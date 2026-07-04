import { eq, and, gte, lte, lt, desc, sql, asc, isNull, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  cards, Card, InsertCard,
  categories, Category, InsertCategory,
  transactions, Transaction, InsertTransaction,
  taxReminders, TaxReminder, InsertTaxReminder,
  telegramSessions, InsertTelegramSession,
  workDays, WorkDay, InsertWorkDay,
  invoiceUploads, InvoiceUpload, InsertInvoiceUpload,
  emailReports, EmailReport, InsertEmailReport,
  cardStatements, CardStatement, InsertCardStatement,
  serviceInvoices, ServiceInvoice, InsertServiceInvoice,
  productInvoices, ProductInvoice, InsertProductInvoice,
  suppliers, Supplier, InsertSupplier,
  clients, Client, InsertClient,
  recurringIncome, RecurringIncome, InsertRecurringIncome,
  recurringExpenses, RecurringExpense, InsertRecurringExpense,
  jobs, Job, InsertJob,
  jobDeliveries, JobDelivery, InsertJobDelivery,
  jobCosts, JobCost, InsertJobCost,
  jobPayments, JobPayment, InsertJobPayment,
  categoryLearning, CategoryLearning, InsertCategoryLearning,
  assets, Asset, InsertAsset,
  accountantInvites, AccountantInvite, InsertAccountantInvite,
  partners, Partner, InsertPartner,
  cashBalance, CashBalance,
  cashMovements, CashMovement, InsertCashMovement,
  companyData, CompanyData,
  feedback, Feedback, InsertFeedback,
  calendarEvents, CalendarEvent, InsertCalendarEvent,
  quotations, Quotation, InsertQuotation,
  quotationItems, QuotationItem, InsertQuotationItem,
  telegramLinkingCodes,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(userId: number, newOpenId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ openId: newOpenId }).where(eq(users.id, userId));
}

// ========== CARDS ==========

export async function getAllCards(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(cards.isActive, true)];
  if (userId) conditions.push(eq(cards.userId, userId));
  return db.select().from(cards).where(and(...conditions)).orderBy(asc(cards.id));
}

export async function getCardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
  return result[0];
}

// ========== CATEGORIES ==========

export async function getAllCategories(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name));
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(data: { name: string; icon?: string; color?: string; userId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values({
    name: data.name,
    icon: data.icon || "tag",
    color: data.color || "#8b5cf6",
    isDefault: false,
    ...(data.userId ? { userId: data.userId } : {}),
  } as any);
  return result;
}

export async function updateCategory(id: number, data: { name?: string; icon?: string; color?: string }, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(categories.id, id)];
  if (userId) conditions.push(eq(categories.userId, userId));
  await db.update(categories).set(data).where(and(...conditions));
}

export async function deleteCategory(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(categories.id, id), eq(categories.isDefault, false)];
  if (userId) conditions.push(eq(categories.userId, userId));
  await db.delete(categories).where(and(...conditions));
}

// ========== TRANSACTIONS ==========

export async function getTransactions(filters?: {
  userId?: number;
  scope?: "pj" | "pf";
  cardId?: number;
  categoryId?: number;
  startDate?: number;
  endDate?: number;
  type?: "income" | "expense";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (filters?.userId) conditions.push(eq(transactions.userId, filters.userId));
  if (filters?.scope) conditions.push(eq(transactions.scope, filters.scope));
  if (filters?.cardId) conditions.push(eq(transactions.cardId, filters.cardId));
  if (filters?.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters?.type) conditions.push(eq(transactions.type, filters.type));
  if (filters?.startDate) conditions.push(gte(transactions.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(transactions.date, filters.endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.date))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0),
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(whereClause),
  ]);

  return { items, total: countResult[0]?.count || 0 };
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(data);
  return result;
}

export async function updateTransaction(id: number, data: Partial<InsertTransaction>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(transactions.id, id)];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db.update(transactions).set(data).where(and(...conditions));
}

export async function deleteTransaction(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(transactions.id, id)];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db.delete(transactions).where(and(...conditions));
}

// ========== DASHBOARD AGGREGATES ==========

export async function getDashboardData(startDate: number, endDate: number, userId?: number) {
  const db = await getDb();
  if (!db) return { byScope: [], byCard: [], byCategory: [], totals: { income: 0, expense: 0 }, jobTotals: { income: 0, expense: 0, pendingIncome: 0, pendingExpense: 0 } };

  const userFilter = userId ? eq(transactions.userId, userId) : undefined;
  const dateFilter = and(gte(transactions.date, startDate), lte(transactions.date, endDate), userFilter);

  const [byScope, byCard, byCategory, totals] = await Promise.all([
    db.select({
      scope: transactions.scope,
      type: transactions.type,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    }).from(transactions).where(dateFilter).groupBy(transactions.scope, transactions.type),

    db.select({
      cardId: transactions.cardId,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(transactions).where(and(dateFilter, eq(transactions.type, "expense"))).groupBy(transactions.cardId),

    db.select({
      categoryId: transactions.categoryId,
      scope: transactions.scope,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      count: sql<number>`count(*)`,
    }).from(transactions).where(and(dateFilter, eq(transactions.type, "expense"))).groupBy(transactions.categoryId, transactions.scope),

    db.select({
      type: transactions.type,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    }).from(transactions).where(dateFilter).groupBy(transactions.type),
  ]);

  // Job payments: received in this month (receivedAt in range) OR pending with dueDate in range
  // Filter by joining with jobs table which has userId
  const jobUserFilter = userId ? eq(jobs.userId, userId) : undefined;
  const jobPaymentsReceived = await db.select({
    total: sql<string>`COALESCE(SUM(${jobPayments.amount}), 0)`,
  }).from(jobPayments).innerJoin(jobs, eq(jobPayments.jobId, jobs.id)).where(
    and(
      eq(jobPayments.status, "received"),
      gte(jobPayments.receivedAt, startDate),
      lte(jobPayments.receivedAt, endDate),
      jobUserFilter
    )
  );
  const jobPaymentsPending = await db.select({
    total: sql<string>`COALESCE(SUM(${jobPayments.amount}), 0)`,
  }).from(jobPayments).innerJoin(jobs, eq(jobPayments.jobId, jobs.id)).where(
    and(
      eq(jobPayments.status, "pending"),
      gte(jobPayments.dueDate, startDate),
      lte(jobPayments.dueDate, endDate),
      jobUserFilter
    )
  );

  // Job costs: paid in this month (paidAt in range) OR pending with createdAt in range
  // Exclude costs with paymentSource=card (those will appear via card statement transactions)
  const jobCostsPaid = await db.select({
    total: sql<string>`COALESCE(SUM(${jobCosts.amount}), 0)`,
  }).from(jobCosts).innerJoin(jobs, eq(jobCosts.jobId, jobs.id)).where(
    and(
      eq(jobCosts.status, "paid"),
      gte(jobCosts.paidAt, startDate),
      lte(jobCosts.paidAt, endDate),
      sql`${jobCosts.paymentSource} != 'card'`,
      jobUserFilter
    )
  );
  const jobCostsPending = await db.select({
    total: sql<string>`COALESCE(SUM(${jobCosts.amount}), 0)`,
  }).from(jobCosts).innerJoin(jobs, eq(jobCosts.jobId, jobs.id)).where(
    and(
      eq(jobCosts.status, "pending"),
      gte(sql`UNIX_TIMESTAMP(${jobCosts.createdAt}) * 1000`, startDate),
      lte(sql`UNIX_TIMESTAMP(${jobCosts.createdAt}) * 1000`, endDate),
      sql`${jobCosts.paymentSource} != 'card'`,
      jobUserFilter
    )
  );

  const jobIncomeReceived = parseFloat(String(jobPaymentsReceived[0]?.total || "0"));
  const jobIncomePending = parseFloat(String(jobPaymentsPending[0]?.total || "0"));
  const jobExpensePaid = parseFloat(String(jobCostsPaid[0]?.total || "0"));
  const jobExpensePending = parseFloat(String(jobCostsPending[0]?.total || "0"));

  const totalIncome = totals.find(t => t.type === "income")?.total || "0";
  const totalExpense = totals.find(t => t.type === "expense")?.total || "0";

  return {
    byScope, byCard, byCategory,
    totals: { income: parseFloat(totalIncome), expense: parseFloat(totalExpense) },
    jobTotals: {
      income: jobIncomeReceived,
      expense: jobExpensePaid,
      pendingIncome: jobIncomePending,
      pendingExpense: jobExpensePending,
    },
  };
}

export async function getCardCategoryBreakdown(cardId: number, startDate: number, endDate: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(transactions.cardId, cardId),
    eq(transactions.type, "expense"),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
  ];
  if (userId) conditions.push(eq(transactions.userId, userId));
  const results = await db.select({
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    categoryIcon: categories.icon,
    categoryColor: categories.color,
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    count: sql<number>`COUNT(*)`,
  })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .groupBy(transactions.categoryId, categories.name, categories.icon, categories.color)
    .orderBy(sql`SUM(${transactions.amount}) DESC`);
  // Calculate percentages
  const grandTotal = results.reduce((sum, r) => sum + parseFloat(String(r.total)), 0);
  return results.map(r => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName || "Sem categoria",
    categoryIcon: r.categoryIcon || "tag",
    categoryColor: r.categoryColor || "#6b7280",
    total: parseFloat(String(r.total)),
    count: r.count,
    percentage: grandTotal > 0 ? Math.round((parseFloat(String(r.total)) / grandTotal) * 100) : 0,
  }));
}

export async function getMonthlyTrend(months: number = 6, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).getTime();
  
  const userCondition = userId ? sql` AND ${transactions.userId} = ${userId}` : sql``;
  const rows = await db.execute(
    sql`SELECT 
      DATE_FORMAT(FROM_UNIXTIME(${transactions.date} / 1000), '%Y-%m') as month,
      ${transactions.type} as type,
      ${transactions.scope} as scope,
      COALESCE(SUM(${transactions.amount}), 0) as total
    FROM ${transactions}
    WHERE ${transactions.date} >= ${startDate}${userCondition}
    GROUP BY month, ${transactions.type}, ${transactions.scope}
    ORDER BY month`
  );
  
  const result = (rows as any)[0] || rows;
  const data: Array<{ month: string; type: string; scope: string; total: number }> = (Array.isArray(result) ? result : []).map((row: any) => ({
    month: String(row.month || ''),
    type: String(row.type || ''),
    scope: String(row.scope || ''),
    total: parseFloat(String(row.total || 0)),
  }));

  // Include job payments received (by receivedAt) as PJ income
  const jobUserCondition = userId ? sql` AND ${jobs.userId} = ${userId}` : sql``;
  const jpRows = await db.execute(
    sql`SELECT 
      DATE_FORMAT(FROM_UNIXTIME(${jobPayments.receivedAt} / 1000), '%Y-%m') as month,
      COALESCE(SUM(${jobPayments.amount}), 0) as total
    FROM ${jobPayments}
    INNER JOIN ${jobs} ON ${jobPayments.jobId} = ${jobs.id}
    WHERE ${jobPayments.status} = 'received'
      AND ${jobPayments.receivedAt} >= ${startDate}${jobUserCondition}
    GROUP BY month
    ORDER BY month`
  );
  const jpResult = (jpRows as any)[0] || jpRows;
  for (const row of (Array.isArray(jpResult) ? jpResult : [])) {
    const month = String(row.month || '');
    const total = parseFloat(String(row.total || 0));
    if (month && total > 0) {
      data.push({ month, type: 'income', scope: 'pj', total });
    }
  }

  // Include job costs paid (by paidAt) as PJ expense (exclude card-source)
  const jcRows = await db.execute(
    sql`SELECT 
      DATE_FORMAT(FROM_UNIXTIME(${jobCosts.paidAt} / 1000), '%Y-%m') as month,
      COALESCE(SUM(${jobCosts.amount}), 0) as total
    FROM ${jobCosts}
    INNER JOIN ${jobs} ON ${jobCosts.jobId} = ${jobs.id}
    WHERE ${jobCosts.status} = 'paid'
      AND ${jobCosts.paymentSource} != 'card'
      AND ${jobCosts.paidAt} >= ${startDate}${jobUserCondition}
    GROUP BY month
    ORDER BY month`
  );
  const jcResult = (jcRows as any)[0] || jcRows;
  for (const row of (Array.isArray(jcResult) ? jcResult : [])) {
    const month = String(row.month || '');
    const total = parseFloat(String(row.total || 0));
    if (month && total > 0) {
      data.push({ month, type: 'expense', scope: 'pj', total });
    }
  }

  return data;
}

// ========== YEARLY SUMMARY ==========

