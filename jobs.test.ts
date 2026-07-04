import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Jobs - CRUD", () => {
  let jobId: number;

  afterAll(async () => {
    if (jobId) {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await caller.jobs.delete({ id: jobId }).catch(() => {});
    }
  });

  it("should create a job with only a name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.create({
      name: "Campanha Teste Vitest",
      clientName: null,
      status: "draft",
      startDate: null,
      endDate: null,
      totalCharged: null,
      notes: null,
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
    jobId = result.id;
  });

  it("should list jobs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const found = result.find((j: any) => j.id === jobId);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Campanha Teste Vitest");
    expect(found!.status).toBe("draft");
  });

  it("should list jobs filtered by status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.list({ status: "draft" });
    expect(Array.isArray(result)).toBe(true);
    for (const j of result) {
      expect(j.status).toBe("draft");
    }
  });

  it("should update a job", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.update({
      id: jobId,
      name: "Campanha Atualizada",
      clientName: "Iguatemi",
      status: "in_progress",
      totalCharged: "15000.00",
      startDate: Date.now(),
    });

    expect(result).toEqual({ success: true });
  });

  it("should get job by id with summary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.getById({ id: jobId });
    expect(result).toBeDefined();
    expect(result!.name).toBe("Campanha Atualizada");
    expect(result!.clientName).toBe("Iguatemi");
    expect(result!.status).toBe("in_progress");
    expect(result).toHaveProperty("summary");
    expect(result!.summary).toHaveProperty("totalCosts");
    expect(result!.summary).toHaveProperty("totalPayments");
    expect(result!.summary).toHaveProperty("profit");
    expect(result!.summary).toHaveProperty("margin");
  });

  it("should get month summary for jobs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

    const result = await caller.jobs.monthSummary({ startDate, endDate });
    expect(result).toHaveProperty("activeJobs");
    expect(result).toHaveProperty("totalProfit");
    expect(typeof result.activeJobs).toBe("number");
    expect(typeof result.totalProfit).toBe("number");
  });
});

describe("Jobs - Deliveries", () => {
  let jobId: number;
  const createdJobIds: number[] = [];

  afterAll(async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    for (const id of createdJobIds) {
      await caller.jobs.delete({ id }).catch(() => {});
    }
  });

  it("should create a delivery for a job", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a job first
    const job = await caller.jobs.create({
      name: "Job Entregas Test",
      clientName: null,
      status: "in_progress",
      startDate: null,
      endDate: null,
      totalCharged: null,
      notes: null,
    });
    jobId = job.id;
    createdJobIds.push(jobId);

    const result = await caller.jobs.deliveries.create({
      jobId,
      description: "Entrega vídeo final",
    });

    expect(result).toHaveProperty("success", true);
  });

  it("should update delivery status to delivered", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.getById({ id: jobId });
    const delivery = job!.deliveries![0];

    const result = await caller.jobs.deliveries.update({
      id: delivery.id,
      jobId,
      status: "delivered",
      deliveredAt: Date.now(),
    });

    expect(result).toEqual({ success: true });
  });

  it("should delete a delivery", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a fresh job + delivery for this test
    const freshJob = await caller.jobs.create({
      name: "Job Delete Delivery Test",
      clientName: null,
      status: "in_progress",
      startDate: null,
      endDate: null,
      totalCharged: null,
      notes: null,
    });
    const freshJobId = freshJob.id;
    createdJobIds.push(freshJobId);

    await caller.jobs.deliveries.create({
      jobId: freshJobId,
      description: "Entrega para deletar",
    });

    const job = await caller.jobs.getById({ id: freshJobId });
    const delivery = job!.deliveries![0];

    const result = await caller.jobs.deliveries.delete({ id: delivery.id });
    expect(result).toEqual({ success: true });
  });
});

