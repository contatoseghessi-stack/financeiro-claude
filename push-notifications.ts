import webpush from "web-push";
import { getDb } from "./db";
import { pushSubscriptions, notificationPreferences } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:contato@euge.com.br",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: any) {
      // If subscription is expired/invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db!.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
  return sent;
}

/**
 * Send push notification to all users who have a specific preference enabled
 */
export async function sendPushToUsersWithPreference(
  preferenceKey: keyof typeof notificationPreferences.$inferSelect,
  getUserIds: () => Promise<number[]>,
  payload: PushPayload
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const userIds = await getUserIds();
  let totalSent = 0;

  for (const userId of userIds) {
    // Check user preference
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    // If no preferences set, defaults are all true
    if (prefs.length === 0 || (prefs[0] as any)[preferenceKey] === true) {
      const sent = await sendPushToUser(userId, payload);
      totalSent += sent;
    }
  }
  return totalSent;
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribePush(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const db = await getDb();
  if (!db) return null;
  // Check if already subscribed with same endpoint
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, subscription.endpoint)
      )
    )
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [result] = await db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });

  return { id: result.insertId };
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribePush(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return {
    recurrenceDue: true,
    jobPaymentPending: true,
    quotationExpiring: true,
    goalReached: true,
    planLimitReaching: true,
    cardStatementDue: true,
    jobWithoutDelivery: true,
    weeklySummary: true,
    irAlert: true,
    overduePayment: true,
    dailyAgenda: true,
  };
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (prefs.length === 0) {
    // Return defaults (all enabled)
    return {
      recurrenceDue: true,
      jobPaymentPending: true,
      quotationExpiring: true,
      goalReached: true,
      planLimitReaching: true,
      cardStatementDue: true,
      jobWithoutDelivery: true,
      weeklySummary: true,
      irAlert: true,
      overduePayment: true,
      dailyAgenda: true,
    };
  }

  const { id, userId: _, createdAt, updatedAt, ...preferences } = prefs[0];
  return preferences;
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: number,
  preferences: Partial<{
    recurrenceDue: boolean;
    jobPaymentPending: boolean;
    quotationExpiring: boolean;
    goalReached: boolean;
    planLimitReaching: boolean;
    cardStatementDue: boolean;
    jobWithoutDelivery: boolean;
    weeklySummary: boolean;
    irAlert: boolean;
    overduePayment: boolean;
    dailyAgenda: boolean;
  }>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(notificationPreferences).values({
      userId,
      ...preferences,
    });
  } else {
    await db
      .update(notificationPreferences)
      .set(preferences)
      .where(eq(notificationPreferences.userId, userId));
  }
}
