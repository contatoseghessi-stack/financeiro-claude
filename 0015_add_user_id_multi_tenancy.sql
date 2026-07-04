-- Multi-tenancy: Add userId to all data tables
-- Step 1: Drop foreign keys that reference tables being altered
ALTER TABLE `clients` DROP INDEX `clients_cnpj_unique`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP INDEX `suppliers_cnpj_unique`;--> statement-breakpoint
ALTER TABLE `cardStatements` DROP FOREIGN KEY `cardStatements_cardId_cards_id_fk`;--> statement-breakpoint
ALTER TABLE `categoryLearning` DROP FOREIGN KEY `categoryLearning_categoryId_categories_id_fk`;--> statement-breakpoint
ALTER TABLE `jobCosts` DROP FOREIGN KEY `jobCosts_jobId_jobs_id_fk`;--> statement-breakpoint
ALTER TABLE `jobCosts` DROP FOREIGN KEY `jobCosts_supplierId_suppliers_id_fk`;--> statement-breakpoint
ALTER TABLE `jobCosts` DROP FOREIGN KEY `jobCosts_categoryId_categories_id_fk`;--> statement-breakpoint
ALTER TABLE `jobDeliveries` DROP FOREIGN KEY `jobDeliveries_jobId_jobs_id_fk`;--> statement-breakpoint
ALTER TABLE `jobPayments` DROP FOREIGN KEY `jobPayments_jobId_jobs_id_fk`;--> statement-breakpoint
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_clientId_clients_id_fk`;--> statement-breakpoint
ALTER TABLE `quoteItems` DROP FOREIGN KEY `quoteItems_quoteId_quotes_id_fk`;--> statement-breakpoint
ALTER TABLE `quotes` DROP FOREIGN KEY `quotes_clientId_clients_id_fk`;--> statement-breakpoint
ALTER TABLE `quotes` DROP FOREIGN KEY `quotes_convertedJobId_jobs_id_fk`;--> statement-breakpoint
ALTER TABLE `recurringExpenses` DROP FOREIGN KEY `recurringExpenses_supplierId_suppliers_id_fk`;--> statement-breakpoint
ALTER TABLE `recurringExpenses` DROP FOREIGN KEY `recurringExpenses_categoryId_categories_id_fk`;--> statement-breakpoint
ALTER TABLE `recurringIncome` DROP FOREIGN KEY `recurringIncome_clientId_clients_id_fk`;--> statement-breakpoint

-- Step 2: Add userId columns as nullable first
ALTER TABLE `assets` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `cardStatements` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `cards` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `cashBalance` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `cashMovements` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `categories` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `categoryLearning` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `clients` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `companyData` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `emailReports` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `goals` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `invoiceUploads` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `jobs` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `productInvoices` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `quotes` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `recurringExpenses` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `recurringIncome` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `serviceInvoices` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `taxReminders` ADD `userId` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `telegramSessions` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `transactions` ADD `userId` int DEFAULT 1;--> statement-breakpoint

-- Step 3: Update all existing rows to userId = 1 (the owner)
UPDATE `assets` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `cardStatements` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `cards` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `cashBalance` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `cashMovements` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `categories` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `categoryLearning` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `clients` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `companyData` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `emailReports` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `goals` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `invoiceUploads` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `jobs` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `productInvoices` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `quotes` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `recurringExpenses` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `recurringIncome` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `serviceInvoices` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `suppliers` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `taxReminders` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `transactions` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint

-- Step 4: Make userId NOT NULL (except telegramSessions which stays nullable)
ALTER TABLE `assets` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cardStatements` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cashBalance` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cashMovements` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `categoryLearning` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `companyData` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `emailReports` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invoiceUploads` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `productInvoices` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `recurringExpenses` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `recurringIncome` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `serviceInvoices` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `taxReminders` MODIFY `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY `userId` int NOT NULL;
