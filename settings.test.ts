import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Settings tests - NON-DESTRUCTIVE
 * 
 * These tests verify that the settings endpoints exist and respond correctly
 * WITHOUT actually deleting real data from the database.
 * 
 * The destructive operations (clearAllData, clearJobs, clearTransactions, etc.)
 * are tested by verifying they are callable procedures, not by executing them
 * against the production database.
 */

function createAuthContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

describe("Settings - Data Management (Non-Destructive)", () => {
  const caller = appRouter.createCaller(createAuthContext());

  it("should have clearTransactions endpoint available", () => {
    // Verify the procedure exists without calling it
    expect(caller.settings.clearTransactions).toBeDefined();
    expect(typeof caller.settings.clearTransactions).toBe("function");
  });

  it("should have clearCategoryLearning endpoint available", () => {
    expect(caller.settings.clearCategoryLearning).toBeDefined();
    expect(typeof caller.settings.clearCategoryLearning).toBe("function");
  });

  it("should have clearRecurrences endpoint available", () => {
    expect(caller.settings.clearRecurrences).toBeDefined();
    expect(typeof caller.settings.clearRecurrences).toBe("function");
  });

  it("should have clearJobs endpoint available", () => {
    expect(caller.settings.clearJobs).toBeDefined();
    expect(typeof caller.settings.clearJobs).toBe("function");
  });

  it("should have clearAllData endpoint available", () => {
    expect(caller.settings.clearAllData).toBeDefined();
    expect(typeof caller.settings.clearAllData).toBe("function");
  });

  it("should have importBackup endpoint available", () => {
    expect(caller.settings.importBackup).toBeDefined();
    expect(typeof caller.settings.importBackup).toBe("function");
  });

  it("should have exportBackup endpoint available", async () => {
    // exportBackup is safe to call - it only reads data
    const result = await caller.settings.exportBackup();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });
});
