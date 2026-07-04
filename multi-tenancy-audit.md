# Multi-Tenancy Audit

## Tables that NEED userId:
1. cards - no userId
2. categories - no userId
3. transactions - no userId
4. taxReminders - no userId
5. workDays - no userId
6. invoiceUploads - no userId
7. cardStatements - no userId (has cardId FK)
8. serviceInvoices - no userId
9. productInvoices - no userId
10. suppliers - no userId
11. clients - no userId
12. recurringIncome - no userId
13. recurringExpenses - no userId
14. jobs - no userId
15. jobDeliveries - inherits from jobs (via jobId FK cascade)
16. jobCosts - inherits from jobs (via jobId FK cascade)
17. jobPayments - inherits from jobs (via jobId FK cascade)
18. categoryLearning - no userId
19. quotes - no userId
20. quoteItems - inherits from quotes (via quoteId FK cascade)
21. assets - no userId
22. cashBalance - no userId
23. cashMovements - no userId
24. companyData - no userId
25. goals - no userId

## Tables that ALREADY have userId:
- partners - has userId ✓

## Tables that DON'T need userId (system-level or user table):
- users (IS the user table)
- telegramSessions (linked to user via chatId)
- accountantInvites (has invitedBy which is userId)
- emailReports (could use userId but is system config)

## Strategy:
- Add userId to all "parent" tables (not child tables that cascade from parent)
- Child tables (jobDeliveries, jobCosts, jobPayments, quoteItems) inherit isolation from parent
- For queries on child tables, join with parent to filter by userId
- OR add userId to child tables too for simpler queries (recommended)

## Tables to add userId (direct column):
cards, categories, transactions, taxReminders, workDays, invoiceUploads, 
cardStatements, serviceInvoices, productInvoices, suppliers, clients,
recurringIncome, recurringExpenses, jobs, jobDeliveries, jobCosts, jobPayments,
categoryLearning, quotes, quoteItems, assets, cashBalance, cashMovements,
companyData, goals
