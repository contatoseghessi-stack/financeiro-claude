#!/usr/bin/env python3
"""
Apply multi-tenancy userId filtering to db.ts
This script modifies the db.ts file to add userId parameter to functions
and add the appropriate WHERE clause filtering.
"""
import re

DB_FILE = "/home/ubuntu/financeiro-euge/server/db.ts"

with open(DB_FILE, "r") as f:
    content = f.read()

# ============================================================
# PART 1: Add userId to READ functions (SELECT queries)
# ============================================================

# Pattern: function signature changes
replacements = [
    # getAllCards
    (
        "export async function getAllCards() {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(cards).where(eq(cards.isActive, true)).orderBy(asc(cards.id));",
        "export async function getAllCards(userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions: any[] = [eq(cards.isActive, true)];\n  if (userId) conditions.push(eq(cards.userId, userId));\n  return db.select().from(cards).where(and(...conditions)).orderBy(asc(cards.id));"
    ),
    # getAllCategories
    (
        "export async function getAllCategories() {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(categories).orderBy(asc(categories.name));",
        "export async function getAllCategories(userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  if (userId) return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name));\n  return db.select().from(categories).orderBy(asc(categories.name));"
    ),
    # getTransactions - add userId to the function
    (
        "export async function getTransactions(filters?: {\n  scope?: \"pj\" | \"pf\";\n  cardId?: number;\n  categoryId?: number;\n  startDate?: number;\n  endDate?: number;\n  type?: \"income\" | \"expense\";\n  limit?: number;\n  offset?: number;\n}) {\n  const db = await getDb();\n  if (!db) return { items: [], total: 0 };\n\n  const conditions = [];",
        "export async function getTransactions(filters?: {\n  userId?: number;\n  scope?: \"pj\" | \"pf\";\n  cardId?: number;\n  categoryId?: number;\n  startDate?: number;\n  endDate?: number;\n  type?: \"income\" | \"expense\";\n  limit?: number;\n  offset?: number;\n}) {\n  const db = await getDb();\n  if (!db) return { items: [], total: 0 };\n\n  const conditions = [];\n  if (filters?.userId) conditions.push(eq(transactions.userId, filters.userId));"
    ),
    # getAllTaxReminders
    (
        "export async function getAllTaxReminders() {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(taxReminders).where(eq(taxReminders.isActive, true)).orderBy(asc(taxReminders.dueDay));",
        "export async function getAllTaxReminders(userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions: any[] = [eq(taxReminders.isActive, true)];\n  if (userId) conditions.push(eq(taxReminders.userId, userId));\n  return db.select().from(taxReminders).where(and(...conditions)).orderBy(asc(taxReminders.dueDay));"
    ),
    # getSuppliers
    (
        "export async function getSuppliers(activeOnly = true) {\n  const db = await getDb();\n  if (!db) return [];\n\n  if (activeOnly) {\n    return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.companyName));\n  }\n  return db.select().from(suppliers).orderBy(asc(suppliers.companyName));",
        "export async function getSuppliers(activeOnly = true, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions: any[] = [];\n  if (activeOnly) conditions.push(eq(suppliers.isActive, true));\n  if (userId) conditions.push(eq(suppliers.userId, userId));\n  if (conditions.length > 0) return db.select().from(suppliers).where(and(...conditions)).orderBy(asc(suppliers.companyName));\n  return db.select().from(suppliers).orderBy(asc(suppliers.companyName));"
    ),
    # searchSuppliers
    (
        "export async function searchSuppliers(query: string) {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(suppliers)\n    .where(and(eq(suppliers.isActive, true), like(suppliers.companyName, `%${query}%`)))\n    .orderBy(asc(suppliers.companyName))\n    .limit(10);",
        "export async function searchSuppliers(query: string, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions: any[] = [eq(suppliers.isActive, true), like(suppliers.companyName, `%${query}%`)];\n  if (userId) conditions.push(eq(suppliers.userId, userId));\n  return db.select().from(suppliers)\n    .where(and(...conditions))\n    .orderBy(asc(suppliers.companyName))\n    .limit(10);"
    ),
    # getClients
    (
        "export async function getClients(activeOnly = true) {\n  const db = await getDb();\n  if (!db) return [];\n\n  if (activeOnly) {\n    return db.select().from(clients).where(eq(clients.isActive, true)).orderBy(asc(clients.companyName));\n  }\n  return db.select().from(clients).orderBy(asc(clients.companyName));",
        "export async function getClients(activeOnly = true, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions: any[] = [];\n  if (activeOnly) conditions.push(eq(clients.isActive, true));\n  if (userId) conditions.push(eq(clients.userId, userId));\n  if (conditions.length > 0) return db.select().from(clients).where(and(...conditions)).orderBy(asc(clients.companyName));\n  return db.select().from(clients).orderBy(asc(clients.companyName));"
    ),
    # getRecurringIncome
    (
        "export async function getRecurringIncome(activeOnly = true) {\n  const db = await getDb();\n  if (!db) return [];\n\n  if (activeOnly) {\n    return db.select().from(recurringIncome).where(eq(recurringIncome.isActive, true)).orderBy(asc(recurringIncome.nextOccurrence));\n  }\n  return db.select().from(recurringIncome).orderBy(asc(recurringIncome.nextOccurrence));",
        "export async function getRecurringIncome(activeOnly = true, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions: any[] = [];\n  if (activeOnly) conditions.push(eq(recurringIncome.isActive, true));\n  if (userId) conditions.push(eq(recurringIncome.userId, userId));\n  if (conditions.length > 0) return db.select().from(recurringIncome).where(and(...conditions)).orderBy(asc(recurringIncome.nextOccurrence));\n  return db.select().from(recurringIncome).orderBy(asc(recurringIncome.nextOccurrence));"
    ),
    # getRecurringExpenses
    (
        "export async function getRecurringExpenses(activeOnly = true) {\n  const db = await getDb();\n  if (!db) return [];\n\n  if (activeOnly) {\n    return db.select().from(recurringExpenses).where(eq(recurringExpenses.isActive, true)).orderBy(asc(recurringExpenses.nextOccurrence));\n  }\n  return db.select().from(recurringExpenses).orderBy(asc(recurringExpenses.nextOccurrence));",
        "export async function getRecurringExpenses(activeOnly = true, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions: any[] = [];\n  if (activeOnly) conditions.push(eq(recurringExpenses.isActive, true));\n  if (userId) conditions.push(eq(recurringExpenses.userId, userId));\n  if (conditions.length > 0) return db.select().from(recurringExpenses).where(and(...conditions)).orderBy(asc(recurringExpenses.nextOccurrence));\n  return db.select().from(recurringExpenses).orderBy(asc(recurringExpenses.nextOccurrence));"
    ),
    # getUpcomingRecurrences
    (
        "export async function getUpcomingRecurrences(daysAhead = 7) {\n  const db = await getDb();\n  if (!db) return { income: [], expenses: [] };\n\n  const now = Date.now();\n  const future = now + daysAhead * 24 * 60 * 60 * 1000;\n\n  const [income, expenses] = await Promise.all([\n    db.select().from(recurringIncome)\n      .where(and(\n        eq(recurringIncome.isActive, true),\n        gte(recurringIncome.nextOccurrence, now),\n        lte(recurringIncome.nextOccurrence, future)\n      )),\n    db.select().from(recurringExpenses)\n      .where(and(\n        eq(recurringExpenses.isActive, true),\n        gte(recurringExpenses.nextOccurrence, now),\n        lte(recurringExpenses.nextOccurrence, future)\n      )),\n  ]);\n\n  return { income, expenses };",
        "export async function getUpcomingRecurrences(daysAhead = 7, userId?: number) {\n  const db = await getDb();\n  if (!db) return { income: [], expenses: [] };\n\n  const now = Date.now();\n  const future = now + daysAhead * 24 * 60 * 60 * 1000;\n\n  const incomeConditions: any[] = [eq(recurringIncome.isActive, true), gte(recurringIncome.nextOccurrence, now), lte(recurringIncome.nextOccurrence, future)];\n  const expenseConditions: any[] = [eq(recurringExpenses.isActive, true), gte(recurringExpenses.nextOccurrence, now), lte(recurringExpenses.nextOccurrence, future)];\n  if (userId) { incomeConditions.push(eq(recurringIncome.userId, userId)); expenseConditions.push(eq(recurringExpenses.userId, userId)); }\n\n  const [income, expenses] = await Promise.all([\n    db.select().from(recurringIncome).where(and(...incomeConditions)),\n    db.select().from(recurringExpenses).where(and(...expenseConditions)),\n  ]);\n\n  return { income, expenses };"
    ),
    # getJobs
    (
        "export async function getJobs(filters?: { status?: string; clientId?: number; startDate?: number; endDate?: number }) {",
        "export async function getJobs(filters?: { userId?: number; status?: string; clientId?: number; startDate?: number; endDate?: number }) {"
    ),
    # getWorkDays
    (
        "export async function getWorkDays(filters?: { clientName?: string; month?: number; year?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];",
        "export async function getWorkDays(filters?: { userId?: number; clientName?: string; month?: number; year?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];\n  if (filters?.userId) conditions.push(eq(workDays.userId, filters.userId));"
    ),
    # getInvoiceUploads
    (
        "export async function getInvoiceUploads(filters?: { status?: string; cardId?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];",
        "export async function getInvoiceUploads(filters?: { userId?: number; status?: string; cardId?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];\n  if (filters?.userId) conditions.push(eq(invoiceUploads.userId, filters.userId));"
    ),
    # getEmailReports
    (
        "export async function getEmailReports(activeOnly = true) {\n  const db = await getDb();\n  if (!db) return [];\n\n  if (activeOnly) {\n    return db.select().from(emailReports).where(eq(emailReports.isActive, true));\n  }\n\n  return db.select().from(emailReports);",
        "export async function getEmailReports(activeOnly = true, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions: any[] = [];\n  if (activeOnly) conditions.push(eq(emailReports.isActive, true));\n  if (userId) conditions.push(eq(emailReports.userId, userId));\n  if (conditions.length > 0) return db.select().from(emailReports).where(and(...conditions));\n  return db.select().from(emailReports);"
    ),
    # getCardStatements
    (
        "export async function getCardStatements(filters?: { cardId?: number; month?: number; year?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];",
        "export async function getCardStatements(filters?: { userId?: number; cardId?: number; month?: number; year?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];\n  if (filters?.userId) conditions.push(eq(cardStatements.userId, filters.userId));"
    ),
    # getServiceInvoices
    (
        "export async function getServiceInvoices(filters?: { supplierId?: number; status?: string }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];",
        "export async function getServiceInvoices(filters?: { userId?: number; supplierId?: number; status?: string }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];\n  if (filters?.userId) conditions.push(eq(serviceInvoices.userId, filters.userId));"
    ),
    # getProductInvoices
    (
        "export async function getProductInvoices(filters?: { supplierId?: number; status?: string }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];",
        "export async function getProductInvoices(filters?: { userId?: number; supplierId?: number; status?: string }) {\n  const db = await getDb();\n  if (!db) return [];\n\n  let conditions: any[] = [];\n  if (filters?.userId) conditions.push(eq(productInvoices.userId, filters.userId));"
    ),
    # getQuotes
    (
        "export async function getQuotes(filters?: { status?: string; clientId?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions = [];",
        "export async function getQuotes(filters?: { userId?: number; status?: string; clientId?: number }) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions = [];\n  if (filters?.userId) conditions.push(eq(quotes.userId, filters.userId));"
    ),
    # listAssets
    (
        "export async function listAssets() {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(assets).orderBy(desc(assets.purchaseDate));",
        "export async function listAssets(userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  if (userId) return db.select().from(assets).where(eq(assets.userId, userId)).orderBy(desc(assets.purchaseDate));\n  return db.select().from(assets).orderBy(desc(assets.purchaseDate));"
    ),
    # getCashBalance
    (
        "export async function getCashBalance(): Promise<string> {",
        "export async function getCashBalance(userId?: number): Promise<string> {"
    ),
    # getCashMovements
    (
        "export async function getCashMovements(limit = 50) {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(cashMovements).orderBy(sql`${cashMovements.date} DESC`).limit(limit);",
        "export async function getCashMovements(limit = 50, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  if (userId) return db.select().from(cashMovements).where(eq(cashMovements.userId, userId)).orderBy(sql`${cashMovements.date} DESC`).limit(limit);\n  return db.select().from(cashMovements).orderBy(sql`${cashMovements.date} DESC`).limit(limit);"
    ),
    # getCompanyData
    (
        "export async function getCompanyData() {\n  const db = await getDb();\n  if (!db) return null;\n  const rows = await db.select().from(companyData).limit(1);\n  return rows[0] || null;",
        "export async function getCompanyData(userId?: number) {\n  const db = await getDb();\n  if (!db) return null;\n  if (userId) {\n    const rows = await db.select().from(companyData).where(eq(companyData.userId, userId)).limit(1);\n    return rows[0] || null;\n  }\n  const rows = await db.select().from(companyData).limit(1);\n  return rows[0] || null;"
    ),
    # getGoals
    (
        "export async function getGoals(year: number) {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(goals).where(eq(goals.year, year)).orderBy(goals.month);",
        "export async function getGoals(year: number, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions: any[] = [eq(goals.year, year)];\n  if (userId) conditions.push(eq(goals.userId, userId));\n  return db.select().from(goals).where(and(...conditions)).orderBy(goals.month);"
    ),
    # getGoalsByMonth
    (
        "export async function getGoalsByMonth(month: number, year: number) {\n  const db = await getDb();\n  if (!db) return [];\n  return db.select().from(goals).where(and(eq(goals.month, month), eq(goals.year, year)));",
        "export async function getGoalsByMonth(month: number, year: number, userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n  const conditions: any[] = [eq(goals.month, month), eq(goals.year, year)];\n  if (userId) conditions.push(eq(goals.userId, userId));\n  return db.select().from(goals).where(and(...conditions));"
    ),
    # getInstallmentGroups
    (
        "export async function getInstallmentGroups(scope?: \"pj\" | \"pf\") {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions = [sql`${transactions.installmentGroupId} IS NOT NULL`];",
        "export async function getInstallmentGroups(scope?: \"pj\" | \"pf\", userId?: number) {\n  const db = await getDb();\n  if (!db) return [];\n\n  const conditions = [sql`${transactions.installmentGroupId} IS NOT NULL`];\n  if (userId) conditions.push(eq(transactions.userId, userId));"
    ),
    # getAllCategoryLearnings
    (
        "export async function getAllCategoryLearnings(): Promise<CategoryLearning[]> {\n  const db = await getDb();\n  return db!.select().from(categoryLearning).orderBy(desc(categoryLearning.confirmCount));",
        "export async function getAllCategoryLearnings(userId?: number): Promise<CategoryLearning[]> {\n  const db = await getDb();\n  if (userId) return db!.select().from(categoryLearning).where(eq(categoryLearning.userId, userId)).orderBy(desc(categoryLearning.confirmCount));\n  return db!.select().from(categoryLearning).orderBy(desc(categoryLearning.confirmCount));"
    ),
]