export async function getYearlySummary(year: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, 0, 1).getTime();
  const endDate = new Date(year, 11, 31, 23, 59, 59).getTime();
  
  // Regular transactions
  const userCondition = userId ? sql` AND ${transactions.userId} = ${userId}` : sql``;
  const rows = await db.execute(
    sql`SELECT 
      DATE_FORMAT(FROM_UNIXTIME(${transactions.date} / 1000), '%Y-%m') as month,
      ${transactions.type} as type,
      COALESCE(SUM(${transactions.amount}), 0) as total
    FROM ${transactions}
    WHERE ${transactions.date} >= ${startDate} AND ${transactions.date} <= ${endDate}${userCondition}
    GROUP BY month, ${transactions.type}
    ORDER BY month`
  );
  
  const result = (rows as any)[0] || rows;
  const data: Array<{ month: string; type: string; total: number }> = (Array.isArray(result) ? result : []).map((row: any) => ({
    month: String(row.month || ''),
    type: String(row.type || ''),
    total: parseFloat(String(row.total || 0)),
  }));

  // Job payments received (by receivedAt date) - add as income
  const jobUserCondition = userId ? sql` AND ${jobs.userId} = ${userId}` : sql``;
  const jobPaymentsReceivedRows = await db.execute(
    sql`SELECT 
      DATE_FORMAT(FROM_UNIXTIME(${jobPayments.receivedAt} / 1000), '%Y-%m') as month,
      COALESCE(SUM(${jobPayments.amount}), 0) as total
    FROM ${jobPayments}
    INNER JOIN ${jobs} ON ${jobPayments.jobId} = ${jobs.id}
    WHERE ${jobPayments.status} = 'received'
      AND ${jobPayments.receivedAt} >= ${startDate}
      AND ${jobPayments.receivedAt} <= ${endDate}${jobUserCondition}
    GROUP BY month
    ORDER BY month`
  );
  const jpResult = (jobPaymentsReceivedRows as any)[0] || jobPaymentsReceivedRows;
  const jpData = Array.isArray(jpResult) ? jpResult : [];
  for (const row of jpData) {
    const month = String(row.month || '');
    const total = parseFloat(String(row.total || 0));
    if (month && total > 0) {
      data.push({ month, type: 'income', total });
    }
  }

  // Job costs paid (by paidAt date) - add as expense
  // Exclude costs with paymentSource=card (those come via card statement transactions)
  const jobCostsPaidRows = await db.execute(
    sql`SELECT 
      DATE_FORMAT(FROM_UNIXTIME(${jobCosts.paidAt} / 1000), '%Y-%m') as month,
      COALESCE(SUM(${jobCosts.amount}), 0) as total
    FROM ${jobCosts}
    INNER JOIN ${jobs} ON ${jobCosts.jobId} = ${jobs.id}
    WHERE ${jobCosts.status} = 'paid'
      AND ${jobCosts.paymentSource} != 'card'
      AND ${jobCosts.paidAt} >= ${startDate}
      AND ${jobCosts.paidAt} <= ${endDate}${jobUserCondition}
    GROUP BY month
    ORDER BY month`
  );
  const jcResult = (jobCostsPaidRows as any)[0] || jobCostsPaidRows;
  const jcData = Array.isArray(jcResult) ? jcResult : [];
  for (const row of jcData) {
    const month = String(row.month || '');
    const total = parseFloat(String(row.total || 0));
    if (month && total > 0) {
      data.push({ month, type: 'expense', total });
    }
  }

  return data;
}

// ========== RECURRING PROJECTIONS ==========

export async function getRecurringProjections(year: number, userId?: number) {
  const incomes = await getRecurringIncome(true, userId);
  const expenses = await getRecurringExpenses(true, userId);
  
  // Also get pending job payments for this year
  const db = await getDb();
  const jobUserFilter = userId ? eq(jobs.userId, userId) : undefined;
  const pendingJobPaymentsList = db ? await db.select({ amount: jobPayments.amount, dueDate: jobPayments.dueDate }).from(jobPayments)
    .innerJoin(jobs, eq(jobPayments.jobId, jobs.id))
    .where(
      and(
        eq(jobPayments.status, 'pending'),
        gte(jobPayments.dueDate, new Date(year, 0, 1).getTime()),
        lte(jobPayments.dueDate, new Date(year, 11, 31, 23, 59, 59).getTime()),
        jobUserFilter
      )
    ) : [];
  
  const projections: Array<{ month: string; type: 'income' | 'expense'; total: number; isProjected: boolean; source?: string }> = [];
  
  for (let m = 0; m < 12; m++) {
    const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
    const monthStart = new Date(year, m, 1).getTime();
    const monthEnd = new Date(year, m + 1, 0, 23, 59, 59).getTime();
    
    let projectedIncome = 0;
    
    // Recurring income projections
    for (const inc of incomes) {
      if (inc.startDate > monthEnd) continue;
      if (inc.endDate && inc.endDate < monthStart) continue;
      
      const freq = inc.frequency;
      const startMonth = new Date(inc.startDate).getMonth();
      const startYear = new Date(inc.startDate).getFullYear();
      const diffMonths = (year - startYear) * 12 + (m - startMonth);
      
      if (diffMonths < 0) continue;
      
      let matches = false;
      if (freq === 'monthly') matches = true;
      else if (freq === 'quarterly') matches = diffMonths % 3 === 0;
      else if (freq === 'semiannual') matches = diffMonths % 6 === 0;
      else if (freq === 'annual') matches = diffMonths % 12 === 0;
      
      if (matches) projectedIncome += parseFloat(String(inc.amount));
    }
    
    if (projectedIncome > 0) {
      projections.push({ month: monthStr, type: 'income', total: projectedIncome, isProjected: true, source: 'recurring' });
    }
    
    // Recurring expense projections
    let projectedExpense = 0;
    for (const exp of expenses) {
      if (exp.startDate > monthEnd) continue;
      if (exp.endDate && exp.endDate < monthStart) continue;
      
      const freq = exp.frequency;
      const startMonth = new Date(exp.startDate).getMonth();
      const startYear = new Date(exp.startDate).getFullYear();
      const diffMonths = (year - startYear) * 12 + (m - startMonth);
      
      if (diffMonths < 0) continue;
      
      let matches = false;
      if (freq === 'monthly') matches = true;
      else if (freq === 'quarterly') matches = diffMonths % 3 === 0;
      else if (freq === 'semiannual') matches = diffMonths % 6 === 0;
      else if (freq === 'annual') matches = diffMonths % 12 === 0;
      
      if (matches) projectedExpense += parseFloat(String(exp.amount));
    }
    
    if (projectedExpense > 0) {
      projections.push({ month: monthStr, type: 'expense', total: projectedExpense, isProjected: true, source: 'recurring' });
    }
    
    // Pending job payments projections
    let jobPaymentsTotal = 0;
    for (const jp of pendingJobPaymentsList) {
      if (jp.dueDate >= monthStart && jp.dueDate <= monthEnd) {
        jobPaymentsTotal += parseFloat(String(jp.amount));
      }
    }
    
    if (jobPaymentsTotal > 0) {
      projections.push({ month: monthStr, type: 'income', total: jobPaymentsTotal, isProjected: true, source: 'jobs' });
    }
  }
  
  return projections;
}

// ========== TAX REMINDERS ==========

export async function getAllTaxReminders(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(taxReminders.isActive, true)];
  if (userId) conditions.push(eq(taxReminders.userId, userId));
  return db.select().from(taxReminders).where(and(...conditions)).orderBy(asc(taxReminders.dueDay));
}

export async function updateTaxReminderNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(taxReminders).set({ lastNotified: Date.now() }).where(eq(taxReminders.id, id));
}

// ========== TELEGRAM SESSIONS ==========

export async function upsertTelegramSession(data: { chatId: string; username?: string; firstName?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(telegramSessions).values({
    chatId: data.chatId,
    username: data.username || null,
    firstName: data.firstName || null,
  }).onDuplicateKeyUpdate({
    set: { username: data.username || null, firstName: data.firstName || null },
  });
}

export async function getActiveTelegramSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(telegramSessions).where(eq(telegramSessions.isActive, true));
}

// ========== TELEGRAM LINKING ==========

export async function createTelegramLinkingCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Generate 6-char alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Expire in 5 minutes
  const expiresAt = Date.now() + 5 * 60 * 1000;
  await db.insert(telegramLinkingCodes).values({ userId, code, expiresAt });
  return code;
}

export async function consumeTelegramLinkingCode(code: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(telegramLinkingCodes)
    .where(and(eq(telegramLinkingCodes.code, code.toUpperCase()), eq(telegramLinkingCodes.used, false)));
  if (!row) return null;
  if (row.expiresAt < Date.now()) return null; // expired
  // Mark as used
  await db.update(telegramLinkingCodes).set({ used: true }).where(eq(telegramLinkingCodes.id, row.id));
  return row.userId;
}

export async function linkTelegramToUser(chatId: string, userId: number, username?: string, firstName?: string) {
  const db = await getDb();
  if (!db) return;
  // Update telegramSessions to set the userId
  await db.insert(telegramSessions).values({
    chatId, userId, username: username || null, firstName: firstName || null,
  }).onDuplicateKeyUpdate({
    set: { userId, username: username || null, firstName: firstName || null },
  });
  // Also update user's telegramChatId field
  await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
}

export async function unlinkTelegram(chatId: string) {
  const db = await getDb();
  if (!db) return;
  // Get the session to find userId
  const [session] = await db.select().from(telegramSessions).where(eq(telegramSessions.chatId, chatId));
  if (session && session.userId) {
    await db.update(users).set({ telegramChatId: null }).where(eq(users.id, session.userId));
  }
  // Remove session or set userId to null
  await db.delete(telegramSessions).where(eq(telegramSessions.chatId, chatId));
}

export async function getUserIdByChatId(chatId: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [session] = await db.select().from(telegramSessions)
    .where(and(eq(telegramSessions.chatId, chatId), eq(telegramSessions.isActive, true)));
  return session?.userId || null;
}

export async function getTelegramStatusByUserId(userId: number): Promise<{ connected: boolean; chatId?: string; username?: string }> {
  const db = await getDb();
  if (!db) return { connected: false };
  const [session] = await db.select().from(telegramSessions)
    .where(and(eq(telegramSessions.userId, userId), eq(telegramSessions.isActive, true)));
  if (session) return { connected: true, chatId: session.chatId, username: session.username || undefined };
  return { connected: false };
}

export async function findCategoryByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories)
    .where(sql`LOWER(${categories.name}) = LOWER(${name})`)
    .limit(1);
  return result[0];
}

export async function findCardByType(type: "pj" | "pf") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cards).where(and(eq(cards.type, type), eq(cards.isActive, true)));
}

// ========== WORK DAYS (DIÁRIAS) ==========

export async function createWorkDay(data: InsertWorkDay) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workDays).values(data);
  return result;
}

export async function getWorkDays(filters?: { userId?: number; clientName?: string; month?: number; year?: number }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(workDays.userId, filters.userId));

  if (filters?.clientName) {
    conditions.push(sql`LOWER(${workDays.clientName}) LIKE LOWER(${`%${filters.clientName}%`})`);
  }

  if (filters?.month && filters?.year) {
    const start = new Date(filters.year, filters.month - 1, 1).getTime();
    const end = new Date(filters.year, filters.month, 0, 23, 59, 59).getTime();
    conditions.push(and(gte(workDays.date, start), lte(workDays.date, end)));
  } else if (filters?.year && !filters?.month) {
    const start = new Date(filters.year, 0, 1).getTime();
    const end = new Date(filters.year, 11, 31, 23, 59, 59).getTime();
    conditions.push(and(gte(workDays.date, start), lte(workDays.date, end)));
  }

  let query: any = db.select().from(workDays);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query.orderBy(desc(workDays.date));
}

export async function updateWorkDay(id: number, data: Partial<InsertWorkDay>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(workDays.id, id)];
  if (userId) conditions.push(eq(workDays.userId, userId));
  return db.update(workDays).set(data).where(and(...conditions));
}

export async function deleteWorkDay(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(workDays.id, id)];
  if (userId) conditions.push(eq(workDays.userId, userId));
  return db.delete(workDays).where(and(...conditions));
}

export async function getWorkDaysSummary(startDate: number, endDate: number, userId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, count: 0, byClient: [] };

  const conditions: any[] = [gte(workDays.date, startDate), lte(workDays.date, endDate)];
  if (userId) conditions.push(eq(workDays.userId, userId));

  const data = await db.select({
    clientName: workDays.clientName,
    total: sql<string>`SUM(${workDays.dailyRate})`,
    count: sql<number>`COUNT(*)`,
  })
    .from(workDays)
    .where(and(...conditions))
    .groupBy(workDays.clientName);

  const total = data.reduce((sum, row) => sum + parseFloat(String(row.total || 0)), 0);
  const count = data.reduce((sum, row) => sum + (row.count || 0), 0);

  return { total, count, byClient: data };
}

export async function getWorkDayContractors(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const data = await db.select({
    clientName: workDays.clientName,
    total: sql<string>`SUM(${workDays.dailyRate})`,
    count: sql<number>`COUNT(*)`,
    lastDate: sql<number>`MAX(${workDays.date})`,
  })
    .from(workDays)
    .where(eq(workDays.userId, userId))
    .groupBy(workDays.clientName)
    .orderBy(sql`MAX(${workDays.date}) DESC`);
  return data;
}

// ========== INVOICE UPLOADS (FATURAS) ==========

export async function createInvoiceUpload(data: InsertInvoiceUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoiceUploads).values(data);
  return result;
}

export async function getInvoiceUploads(filters?: { userId?: number; status?: string; cardId?: number }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(invoiceUploads.userId, filters.userId));

  if (filters?.status) {
    conditions.push(eq(invoiceUploads.status, filters.status as any));
  }

  if (filters?.cardId) {
    conditions.push(eq(invoiceUploads.cardId, filters.cardId));
  }

  let query: any = db.select().from(invoiceUploads);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query.orderBy(desc(invoiceUploads.uploadedAt));
}

export async function updateInvoiceUpload(id: number, data: Partial<InsertInvoiceUpload>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(invoiceUploads.id, id)];
  if (userId) conditions.push(eq(invoiceUploads.userId, userId));
  return db.update(invoiceUploads).set(data).where(and(...conditions));
}

export async function getInvoiceUploadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoiceUploads).where(eq(invoiceUploads.id, id)).limit(1);
  return result[0];
}

// ========== EMAIL REPORTS ==========

export async function createEmailReport(data: InsertEmailReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(emailReports).values(data);
}

export async function getEmailReports(activeOnly = true, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (activeOnly) conditions.push(eq(emailReports.isActive, true));
  if (userId) conditions.push(eq(emailReports.userId, userId));
  if (conditions.length > 0) return db.select().from(emailReports).where(and(...conditions));
  return db.select().from(emailReports);
}