describe("Jobs - Costs", () => {
  let jobId: number;

  afterAll(async () => {
    if (jobId) {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await caller.jobs.delete({ id: jobId }).catch(() => {});
    }
  });

  it("should create a cost for a job", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.create({
      name: "Job Custos Test",
      clientName: null,
      status: "in_progress",
      startDate: null,
      endDate: null,
      totalCharged: "10000.00",
      notes: null,
    });
    jobId = job.id;

    const result = await caller.jobs.costs.create({
      jobId,
      description: "Freelancer edição",
      amount: "2000.00",
      supplierName: "Editor Freelancer",
      status: "paid",
      paidAt: Date.now(),
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("id");
  });

  it("should reflect cost in job summary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.getById({ id: jobId });
    expect(job!.summary!.totalCosts).toBe(2000);
  });

  it("should delete a cost", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.getById({ id: jobId });
    const cost = job!.costs![0];

    const result = await caller.jobs.costs.delete({ id: cost.id });
    expect(result).toEqual({ success: true });
  });
});

describe("Jobs - Payments (Recebimentos)", () => {
  let jobId: number;
  let paymentId: number;

  afterAll(async () => {
    if (jobId) {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await caller.jobs.delete({ id: jobId }).catch(() => {});
    }
  });

  it("should create a payment for a job", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.create({
      name: "Job Pagamentos Test",
      clientName: "Cliente Pagador",
      status: "in_progress",
      startDate: null,
      endDate: null,
      totalCharged: "9000.00",
      notes: null,
    });
    jobId = job.id;

    const result = await caller.jobs.payments.create({
      jobId,
      description: "Parcela 1/3",
      amount: "3000.00",
      dueDate: Date.now() + 30 * 86400000,
      status: "pending",
      receivedAt: null,
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("id");
    paymentId = result.id;
  });

  it("should reflect payment in job summary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.getById({ id: jobId });
    // totalCharged auto-creates a 9000 payment + manually created 3000 = 12000
    expect(job!.summary!.totalPayments).toBe(12000);
    expect(job!.summary!.pendingPayments).toBe(2);
  });

  it("should update payment with receivedAt date", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const receivedDate = Date.now();
    const result = await caller.jobs.payments.update({
      id: paymentId,
      jobId,
      status: "received",
      receivedAt: receivedDate,
    });

    expect(result).toEqual({ success: true });

    // Verify the payment was updated
    const job = await caller.jobs.getById({ id: jobId });
    const payment = job!.payments!.find((p: any) => p.id === paymentId);
    expect(payment).toBeDefined();
    expect(payment!.status).toBe("received");
    expect(payment!.receivedAt).toBeDefined();
  });

  it("should update payment description and amount", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.payments.update({
      id: paymentId,
      jobId,
      description: "Parcela 1/3 (atualizada)",
      amount: "3500.00",
    });

    expect(result).toEqual({ success: true });
  });

  it("should delete a payment", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.payments.delete({ id: paymentId });
    expect(result).toEqual({ success: true });
  });
});

describe("Jobs - Delete", () => {
  it("should delete a job and its related data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.create({
      name: "Job Para Deletar",
      clientName: null,
      status: "draft",
      startDate: null,
      endDate: null,
      totalCharged: null,
      notes: null,
    });

    // Add delivery, cost, payment
    await caller.jobs.deliveries.create({ jobId: job.id, description: "Entrega teste" });
    await caller.jobs.costs.create({ jobId: job.id, description: "Custo teste", amount: "100.00", supplierName: null, status: "pending", paidAt: null });
    await caller.jobs.payments.create({ jobId: job.id, description: "Pagamento teste", amount: "500.00", dueDate: Date.now(), status: "pending", receivedAt: null });

    const result = await caller.jobs.delete({ id: job.id });
    expect(result).toEqual({ success: true });

    // Verify job is gone - getById throws when not found
    await expect(caller.jobs.getById({ id: job.id })).rejects.toThrow();
  });
});
