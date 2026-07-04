import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { transactions, jobs, cards, categories, recurringIncome, recurringExpenses, cardStatements } from "../drizzle/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { getPlan, isLimitExceeded, type PlanId } from "./stripe";

/**
 * Check if user can create a new job (active jobs limit)
 */
export async function checkJobLimit(userId: number, planId: PlanId): Promise<void> {
  const plan = getPlan(planId);
  if (plan.limits.maxActiveJobs === -1) return; // unlimited

  const db = await getDb();
  if (!db) return;

  const result = await db.select({ count: count() })
    .from(jobs)
    .where(and(
      eq(jobs.userId, userId),
      sql`${jobs.status} IN ('lead', 'proposal', 'in_progress')`
    ));

  const activeCount = result[0]?.count || 0;
  if (isLimitExceeded(activeCount, plan.limits.maxActiveJobs)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${plan.limits.maxActiveJobs} jobs ativos atingido. Faça upgrade para o plano ${planId === "free" ? "Pro" : "Business"} para criar mais jobs.`,
    });
  }
}

/**
 * Check if user can create a new transaction (monthly limit)
 */
export async function checkTransactionLimit(userId: number, planId: PlanId): Promise<void> {
  const plan = getPlan(planId);
  if (plan.limits.maxTransactionsPerMonth === -1) return; // unlimited

  const db = await getDb();
  if (!db) return;

  // Count transactions this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const result = await db.select({ count: count() })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, startOfMonth),
      lte(transactions.date, endOfMonth)
    ));

  const monthlyCount = result[0]?.count || 0;
  if (isLimitExceeded(monthlyCount, plan.limits.maxTransactionsPerMonth)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${plan.limits.maxTransactionsPerMonth} transações/mês atingido. Faça upgrade para o plano Pro para transações ilimitadas.`,
    });
  }
}

/**
 * Check if user can create a new card
 */
export async function checkCardLimit(userId: number, planId: PlanId): Promise<void> {
  const plan = getPlan(planId);
  if (plan.limits.maxCards === -1) return;

  const db = await getDb();
  if (!db) return;

  const result = await db.select({ count: count() })
    .from(cards)
    .where(eq(cards.userId, userId));

  const cardCount = result[0]?.count || 0;
  if (isLimitExceeded(cardCount, plan.limits.maxCards)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${plan.limits.maxCards} cartões atingido. Faça upgrade para adicionar mais cartões.`,
    });
  }
}

/**
 * Check if user can create a new category
 */
export async function checkCategoryLimit(userId: number, planId: PlanId): Promise<void> {
  const plan = getPlan(planId);
  if (plan.limits.maxCategories === -1) return;

  const db = await getDb();
  if (!db) return;

  const result = await db.select({ count: count() })
    .from(categories)
    .where(eq(categories.userId, userId));

  const catCount = result[0]?.count || 0;
  if (isLimitExceeded(catCount, plan.limits.maxCategories)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${plan.limits.maxCategories} categorias atingido. Faça upgrade para adicionar mais categorias.`,
    });
  }
}

/**
 * Check if user can create a new recurrence
 */
export async function checkRecurrenceLimit(userId: number, planId: PlanId): Promise<void> {
  const plan = getPlan(planId);
  if (plan.limits.maxRecurrences === -1) return;

  const db = await getDb();
  if (!db) return;

  const incomeCount = await db.select({ count: count() })
    .from(recurringIncome)
    .where(eq(recurringIncome.userId, userId));

  const expenseCount = await db.select({ count: count() })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.userId, userId));

  const total = (incomeCount[0]?.count || 0) + (expenseCount[0]?.count || 0);
  if (isLimitExceeded(total, plan.limits.maxRecurrences)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${plan.limits.maxRecurrences} recorrências atingido. Faça upgrade para adicionar mais.`,
    });
  }
}

/**
 * Check if user can upload a statement this month
 */
export async function checkUploadLimit(userId: number, planId: PlanId): Promise<void> {
  const plan = getPlan(planId);
  if (plan.limits.maxUploadsPerMonth === -1) return;

  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db.select({ count: count() })
    .from(cardStatements)
    .where(and(
      eq(cardStatements.userId, userId),
      gte(cardStatements.uploadedAt, startOfMonth)
    ));

  const uploadCount = result[0]?.count || 0;
  if (isLimitExceeded(uploadCount, plan.limits.maxUploadsPerMonth)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${plan.limits.maxUploadsPerMonth} upload(s)/mês atingido. Faça upgrade para enviar mais faturas.`,
    });
  }
}

/**
 * Check if a feature is available for the user's plan
 */
export function checkFeatureAccess(planId: PlanId, feature: string): void {
  const plan = getPlan(planId);
  const featureMap: Record<string, boolean> = {
    reports_pdf: plan.limits.hasReportsPDF,
    dre: plan.limits.hasDRE,
    goals: plan.limits.hasGoals,
    quotes: plan.limits.hasQuotes,
    telegram: plan.limits.hasTelegram,
  };

  if (feature in featureMap && !featureMap[feature]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Esta funcionalidade está disponível a partir do plano Pro. Faça upgrade para acessar.`,
    });
  }
}
