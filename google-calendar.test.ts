import { describe, it, expect } from "vitest";

describe("Google Calendar OAuth2 Credentials", () => {
  it("should have GOOGLE_CLIENT_ID set", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    expect(clientId).toContain(".apps.googleusercontent.com");
  });

  it("should have GOOGLE_CLIENT_SECRET set", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    expect(clientSecret!.startsWith("GOCSPX-")).toBe(true);
  });

  it("should be able to create OAuth2 client", async () => {
    const { google } = await import("googleapis");
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3000/api/google/callback"
    );
    expect(oauth2Client).toBeDefined();

    // Generate auth URL should work
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });
    expect(authUrl).toContain("accounts.google.com");
    expect(authUrl).toContain(process.env.GOOGLE_CLIENT_ID);
  });
});
