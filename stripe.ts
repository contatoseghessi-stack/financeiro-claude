import Stripe from "stripe";
import { ENV } from "./_core/env";

// Initialize Stripe client
export const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2026-05-27.dahlia",
});

// ==================== PLAN DEFINITIONS ====================

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  maxActiveJobs: number;
  maxTransactionsPerMonth: number;
  maxCards: number;
  maxCategories: number;
  maxRecurrences: number;
  maxUploadsPerMonth: number;
  hasReportsPDF: boolean;
  hasDRE: boolean;
  hasGoals: boolean;
  hasQuotes: boolean;
  hasTelegram: boolean;
  hasPrioritySupport: boolean;
  hasAI: boolean; // IA: insights, assistente, categorização automática, relatório IA
  hasDocumentScan: boolean; // Scan de documentos com IA
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number; // in BRL cents
  stripePriceId: string | null; // null for free plan
  limits: PlanLimits;
  popular?: boolean;
}

// Plan configurations - easily editable
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Grátis",
    description: "Para começar a organizar suas finanças",
    priceMonthly: 0,
    stripePriceId: null,
    limits: {
      maxActiveJobs: -1, // unlimited
      maxTransactionsPerMonth: -1, // unlimited
      maxCards: -1, // unlimited
      maxCategories: -1, // unlimited
      maxRecurrences: -1, // unlimited
      maxUploadsPerMonth: -1, // unlimited
      hasReportsPDF: true,
      hasDRE: true,
      hasGoals: true,
      hasQuotes: true,
      hasTelegram: true,
      hasPrioritySupport: false,
      hasAI: false, // IA só no Pro e Business
      hasDocumentScan: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Para freelancers e MEIs que querem crescer",
    priceMonthly: 2900, // R$29.00
    stripePriceId: "price_1Tf59nBfYEfXOtQZC7G489LU",
    popular: true,
    limits: {
      maxActiveJobs: -1, // unlimited
      maxTransactionsPerMonth: -1, // unlimited
      maxCards: -1, // unlimited
      maxCategories: -1, // unlimited
      maxRecurrences: -1, // unlimited
      maxUploadsPerMonth: -1, // unlimited
      hasReportsPDF: true,
      hasDRE: true,
      hasGoals: true,
      hasQuotes: true,
      hasTelegram: true,
      hasPrioritySupport: true,
      hasAI: true, // IA incluída
      hasDocumentScan: true,
    },
  },
  business: {
    id: "business",
    name: "Business",
    description: "Para estúdios e agências que precisam de tudo",
    priceMonthly: 5900, // R$59.00
    stripePriceId: "price_1Tf59nBfYEfXOtQZCOkYwSR2",
    limits: {
      maxActiveJobs: -1, // unlimited
      maxTransactionsPerMonth: -1, // unlimited
      maxCards: -1, // unlimited
      maxCategories: -1, // unlimited
      maxRecurrences: -1, // unlimited
      maxUploadsPerMonth: -1, // unlimited
      hasReportsPDF: true,
      hasDRE: true,
      hasGoals: true,
      hasQuotes: true,
      hasTelegram: true,
      hasPrioritySupport: true,
      hasAI: true, // IA incluída
      hasDocumentScan: true,
    },
  },
};

// Helper to get plan by ID
export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId] || PLANS.free;
}

// Helper to check if a limit is exceeded (-1 means unlimited)
export function isLimitExceeded(current: number, max: number): boolean {
  if (max === -1) return false; // unlimited
  return current >= max;
}

// Helper to check if a feature is available for a plan
export function hasFeature(planId: PlanId, feature: keyof PlanLimits): boolean {
  const plan = getPlan(planId);
  const value = plan.limits[feature];
  if (typeof value === "boolean") return value;
  return value !== 0;
}