export async function updateEmailReport(id: number, data: Partial<InsertEmailReport>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(emailReports.id, id)];
  if (userId) conditions.push(eq(emailReports.userId, userId));
  return db.update(emailReports).set(data).where(and(...conditions));
}

export async function deleteEmailReport(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(emailReports.id, id)];
  if (userId) conditions.push(eq(emailReports.userId, userId));
  return db.delete(emailReports).where(and(...conditions));
}

export async function getEmailReportByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailReports).where(eq(emailReports.email, email)).limit(1);
  return result[0];
}


// ========== CARD STATEMENTS ==========

export async function createCardStatement(data: InsertCardStatement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(cardStatements).values(data);
}

export async function getCardStatements(filters?: { userId?: number; cardId?: number; month?: number; year?: number }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(cardStatements.userId, filters.userId));
  if (filters?.cardId) conditions.push(eq(cardStatements.cardId, filters.cardId));
  if (filters?.month) conditions.push(eq(cardStatements.month, filters.month));
  if (filters?.year) conditions.push(eq(cardStatements.year, filters.year));

  let query: any = db.select().from(cardStatements);
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(desc(cardStatements.uploadedAt));
}

export async function updateCardStatement(id: number, data: Partial<InsertCardStatement>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(cardStatements.id, id)];
  if (userId) conditions.push(eq(cardStatements.userId, userId));
  return db.update(cardStatements).set(data).where(and(...conditions));
}

// ========== SERVICE INVOICES ==========

export async function createServiceInvoice(data: InsertServiceInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(serviceInvoices).values(data);
}

export async function getServiceInvoices(filters?: { userId?: number; supplierId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(serviceInvoices.userId, filters.userId));
  if (filters?.supplierId) conditions.push(eq(serviceInvoices.supplierId, filters.supplierId));
  if (filters?.status) conditions.push(eq(serviceInvoices.status, filters.status as any));

  let query: any = db.select().from(serviceInvoices);
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(desc(serviceInvoices.uploadedAt));
}

export async function updateServiceInvoice(id: number, data: Partial<InsertServiceInvoice>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(serviceInvoices.id, id)];
  if (userId) conditions.push(eq(serviceInvoices.userId, userId));
  return db.update(serviceInvoices).set(data).where(and(...conditions));
}

// ========== PRODUCT INVOICES ==========

export async function createProductInvoice(data: InsertProductInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(productInvoices).values(data);
}

export async function getProductInvoices(filters?: { userId?: number; supplierId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(productInvoices.userId, filters.userId));
  if (filters?.supplierId) conditions.push(eq(productInvoices.supplierId, filters.supplierId));
  if (filters?.status) conditions.push(eq(productInvoices.status, filters.status as any));

  let query: any = db.select().from(productInvoices);
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(desc(productInvoices.uploadedAt));
}

export async function updateProductInvoice(id: number, data: Partial<InsertProductInvoice>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(productInvoices.id, id)];
  if (userId) conditions.push(eq(productInvoices.userId, userId));
  return db.update(productInvoices).set(data).where(and(...conditions));
}

// ========== SUPPLIERS ==========

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(suppliers).values(data);
}

export async function getSuppliers(activeOnly = true, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (activeOnly) conditions.push(eq(suppliers.isActive, true));
  if (userId) conditions.push(eq(suppliers.userId, userId));
  if (conditions.length > 0) return db.select().from(suppliers).where(and(...conditions)).orderBy(asc(suppliers.companyName));
  return db.select().from(suppliers).orderBy(asc(suppliers.companyName));
}

export async function searchSuppliers(query: string, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(suppliers.isActive, true), like(suppliers.companyName, `%${query}%`)];
  if (userId) conditions.push(eq(suppliers.userId, userId));
  return db.select().from(suppliers)
    .where(and(...conditions))
    .orderBy(asc(suppliers.companyName))
    .limit(10);
}

export async function getSupplierByCnpj(cnpj: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.cnpj, cnpj)).limit(1);
  return result[0];
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(suppliers.id, id)];
  if (userId) conditions.push(eq(suppliers.userId, userId));
  return db.update(suppliers).set(data).where(and(...conditions));
}

// ========== CLIENTS ==========

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(clients).values(data);
}

export async function getClients(activeOnly = true, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (activeOnly) conditions.push(eq(clients.isActive, true));
  if (userId) conditions.push(eq(clients.userId, userId));
  if (conditions.length > 0) return db.select().from(clients).where(and(...conditions)).orderBy(asc(clients.companyName));
  return db.select().from(clients).orderBy(asc(clients.companyName));
}

export async function getClientByCnpj(cnpj: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.cnpj, cnpj)).limit(1);
  return result[0];
}

export async function searchClients(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients)
    .where(and(eq(clients.userId, userId), sql`LOWER(${clients.companyName}) LIKE LOWER(${`%${query}%`})`))
    .orderBy(asc(clients.companyName))
    .limit(10);
}

export async function updateClient(id: number, data: Partial<InsertClient>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(clients.id, id)];
  if (userId) conditions.push(eq(clients.userId, userId));
  return db.update(clients).set(data).where(and(...conditions));
}

// ========== RECURRING INCOME ==========

export async function createRecurringIncome(data: InsertRecurringIncome) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nextOccurrence = data.startDate || Date.now();
  const result = await db.insert(recurringIncome).values({ ...data, nextOccurrence });
  // mysql2 returns [ResultSetHeader, ...] where ResultSetHeader has insertId
  const insertId = (result as any)[0]?.insertId;
  return { insertId };
}

export async function getRecurringIncome(activeOnly = true, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (activeOnly) conditions.push(eq(recurringIncome.isActive, true));
  if (userId) conditions.push(eq(recurringIncome.userId, userId));
  if (conditions.length > 0) return db.select().from(recurringIncome).where(and(...conditions)).orderBy(asc(recurringIncome.nextOccurrence));
  return db.select().from(recurringIncome).orderBy(asc(recurringIncome.nextOccurrence));
}

export async function getRecurringIncomeByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recurringIncome).where(eq(recurringIncome.clientId, clientId));
}

export async function updateRecurringIncome(id: number, data: Partial<InsertRecurringIncome>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(recurringIncome.id, id)];
  if (userId) conditions.push(eq(recurringIncome.userId, userId));
  return db.update(recurringIncome).set(data).where(and(...conditions));
}

export async function deleteRecurringIncome(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(recurringIncome.id, id)];
  if (userId) conditions.push(eq(recurringIncome.userId, userId));
  return db.delete(recurringIncome).where(and(...conditions));
}

// ========== RECURRING EXPENSES ==========

export async function createRecurringExpense(data: InsertRecurringExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nextOccurrence = data.startDate || Date.now();
  const result = await db.insert(recurringExpenses).values({ ...data, nextOccurrence });
  const insertId = (result as any)[0]?.insertId;
  return { insertId };
}

export async function getRecurringExpenses(activeOnly = true, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (activeOnly) conditions.push(eq(recurringExpenses.isActive, true));
  if (userId) conditions.push(eq(recurringExpenses.userId, userId));
  if (conditions.length > 0) return db.select().from(recurringExpenses).where(and(...conditions)).orderBy(asc(recurringExpenses.nextOccurrence));
  return db.select().from(recurringExpenses).orderBy(asc(recurringExpenses.nextOccurrence));
}

export async function getRecurringExpensesBySupplier(supplierId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recurringExpenses).where(eq(recurringExpenses.supplierId, supplierId));
}

export async function updateRecurringExpense(id: number, data: Partial<InsertRecurringExpense>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(recurringExpenses.id, id)];
  if (userId) conditions.push(eq(recurringExpenses.userId, userId));
  return db.update(recurringExpenses).set(data).where(and(...conditions));
}

export async function deleteRecurringExpense(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(recurringExpenses.id, id)];
  if (userId) conditions.push(eq(recurringExpenses.userId, userId));
  return db.delete(recurringExpenses).where(and(...conditions));
}

// ========== UTILITY FUNCTIONS ==========

export async function getUpcomingRecurrences(daysAhead = 7, userId?: number) {
  const db = await getDb();
  if (!db) return { income: [], expenses: [] };

  const now = Date.now();
  const future = now + daysAhead * 24 * 60 * 60 * 1000;

  const incomeConditions: any[] = [eq(recurringIncome.isActive, true), gte(recurringIncome.nextOccurrence, now), lte(recurringIncome.nextOccurrence, future)];
  const expenseConditions: any[] = [eq(recurringExpenses.isActive, true), gte(recurringExpenses.nextOccurrence, now), lte(recurringExpenses.nextOccurrence, future)];
  if (userId) { incomeConditions.push(eq(recurringIncome.userId, userId)); expenseConditions.push(eq(recurringExpenses.userId, userId)); }

  const [income, expenses] = await Promise.all([
    db.select().from(recurringIncome).where(and(...incomeConditions)),
    db.select().from(recurringExpenses).where(and(...expenseConditions)),
  ]);

  return { income, expenses };
}

// ========== GENERATE TRANSACTIONS FROM RECURRENCES ==========

function getMonthsBetween(startDate: number, endDate: number | null | undefined, frequency: string): number[] {
  const timestamps: number[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getFullYear() + 2, 11, 31); // default: 2 years ahead

  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  const stepMonths = frequency === "monthly" ? 1
    : frequency === "quarterly" ? 3
    : frequency === "semiannual" ? 6
    : 12; // annual

  while (current <= end) {
    timestamps.push(current.getTime());
    current = new Date(current.getFullYear(), current.getMonth() + stepMonths, current.getDate());
  }

  return timestamps;
}

export async function generateTransactionsFromRecurringIncome(recurringId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the recurring income record
  const [rec] = await db.select().from(recurringIncome).where(eq(recurringIncome.id, recurringId));
  if (!rec) throw new Error("Recurring income not found");

  // Delete existing transactions generated from this recurrence
  await db.delete(transactions).where(eq(transactions.recurringIncomeId, recurringId));

  // Generate transactions for each occurrence
  const months = getMonthsBetween(rec.startDate, rec.endDate, rec.frequency);
  const dayOfMonth = rec.dayOfMonth || 1;

  const txValues = months.map((ts) => {
    const d = new Date(ts);
    const txDate = new Date(d.getFullYear(), d.getMonth(), Math.min(dayOfMonth, 28));
    return {
      description: `${rec.description} (recorrente)`,
      amount: rec.amount,
      type: "income" as const,
      scope: "pj" as const,
      source: "recurring" as const,
      recurringIncomeId: recurringId,
      userId: rec.userId,
      date: txDate.getTime(),
    };
  });

  if (txValues.length > 0) {
    // Insert in batches of 50 to avoid query limits
    for (let i = 0; i < txValues.length; i += 50) {
      const batch = txValues.slice(i, i + 50);
      await db.insert(transactions).values(batch as any);
    }
  }

  return { generated: txValues.length };
}

export async function generateTransactionsFromRecurringExpense(recurringId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the recurring expense record
  const [rec] = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, recurringId));
  if (!rec) throw new Error("Recurring expense not found");

  // Delete existing transactions generated from this recurrence
  await db.delete(transactions).where(eq(transactions.recurringExpenseId, recurringId));

  // Generate transactions for each occurrence
  const months = getMonthsBetween(rec.startDate, rec.endDate, rec.frequency);
  const dayOfMonth = rec.dayOfMonth || 1;

  const txValues = months.map((ts) => {
    const d = new Date(ts);
    const txDate = new Date(d.getFullYear(), d.getMonth(), Math.min(dayOfMonth, 28));
    return {
      description: `${rec.description} (recorrente)`,
      amount: rec.amount,
      type: "expense" as const,
      scope: "pj" as const,
      source: "recurring" as const,
      recurringExpenseId: recurringId,
      categoryId: rec.categoryId,
      userId: rec.userId,
      date: txDate.getTime(),
    };
  });

  if (txValues.length > 0) {
    for (let i = 0; i < txValues.length; i += 50) {
      const batch = txValues.slice(i, i + 50);
      await db.insert(transactions).values(batch as any);
    }
  }

  return { generated: txValues.length };
}

export async function deleteTransactionsFromRecurringIncome(recurringId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(transactions).where(eq(transactions.recurringIncomeId, recurringId));
}

export async function deleteTransactionsFromRecurringExpense(recurringId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(transactions).where(eq(transactions.recurringExpenseId, recurringId));
}

// ==================== JOBS ====================

