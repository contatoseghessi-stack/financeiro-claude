/**
 * Notification triggers - checks various conditions and sends push notifications
 * Called by the Heartbeat cron job daily
 *
 * IMPORTANT: All date columns in this project are stored as bigint (milliseconds since epoch).
 * Use .getTime() for comparisons, not Date objects directly.
 */
import { getDb } from "./db";
import {
  users, recurringExpenses, jobs, jobPayments, jobDeliveries,
  quotations, calendarEvents, transactions, goals
} from "../drizzle/schema";
import { eq, and, gte, lte, lt, sql } from "drizzle-orm";
import { sendPushToUser, getNotificationPreferences, type PushPayload } from "./push-notifications";

/**
 * Run all daily notification checks for all users
 */
export async function runDailyNotificationChecks() {
  const db = await getDb();
  if (!db) return { error: "No database connection" };

  const allUsers = await db.select().from(users);
  const results: Record<string, number> = {};

  for (const user of allUsers) {
    const prefs = await getNotificationPreferences(user.id);

    if (prefs.recurrenceDue) {
      results.recurrenceDue = (results.recurrenceDue || 0) + await checkRecurrenceDue(user.id);
    }
    if (prefs.jobPaymentPending) {
      results.jobPaymentPending = (results.jobPaymentPending || 0) + await checkJobPaymentPending(user.id);
    }
    if (prefs.quotationExpiring) {
      results.quotationExpiring = (results.quotationExpiring || 0) + await checkQuotationExpiring(user.id);
    }
    if (prefs.cardStatementDue) {
      results.cardStatementDue = (results.cardStatementDue || 0) + await checkCardStatementDue(user.id);
    }
    if (prefs.jobWithoutDelivery) {
      results.jobWithoutDelivery = (results.jobWithoutDelivery || 0) + await checkJobWithoutDelivery(user.id);
    }
    if (prefs.overduePayment) {
      results.overduePayment = (results.overduePayment || 0) + await checkOverduePayment(user.id);
    }
    if (prefs.dailyAgenda) {
      results.dailyAgenda = (results.dailyAgenda || 0) + await checkDailyAgenda(user.id);
    }
    if (prefs.irAlert) {
      results.irAlert = (results.irAlert || 0) + await checkIRAlert(user.id);
    }
  }

  return { ok: true, notificationsSent: results };
}

/**
 * Run weekly notification checks (called on Mondays)
 */
export async function runWeeklyNotificationChecks() {
  const db = await getDb();
  if (!db) return { error: "No database connection" };

  const allUsers = await db.select().from(users);
  const results: Record<string, number> = {};

  for (const user of allUsers) {
    const prefs = await getNotificationPreferences(user.id);
    if (prefs.weeklySummary) {
      results.weeklySummary = (results.weeklySummary || 0) + await sendWeeklySummary(user.id);
    }
  }

  return { ok: true, notificationsSent: results };
}

// ============ Individual notification checks ============

/**
 * Recorrência vencendo (1 dia antes do vencimento)
 * recurringExpenses.dayOfMonth is an int (day of month), not a timestamp
 */
async function checkRecurrenceDue(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();

  const recurring = await db
    .select()
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.userId, userId),
        eq(recurringExpenses.dayOfMonth, tomorrowDay),
        eq(recurringExpenses.isActive, true)
      )
    );

  let sent = 0;
  for (const rec of recurring) {
    await sendPushToUser(userId, {
      title: "💰 Conta vence amanhã",
      body: `${rec.description} - R$ ${Number(rec.amount).toFixed(2)} vence amanhã (dia ${tomorrowDay})`,
      url: "/recorrencias",
      tag: `recurrence-${rec.id}`,
    });
    sent++;
  }
  return sent;
}

/**
 * Pagamento de Job pendente (na data prevista de recebimento)
 * jobPayments.dueDate is bigint (ms since epoch)
 */
async function checkJobPaymentPending(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

  // Find jobs with pending payments expected today
  const pendingPayments = await db
    .select({ jobName: jobs.name, amount: jobPayments.amount })
    .from(jobPayments)
    .innerJoin(jobs, eq(jobPayments.jobId, jobs.id))
    .where(
      and(
        eq(jobs.userId, userId),
        eq(jobPayments.status, "pending"),
        gte(jobPayments.dueDate, todayStart),
        lte(jobPayments.dueDate, todayEnd)
      )
    );

  let sent = 0;
  for (const payment of pendingPayments) {
    await sendPushToUser(userId, {
      title: "📥 Pagamento previsto para hoje",
      body: `Job "${payment.jobName}" - R$ ${Number(payment.amount).toFixed(2)} previsto para receber hoje`,
      url: "/jobs",
      tag: `job-payment-today`,
    });
    sent++;
  }
  return sent;
}

