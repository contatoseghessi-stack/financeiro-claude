/**
 * Multi-tenancy refactoring plan:
 * 
 * Strategy: Add userId parameter to db.ts functions and filter/inject in routers.ts
 * 
 * Tables with userId column:
 * - cards, categories, transactions, taxReminders, telegramSessions, workDays,
 *   invoiceUploads, emailReports, cardStatements, serviceInvoices, productInvoices,
 *   suppliers, clients, recurringIncome, recurringExpenses, jobs, categoryLearning,
 *   quotes, assets, partners, cashBalance, cashMovements, companyData, goals
 * 
 * Child tables (inherit userId from parent via jobId/quoteId):
 * - jobDeliveries, jobCosts, jobPayments (via jobs.userId)
 * - quoteItems (via quotes.userId)
 * 
 * Tables that DON'T need userId filtering:
 * - users (is the user table itself)
 * - accountantInvites (uses invitedBy/acceptedBy)
 * - telegramSessions (uses chatId, userId is nullable for linking)
 * 
 * Functions that need userId parameter added:
 * 
 * READ functions (need userId filter):
 * - getAllCards() → getAllCards(userId)
 * - getAllCategories() → getAllCategories(userId)
 * - getTransactions(filters) → getTransactions(userId, filters)
 * - getDashboardData(start, end) → getDashboardData(userId, start, end)
 * - getMonthlyTrend(months) → getMonthlyTrend(userId, months)
 * - getYearlySummary(year) → getYearlySummary(userId, year)
 * - getRecurringProjections(year) → getRecurringProjections(userId, year)
 * - getAllTaxReminders() → getAllTaxReminders(userId)
 * - getWorkDays(filters) → getWorkDays(userId, filters)
 * - getWorkDaysSummary(start, end) → getWorkDaysSummary(userId, start, end)
 * - getInvoiceUploads(filters) → getInvoiceUploads(userId, filters)
 * - getEmailReports() → getEmailReports(userId)
 * - getCardStatements(filters) → getCardStatements(userId, filters)
 * - getServiceInvoices(filters) → getServiceInvoices(userId, filters)
 * - getProductInvoices(filters) → getProductInvoices(userId, filters)
 * - getSuppliers() → getSuppliers(userId)
 * - searchSuppliers(query) → searchSuppliers(userId, query)
 * - getClients() → getClients(userId)
 * - getRecurringIncome() → getRecurringIncome(userId)
 * - getRecurringExpenses() → getRecurringExpenses(userId)
 * - getUpcomingRecurrences() → getUpcomingRecurrences(userId)
 * - getJobs(filters) → getJobs(userId, filters)
 * - getJobsMonthSummary(start, end) → getJobsMonthSummary(userId, start, end)
 * - getAllCategoryLearnings() → getAllCategoryLearnings(userId)
 * - getQuotes(filters) → getQuotes(userId, filters)
 * - listAssets() → listAssets(userId)
 * - getCashFlowProjection(months) → getCashFlowProjection(userId, months)
 * - getJobsProfitability() → getJobsProfitability(userId)
 * - getDRE(year, month) → getDRE(userId, year, month)
 * - getDREAnual(year) → getDREAnual(userId, year)
 * - getInstallmentGroups(scope) → getInstallmentGroups(userId, scope)
 * - getAnnualIRSummary(year) → getAnnualIRSummary(userId, year)
 * - getProLaboreSuggestion(months) → getProLaboreSuggestion(userId, months)
 * - getJobTransactionItems(start, end, type) → getJobTransactionItems(userId, start, end, type)
 * - getCashBalance() → getCashBalance(userId)
 * - getCashMovements(limit) → getCashMovements(userId, limit)
 * - getCompanyData() → getCompanyData(userId)
 * - getGoals(year) → getGoals(userId, year)
 * - getGoalsByMonth(month, year) → getGoalsByMonth(userId, month, year)
 * - getUncategorizedTransactions(month, year) → getUncategorizedTransactions(userId, month, year)
 * 
 * WRITE functions (need userId in insert):
 * - createTransaction(data) → needs data.userId
 * - createCategory(data) → needs userId
 * - createWorkDay(data) → needs data.userId
 * - createInvoiceUpload(data) → needs data.userId
 * - createEmailReport(data) → needs data.userId
 * - createCardStatement(data) → needs data.userId
 * - createServiceInvoice(data) → needs data.userId
 * - createProductInvoice(data) → needs data.userId
 * - createSupplier(data) → needs data.userId
 * - createClient(data) → needs data.userId
 * - createRecurringIncome(data) → needs data.userId
 * - createRecurringExpense(data) → needs data.userId
 * - createJob(data) → needs userId
 * - createQuote(data) → needs userId
 * - createAsset(data) → needs userId
 * - createGoal(data) → needs userId
 * - createInstallmentPurchase(data) → needs userId
 * - addCashMovement(data) → needs userId
 * - upsertCompanyData(data) → needs userId
 * - upsertCategoryLearning(merchant, catId) → needs userId
 * 
 * Functions that already have userId:
 * - getPartners(userId) ✓
 * - searchPartners(userId, query) ✓
 * - createPartner(data with userId) ✓
 * - getPartnersRanking(userId, month, year) ✓
 * - getPartnersTotalRanking(userId) ✓
 * 
 * Functions that DON'T need userId (operate on specific IDs):
 * - getCardById(id), getSupplierByCnpj(cnpj), getClientByCnpj(cnpj)
 * - getJobById(id), getJobDeliveries(jobId), getJobCosts(jobId), getJobPayments(jobId)
 * - getJobSummary(jobId), getQuoteById(id), getQuoteItems(quoteId)
 * - getAssetById(id), getPartnerById(id), getPartnerDetail(partnerId)
 * - updateXxx(id, data), deleteXxx(id) - operate on specific records
 * - getTransactionById(id), findDuplicateTransaction(...)
 * - lookupLearnedCategory(merchant) - global lookup is fine
 * - getRecurringIncomeByClient(clientId), getRecurringExpensesBySupplier(supplierId)
 * - generateTransactionsFromRecurringIncome/Expense(id) - operates on specific record
 * - checkAndAutoFinalizeJob(jobId) - operates on specific job
 * - getInstallmentGroup(groupId) - specific group
 */