export async function getJobs(filters?: { userId?: number; status?: string; clientId?: number; startDate?: number; endDate?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(jobs.userId, filters.userId));
  if (filters?.status) conditions.push(eq(jobs.status, filters.status as any));
  if (filters?.clientId) conditions.push(eq(jobs.clientId, filters.clientId));
  if (filters?.startDate) conditions.push(sql`${jobs.startDate} >= ${filters.startDate}`);
  if (filters?.endDate) conditions.push(sql`${jobs.endDate} <= ${filters.endDate}`);

  const rows = await db.select({
    id: jobs.id,
    name: jobs.name,
    clientId: jobs.clientId,
    clientName: jobs.clientName,
    referredByPartnerId: jobs.referredByPartnerId,
    status: jobs.status,
    jobType: jobs.jobType,
    stage: jobs.stage,
    startDate: jobs.startDate,
    endDate: jobs.endDate,
    totalCharged: jobs.totalCharged,
    notes: jobs.notes,
    createdAt: jobs.createdAt,
    updatedAt: jobs.updatedAt,
    partnerName: partners.name,
  })
    .from(jobs)
    .leftJoin(partners, eq(jobs.referredByPartnerId, partners.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${jobs.createdAt} DESC`);

  return rows;
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] || null;
}

export async function createJob(data: { name: string; userId?: number; clientId?: number | null; clientName?: string | null; referredByPartnerId?: number | null; status?: string; startDate?: number | null; endDate?: number | null; totalCharged?: string | null; notes?: string | null; jobType?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(jobs).values({
    name: data.name,
    clientId: data.clientId || null,
    clientName: data.clientName || null,
    referredByPartnerId: data.referredByPartnerId || null,
    status: (data.status as any) || "draft",
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    totalCharged: data.totalCharged || null,
    jobType: (data.jobType as any) || "client",
    notes: data.notes || null,
    ...(data.userId ? { userId: data.userId } : {}),
  } as any);
  return { insertId: Number((result as any)[0].insertId) };
}

export async function updateJob(id: number, data: Partial<{ name: string; clientId: number | null; clientName: string | null; referredByPartnerId: number | null; status: string; startDate: number | null; endDate: number | null; totalCharged: string | null; notes: string | null; jobType: string; stage: string }>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.clientId !== undefined) updateData.clientId = data.clientId;
  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.referredByPartnerId !== undefined) updateData.referredByPartnerId = data.referredByPartnerId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.totalCharged !== undefined) updateData.totalCharged = data.totalCharged;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.jobType !== undefined) updateData.jobType = data.jobType;
  if ((data as any).stage !== undefined) updateData.stage = (data as any).stage;
  const conditions: any[] = [eq(jobs.id, id)];
  if (userId) conditions.push(eq(jobs.userId, userId));
  await db.update(jobs).set(updateData).where(and(...conditions));
}

// Auto-finalize job if all deliveries are "delivered" and all payments are "received"
export async function checkAndAutoFinalizeJob(jobId: number) {
  const db = await getDb();
  if (!db) return;
  // Get current job status
  const [job] = await db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, jobId));
  if (!job || job.status === "completed" || job.status === "cancelled") return;
  // Check deliveries
  const deliveries = await db.select({ status: jobDeliveries.status }).from(jobDeliveries).where(eq(jobDeliveries.jobId, jobId));
  if (deliveries.length === 0) return; // No deliveries = can't auto-finalize
  const allDelivered = deliveries.every(d => d.status === "delivered");
  if (!allDelivered) return;
  // Check payments
  const payments = await db.select({ status: jobPayments.status }).from(jobPayments).where(eq(jobPayments.jobId, jobId));
  if (payments.length === 0) return; // No payments = can't auto-finalize
  const allReceived = payments.every(p => p.status === "received");
  if (!allReceived) return;
  // All conditions met - finalize
  await db.update(jobs).set({ status: "completed" }).where(eq(jobs.id, jobId));
}

export async function deleteJob(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // cascade will delete deliveries, costs, payments
  const conditions: any[] = [eq(jobs.id, id)];
  if (userId) conditions.push(eq(jobs.userId, userId));
  await db.delete(jobs).where(and(...conditions));
}

// ==================== JOB DELIVERIES ====================

export async function getJobDeliveries(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobDeliveries).where(eq(jobDeliveries.jobId, jobId)).orderBy(sql`${jobDeliveries.createdAt} ASC`);
}

export async function createJobDelivery(data: { jobId: number; description: string; status?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(jobDeliveries).values({
    jobId: data.jobId,
    description: data.description,
    status: (data.status as any) || "pending",
  });
}

export async function updateJobDelivery(id: number, data: Partial<{ description: string; status: string; deliveredAt: number | null }>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.deliveredAt !== undefined) updateData.deliveredAt = data.deliveredAt;
  // Ownership check: verify userId via jobs table
  if (userId) {
    const delivery = await db.select({ jobId: jobDeliveries.jobId }).from(jobDeliveries).where(eq(jobDeliveries.id, id)).limit(1);
    if (!delivery[0]) return;
    const job = await db.select({ userId: jobs.userId }).from(jobs).where(eq(jobs.id, delivery[0].jobId)).limit(1);
    if (!job[0] || job[0].userId !== userId) return;
  }
  await db.update(jobDeliveries).set(updateData).where(eq(jobDeliveries.id, id));
}

export async function deleteJobDelivery(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Ownership check: verify userId via jobs table
  if (userId) {
    const delivery = await db.select({ jobId: jobDeliveries.jobId }).from(jobDeliveries).where(eq(jobDeliveries.id, id)).limit(1);
    if (!delivery[0]) return;
    const job = await db.select({ userId: jobs.userId }).from(jobs).where(eq(jobs.id, delivery[0].jobId)).limit(1);
    if (!job[0] || job[0].userId !== userId) return;
  }
  await db.delete(jobDeliveries).where(eq(jobDeliveries.id, id));
}

// ==================== JOB COSTS ====================

export async function getJobCosts(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobCosts).where(eq(jobCosts.jobId, jobId)).orderBy(sql`${jobCosts.createdAt} ASC`);
}

export async function createJobCost(data: { jobId: number; description: string; amount: string; supplierName?: string | null; supplierId?: number | null; categoryId?: number | null; paidAt?: number | null; status?: string; paymentSource?: string; cardId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Auto-fill paidAt when status is paid but no date provided
  const paidAt = data.status === "paid" && !data.paidAt ? Date.now() : (data.paidAt || null);
  const result = await db.insert(jobCosts).values({
    jobId: data.jobId,
    description: data.description,
    amount: data.amount,
    supplierName: data.supplierName || null,
    supplierId: data.supplierId || null,
    categoryId: data.categoryId || null,
    paidAt,
    status: (data.status as any) || "pending",
    paymentSource: (data.paymentSource as any) || "cash",
    cardId: data.cardId || null,
  });
  return { insertId: Number((result as any)[0].insertId) };
}

export async function updateJobCost(id: number, data: Partial<{ description: string; amount: string; supplierName: string | null; supplierId: number | null; categoryId: number | null; paidAt: number | null; status: string; transactionId: number | null; paymentSource: string; cardId: number | null; linkedTransactionId: number | null }>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.supplierName !== undefined) updateData.supplierName = data.supplierName;
  if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.paidAt !== undefined) updateData.paidAt = data.paidAt;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
  if (data.paymentSource !== undefined) updateData.paymentSource = data.paymentSource;
  if (data.cardId !== undefined) updateData.cardId = data.cardId;
  if (data.linkedTransactionId !== undefined) updateData.linkedTransactionId = data.linkedTransactionId;
  // Auto-fill paidAt when status changes to paid but no paidAt provided
  if (data.status === "paid" && !data.paidAt && data.paidAt !== 0) {
    updateData.paidAt = Date.now();
  }
  // Ownership check: join with jobs table to verify userId
  if (userId) {
    const cost = await db.select({ jobId: jobCosts.jobId }).from(jobCosts).where(eq(jobCosts.id, id)).limit(1);
    if (!cost[0]) return;
    const job = await db.select({ userId: jobs.userId }).from(jobs).where(eq(jobs.id, cost[0].jobId)).limit(1);
    if (!job[0] || job[0].userId !== userId) return;
  }
  await db.update(jobCosts).set(updateData).where(eq(jobCosts.id, id));
}

export async function getUnlinkedJobCostsByCard(cardId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const userFilter = userId ? eq(jobs.userId, userId) : undefined;
  const conditions = [
    eq(jobCosts.paymentSource, "card"),
    eq(jobCosts.cardId, cardId),
    sql`${jobCosts.linkedTransactionId} IS NULL`,
  ];
  if (userFilter) conditions.push(userFilter);
  return db.select({
    id: jobCosts.id,
    jobId: jobCosts.jobId,
    description: jobCosts.description,
    amount: jobCosts.amount,
    paidAt: jobCosts.paidAt,
    status: jobCosts.status,
    categoryId: jobCosts.categoryId,
  }).from(jobCosts)
    .innerJoin(jobs, eq(jobCosts.jobId, jobs.id))
    .where(and(...conditions));
}

export async function deleteJobCost(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Ownership check: join with jobs table to verify userId
  if (userId) {
    const cost = await db.select({ jobId: jobCosts.jobId }).from(jobCosts).where(eq(jobCosts.id, id)).limit(1);
    if (!cost[0]) return;
    const job = await db.select({ userId: jobs.userId }).from(jobs).where(eq(jobs.id, cost[0].jobId)).limit(1);
    if (!job[0] || job[0].userId !== userId) return;
  }
  await db.delete(jobCosts).where(eq(jobCosts.id, id));
}

// ==================== JOB PAYMENTS ====================

export async function getJobPayments(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobPayments).where(eq(jobPayments.jobId, jobId)).orderBy(sql`${jobPayments.dueDate} ASC`);
}

export async function createJobPayment(data: { jobId: number; description: string; amount: string; dueDate: number; receivedAt?: number | null; status?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Auto-set receivedAt to dueDate when status is received but receivedAt is not provided
  const receivedAt = data.receivedAt || (data.status === "received" ? data.dueDate : null);
  const result = await db.insert(jobPayments).values({
    jobId: data.jobId,
    description: data.description,
    amount: data.amount,
    dueDate: data.dueDate,
    receivedAt,
    status: (data.status as any) || "pending",
  });
  return { insertId: Number((result as any)[0].insertId) };
}

export async function updateJobPayment(id: number, data: Partial<{ description: string; amount: string; dueDate: number; receivedAt: number | null; status: string; transactionId: number | null }>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.receivedAt !== undefined) updateData.receivedAt = data.receivedAt;
  if (data.status !== undefined) updateData.status = data.status;
  // Auto-set receivedAt when status changes to received but receivedAt is not provided
  if (data.status === "received" && data.receivedAt === undefined) {
    const current = await db.select({ dueDate: jobPayments.dueDate, receivedAt: jobPayments.receivedAt }).from(jobPayments).where(eq(jobPayments.id, id)).limit(1);
    if (current[0] && !current[0].receivedAt) {
      updateData.receivedAt = current[0].dueDate || Date.now();
    }
  }
  if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
  // Ownership check: join with jobs table to verify userId
  if (userId) {
    const payment = await db.select({ jobId: jobPayments.jobId }).from(jobPayments).where(eq(jobPayments.id, id)).limit(1);
    if (!payment[0]) return;
    const job = await db.select({ userId: jobs.userId }).from(jobs).where(eq(jobs.id, payment[0].jobId)).limit(1);
    if (!job[0] || job[0].userId !== userId) return;
  }
  await db.update(jobPayments).set(updateData).where(eq(jobPayments.id, id));
}

export async function deleteJobPayment(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Ownership check: join with jobs table to verify userId
  if (userId) {
    const payment = await db.select({ jobId: jobPayments.jobId }).from(jobPayments).where(eq(jobPayments.id, id)).limit(1);
    if (!payment[0]) return;
    const job = await db.select({ userId: jobs.userId }).from(jobs).where(eq(jobs.id, payment[0].jobId)).limit(1);
    if (!job[0] || job[0].userId !== userId) return;
  }
  await db.delete(jobPayments).where(eq(jobPayments.id, id));
}

// ==================== JOB SUMMARY ====================

export async function getJobSummary(jobId: number) {
  const db = await getDb();
  if (!db) return { totalCosts: 0, totalPayments: 0, profit: 0, margin: 0, deliveredCount: 0, totalDeliveries: 0, pendingPayments: 0 };
  
  const costs = await db.select({ total: sql<string>`COALESCE(SUM(${jobCosts.amount}), 0)` }).from(jobCosts).where(eq(jobCosts.jobId, jobId));
  const payments = await db.select({ total: sql<string>`COALESCE(SUM(${jobPayments.amount}), 0)` }).from(jobPayments).where(eq(jobPayments.jobId, jobId));
  const deliveries = await db.select({ 
    total: sql<number>`COUNT(*)`,
    delivered: sql<number>`SUM(CASE WHEN ${jobDeliveries.status} = 'delivered' THEN 1 ELSE 0 END)`
  }).from(jobDeliveries).where(eq(jobDeliveries.jobId, jobId));
  const pending = await db.select({ count: sql<number>`COUNT(*)` }).from(jobPayments).where(and(eq(jobPayments.jobId, jobId), eq(jobPayments.status, "pending")));

  const totalCosts = parseFloat(String(costs[0]?.total || "0"));
  const totalPayments = parseFloat(String(payments[0]?.total || "0"));
  const profit = totalPayments - totalCosts;
  const margin = totalPayments > 0 ? (profit / totalPayments) * 100 : 0;

  return {
    totalCosts,
    totalPayments,
    profit,
    margin,
    deliveredCount: Number(deliveries[0]?.delivered || 0),
    totalDeliveries: Number(deliveries[0]?.total || 0),
    pendingPayments: Number(pending[0]?.count || 0),
  };
}

export async function getJobsMonthSummary(startDate: number, endDate: number, userId?: number) {
  const db = await getDb();
  if (!db) return { activeJobs: 0, totalProfit: 0 };
  
  const conditions: any[] = [
    sql`(${jobs.status} = 'in_progress' OR ${jobs.status} = 'completed')`,
    sql`(${jobs.startDate} IS NULL OR ${jobs.startDate} <= ${endDate})`,
    sql`(${jobs.endDate} IS NULL OR ${jobs.endDate} >= ${startDate})`
  ];
  if (userId) conditions.push(eq(jobs.userId, userId));

  // Jobs that overlap with the month (started before endDate and not ended before startDate)
  const activeJobsList = await db.select().from(jobs).where(
    and(...conditions)
  );

  let totalProfit = 0;
  for (const job of activeJobsList) {
    const summary = await getJobSummary(job.id);
    totalProfit += summary.profit;
  }

  return { activeJobs: activeJobsList.length, totalProfit };
}


// ========== CATEGORY LEARNING ==========

/**
 * Busca a categoria aprendida para um merchant/descrição
 * Normaliza o padrão para lowercase e remove espaços extras
 */
export async function lookupLearnedCategory(merchantDesc: string): Promise<CategoryLearning | null> {
  const db = await getDb();
  const normalized = merchantDesc.trim().toUpperCase();
  
  const results = await db!.select().from(categoryLearning)
    .where(eq(categoryLearning.merchantPattern, normalized))
    .limit(1);
  
  return results[0] || null;
}

/**
 * Salva ou incrementa o aprendizado de categoria para um merchant
 * Se já existe, incrementa confirmCount e atualiza lastUsedAt
 */
export async function upsertCategoryLearning(merchantDesc: string, catId: number, userId?: number): Promise<void> {
  const db = await getDb();
  const normalized = merchantDesc.trim().toUpperCase();
  
  const userFilter = userId ? eq(categoryLearning.userId, userId) : undefined;
  const existing = await db!.select().from(categoryLearning)
    .where(and(eq(categoryLearning.merchantPattern, normalized), userFilter))
    .limit(1);
  
  if (existing[0]) {
    await db!.update(categoryLearning)
      .set({ 
        categoryId: catId, 
        confirmCount: existing[0].confirmCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(categoryLearning.id, existing[0].id));
  } else {
    await db!.insert(categoryLearning).values({
      merchantPattern: normalized,
      categoryId: catId,
      confirmCount: 1,
      ...(userId ? { userId } : {}),
    } as any);
  }
}

/**
 * Busca transações sem categoria de um mês específico
 */
export async function getUncategorizedTransactions(month: number, year: number, userId?: number, lookbackMonths: number = 0) {
  const db = await getDb();
  // If lookbackMonths > 0, search from (month - lookbackMonths) to end of current month
  const startMonth = lookbackMonths > 0 ? month - lookbackMonths : month;
  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const startTs = startDate.getTime();
  const endTs = endDate.getTime();
  const conditions: any[] = [
    gte(transactions.date, startTs),
    lte(transactions.date, endTs),
    isNull(transactions.categoryId),
    eq(transactions.source, "telegram"),
  ];
  if (userId) conditions.push(eq(transactions.userId, userId));
  return db!.select().from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date));
}

/**
 * Atualiza a categoria de uma transação
 */
/**
 * Find a duplicate transaction with same description, amount and date (but different id)
 */
export async function findDuplicateTransaction(excludeId: number, description: string, amount: string, date: number, targetCategoryId?: number): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;
  // Match within a 24h window of the date
  const dayStart = date - (date % 86400000);
  const dayEnd = dayStart + 86400000 - 1;
  const conditions = [
    eq(transactions.description, description),
    eq(transactions.amount, amount),
    gte(transactions.date, dayStart),
    lte(transactions.date, dayEnd),
    sql`${transactions.id} != ${excludeId}`,
  ];
  // Only match duplicates in the target category if specified
  if (targetCategoryId !== undefined) {
    conditions.push(eq(transactions.categoryId, targetCategoryId));
  }
  const results = await db.select({ id: transactions.id }).from(transactions)
    .where(and(...conditions))
    .limit(1);
  return results[0] || null;
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return results[0] || null;
}

export async function updateTransactionCategory(transactionId: number, catId: number, userId?: number): Promise<void> {
  const db = await getDb();
  const conditions: any[] = [eq(transactions.id, transactionId)];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db!.update(transactions)
    .set({ categoryId: catId })
    .where(and(...conditions));
}

/**
 * Busca todas as entradas de aprendizado de categoria
 */
export async function getAllCategoryLearnings(userId?: number): Promise<CategoryLearning[]> {
  const db = await getDb();
  if (userId) return db!.select().from(categoryLearning).where(eq(categoryLearning.userId, userId)).orderBy(desc(categoryLearning.confirmCount));
  return db!.select().from(categoryLearning).orderBy(desc(categoryLearning.confirmCount));
}

// ========== QUOTES (ORÇAMENTOS) ==========

import {
  quotes, Quote, InsertQuote,
  quoteItems, QuoteItem, InsertQuoteItem,
} from "../drizzle/schema";

export async function getQuotes(filters?: { userId?: number; status?: string; clientId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.userId) conditions.push(eq(quotes.userId, filters.userId));
  if (filters?.status) conditions.push(eq(quotes.status, filters.status as any));
  if (filters?.clientId) conditions.push(eq(quotes.clientId, filters.clientId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(quotes).where(where).orderBy(desc(quotes.createdAt));
}

export async function getQuoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return results[0] || null;
}

export async function createQuote(data: Omit<InsertQuote, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(data as any);
  const insertId = (result as any)[0]?.insertId;
  return { insertId };
}

export async function updateQuote(id: number, data: Partial<InsertQuote>, userId?: number) {
  const db = await getDb();
  if (!db) return;
  const conditions: any[] = [eq(quotes.id, id)];
  if (userId) conditions.push(eq(quotes.userId, userId));
  await db.update(quotes).set(data as any).where(and(...conditions));
}

export async function deleteQuote(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return;
  // Verify ownership before deleting
  if (userId) {
    const [quote] = await db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
    if (!quote) return;
  }
  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  await db.delete(quotes).where(eq(quotes.id, id));
}

export async function getQuoteItems(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.id));
}

export async function createQuoteItem(data: Omit<InsertQuoteItem, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(quoteItems).values(data as any);
  // Update quote total
  await recalcQuoteTotal(data.quoteId);
}

export async function updateQuoteItem(id: number, data: Partial<InsertQuoteItem>, userId?: number) {
  const db = await getDb();
  if (!db) return;
  // Verify ownership via parent quote
  if (userId) {
    const item = await db.select({ quoteId: quoteItems.quoteId }).from(quoteItems).where(eq(quoteItems.id, id)).limit(1);
    if (item[0]) {
      const quote = await db.select({ userId: quotes.userId }).from(quotes).where(eq(quotes.id, item[0].quoteId)).limit(1);
      if (quote[0] && quote[0].userId !== userId) return;
    }
  }
  await db.update(quoteItems).set(data as any).where(eq(quoteItems.id, id));
  // Get quoteId to recalc
  const item = await db.select({ quoteId: quoteItems.quoteId }).from(quoteItems).where(eq(quoteItems.id, id)).limit(1);
  if (item[0]) await recalcQuoteTotal(item[0].quoteId);
}

export async function deleteQuoteItem(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return;
  const item = await db.select({ quoteId: quoteItems.quoteId }).from(quoteItems).where(eq(quoteItems.id, id)).limit(1);
  // Verify ownership via parent quote
  if (userId && item[0]) {
    const quote = await db.select({ userId: quotes.userId }).from(quotes).where(eq(quotes.id, item[0].quoteId)).limit(1);
    if (quote[0] && quote[0].userId !== userId) return;
  }
  await db.delete(quoteItems).where(eq(quoteItems.id, id));
  if (item[0]) await recalcQuoteTotal(item[0].quoteId);
}

async function recalcQuoteTotal(quoteId: number) {
  const db = await getDb();
  if (!db) return;
  const result = await db.select({ total: sql<string>`COALESCE(SUM(${quoteItems.subtotal}), 0)` }).from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const total = result[0]?.total || "0";
  await db.update(quotes).set({ totalAmount: total }).where(eq(quotes.id, quoteId));
}

// ========== CASH FLOW PROJECTION ==========

export async function getCashFlowProjection(months: number = 12, userId?: number) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const result: Array<{ month: string; income: number; expense: number; balance: number; accumulated: number }> = [];
  let accumulated = 0;
  
  // Get initial balance from all past transactions
  const db = await getDb();
  if (!db) return result;
  
  const firstMonthStart = new Date(currentYear, currentMonth, 1).getTime();
  const txUserFilter = userId ? eq(transactions.userId, userId) : undefined;
  const pastTotals = await db.select({
    type: transactions.type,
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions).where(and(lt(transactions.date, firstMonthStart), txUserFilter)).groupBy(transactions.type);
  
  const pastIncome = parseFloat(String(pastTotals.find(t => t.type === 'income')?.total || '0'));
  const pastExpense = parseFloat(String(pastTotals.find(t => t.type === 'expense')?.total || '0'));
  accumulated = pastIncome - pastExpense;
  
  // Get recurring data
  const activeIncomes = await getRecurringIncome(true, userId);
  const activeExpenses = await getRecurringExpenses(true, userId);
  
  // Get pending job payments
  const jobUserFilter = userId ? eq(jobs.userId, userId) : undefined;
  const pendingPayments = await db.select({ amount: jobPayments.amount, dueDate: jobPayments.dueDate }).from(jobPayments)
    .innerJoin(jobs, eq(jobPayments.jobId, jobs.id))
    .where(and(eq(jobPayments.status, 'pending'), jobUserFilter));
  
  // Get pending job costs
  const pendingCosts = await db.select({ amount: jobCosts.amount, paidAt: jobCosts.paidAt }).from(jobCosts)
    .innerJoin(jobs, eq(jobCosts.jobId, jobs.id))
    .where(and(eq(jobCosts.status, 'pending'), jobUserFilter));
  
  for (let i = 0; i < months; i++) {
    const m = (currentMonth + i) % 12;
    const y = currentYear + Math.floor((currentMonth + i) / 12);
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthStart = new Date(y, m, 1).getTime();
    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59).getTime();
    
    // Real transactions for this month
    const monthTotals = await db.select({
      type: transactions.type,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    }).from(transactions).where(and(gte(transactions.date, monthStart), lte(transactions.date, monthEnd), txUserFilter)).groupBy(transactions.type);
    
    let monthIncome = parseFloat(String(monthTotals.find(t => t.type === 'income')?.total || '0'));
    let monthExpense = parseFloat(String(monthTotals.find(t => t.type === 'expense')?.total || '0'));
    
    // Add job payments received in this month (all months, not just future)
    const receivedPaymentsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${jobPayments.amount}), 0)`,
    }).from(jobPayments).innerJoin(jobs, eq(jobPayments.jobId, jobs.id)).where(and(
      eq(jobPayments.status, 'received'),
      gte(jobPayments.receivedAt, monthStart),
      lte(jobPayments.receivedAt, monthEnd),
      jobUserFilter
    ));
    monthIncome += parseFloat(String(receivedPaymentsResult[0]?.total || '0'));
    
    // Add job costs paid in this month
    const paidCostsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${jobCosts.amount}), 0)`,
    }).from(jobCosts).innerJoin(jobs, eq(jobCosts.jobId, jobs.id)).where(and(
      eq(jobCosts.status, 'paid'),
      gte(jobCosts.paidAt, monthStart),
      lte(jobCosts.paidAt, monthEnd),
      jobUserFilter
    ));
    monthExpense += parseFloat(String(paidCostsResult[0]?.total || '0'));
    
    // For future months, also add pending job payments/costs projected
    const isFuture = monthStart > Date.now();
    if (isFuture) {
      // Add pending job payments due this month
      for (const jp of pendingPayments) {
        if (jp.dueDate >= monthStart && jp.dueDate <= monthEnd) {
          monthIncome += parseFloat(String(jp.amount));
        }
      }
      // Add pending job costs (if they have a projected date)
      for (const jc of pendingCosts) {
        if (jc.paidAt && jc.paidAt >= monthStart && jc.paidAt <= monthEnd) {
          monthExpense += parseFloat(String(jc.amount));
        }
      }
    }
    
    const balance = monthIncome - monthExpense;
    accumulated += balance;
    
    result.push({ month: monthStr, income: monthIncome, expense: monthExpense, balance, accumulated });
  }
  
  return result;
}

// ========== JOBS PROFITABILITY ==========

export async function getJobsProfitability(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const jobsFilter = userId ? eq(jobs.userId, userId) : undefined;
  const allJobs = await db.select().from(jobs).where(jobsFilter).orderBy(desc(jobs.createdAt));
  const result = [];
  
  for (const job of allJobs) {
    const summary = await getJobSummary(job.id);
    result.push({
      id: job.id,
      name: job.name,
      clientName: job.clientName,
      status: job.status,
      startDate: job.startDate,
      endDate: job.endDate,
      totalCharged: job.totalCharged ? parseFloat(String(job.totalCharged)) : 0,
      totalCosts: summary.totalCosts,
      totalPayments: summary.totalPayments,
      profit: summary.profit,
      margin: summary.margin,
      pendingPayments: summary.pendingPayments,
      deliveredCount: summary.deliveredCount,
      totalDeliveries: summary.totalDeliveries,
    });
  }
  
  return result;
}

// ========== DRE (Demonstrativo de Resultado) ==========

export async function getDRE(year: number, month?: number, userId?: number) {
  const db = await getDb();
  if (!db) return {
    period: '',
    receitaBruta: 0,
    custosDirectos: 0,
    lucroBruto: 0,
    despesasFixas: 0,
    despesasVariaveis: 0,
    lucroOperacional: 0,
    outrasReceitas: 0,
    lucroLiquido: 0,
    breakdown: { receitasPJ: 0, receitasPF: 0, custosFornecedores: 0, despesasRecorrentes: 0, despesasCartao: 0, despesasAvulsas: 0 },
  };
  
  let startDate: number, endDate: number, period: string;
  if (month !== undefined) {
    startDate = new Date(year, month, 1).getTime();
    endDate = new Date(year, month + 1, 0, 23, 59, 59).getTime();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    period = `${monthNames[month]} ${year}`;
  } else {
    startDate = new Date(year, 0, 1).getTime();
    endDate = new Date(year, 11, 31, 23, 59, 59).getTime();
    period = `${year}`;
  }
  
  const txUserFilter = userId ? eq(transactions.userId, userId) : undefined;
  const dateFilter = and(gte(transactions.date, startDate), lte(transactions.date, endDate), txUserFilter);
  
  // Income by scope (from transactions)
  const incomeByScope = await db.select({
    scope: transactions.scope,
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions).where(and(dateFilter, eq(transactions.type, 'income'))).groupBy(transactions.scope);
  
  let receitasPJ = parseFloat(String(incomeByScope.find(r => r.scope === 'pj')?.total || '0'));
  const receitasPF = parseFloat(String(incomeByScope.find(r => r.scope === 'pf')?.total || '0'));
  
  // Add job payments received in this period (jobs are PJ income)
  const jobUserFilter = userId ? eq(jobs.userId, userId) : undefined;
  const jobPaymentReceived = await db.select({
    total: sql<string>`COALESCE(SUM(${jobPayments.amount}), 0)`,
  }).from(jobPayments).innerJoin(jobs, eq(jobPayments.jobId, jobs.id)).where(and(
    eq(jobPayments.status, 'received'),
    gte(jobPayments.receivedAt, startDate),
    lte(jobPayments.receivedAt, endDate),
    jobUserFilter
  ));
  const receitasJobs = parseFloat(String(jobPaymentReceived[0]?.total || '0'));
  receitasPJ += receitasJobs;
  
  const receitaBruta = receitasPJ + receitasPF;
  
  // Direct costs: job costs paid in this period (exclude card-source, those come via transactions)
  const jobCostResult = await db.select({
    total: sql<string>`COALESCE(SUM(${jobCosts.amount}), 0)`,
  }).from(jobCosts).innerJoin(jobs, eq(jobCosts.jobId, jobs.id)).where(and(
    eq(jobCosts.status, 'paid'),
    sql`${jobCosts.paymentSource} != 'card'`,
    gte(jobCosts.paidAt, startDate),
    lte(jobCosts.paidAt, endDate),
    jobUserFilter
  ));
  const custosFornecedores = parseFloat(String(jobCostResult[0]?.total || '0'));
  
  // Recurring expenses (from transactions with source='recurring' and type='expense')
  const recurringExpResult = await db.select({
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions).where(and(dateFilter, eq(transactions.type, 'expense'), eq(transactions.source, 'recurring')));
  const despesasRecorrentes = parseFloat(String(recurringExpResult[0]?.total || '0'));
  
  // Card expenses (expenses with cardId)
  const cardExpResult = await db.select({
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions).where(and(dateFilter, eq(transactions.type, 'expense'), sql`${transactions.cardId} IS NOT NULL`, sql`${transactions.source} != 'recurring'`));
  const despesasCartao = parseFloat(String(cardExpResult[0]?.total || '0'));
  
  // Other expenses (no card, not recurring, not from jobs)
  const otherExpResult = await db.select({
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions).where(and(dateFilter, eq(transactions.type, 'expense'), isNull(transactions.cardId), sql`${transactions.source} != 'recurring'`));
  const despesasAvulsas = parseFloat(String(otherExpResult[0]?.total || '0'));
  
  const custosDirectos = custosFornecedores;
  const lucroBruto = receitaBruta - custosDirectos;
  const despesasFixas = despesasRecorrentes;
  const despesasVariaveis = despesasCartao + despesasAvulsas;
  const lucroOperacional = lucroBruto - despesasFixas - despesasVariaveis;
  const lucroLiquido = lucroOperacional;
  
  return {
    period,
    receitaBruta,
    custosDirectos,
    lucroBruto,
    despesasFixas,
    despesasVariaveis,
    lucroOperacional,
    outrasReceitas: 0,
    lucroLiquido,
    breakdown: { receitasPJ, receitasPF, custosFornecedores, despesasRecorrentes, despesasCartao, despesasAvulsas },
  };
}

export async function getDREAnual(year: number, userId?: number) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const dre = await getDRE(year, m, userId);
    months.push({ ...dre, monthIndex: m });
  }
  
  // Totals
  const totals = await getDRE(year, undefined, userId);
  
  return { months, totals };
}

// ========== INSTALLMENT PURCHASES (COMPRAS PARCELADAS) ==========

export async function createInstallmentPurchase(data: {
  description: string;
  totalAmount: string;
  installments: number;
  type: "income" | "expense";
  scope: "pj" | "pf";
  cardId?: number | null;
  categoryId?: number | null;
  firstDate: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return { groupId: "", count: 0 };

  const groupId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const total = parseFloat(data.totalAmount);
  const perInstallment = Math.round((total / data.installments) * 100) / 100;
  // Adjust last installment to account for rounding
  const lastInstallment = Math.round((total - perInstallment * (data.installments - 1)) * 100) / 100;

  const firstDateObj = new Date(data.firstDate);

  for (let i = 0; i < data.installments; i++) {
    const installmentDate = new Date(firstDateObj.getFullYear(), firstDateObj.getMonth() + i, firstDateObj.getDate());
    const amount = i === data.installments - 1 ? lastInstallment : perInstallment;
    const desc = `${data.description} (${i + 1}/${data.installments})`;

    await db.insert(transactions).values({
      description: desc,
      amount: amount.toFixed(2),
      type: data.type,
      scope: data.scope,
      cardId: data.cardId ?? null,
      categoryId: data.categoryId ?? null,
      source: "installment",
      installmentGroupId: groupId,
      installmentNumber: i + 1,
      installmentTotal: data.installments,
      date: installmentDate.getTime(),
      userId: data.userId,
    } as any);
  }

  return { groupId, count: data.installments };
}

export async function getInstallmentGroups(scope?: "pj" | "pf", userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [sql`${transactions.installmentGroupId} IS NOT NULL`];
  if (userId) conditions.push(eq(transactions.userId, userId));
  if (scope) conditions.push(eq(transactions.scope, scope));

  const groups = await db.select({
    installmentGroupId: transactions.installmentGroupId,
    description: sql<string>`SUBSTRING_INDEX(MIN(${transactions.description}), ' (', 1)`,
    scope: transactions.scope,
    type: transactions.type,
    cardId: transactions.cardId,
    categoryId: transactions.categoryId,
    totalAmount: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    installmentTotal: sql<number>`MAX(${transactions.installmentTotal})`,
    paidCount: sql<number>`SUM(CASE WHEN ${transactions.date} <= ${Date.now()} THEN 1 ELSE 0 END)`,
    firstDate: sql<number>`MIN(${transactions.date})`,
    lastDate: sql<number>`MAX(${transactions.date})`,
  }).from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.installmentGroupId, transactions.scope, transactions.type, transactions.cardId, transactions.categoryId)
    .orderBy(desc(sql`MIN(${transactions.date})`));

  return groups;
}

export async function deleteInstallmentGroup(groupId: string, userId?: number) {
  const db = await getDb();
  if (!db) return;
  const conditions: any[] = [eq(transactions.installmentGroupId, groupId)];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db.delete(transactions).where(and(...conditions));
}


// ========== EDIT/DELETE RECURRENCES WITH PROPAGATION ==========

export async function updateRecurringIncomeAndRegenerate(id: number, data: Partial<InsertRecurringIncome>) {
  // Update the recurring income record
  await updateRecurringIncome(id, data);
  // Regenerate all transactions from this recurrence
  return generateTransactionsFromRecurringIncome(id);
}

export async function deleteRecurringIncomeAndTransactions(id: number) {
  // Delete all generated transactions first
  await deleteTransactionsFromRecurringIncome(id);
  // Then delete the recurring record itself
  await deleteRecurringIncome(id);
  return { deleted: true };
}

export async function updateRecurringExpenseAndRegenerate(id: number, data: Partial<InsertRecurringExpense>) {
  // Update the recurring expense record
  await updateRecurringExpense(id, data);
  // Regenerate all transactions from this recurrence
  return generateTransactionsFromRecurringExpense(id);
}

export async function deleteRecurringExpenseAndTransactions(id: number) {
  // Delete all generated transactions first
  await deleteTransactionsFromRecurringExpense(id);
  // Then delete the recurring record itself
  await deleteRecurringExpense(id);
  return { deleted: true };
}

// ========== EDIT/DELETE INSTALLMENT GROUPS ==========

export async function updateInstallmentGroupFuture(groupId: string, data: { description?: string; amount?: string }, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = Date.now();
  const updateData: any = {};
  if (data.description) updateData.description = data.description;
  if (data.amount) updateData.amount = data.amount;
  
  // Update only future (unpaid) installments
  const conditions: any[] = [
    eq(transactions.installmentGroupId, groupId),
    gte(transactions.date, now)
  ];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db.update(transactions)
    .set(updateData)
    .where(and(...conditions));
  
  return { updated: true };
}

export async function deleteInstallmentGroupFuture(groupId: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = Date.now();
  
  // Delete only future installments
  const conditions: any[] = [
    eq(transactions.installmentGroupId, groupId),
    gte(transactions.date, now)
  ];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db.delete(transactions)
    .where(and(...conditions));
  
  return { deleted: true };
}

export async function getInstallmentGroup(groupId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(eq(transactions.installmentGroupId, groupId))
    .orderBy(asc(transactions.date));
}

// ========== ACCOUNTANT INVITES ==========

export async function createAccountantInvite(data: { email: string; invitedBy: number; token: string; expiresAt: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(accountantInvites).values(data);
  return { id: result[0].insertId };
}

export async function getAccountantInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(accountantInvites).where(eq(accountantInvites.token, token));
  return rows[0] || null;
}

export async function acceptAccountantInvite(token: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accountantInvites)
    .set({ status: "accepted", acceptedBy: userId })
    .where(eq(accountantInvites.token, token));
  // Update user role to accountant
  await db.update(users).set({ role: "accountant" }).where(eq(users.id, userId));
  return { accepted: true };
}

export async function listAccountantInvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountantInvites).orderBy(desc(accountantInvites.createdAt));
}

// ========== ASSETS (BENS/PATRIMÔNIO) ==========

export async function createAsset(data: InsertAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assets).values(data);
  return { id: result[0].insertId };
}

export async function listAssets(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(assets.isActive, true)];
  if (userId) conditions.push(eq(assets.userId, userId));
  return db.select().from(assets).where(and(...conditions)).orderBy(desc(assets.purchaseDate));
}

export async function getAssetById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(assets).where(eq(assets.id, id));
  return rows[0] || null;
}

export async function updateAsset(id: number, data: Partial<InsertAsset>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(assets.id, id)];
  if (userId) conditions.push(eq(assets.userId, userId));
  await db.update(assets).set(data).where(and(...conditions));
  return { updated: true };
}

export async function deleteAsset(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(assets.id, id)];
  if (userId) conditions.push(eq(assets.userId, userId));
  await db.update(assets).set({ isActive: false }).where(and(...conditions));
  return { deleted: true };
}

// ========== FISCAL CATEGORY (CLASSIFICAÇÃO FISCAL PF) ==========

export async function updateTransactionFiscalCategory(id: number, fiscalCategory: string | null, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [eq(transactions.id, id)];
  if (userId) conditions.push(eq(transactions.userId, userId));
  await db.update(transactions).set({ fiscalCategory: fiscalCategory as any }).where(and(...conditions));
  return { updated: true };
}

// ========== RESUMO ANUAL IR ==========

export async function getAnnualIRSummary(year: number, userId?: number) {
  const db = await getDb();
  if (!db) return null;
  
  const startOfYear = new Date(year, 0, 1).getTime();
  const endOfYear = new Date(year + 1, 0, 1).getTime();
  
  // Get all transactions for the year
  const conditions: any[] = [gte(transactions.date, startOfYear), lt(transactions.date, endOfYear)];
  if (userId) conditions.push(eq(transactions.userId, userId));
  const yearTransactions = await db.select().from(transactions)
    .where(and(...conditions));
  
  // Separate PJ and PF
  const pjIncome = yearTransactions.filter(t => t.type === 'income' && t.scope === 'pj');
  const pfIncome = yearTransactions.filter(t => t.type === 'income' && t.scope === 'pf');
  const pjExpenses = yearTransactions.filter(t => t.type === 'expense' && t.scope === 'pj');
  const pfExpenses = yearTransactions.filter(t => t.type === 'expense' && t.scope === 'pf');
  
  const sum = (arr: typeof yearTransactions) => arr.reduce((s, t) => s + Number(t.amount), 0);
  
  // Deductible PF expenses (saúde, educação)
  const deductibleHealth = pfExpenses.filter(t => t.fiscalCategory === 'saude');
  const deductibleEducation = pfExpenses.filter(t => t.fiscalCategory === 'educacao');
  
  // Get assets for the year
  const yearAssets = await db.select().from(assets)
    .where(and(eq(assets.isActive, true), lte(assets.purchaseDate, endOfYear)));
  
  // Calculate total depreciation
  const totalAssetValue = yearAssets.reduce((s, a) => s + Number(a.purchaseValue), 0);
  const totalCurrentValue = yearAssets.reduce((s, a) => {
    const ageYears = (Date.now() - Number(a.purchaseDate)) / (365.25 * 24 * 60 * 60 * 1000);
    const depreciation = Math.min(ageYears * Number(a.depreciationRate) / 100, 1);
    return s + Number(a.purchaseValue) * (1 - depreciation);
  }, 0);
  
  // Simples Nacional estimate (6% for services)
  const pjTotalIncome = sum(pjIncome);
  const simplesEstimate = pjTotalIncome * 0.06;
  
  // IRPF estimate (simplified)
  const pfTotalIncome = sum(pfIncome);
  const totalDeductible = sum(deductibleHealth) + Math.min(sum(deductibleEducation), 3561.50); // Limite educação 2024
  const taxableIncome = Math.max(0, pfTotalIncome - totalDeductible);
  
  let irpfEstimate = 0;
  if (taxableIncome > 55976.16) irpfEstimate = taxableIncome * 0.275 - 10432.32;
  else if (taxableIncome > 45012.60) irpfEstimate = taxableIncome * 0.225 - 7633.51;
  else if (taxableIncome > 33919.80) irpfEstimate = taxableIncome * 0.15 - 4257.57;
  else if (taxableIncome > 26963.24) irpfEstimate = taxableIncome * 0.075 - 2013.70;
  else irpfEstimate = 0;
  
  return {
    year,
    pj: {
      totalIncome: pjTotalIncome,
      totalExpenses: sum(pjExpenses),
      netProfit: pjTotalIncome - sum(pjExpenses),
      simplesEstimate,
    },
    pf: {
      totalIncome: pfTotalIncome,
      totalExpenses: sum(pfExpenses),
      deductibleHealth: sum(deductibleHealth),
      deductibleEducation: sum(deductibleEducation),
      totalDeductible,
      taxableIncome,
      irpfEstimate,
    },
    assets: {
      totalPurchaseValue: totalAssetValue,
      totalCurrentValue,
      count: yearAssets.length,
      items: yearAssets,
    },
    totalTaxEstimate: simplesEstimate + Math.max(0, irpfEstimate),
  };
}

// ========== SUGESTÃO DE PRÓ-LABORE ==========

export async function getProLaboreSuggestion(months: number = 6, userId?: number) {
  const db = await getDb();
  if (!db) return null;
  
  const now = Date.now();
  const startDate = now - (months * 30 * 24 * 60 * 60 * 1000);
  
  // Get user's business type to adjust tax calculation
  let businessType = 'simples';
  if (userId) {
    const [user] = await db.select({ businessType: users.businessType }).from(users).where(eq(users.id, userId));
    if (user) businessType = user.businessType;
  }
  
  // Get PJ transactions for the period
  const pjConditions: any[] = [eq(transactions.scope, 'pj'), gte(transactions.date, startDate), lte(transactions.date, now)];
  if (userId) pjConditions.push(eq(transactions.userId, userId));
  const pjTransactions = await db.select().from(transactions)
    .where(and(...pjConditions));
  
  const pjIncome = pjTransactions.filter(t => t.type === 'income');
  const pjExpenses = pjTransactions.filter(t => t.type === 'expense');
  
  let totalIncome = pjIncome.reduce((s, t) => s + Number(t.amount), 0);
  let totalExpenses = pjExpenses.reduce((s, t) => s + Number(t.amount), 0);
  
  // Include job payments received in the period (filtered by user's jobs)
  const jobPaymentConditions: any[] = [
    eq(jobPayments.status, 'received'),
    gte(jobPayments.receivedAt, startDate),
    lte(jobPayments.receivedAt, now),
  ];
  if (userId) jobPaymentConditions.push(eq(jobs.userId, userId));
  const jobPaymentsReceived = await db.select({ amount: jobPayments.amount })
    .from(jobPayments)
    .innerJoin(jobs, eq(jobPayments.jobId, jobs.id))
    .where(and(...jobPaymentConditions));
  totalIncome += jobPaymentsReceived.reduce((s, p) => s + Number(p.amount), 0);
  
  // Include job costs paid in the period (filtered by user's jobs, exclude card-source)
  const jobCostConditions: any[] = [
    eq(jobCosts.status, 'paid'),
    sql`${jobCosts.paymentSource} != 'card'`,
    gte(jobCosts.paidAt, startDate),
    lte(jobCosts.paidAt, now),
  ];
  if (userId) jobCostConditions.push(eq(jobs.userId, userId));
  const jobCostsPaid = await db.select({ amount: jobCosts.amount })
    .from(jobCosts)
    .innerJoin(jobs, eq(jobCosts.jobId, jobs.id))
    .where(and(...jobCostConditions));
  totalExpenses += jobCostsPaid.reduce((s, c) => s + Number(c.amount), 0);
  
  const avgMonthlyIncome = totalIncome / months;
  const avgMonthlyExpenses = totalExpenses / months;
  const avgMonthlyProfit = avgMonthlyIncome - avgMonthlyExpenses;
  
  // Get recurring expenses to estimate fixed costs (filtered by userId)
  const recurringConditions: any[] = [eq(recurringExpenses.isActive, true)];
  if (userId) recurringConditions.push(eq(recurringExpenses.userId, userId));
  const recurringExp = await db.select().from(recurringExpenses)
    .where(and(...recurringConditions));
  const monthlyFixedCosts = recurringExp
    .filter(r => r.frequency === 'monthly')
    .reduce((s, r) => s + Number(r.amount), 0);
  
  // Safety margin: 20% of income for reinvestment/emergencies
  const safetyMargin = avgMonthlyIncome * 0.20;
  
  // Tax reserve based on business type
  let taxRate = 0.06; // Simples Nacional default
  let taxLabel = 'Simples Nacional (6%)';
  if (businessType === 'mei') {
    taxRate = 0.01; // MEI pays fixed DAS, minimal percentage
    taxLabel = 'MEI - DAS fixo (~R$75/mês)';
  } else if (businessType === 'autonomo') {
    taxRate = 0.15; // Autônomo - carnê-leão estimado
    taxLabel = 'Carnê-leão estimado (15%)';
  }
  const taxReserve = businessType === 'mei' ? 75 : avgMonthlyIncome * taxRate;
  
  // Suggested salary = profit - safety margin - tax reserve
  const suggestedSalary = Math.max(0, avgMonthlyProfit - safetyMargin - taxReserve);
  
  // Conservative salary (30% of income)
  const conservativeSalary = avgMonthlyIncome * 0.30;
  
  // Moderate salary (40% of income)
  const moderateSalary = avgMonthlyIncome * 0.40;
  
  // Aggressive salary (50% of income)
  const aggressiveSalary = avgMonthlyIncome * 0.50;
  
  return {
    period: { months, startDate, endDate: now },
    businessType,
    averages: {
      monthlyIncome: avgMonthlyIncome,
      monthlyExpenses: avgMonthlyExpenses,
      monthlyProfit: avgMonthlyProfit,
      monthlyFixedCosts,
    },
    reserves: {
      safetyMargin,
      taxReserve,
      taxLabel,
    },
    suggestions: {
      calculated: suggestedSalary,
      conservative: conservativeSalary,
      moderate: moderateSalary,
      aggressive: aggressiveSalary,
    },
    recommendation: suggestedSalary > moderateSalary ? 'moderate' : 'conservative',
  };
}


// ==================== JOB TRANSACTION ITEMS (virtual) ====================

export async function getJobTransactionItems(startDate: number, endDate: number, type?: "income" | "expense", userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const items: Array<{
    id: number;
    description: string;
    amount: string;
    type: "income" | "expense";
    scope: "pj";
    cardId: number | null;
    categoryId: number | null;
    date: number;
    source: string;
    recurringIncomeId: number | null;
    recurringExpenseId: number | null;
    installmentGroupId: string | null;
    createdAt: Date;
    jobPaymentId?: number;
    jobCostId?: number;
    jobId?: number;
    jobStatus?: string;
  }> = [];

  const jobUserFilter = userId ? eq(jobs.userId, userId) : undefined;

  // Job payments as income items
  if (!type || type === "income") {
    // Received payments (by receivedAt date)
    const received = await db.select({
      id: jobPayments.id,
      description: jobPayments.description,
      amount: jobPayments.amount,
      receivedAt: jobPayments.receivedAt,
      jobId: jobPayments.jobId,
    }).from(jobPayments).innerJoin(jobs, eq(jobPayments.jobId, jobs.id)).where(
      and(
        eq(jobPayments.status, "received"),
        gte(jobPayments.receivedAt, startDate),
        lte(jobPayments.receivedAt, endDate),
        jobUserFilter
      )
    );

    // Pending payments (by dueDate)
    const pending = await db.select({
      id: jobPayments.id,
      description: jobPayments.description,
      amount: jobPayments.amount,
      dueDate: jobPayments.dueDate,
      jobId: jobPayments.jobId,
    }).from(jobPayments).innerJoin(jobs, eq(jobPayments.jobId, jobs.id)).where(
      and(
        eq(jobPayments.status, "pending"),
        gte(jobPayments.dueDate, startDate),
        lte(jobPayments.dueDate, endDate),
        jobUserFilter
      )
    );

    // Get job names for descriptions
    const jobIds = Array.from(new Set([...received.map(r => r.jobId), ...pending.map(p => p.jobId)]));
    const jobNames: Record<number, string> = {};
    if (jobIds.length > 0) {
      for (const jid of jobIds) {
        const job = await db.select({ name: jobs.name }).from(jobs).where(eq(jobs.id, jid)).limit(1);
        if (job[0]) jobNames[jid] = job[0].name;
      }
    }

    for (const p of received) {
      items.push({
        id: -(p.id * 10 + 1),
        description: `${jobNames[p.jobId] || "Job"} - ${p.description}`,
        amount: String(p.amount),
        type: "income",
        scope: "pj",
        cardId: null,
        categoryId: null,
        date: p.receivedAt!,
        source: "job",
        recurringIncomeId: null,
        recurringExpenseId: null,
        installmentGroupId: null,
        createdAt: new Date(),
        jobPaymentId: p.id,
        jobId: p.jobId,
        jobStatus: "received",
      });
    }

    for (const p of pending) {
      items.push({
        id: -(p.id * 10 + 2),
        description: `${jobNames[p.jobId] || "Job"} - ${p.description}`,
        amount: String(p.amount),
        type: "income",
        scope: "pj",
        cardId: null,
        categoryId: null,
        date: p.dueDate,
        source: "job_pending",
        recurringIncomeId: null,
        recurringExpenseId: null,
        installmentGroupId: null,
        createdAt: new Date(),
        jobPaymentId: p.id,
        jobId: p.jobId,
        jobStatus: "pending",
      });
    }
  }

  // Job costs as expense items
  if (!type || type === "expense") {
    // Paid costs (by paidAt date)
    const paid = await db.select({
      id: jobCosts.id,
      description: jobCosts.description,
      amount: jobCosts.amount,
      paidAt: jobCosts.paidAt,
      jobId: jobCosts.jobId,
      categoryId: jobCosts.categoryId,
    }).from(jobCosts).innerJoin(jobs, eq(jobCosts.jobId, jobs.id)).where(
      and(
        eq(jobCosts.status, "paid"),
        sql`${jobCosts.paymentSource} != 'card'`,
        gte(jobCosts.paidAt, startDate),
        lte(jobCosts.paidAt, endDate),
        jobUserFilter
      )
    );

    // Pending costs (appear in all months from creation until paid - continuous projection)
    const pendingCosts = await db.select({
      id: jobCosts.id,
      description: jobCosts.description,
      amount: jobCosts.amount,
      createdAt: jobCosts.createdAt,
      jobId: jobCosts.jobId,
      categoryId: jobCosts.categoryId,
    }).from(jobCosts).innerJoin(jobs, eq(jobCosts.jobId, jobs.id)).where(
      and(
        eq(jobCosts.status, "pending"),
        sql`${jobCosts.paymentSource} != 'card'`,
        gte(sql`UNIX_TIMESTAMP(${jobCosts.createdAt}) * 1000`, startDate),
        jobUserFilter
      )
    );

    // Get job names
    const costJobIds = Array.from(new Set([...paid.map(c => c.jobId), ...pendingCosts.map(c => c.jobId)]));
    const costJobNames: Record<number, string> = {};
    if (costJobIds.length > 0) {
      for (const jid of costJobIds) {
        const job = await db.select({ name: jobs.name }).from(jobs).where(eq(jobs.id, jid)).limit(1);
        if (job[0]) costJobNames[jid] = job[0].name;
      }
    }

    for (const c of paid) {
      items.push({
        id: -(c.id * 10 + 3),
        description: `${costJobNames[c.jobId] || "Job"} - ${c.description}`,
        amount: String(c.amount),
        type: "expense",
        scope: "pj",
        cardId: null,
        categoryId: c.categoryId,
        date: c.paidAt!,
        source: "job",
        recurringIncomeId: null,
        recurringExpenseId: null,
        installmentGroupId: null,
        createdAt: new Date(),
        jobCostId: c.id,
        jobId: c.jobId,
        jobStatus: "paid",
      });
    }

    for (const c of pendingCosts) {
      // Only include if created before or during endDate (so it appears in this month and all future months until paid)
      const createdTime = c.createdAt.getTime();
      if (createdTime <= endDate) {
        items.push({
          id: -(c.id * 10 + 4),
          description: `${costJobNames[c.jobId] || "Job"} - ${c.description}`,
          amount: String(c.amount),
          type: "expense",
          scope: "pj",
          cardId: null,
          categoryId: c.categoryId,
          date: createdTime, // Use createdAt as the date it appears
          source: "job_pending",
          recurringIncomeId: null,
          recurringExpenseId: null,
          installmentGroupId: null,
          createdAt: new Date(),
          jobCostId: c.id,
          jobId: c.jobId,
          jobStatus: "pending",
        });
      }
    }
  }

  return items;
}

// ========== PARTNERS (INDICAÇÕES) ==========

export async function getPartners(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partners).where(eq(partners.userId, userId)).orderBy(asc(partners.name));
}

export async function getPartnerById(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = userId ? and(eq(partners.id, id), eq(partners.userId, userId)) : eq(partners.id, id);
  const result = await db.select().from(partners).where(conditions).limit(1);
  return result[0];
}

export async function searchPartners(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partners)
    .where(and(eq(partners.userId, userId), like(partners.name, `${query}%`)))
    .orderBy(asc(partners.name))
    .limit(10);
}

export async function createPartner(data: { userId: number; name: string; phone?: string; email?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(partners).values({
    userId: data.userId,
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    notes: data.notes || null,
  });
  // Return the inserted id
  const inserted = await db.select().from(partners)
    .where(and(eq(partners.userId, data.userId), eq(partners.name, data.name)))
    .orderBy(desc(partners.id))
    .limit(1);
  return inserted[0];
}

export async function updatePartner(id: number, data: { name?: string; phone?: string; email?: string; notes?: string }, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  const conditions = userId ? and(eq(partners.id, id), eq(partners.userId, userId)) : eq(partners.id, id);
  await db.update(partners).set(updateData).where(conditions);
}

export async function deletePartner(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Clear referredByPartnerId from jobs that reference this partner
  await db.update(jobs).set({ referredByPartnerId: null }).where(eq(jobs.referredByPartnerId, id));
  const conditions = userId ? and(eq(partners.id, id), eq(partners.userId, userId)) : eq(partners.id, id);
  await db.delete(partners).where(conditions);
}

export async function getPartnersRanking(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get start and end of month
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  
  // Count jobs per partner that were created in this month
  const result = await db.execute(
    sql`SELECT 
      p.id, p.name, p.phone, p.email,
      COUNT(j.id) as jobCount
    FROM ${partners} p
    LEFT JOIN ${jobs} j ON j.referredByPartnerId = p.id 
      AND UNIX_TIMESTAMP(j.createdAt) * 1000 >= ${startDate}
      AND UNIX_TIMESTAMP(j.createdAt) * 1000 <= ${endDate}
    WHERE p.userId = ${userId}
    GROUP BY p.id, p.name, p.phone, p.email
    HAVING COUNT(j.id) > 0
    ORDER BY jobCount DESC, p.name ASC`
  );
  
  const rows = (result as any)[0] || result;
  const data = Array.isArray(rows) ? rows : [];
  
  return data.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    jobCount: Number(row.jobCount || 0),
  }));
}

export async function getPartnersTotalRanking(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT 
      p.id, p.name, p.phone, p.email,
      COUNT(j.id) as jobCount
    FROM ${partners} p
    LEFT JOIN ${jobs} j ON j.referredByPartnerId = p.id
    WHERE p.userId = ${userId}
    GROUP BY p.id, p.name, p.phone, p.email
    ORDER BY jobCount DESC, p.name ASC`
  );
  
  const rows = (result as any)[0] || result;
  const data = Array.isArray(rows) ? rows : [];
  
  return data.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    jobCount: Number(row.jobCount || 0),
  }));
}

