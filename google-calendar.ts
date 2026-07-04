import { google, calendar_v3 } from "googleapis";
import { getDb } from "./db";
import { googleCalendarTokens, calendarEvents } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuth2Client(redirectUrl?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl || `${process.env.VITE_OAUTH_PORTAL_URL ? "" : ""}http://localhost:3000/api/google/callback`
  );
}

/**
 * Generate the Google OAuth2 authorization URL
 */
export function getGoogleAuthUrl(origin: string, userId: number): string {
  const redirectUri = `${origin}/api/google/callback`;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: JSON.stringify({ userId, origin }),
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens and save them
 */
export async function handleGoogleCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, origin } = JSON.parse(state);
    const redirectUri = `${origin}/api/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return { success: false, error: "No access token received" };
    }

    const db = await getDb();
    if (!db) return { success: false, error: "DB not available" };

    // Upsert tokens
    const existing = await db.select().from(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId)).limit(1);

    if (existing.length > 0) {
      await db.update(googleCalendarTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing[0].refreshToken,
          expiresAt: tokens.expiry_date || Date.now() + 3600000,
        })
        .where(eq(googleCalendarTokens.userId, userId));
    } else {
      await db.insert(googleCalendarTokens).values({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date || Date.now() + 3600000,
        calendarId: "primary",
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Google Calendar] Callback error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Get authenticated OAuth2 client for a user (refreshes token if needed)
 */
async function getAuthenticatedClient(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const tokenRow = (await db.select().from(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId)).limit(1))[0];
  if (!tokenRow) throw new Error("Google Calendar not connected");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    expiry_date: tokenRow.expiresAt,
  });

  // Check if token needs refresh
  if (tokenRow.expiresAt < Date.now() + 60000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await db.update(googleCalendarTokens)
        .set({
          accessToken: credentials.access_token!,
          expiresAt: credentials.expiry_date || Date.now() + 3600000,
          ...(credentials.refresh_token ? { refreshToken: credentials.refresh_token } : {}),
        })
        .where(eq(googleCalendarTokens.userId, userId));
      oauth2Client.setCredentials(credentials);
    } catch (err: any) {
      console.error("[Google Calendar] Token refresh failed:", err);
      throw new Error("Token expired. Please reconnect Google Calendar.");
    }
  }

  return { oauth2Client, tokenRow };
}

/**
 * Check connection status
 */
export async function getGoogleCalendarStatus(userId: number) {
  const db = await getDb();
  if (!db) return { connected: false };

  const tokenRow = (await db.select().from(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId)).limit(1))[0];
  if (!tokenRow) return { connected: false };

  return {
    connected: true,
    calendarId: tokenRow.calendarId,
    lastSyncAt: tokenRow.lastSyncAt,
  };
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Revoke token
  try {
    const { oauth2Client } = await getAuthenticatedClient(userId);
    await oauth2Client.revokeCredentials();
  } catch {
    // Ignore revoke errors
  }

  // Delete tokens
  await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));

  // Remove google-sourced events
  await db.delete(calendarEvents).where(
    and(eq(calendarEvents.userId, userId), eq(calendarEvents.source, "google"))
  );

  return { success: true };
}

/**
 * List user's Google Calendars
 */
export async function listGoogleCalendars(userId: number) {
  const { oauth2Client } = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const res = await calendar.calendarList.list();
  return (res.data.items || []).map((cal) => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false,
    backgroundColor: cal.backgroundColor,
  }));
}

/**
 * Set which calendar to sync
 */
export async function setGoogleCalendarId(userId: number, calendarId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.update(googleCalendarTokens)
    .set({ calendarId })
    .where(eq(googleCalendarTokens.userId, userId));

  return { success: true };
}

/**
 * Sync events FROM Google Calendar TO local
 */
export async function syncFromGoogle(userId: number): Promise<{ imported: number; updated: number; deleted: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const { oauth2Client, tokenRow } = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // Get events from the last 3 months to next 6 months
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 3);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6);

  let imported = 0;
  let updated = 0;
  let deleted = 0;

  try {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: tokenRow.calendarId || "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    };

    // Use syncToken for incremental sync if available
    if (tokenRow.syncToken) {
      delete params.timeMin;
      delete params.timeMax;
      params.syncToken = tokenRow.syncToken;
    }

    let pageToken: string | undefined;
    let newSyncToken: string | undefined;

    do {
      if (pageToken) params.pageToken = pageToken;

      let res;
      try {
        res = await calendar.events.list(params);
      } catch (err: any) {
        // If syncToken is invalid, do full sync
        if (err.code === 410) {
          delete params.syncToken;
          params.timeMin = timeMin.toISOString();
          params.timeMax = timeMax.toISOString();
          res = await calendar.events.list(params);
        } else {
          throw err;
        }
      }

      newSyncToken = res.data.nextSyncToken || undefined;
      pageToken = res.data.nextPageToken || undefined;

      for (const event of res.data.items || []) {
        if (!event.id) continue;

        // Handle cancelled events
        if (event.status === "cancelled") {
          const result = await db.delete(calendarEvents).where(
            and(
              eq(calendarEvents.userId, userId),
              eq(calendarEvents.googleEventId, event.id)
            )
          );
          if ((result as any).rowsAffected > 0 || (result as any)[0]?.affectedRows > 0) deleted++;
          continue;
        }

        const startAt = event.start?.dateTime
          ? new Date(event.start.dateTime).getTime()
          : event.start?.date
            ? new Date(event.start.date).getTime()
            : null;

        if (!startAt) continue;

        const endAt = event.end?.dateTime
          ? new Date(event.end.dateTime).getTime()
          : event.end?.date
            ? new Date(event.end.date).getTime()
            : null;

        const allDay = !event.start?.dateTime;
        const title = event.summary || "(Sem título)";
        const description = event.description || null;

        // Check if event already exists locally
        const existing = await db.select().from(calendarEvents).where(
          and(
            eq(calendarEvents.userId, userId),
            eq(calendarEvents.googleEventId, event.id)
          )
        ).limit(1);

        if (existing.length > 0) {
          await db.update(calendarEvents)
            .set({ title, description, startAt, endAt, allDay })
            .where(eq(calendarEvents.id, existing[0].id));
          updated++;
        } else {
          await db.insert(calendarEvents).values({
            userId,
            title,
            description,
            startAt,
            endAt,
            allDay,
            eventType: "manual",
            color: "#4285F4", // Google blue
            source: "google",
            googleEventId: event.id,
          });
          imported++;
        }
      }
    } while (pageToken);

    // Save sync token for incremental sync next time
    if (newSyncToken) {
      await db.update(googleCalendarTokens)
        .set({ syncToken: newSyncToken, lastSyncAt: Date.now() })
        .where(eq(googleCalendarTokens.userId, userId));
    }
  } catch (err: any) {
    console.error("[Google Calendar] Sync from Google error:", err);
    throw new Error("Erro ao sincronizar: " + (err.message || "Unknown"));
  }

  return { imported, updated, deleted };
}

/**
 * Push a local event TO Google Calendar
 */
export async function pushEventToGoogle(userId: number, eventId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const event = (await db.select().from(calendarEvents).where(
    and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId))
  ).limit(1))[0];

  if (!event) throw new Error("Event not found");
  if (event.source === "google") return event.googleEventId; // Already from Google

  const { oauth2Client, tokenRow } = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const googleEvent: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description || undefined,
    start: event.allDay
      ? { date: new Date(event.startAt).toISOString().split("T")[0] }
      : { dateTime: new Date(event.startAt).toISOString() },
    end: event.endAt
      ? event.allDay
        ? { date: new Date(event.endAt).toISOString().split("T")[0] }
        : { dateTime: new Date(event.endAt).toISOString() }
      : event.allDay
        ? { date: new Date(event.startAt + 86400000).toISOString().split("T")[0] }
        : { dateTime: new Date(event.startAt + 3600000).toISOString() },
  };

  try {
    if (event.googleEventId) {
      // Update existing
      await calendar.events.update({
        calendarId: tokenRow.calendarId || "primary",
        eventId: event.googleEventId,
        requestBody: googleEvent,
      });
      return event.googleEventId;
    } else {
      // Create new
      const res = await calendar.events.insert({
        calendarId: tokenRow.calendarId || "primary",
        requestBody: googleEvent,
      });
      const googleEventId = res.data.id || null;
      if (googleEventId) {
        await db.update(calendarEvents)
          .set({ googleEventId })
          .where(eq(calendarEvents.id, eventId));
      }
      return googleEventId;
    }
  } catch (err: any) {
    console.error("[Google Calendar] Push event error:", err);
    throw new Error("Erro ao enviar para Google Calendar: " + (err.message || "Unknown"));
  }
}

/**
 * Push ALL local events to Google Calendar
 */
export async function pushAllEventsToGoogle(userId: number): Promise<{ pushed: number; errors: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const localEvents = await db.select().from(calendarEvents).where(
    and(
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.source, "local")
    )
  );

  let pushed = 0;
  let errors = 0;

  for (const event of localEvents) {
    try {
      await pushEventToGoogle(userId, event.id);
      pushed++;
    } catch {
      errors++;
    }
  }

  return { pushed, errors };
}
