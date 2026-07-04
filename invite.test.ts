import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId = 1): TrpcContext {
  const user = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "test",
    role: "user" as const,
    telegramChatId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("Invite System", () => {
  it("should generate a referral code for the user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.getMyCode();
    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("string");
    expect(result.code.startsWith("euge_")).toBe(true);
  });

  it("should return the same code on subsequent calls", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result1 = await caller.invite.getMyCode();
    const result2 = await caller.invite.getMyCode();
    expect(result1.code).toBe(result2.code);
  });

  it("should return invite stats", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.getStats();
    expect(result).toBeDefined();
    expect(typeof result.inviteCount).toBe("number");
    expect(Array.isArray(result.invitees)).toBe(true);
  });

  it("should validate an existing referral code", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const { code } = await caller.invite.getMyCode();
    const result = await caller.invite.validate({ code });
    expect(result.valid).toBe(true);
  });

  it("should reject an invalid referral code", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.validate({ code: "invalid_code_xyz" });
    expect(result.valid).toBe(false);
    expect(result.inviterName).toBeNull();
  });

  it("should reject applying own referral code", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const { code } = await caller.invite.getMyCode();
    await expect(caller.invite.applyCode({ code })).rejects.toThrow(
      "Você não pode usar seu próprio código"
    );
  });

  it("should reject an invalid code on apply", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.invite.applyCode({ code: "nonexistent_code" })
    ).rejects.toThrow("Código inválido");
  });
});