export async function getPartnerDetail(partnerId: number, userId?: number) {
  const db = await getDb();
  if (!db) return null;

  // Get partner info
  const conditions = userId ? and(eq(partners.id, partnerId), eq(partners.userId, userId)) : eq(partners.id, partnerId);
  const partnerResult = await db.select().from(partners).where(conditions).limit(1);
  const partner = partnerResult[0];
  if (!partner) return null;

  // Get all jobs referred by this partner
  const referredJobs = await db.select({
    id: jobs.id,
    name: jobs.name,
    clientName: jobs.clientName,
    status: jobs.status,
    startDate: jobs.startDate,
    endDate: jobs.endDate,
    totalCharged: jobs.totalCharged,
    createdAt: jobs.createdAt,
  }).from(jobs).where(eq(jobs.referredByPartnerId, partnerId)).orderBy(sql`${jobs.createdAt} DESC`);

  // Calculate revenue stats
  let totalRevenue = 0;
  let totalJobs = referredJobs.length;
  let completedJobs = 0;
  let activeJobs = 0;

  for (const job of referredJobs) {
    if (job.totalCharged) {
      totalRevenue += parseFloat(String(job.totalCharged));
    }
    if (job.status === 'completed') completedJobs++;
    if (job.status === 'in_progress') activeJobs++;
  }

  return {
    partner,
    jobs: referredJobs,
    stats: {
      totalJobs,
      completedJobs,
      activeJobs,
      totalRevenue,
    },
  };
}