/**
 * Orçamento expirando (2 dias antes da validade)
 * quotations.issueDate is a timestamp, validityDays is int
 * We compute: issueDate + validityDays = expiryDate, check if expiryDate is 2 days from now
 */
async function checkQuotationExpiring(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  twoDaysFromNow.setHours(0, 0, 0, 0);
  const targetDayStart = twoDaysFromNow.getTime();
  const targetDayEnd = targetDayStart + 24 * 60 * 60 * 1000 - 1;

  // Quotations where issueDate + validityDays falls on the target day
  const expiring = await db
    .select()
    .from(quotations)
    .where(
      and(
        eq(quotations.userId, userId),
        sql`${quotations.status} = 'sent'`,
        sql`UNIX_TIMESTAMP(${quotations.issueDate}) * 1000 + ${quotations.validityDays} * 86400000 >= ${targetDayStart}`,
        sql`UNIX_TIMESTAMP(${quotations.issueDate}) * 1000 + ${quotations.validityDays} * 86400000 <= ${targetDayEnd}`
      )
    );

  let sent = 0;
  for (const q of expiring) {
    await sendPushToUser(userId, {
      title: "⏰ Orçamento expirando",
      body: `Orçamento #${q.number} para ${q.clientName} vence em 2 dias. Faça follow-up!`,
      url: "/orcamentos-pro",
      tag: `quotation-expiring-${q.id}`,
    });
    sent++;
  }
  return sent;
}

/**
 * Fatura do cartão próxima (3 dias antes do fechamento)
 * Cards table doesn't have a closingDay field in this schema - skip for now
 */
async function checkCardStatementDue(_userId: number): Promise<number> {
  // Cards table doesn't have a closingDay field in this schema
  // This notification type would need additional configuration per card
  // For now, return 0 - can be implemented when card closing day is added
  return 0;
}

/**
 * Job sem entrega registrada (7 dias após início sem entrega)
 * jobs.startDate is bigint (ms since epoch)
 */
async function checkJobWithoutDelivery(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoMs = sevenDaysAgo.getTime();

  const jobsInProgress = await db
    .select({ id: jobs.id, name: jobs.name })
    .from(jobs)
    .where(
      and(
        eq(jobs.userId, userId),
        eq(jobs.status, "in_progress"),
        lte(jobs.startDate, sevenDaysAgoMs)
      )
    );

  let sent = 0;
  for (const job of jobsInProgress) {
    // Check if job has any deliveries
    const deliveries = await db
      .select()
      .from(jobDeliveries)
      .where(eq(jobDeliveries.jobId, job.id))
      .limit(1);

    if (deliveries.length === 0) {
      await sendPushToUser(userId, {
        title: "📋 Job sem entrega registrada",
        body: `"${job.name}" está em andamento há mais de 7 dias sem nenhuma entrega registrada.`,
        url: "/jobs",
        tag: `job-no-delivery-${job.id}`,
      });
      sent++;
    }
  }
  return sent;
}

/**
 * Inadimplência (Job com pagamento atrasado)
 * jobPayments.dueDate is bigint (ms since epoch)
 */
async function checkOverduePayment(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const overdue = await db
    .select({ jobName: jobs.name, amount: jobPayments.amount, dueDate: jobPayments.dueDate })
    .from(jobPayments)
    .innerJoin(jobs, eq(jobPayments.jobId, jobs.id))
    .where(
      and(
        eq(jobs.userId, userId),
        eq(jobPayments.status, "pending"),
        lt(jobPayments.dueDate, todayMs)
      )
    );

  let sent = 0;
  if (overdue.length > 0) {
    const totalOverdue = overdue.reduce((sum, p) => sum + Number(p.amount), 0);
    await sendPushToUser(userId, {
      title: "🚨 Pagamentos atrasados",
      body: `Você tem ${overdue.length} pagamento(s) atrasado(s) totalizando R$ ${totalOverdue.toFixed(2)}. Hora de cobrar!`,
      url: "/jobs",
      tag: `overdue-payments`,
    });
    sent++;
  }
  return sent;
}

