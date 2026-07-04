import { describe, expect, it } from "vitest";

describe("Telegram Bot Token", () => {
  it("should have TELEGRAM_BOT_TOKEN set in environment", () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    expect(token!.length).toBeGreaterThan(10);
  });

  it("should be able to reach Telegram API with the token", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN not set");
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
  });
});
