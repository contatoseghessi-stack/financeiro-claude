import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

// Same auth context pattern as other test files
function createAuthContext() {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      role: "admin" as const,
      loginMethod: "email",
      telegramChatId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe("Partners - Schema", () => {
  it("should have partners table with correct fields", async () => {
    const { partners } = await import("../drizzle/schema");
    expect(partners).toBeDefined();
    expect(partners.id).toBeDefined();
    expect(partners.userId).toBeDefined();
    expect(partners.name).toBeDefined();
    expect(partners.phone).toBeDefined();
    expect(partners.email).toBeDefined();
    expect(partners.notes).toBeDefined();
    expect(partners.createdAt).toBeDefined();
  });

  it("should have referredByPartnerId field on jobs table", async () => {
    const { jobs } = await import("../drizzle/schema");
    expect(jobs.referredByPartnerId).toBeDefined();
  });
});

describe("Partners - Router", () => {
  it("should have partners procedures defined", () => {
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures["partners.list"]).toBeDefined();
    expect(procedures["partners.search"]).toBeDefined();
    expect(procedures["partners.create"]).toBeDefined();
    expect(procedures["partners.update"]).toBeDefined();
    expect(procedures["partners.delete"]).toBeDefined();
    expect(procedures["partners.ranking"]).toBeDefined();
    expect(procedures["partners.totalRanking"]).toBeDefined();
  });

  it("should accept referredByPartnerId in jobs.create input", () => {
    const procedures = (appRouter as any)._def.procedures;
    const createProcedure = procedures["jobs.create"];
    const inputSchema = createProcedure._def.inputs[0];
    const parsed = inputSchema.safeParse({ name: "Test Job", referredByPartnerId: 1 });
    expect(parsed.success).toBe(true);
  });

  it("should accept referredByPartnerId in jobs.update input", () => {
    const procedures = (appRouter as any)._def.procedures;
    const updateProcedure = procedures["jobs.update"];
    const inputSchema = updateProcedure._def.inputs[0];
    const parsed = inputSchema.safeParse({ id: 1, referredByPartnerId: 2 });
    expect(parsed.success).toBe(true);
  });

  it("should accept null for referredByPartnerId to clear partner", () => {
    const procedures = (appRouter as any)._def.procedures;
    const updateProcedure = procedures["jobs.update"];
    const inputSchema = updateProcedure._def.inputs[0];
    const parsed = inputSchema.safeParse({ id: 1, referredByPartnerId: null });
    expect(parsed.success).toBe(true);
  });
});

describe("Partners - CRUD Integration", () => {
  let partnerId: number;

  it("should create a partner", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const partner = await caller.partners.create({ name: "Carlos Indicador", phone: "(51) 99999-0000", email: "carlos@test.com" });
    expect(partner).toBeDefined();
    expect(partner!.name).toBe("Carlos Indicador");
    expect(partner!.phone).toBe("(51) 99999-0000");
    partnerId = partner!.id;
  });

  it("should list partners", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const list = await caller.partners.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.find((p: any) => p.name === "Carlos Indicador")).toBeDefined();
  });

  it("should search partners by prefix", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.partners.search({ query: "Car" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toContain("Car");
  });

  it("should update a partner", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.partners.update({ id: partnerId, phone: "(51) 88888-0000" });
    expect(result).toEqual({ success: true });
  });

  it("should create a job with referredByPartnerId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const job = await caller.jobs.create({
      name: "Job com Indicação",
      clientName: "Cliente Test",
      referredByPartnerId: partnerId,
    });
    expect(job.success).toBe(true);
    expect(job.id).toBeDefined();
  });

  it("should get ranking for current month", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const now = new Date();
    const ranking = await caller.partners.ranking({ month: now.getMonth() + 1, year: now.getFullYear() });
    expect(ranking.length).toBeGreaterThanOrEqual(1);
    const carlos = ranking.find((r: any) => r.name === "Carlos Indicador");
    expect(carlos).toBeDefined();
    expect(carlos!.jobCount).toBeGreaterThanOrEqual(1);
  });

  it("should get partner detail with jobs and revenue", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const detail = await caller.partners.detail({ id: partnerId });
    expect(detail).toBeDefined();
    expect(detail!.partner.name).toBe("Carlos Indicador");
    expect(detail!.stats.totalJobs).toBeGreaterThanOrEqual(1);
    expect(detail!.jobs.length).toBeGreaterThanOrEqual(1);
    expect(detail!.stats.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  it("should delete a partner and clear job references", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.partners.delete({ id: partnerId });
    expect(result).toEqual({ success: true });
  });
});
