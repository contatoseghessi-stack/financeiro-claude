import { google } from "googleapis";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

function getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    ENV.googleClientId,
    ENV.googleClientSecret,
    redirectUri
  );
}

export function registerGoogleLoginRoutes(app: Express) {
  // Step 1: Redirect user to Google consent screen
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const origin = req.query.origin as string;
    if (!origin) {
      res.status(400).json({ error: "Missing origin parameter" });
      return;
    }

    const redirectUri = `${origin}/api/auth/google/callback`;
    const oauth2Client = getOAuth2Client(redirectUri);

    const state = JSON.stringify({ origin });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state,
      prompt: "select_account",
    });

    res.redirect(authUrl);
  });

  // Step 2: Handle Google callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code || !stateParam) {
      res.status(400).json({ error: "Missing code or state" });
      return;
    }

    try {
      const { origin } = JSON.parse(stateParam);
      const redirectUri = `${origin}/api/auth/google/callback`;
      const oauth2Client = getOAuth2Client(redirectUri);

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: googleUser } = await oauth2.userinfo.get();

      if (!googleUser.email || !googleUser.id) {
        res.status(400).json({ error: "Failed to get user info from Google" });
        return;
      }

      // Use Google ID as the openId for this user
      const openId = `google_${googleUser.id}`;

      // Check if user already exists by openId
      let existingUser = await db.getUserByOpenId(openId);

      // If not found by openId, check by email (migration from Manus OAuth)
      if (!existingUser && googleUser.email) {
        const userByEmail = await db.getUserByEmail(googleUser.email);
        if (userByEmail) {
          // Migrate: update the existing user's openId to the Google one
          await db.updateUserOpenId(userByEmail.id, openId);
          existingUser = { ...userByEmail, openId };
        }
      }

      const isNewUser = !existingUser;

      // Upsert user
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Send welcome notification for new users
      if (isNewUser) {
        notifyOwner({
          title: "Novo usuário cadastrado!",
          content: `${googleUser.name || "Usuário"} (${googleUser.email}) acabou de criar uma conta via Google no Eugê Financeiro.`,
        }).catch((err) => console.warn("[Google Login] Failed to send welcome notification:", err));
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to app
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google Login] Callback failed:", error);
      res.status(500).json({ error: "Google login failed" });
    }
  });
}
