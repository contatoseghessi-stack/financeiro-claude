import { describe, it, expect } from "vitest";
import { PLANS, getPlan, isLimitExceeded, hasFeature, type PlanId } from "./stripe";

describe("Billing - Plan Configuration", () => {
  it("should have 3 plans defined", () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
    expect(PLANS.free).toBeDefined();
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.business).toBeDefined();
  });

  it("free plan should have correct limits", () => {
    const free = PLANS.free;
    expect(free.priceMonthly).toBe(0);
    expect(free.limits.maxTransactionsPerMonth).toBe(-1);
    expect(free.limits.maxActiveJobs).toBe(-1);
    expect(free.limits.maxCards).toBe(-1);
    expect(free.limits.maxCategories).toBe(-1);
    expect(free.limits.maxRecurrences).toBe(-1);
    expect(free.limits.maxUploadsPerMonth).toBe(-1);
    expect(free.limits.hasReportsPDF).toBe(true);
    expect(free.limits.hasDRE).toBe(true);
    expect(free.limits.hasGoals).toBe(true);
    expect(free.limits.hasQuotes).toBe(true);
    expect(free.limits.hasTelegram).toBe(true);
    expect(free.limits.hasPrioritySupport).toBe(false);
    // IA restrita ao plano pago
    expect(free.limits.hasAI).toBe(false);
    expect(free.limits.hasDocumentScan).toBe(false);
  });

  it("pro plan should have AI enabled", () => {
    const pro = PLANS.pro;
    expect(pro.priceMonthly).toBe(2900);
    expect(pro.limits.maxTransactionsPerMonth).toBe(-1);
    expect(pro.limits.hasReportsPDF).toBe(true);
    expect(pro.limits.hasDRE).toBe(true);
    expect(pro.limits.hasGoals).toBe(true);
    expect(pro.limits.hasQuotes).toBe(true);
    expect(pro.limits.hasTelegram).toBe(true);
    expect(pro.limits.hasPrioritySupport).toBe(true);
    expect(pro.limits.hasAI).toBe(true);
    expect(pro.limits.hasDocumentScan).toBe(true);
  });

  it("business plan should have unlimited everything including AI", () => {
    const biz = PLANS.business;
    expect(biz.priceMonthly).toBe(5900);
    expect(biz.limits.maxTransactionsPerMonth).toBe(-1);
    expect(biz.limits.maxActiveJobs).toBe(-1);
    expect(biz.limits.maxCards).toBe(-1);
    expect(biz.limits.maxCategories).toBe(-1);
    expect(biz.limits.maxRecurrences).toBe(-1);
    expect(biz.limits.maxUploadsPerMonth).toBe(-1);
    expect(biz.limits.hasReportsPDF).toBe(true);
    expect(biz.limits.hasDRE).toBe(true);
    expect(biz.limits.hasGoals).toBe(true);
    expect(biz.limits.hasQuotes).toBe(true);
    expect(biz.limits.hasTelegram).toBe(true);
    expect(biz.limits.hasPrioritySupport).toBe(true);
    expect(biz.limits.hasAI).toBe(true);
    expect(biz.limits.hasDocumentScan).toBe(true);
  });

  it("getPlan should return correct plan", () => {
    expect(getPlan("free").id).toBe("free");
    expect(getPlan("pro").id).toBe("pro");
    expect(getPlan("business").id).toBe("business");
  });

  it("getPlan should default to free for unknown plan", () => {
    expect(getPlan("unknown" as PlanId).id).toBe("free");
  });
});

describe("Billing - Limit Checks", () => {
  it("isLimitExceeded should return false when under limit", () => {
    expect(isLimitExceeded(5, 50)).toBe(false);
    expect(isLimitExceeded(0, 3)).toBe(false);
    expect(isLimitExceeded(49, 50)).toBe(false);
  });

  it("isLimitExceeded should return true when at or over limit", () => {
    expect(isLimitExceeded(50, 50)).toBe(true);
    expect(isLimitExceeded(51, 50)).toBe(true);
    expect(isLimitExceeded(3, 3)).toBe(true);
  });

  it("isLimitExceeded should return false for unlimited (-1)", () => {
    expect(isLimitExceeded(9999, -1)).toBe(false);
    expect(isLimitExceeded(0, -1)).toBe(false);
  });
});

describe("Billing - Feature Access", () => {
  it("free plan should NOT have AI features", () => {
    expect(hasFeature("free", "hasAI")).toBe(false);
    expect(hasFeature("free", "hasDocumentScan")).toBe(false);
  });

  it("free plan should have basic features", () => {
    expect(hasFeature("free", "hasReportsPDF")).toBe(true);
    expect(hasFeature("free", "hasDRE")).toBe(true);
    expect(hasFeature("free", "hasGoals")).toBe(true);
    expect(hasFeature("free", "hasQuotes")).toBe(true);
    expect(hasFeature("free", "hasTelegram")).toBe(true);
  });

  it("pro plan should have AI features", () => {
    expect(hasFeature("pro", "hasAI")).toBe(true);
    expect(hasFeature("pro", "hasDocumentScan")).toBe(true);
  });

  it("business plan should have all features", () => {
    expect(hasFeature("business", "hasReportsPDF")).toBe(true);
    expect(hasFeature("business", "hasDRE")).toBe(true);
    expect(hasFeature("business", "hasGoals")).toBe(true);
    expect(hasFeature("business", "hasQuotes")).toBe(true);
    expect(hasFeature("business", "hasTelegram")).toBe(true);
    expect(hasFeature("business", "hasPrioritySupport")).toBe(true);
    expect(hasFeature("business", "hasAI")).toBe(true);
    expect(hasFeature("business", "hasDocumentScan")).toBe(true);
  });

  it("numeric limits should be treated as features when non-zero or unlimited", () => {
    expect(hasFeature("free", "maxActiveJobs")).toBe(true);
    expect(hasFeature("free", "maxTransactionsPerMonth")).toBe(true);
  });
});