// ==================== CASH BALANCE ====================

export async function getCashBalance(userId?: number): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  const userFilter = userId ? eq(cashBalance.userId, userId) : undefined;
  const rows = await db.select().from(cashBalance).where(userFilter).limit(1);
  if (rows.length === 0) {
    // Initialize with 0
    await db.insert(cashBalance).values({ balance: "0", userId: userId || 1 } as any);
    return "0";
  }
  return String(rows[0].balance);
}

export async function updateCashBalance(newBalance: string, description: string, type: "deposit" | "withdrawal" | "adjustment", userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  const currentBalance = await getCashBalance(userId);
  const amount = String(Math.abs(parseFloat(newBalance) - parseFloat(currentBalance)));
  
  // Record movement
  await db.insert(cashMovements).values({
    type,
    amount,
    previousBalance: currentBalance,
    newBalance: newBalance,
    description,
    date: Date.now(),
    userId: userId || 1,
  } as any);
  
  // Update balance
  const userFilter = userId ? eq(cashBalance.userId, userId) : undefined;
  const rows = await db.select().from(cashBalance).where(userFilter).limit(1);
  if (rows.length === 0) {
    await db.insert(cashBalance).values({ balance: newBalance, userId: userId || 1 } as any);
  } else {
    await db.update(cashBalance).set({ balance: newBalance }).where(eq(cashBalance.id, rows[0].id));
  }
  
  return { balance: newBalance };
}