/**
 * Agenda do dia (todo dia com compromissos)
 * calendarEvents.startAt is bigint (ms since epoch)
 */
async function checkDailyAgenda(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

  const todayEvents = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startAt, todayStart),
        lte(calendarEvents.startAt, todayEnd)
      )
    );

  if (todayEvents.length > 0) {
    const eventNames = todayEvents.slice(0, 3).map(e => e.title).join(", ");
    const extra = todayEvents.length > 3 ? ` +${todayEvents.length - 3} mais` : "";
    await sendPushToUser(userId, {
      title: `📅 Agenda de hoje (${todayEvents.length} evento${todayEvents.length > 1 ? "s" : ""})`,
      body: `${eventNames}${extra}`,
      url: "/agenda",
      tag: `daily-agenda`,
    });
    return 1;
  }
  return 0;
}

/**
 * Alerta de IR (faturamento PJ se aproximando do limite MEI)
 * transactions.date is bigint (ms since epoch)
 */
async function checkIRAlert(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1).getTime();
  const now = Date.now();

  // Sum PJ income for the year
  const [result] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        eq(transactions.scope, "pj"),
        gte(transactions.date, startOfYear),
        lte(transactions.date, now)
      )
    );

  const totalPJ = Number(result?.total || 0);
  const meiLimit = 81000; // MEI annual limit
  const threshold = meiLimit * 0.8; // Alert at 80%

  if (totalPJ >= threshold && totalPJ < meiLimit) {
    await sendPushToUser(userId, {
      title: "⚠️ Alerta de Faturamento MEI",
      body: `Seu faturamento PJ está em R$ ${totalPJ.toFixed(2)} (${((totalPJ / meiLimit) * 100).toFixed(0)}% do limite MEI de R$ 81.000). Atenção ao planejamento tributário!`,
      url: "/ir",
      tag: `ir-alert-${currentYear}`,
    });
    return 1;
  }
  return 0;
}

/**
 * Resumo semanal (toda segunda de manhã)
 * transactions.date is bigint (ms since epoch)
 */
async function sendWeeklySummary(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Get income and expenses for the week
  const [incomeResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        gte(transactions.date, weekAgo),
        lte(transactions.date, now)
      )
    );

  const [expenseResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, weekAgo),
        lte(transactions.date, now)
      )
    );

  const income = Number(incomeResult?.total || 0);
  const expenses = Number(expenseResult?.total || 0);
  const balance = income - expenses;

  await sendPushToUser(userId, {
    title: "📊 Resumo da Semana",
    body: `Receitas: R$ ${income.toFixed(2)} | Despesas: R$ ${expenses.toFixed(2)} | Saldo: R$ ${balance.toFixed(2)}`,
    url: "/",
    tag: `weekly-summary`,
  });
  return 1;
}

/**
 * Check if goal was reached (called after transactions are created)
 */
export async function checkGoalReached(userId: number, currentMonthIncome: number) {
  const prefs = await getNotificationPreferences(userId);
  if (!prefs.goalReached) return;

  const db = await getDb();
  if (!db) return;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const monthGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.month, currentMonth),
        eq(goals.year, currentYear)
      )
    );

  for (const goal of monthGoals) {
    if (currentMonthIncome >= Number(goal.targetValue)) {
      await sendPushToUser(userId, {
        title: "🎉 Meta atingida!",
        body: `Parabéns! Você atingiu sua meta de R$ ${Number(goal.targetValue).toFixed(2)} para ${goal.title || "este mês"}!`,
        url: "/metas",
        tag: `goal-reached-${goal.id}`,
      });
    }
  }
}

/**
 * Check plan limit reaching (called when user creates items)
 */
export async function checkPlanLimit(userId: number, resource: string, currentCount: number, limit: number) {
  if (currentCount < limit * 0.8) return;

  const prefs = await getNotificationPreferences(userId);
  if (!prefs.planLimitReaching) return;

  const percentage = Math.round((currentCount / limit) * 100);
  await sendPushToUser(userId, {
    title: "⚡ Limite do plano chegando",
    body: `Você está usando ${percentage}% do limite de ${resource} do seu plano (${currentCount}/${limit}). Considere fazer upgrade!`,
    url: "/billing",
    tag: `plan-limit-${resource}`,
  });
}
