import { describe, it, expect } from "vitest";

describe("Insights & Monthly Report Routers", () => {
  it("appRouter should be defined and have expected routers", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    // The router should have a _def with record containing our new routers
    const def = (appRouter as any)._def;
    expect(def).toBeDefined();
    // Check that the router has record or procedures
    const record = def.record || def.procedures || {};
    // insights and monthlyReport should be in the record
    expect(record.insights).toBeDefined();
    expect(record.monthlyReport).toBeDefined();
    expect(record.jobs).toBeDefined();
  });
});

describe("Job Stage Schema", () => {
  it("jobs schema should include stage field", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.jobs).toBeDefined();
    // Check that the jobs table has the stage column
    const jobsTable = schema.jobs as any;
    expect(jobsTable.stage).toBeDefined();
  });
});