export async function addCashMovement(data: { type: "deposit" | "withdrawal" | "adjustment"; amount: string; description: string }, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  const currentBalance = await getCashBalance(userId);
  const currentNum = parseFloat(currentBalance);
  const amountNum = parseFloat(data.amount);
  
  let newBalanceNum: number;
  if (data.type === "deposit") {
    newBalanceNum = currentNum + amountNum;
  } else if (data.type === "withdrawal") {
    newBalanceNum = currentNum - amountNum;
  } else {
    // adjustment - amount IS the new balance
    newBalanceNum = amountNum;
  }
  
  const newBalance = newBalanceNum.toFixed(2);
  
  await db.insert(cashMovements).values({
    type: data.type,
    amount: data.amount,
    previousBalance: currentBalance,
    newBalance,
    description: data.description,
    date: Date.now(),
    userId: userId || 1,
  } as any);
  
  // Update balance
  const userFilter = userId ? eq(cashBalance.userId, userId) : undefined;
  const rows = await db.select().from(cashBalance).where(userFilter).limit(1);
  if (rows.length === 0) {
    await db.insert(cashBalance).values({ balance: newBalance, userId: userId || 1 } as any);
  } else {
    await db.update(cashBalance).set({ balance: newBalance }).where(eq(cashBalance.id, rows[0].id));
  }
  
  return { balance: newBalance };
}