# Add userId filter to getJobs (inside the function body)
replacements.append((
    "  const conditions: any[] = [];\n  if (filters?.status) conditions.push(eq(jobs.status, filters.status as any));\n  if (filters?.clientId) conditions.push(eq(jobs.clientId, filters.clientId));\n  if (filters?.startDate) conditions.push(sql`${jobs.startDate} >= ${filters.startDate}`);\n  if (filters?.endDate) conditions.push(sql`${jobs.endDate} <= ${filters.endDate}`);",
    "  const conditions: any[] = [];\n  if (filters?.userId) conditions.push(eq(jobs.userId, filters.userId));\n  if (filters?.status) conditions.push(eq(jobs.status, filters.status as any));\n  if (filters?.clientId) conditions.push(eq(jobs.clientId, filters.clientId));\n  if (filters?.startDate) conditions.push(sql`${jobs.startDate} >= ${filters.startDate}`);\n  if (filters?.endDate) conditions.push(sql`${jobs.endDate} <= ${filters.endDate}`);"
))

# Apply all replacements
applied = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        applied += 1
    else:
        # Try to find partial match
        first_line = old.split('\n')[0]
        if first_line in content:
            print(f"PARTIAL MATCH (first line found): {first_line[:80]}...")
        else:
            print(f"NOT FOUND: {first_line[:80]}...")

print(f"\nApplied {applied}/{len(replacements)} replacements")

# Write the modified file
with open(DB_FILE, "w") as f:
    f.write(content)

print("Done! db.ts has been updated with userId parameters.")
