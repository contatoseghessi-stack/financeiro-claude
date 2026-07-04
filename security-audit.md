# Security Audit Findings

## CRITICAL - Missing userId in routers.ts (IDOR vulnerabilities)

### 1. recurringIncome.delete (line ~1098) - NO userId passed
```
deleteTransactionsFromRecurringIncome(input.id) - no userId
deleteRecurringIncome(input.id) - no userId (function supports it!)
```

### 2. recurringExpense.delete (line ~1145) - NO userId passed
```
deleteTransactionsFromRecurringExpense(input.id) - no userId
deleteRecurringExpense(input.id) - no userId (function supports it!)
```

### 3. emailReports.delete (line ~823) - NO userId passed
```
deleteEmailReport(input.id) - no userId (function supports it!)
```

### 4. quotes.getById (line ~1365) - NO ownership check
```
getQuoteById(input.id) - returns any user's quote
```

### 5. quotes.convertToJob (line ~1400) - NO ownership check
```
getQuoteById(input.id) - no ownership verification before converting
```

### 6. assets.getById (line ~1515) - NO ownership check
```
getAssetById(input.id) - returns any user's asset
```

### 7. assets.delete (line ~1550) - NO userId passed
```
deleteAsset(input.id) - no userId (function supports it!)
```

### 8. invoiceUploads.getById (line ~796) - NO ownership check
```
getInvoiceUploadById(input.id) - returns any user's invoice
```

### 9. jobs.costs.list (line ~1264) - NO job ownership verification
```
getJobCosts(input.jobId) - anyone can list costs of any job
```

### 10. jobs.costs.create (line ~1277) - NO job ownership verification
```
createJobCost(input) - anyone can create costs on any job
```

### 11. jobs.payments.list (line ~1301) - NO job ownership verification
```
getJobPayments(input.jobId) - anyone can list payments of any job
```

### 12. jobs.payments.create (line ~1313) - NO job ownership verification
```
createJobPayment(input) - anyone can create payments on any job
```

### 13. deleteTransactionsFromRecurringIncome/Expense - no userId filter at all
These functions delete ALL transactions matching a recurringId without verifying ownership.

## MEDIUM - Functions where userId is optional but should be required

Many db.ts functions have `userId?: number` which means if the caller forgets to pass it, the query returns ALL users' data. The pattern `if (userId) conditions.push(...)` means without userId, no filter is applied.

## Approach to fix:
1. Add ctx.user!.id to all router calls that are missing it
2. For job sub-resources (costs, payments, deliveries), verify job ownership before operating
3. For getById calls, add ownership verification after fetching