export async function getCashMovements(limit = 50, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) return db.select().from(cashMovements).where(eq(cashMovements.userId, userId)).orderBy(sql`${cashMovements.date} DESC`).limit(limit);
  return db.select().from(cashMovements).orderBy(sql`${cashMovements.date} DESC`).limit(limit);
}

// ==================== COMPANY DATA ====================

export async function getCompanyData(userId?: number) {
  const db = await getDb();
  if (!db) return null;
  if (userId) {
    const rows = await db.select().from(companyData).where(eq(companyData.userId, userId)).limit(1);
    return rows[0] || null;
  }
  const rows = await db.select().from(companyData).limit(1);
  return rows[0] || null;
}

export async function upsertCompanyData(data: Partial<{
  cnpj: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnae: string | null;
  capitalSocial: string | null;
  dataAbertura: string | null;
  situacao: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  email: string | null;
  telefone: string | null;
  logoUrl: string | null;
}>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  const conditions: any[] = [];
  if (userId) conditions.push(eq(companyData.userId, userId));
  const existing = conditions.length > 0 
    ? await db.select().from(companyData).where(and(...conditions)).limit(1)
    : await db.select().from(companyData).limit(1);
  if (existing.length === 0) {
    await db.insert(companyData).values({ ...data, ...(userId ? { userId } : {}) } as any);
  } else {
    await db.update(companyData).set(data as any).where(eq(companyData.id, existing[0].id));
  }
  return { success: true };
}


// ===== GOALS (METAS) =====
import { goals } from "../drizzle/schema";

export async function getGoals(year: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(goals.year, year)];
  if (userId) conditions.push(eq(goals.userId, userId));
  return db.select().from(goals).where(and(...conditions)).orderBy(goals.month);
}

export async function getGoalsByMonth(month: number, year: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(goals.month, month), eq(goals.year, year)];
  if (userId) conditions.push(eq(goals.userId, userId));
  return db.select().from(goals).where(and(...conditions));
}

export async function createGoal(data: { title: string; type: string; targetValue: string; month: number; year: number; notes?: string | null; userId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(goals).values(data as any);
  return result;
}

export async function updateGoal(id: number, data: Partial<{ title: string; type: string; targetValue: string; month: number; year: number; notes: string | null }>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const conditions: any[] = [eq(goals.id, id)];
  if (userId) conditions.push(eq(goals.userId, userId));
  await db.update(goals).set(data as any).where(and(...conditions));
}

export async function deleteGoal(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const conditions: any[] = [eq(goals.id, id)];
  if (userId) conditions.push(eq(goals.userId, userId));
  await db.delete(goals).where(and(...conditions));
}


// ========== FEEDBACK (SUGESTÕES E BUGS) ==========

export async function createFeedback(data: { userId: number; userName?: string; type: "suggestion" | "bug"; title: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(feedback).values(data as any);
  return result;
}

export async function listFeedback(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }
  return db.select().from(feedback).orderBy(desc(feedback.createdAt));
}

export async function updateFeedbackStatus(id: number, status: string, adminNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updates: any = { status };
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  await db.update(feedback).set(updates).where(eq(feedback.id, id));
  return { updated: true };
}

export async function deleteFeedback(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(feedback).where(eq(feedback.id, id));
  return { deleted: true };
}


// ==================== Calendar Events ====================

export async function getCalendarEvents(userId: number, startDate: number, endDate: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEvents).where(
    and(
      eq(calendarEvents.userId, userId),
      gte(calendarEvents.startAt, startDate),
      lte(calendarEvents.startAt, endDate)
    )
  ).orderBy(calendarEvents.startAt);
}

export async function getCalendarEventById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  return result[0] || null;
}

export async function createCalendarEvent(data: { userId: number; title: string; description?: string | null; startAt: number; endAt?: number | null; allDay?: boolean; eventType?: string; color?: string; jobId?: number | null; workDayId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(calendarEvents).values({
    userId: data.userId,
    title: data.title,
    description: data.description || null,
    startAt: data.startAt,
    endAt: data.endAt || null,
    allDay: data.allDay ?? false,
    eventType: (data.eventType as any) || "manual",
    color: data.color || "#EE770E",
    jobId: data.jobId || null,
    workDayId: data.workDayId || null,
  } as any);
  return { insertId: Number((result as any)[0].insertId) };
}

export async function updateCalendarEvent(id: number, data: Partial<{ title: string; description: string | null; startAt: number; endAt: number | null; allDay: boolean; color: string }>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startAt !== undefined) updateData.startAt = data.startAt;
  if (data.endAt !== undefined) updateData.endAt = data.endAt;
  if (data.allDay !== undefined) updateData.allDay = data.allDay;
  if (data.color !== undefined) updateData.color = data.color;
  const conditions: any[] = [eq(calendarEvents.id, id)];
  if (userId) conditions.push(eq(calendarEvents.userId, userId));
  await db.update(calendarEvents).set(updateData).where(and(...conditions));
}

export async function deleteCalendarEvent(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const conditions: any[] = [eq(calendarEvents.id, id)];
  if (userId) conditions.push(eq(calendarEvents.userId, userId));
  await db.delete(calendarEvents).where(and(...conditions));
}

export async function getAllCalendarEventsForFeed(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(calendarEvents.startAt);
}

// ==================== QUOTATIONS ====================

export async function getNextQuotationNumber(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "001/" + new Date().getFullYear();
  const year = new Date().getFullYear();
  const existing = await db.select({ number: quotations.number })
    .from(quotations)
    .where(and(eq(quotations.userId, userId), like(quotations.number, `%/${year}`)))
    .orderBy(desc(quotations.id))
    .limit(1);
  if (existing.length === 0) return `001/${year}`;
  const lastNum = parseInt(existing[0].number.split("/")[0], 10);
  return `${String(lastNum + 1).padStart(3, "0")}/${year}`;
}

export async function createQuotation(data: Omit<InsertQuotation, "id" | "createdAt" | "updatedAt">, items: Omit<InsertQuotationItem, "id" | "quotationId">[]) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(quotations).values(data as any);
  const quotationId = (result as any).insertId;
  if (items.length > 0) {
    await db.insert(quotationItems).values(items.map((item, idx) => ({
      ...item,
      quotationId,
      sortOrder: idx,
    })));
  }
  return quotationId as number;
}

export async function getQuotations(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(quotations.userId, userId)];
  if (status && status !== "all") {
    conditions.push(eq(quotations.status, status));
  }
  return db.select().from(quotations).where(and(...conditions)).orderBy(desc(quotations.createdAt));
}

export async function getQuotationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [quotation] = await db.select().from(quotations).where(and(eq(quotations.id, id), eq(quotations.userId, userId)));
  if (!quotation) return null;
  const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, id)).orderBy(quotationItems.sortOrder);
  return { ...quotation, items };
}

export async function updateQuotation(id: number, userId: number, data: Partial<InsertQuotation>, items?: Omit<InsertQuotationItem, "id" | "quotationId">[]) {
  const db = await getDb();
  if (!db) return false;
  await db.update(quotations).set(data as any).where(and(eq(quotations.id, id), eq(quotations.userId, userId)));
  if (items !== undefined) {
    await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
    if (items.length > 0) {
      await db.insert(quotationItems).values(items.map((item, idx) => ({
        ...item,
        quotationId: id,
        sortOrder: idx,
      })));
    }
  }
  return true;
}

export async function deleteQuotation(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
  await db.delete(quotations).where(and(eq(quotations.id, id), eq(quotations.userId, userId)));
  return true;
}

export async function updateQuotationStatus(id: number, userId: number, status: string) {
  const db = await getDb();
  if (!db) return false;
  await db.update(quotations).set({ status }).where(and(eq(quotations.id, id), eq(quotations.userId, userId)));
  return true;
}

export async function duplicateQuotation(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const original = await getQuotationById(id, userId);
  if (!original) return null;
  const newNumber = await getNextQuotationNumber(userId);
  const { id: _id, items, createdAt, updatedAt, jobId, ...rest } = original;
  const newId = await createQuotation(
    { ...rest, number: newNumber, status: "draft", issueDate: new Date() },
    items.map(({ id: _iid, quotationId: _qid, ...item }) => item)
  );
  return newId;
}
