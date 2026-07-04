import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "accountant"]).default("user").notNull(),
  telegramChatId: varchar("telegramChatId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "business"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  invitedBy: int("invitedBy"),
  businessType: mysqlEnum("businessType", ["mei", "simples", "autonomo"]).default("mei").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cards - cartões de crédito
 */
export const cards = mysqlTable("cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["pj", "pf"]).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1").notNull(),
  icon: varchar("icon", { length: 50 }).default("credit-card").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

/**
 * Categories - categorias de despesas
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).default("tag").notNull(),
  color: varchar("color", { length: 7 }).default("#8b5cf6").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Transactions - transações financeiras (receitas e despesas)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  scope: mysqlEnum("scope", ["pj", "pf"]).notNull(),
  cardId: int("cardId"),
  categoryId: int("categoryId"),
  source: mysqlEnum("source", ["telegram", "web", "recurring", "installment", "scan"]).default("web").notNull(),
  recurringIncomeId: int("recurringIncomeId"),
  recurringExpenseId: int("recurringExpenseId"),
  installmentGroupId: varchar("installmentGroupId", { length: 64 }),
  installmentNumber: int("installmentNumber"),
  installmentTotal: int("installmentTotal"),
  fiscalCategory: mysqlEnum("fiscalCategory", ["saude", "educacao", "moradia", "transporte", "alimentacao", "lazer", "vestuario", "servicos", "equipamentos", "software", "outros"]),
  date: bigint("date", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Tax Reminders - lembretes de impostos
 */
export const taxReminders = mysqlTable("taxReminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["das", "irpf", "other"]).notNull(),
  dueDay: int("dueDay").notNull(),
  dueMonth: int("dueMonth"),
  isRecurring: boolean("isRecurring").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastNotified: bigint("lastNotified", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaxReminder = typeof taxReminders.$inferSelect;
export type InsertTaxReminder = typeof taxReminders.$inferInsert;

/**
 * Telegram Sessions - vincular chat do Telegram ao sistema
 */
export const telegramSessions = mysqlTable("telegramSessions", {
  id: int("id").autoincrement().primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull().unique(),
  userId: int("userId").default(1),
  username: varchar("username", { length: 100 }),
  firstName: varchar("firstName", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TelegramSession = typeof telegramSessions.$inferSelect;
export type InsertTelegramSession = typeof telegramSessions.$inferInsert;

/**
 * Work Days - diárias de trabalho freelancer
 */
export const workDays = mysqlTable("workDays", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  dailyRate: decimal("dailyRate", { precision: 12, scale: 2 }).notNull(),
  date: bigint("date", { mode: "number" }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "completed", "invoiced"]).default("completed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkDay = typeof workDays.$inferSelect;
export type InsertWorkDay = typeof workDays.$inferInsert;

/**
 * Invoice Uploads - upload de faturas em PDF
 */
export const invoiceUploads = mysqlTable("invoiceUploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  cardId: int("cardId"),
  status: mysqlEnum("status", ["uploaded", "processing", "completed", "error"]).default("uploaded").notNull(),
  extractedData: text("extractedData"),
  errorMessage: text("errorMessage"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type InvoiceUpload = typeof invoiceUploads.$inferSelect;
export type InsertInvoiceUpload = typeof invoiceUploads.$inferInsert;

/**
 * Email Reports - configuração de relatórios por e-mail
 */
export const emailReports = mysqlTable("emailReports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  email: varchar("email", { length: 320 }).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "weekly"]).default("monthly").notNull(),
  dayOfMonth: int("dayOfMonth").default(1),
  isActive: boolean("isActive").default(true).notNull(),
  lastSentAt: bigint("lastSentAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailReport = typeof emailReports.$inferSelect;
export type InsertEmailReport = typeof emailReports.$inferInsert;

/**
 * Card Statements - extratos de cartão de crédito
 */
export const cardStatements = mysqlTable("cardStatements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  cardId: int("cardId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  status: mysqlEnum("status", ["uploaded", "processing", "completed", "error"]).default("uploaded").notNull(),
  extractedData: text("extractedData"),
  errorMessage: text("errorMessage"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type CardStatement = typeof cardStatements.$inferSelect;
export type InsertCardStatement = typeof cardStatements.$inferInsert;

/**
 * Service Invoices - notas fiscais de serviço contratado
 */
export const serviceInvoices = mysqlTable("serviceInvoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  supplierId: int("supplierId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  nfNumber: varchar("nfNumber", { length: 50 }),
  supplierName: varchar("supplierName", { length: 255 }),
  supplierCnpj: varchar("supplierCnpj", { length: 20 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  issueDate: bigint("issueDate", { mode: "number" }).notNull(),
  dueDate: bigint("dueDate", { mode: "number" }),
  paymentDate: bigint("paymentDate", { mode: "number" }),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type ServiceInvoice = typeof serviceInvoices.$inferSelect;
export type InsertServiceInvoice = typeof serviceInvoices.$inferInsert;

/**
 * Product Invoices - notas fiscais de compra de produto
 */
export const productInvoices = mysqlTable("productInvoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  supplierId: int("supplierId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  nfNumber: varchar("nfNumber", { length: 50 }),
  supplierName: varchar("supplierName", { length: 255 }),
  supplierCnpj: varchar("supplierCnpj", { length: 20 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  issueDate: bigint("issueDate", { mode: "number" }).notNull(),
  dueDate: bigint("dueDate", { mode: "number" }),
  paymentDate: bigint("paymentDate", { mode: "number" }),
  items: text("items"),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type ProductInvoice = typeof productInvoices.$inferSelect;
export type InsertProductInvoice = typeof productInvoices.$inferInsert;

/**
 * Suppliers - fornecedores
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  cnpj: varchar("cnpj", { length: 20 }),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Clients - contratantes/clientes
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  cnpj: varchar("cnpj", { length: 20 }),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  notes: text("notes"),
  referredBy: varchar("referredBy", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Recurring Income - recebimentos recorrentes para contratos anuais
 */
export const recurringIncome = mysqlTable("recurringIncome", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  clientId: int("clientId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "semiannual", "annual"]).notNull(),
  dayOfMonth: int("dayOfMonth").default(1),
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  endDate: bigint("endDate", { mode: "number" }),
  isActive: boolean("isActive").default(true).notNull(),
  lastOccurrence: bigint("lastOccurrence", { mode: "number" }),
  nextOccurrence: bigint("nextOccurrence", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecurringIncome = typeof recurringIncome.$inferSelect;
export type InsertRecurringIncome = typeof recurringIncome.$inferInsert;

/**
 * Recurring Expenses - cobranças recorrentes
 */
export const recurringExpenses = mysqlTable("recurringExpenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  supplierId: int("supplierId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "semiannual", "annual"]).notNull(),
  dayOfMonth: int("dayOfMonth").default(1),
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  endDate: bigint("endDate", { mode: "number" }),
  categoryId: int("categoryId"),
  isActive: boolean("isActive").default(true).notNull(),
  lastOccurrence: bigint("lastOccurrence", { mode: "number" }),
  nextOccurrence: bigint("nextOccurrence", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type InsertRecurringExpense = typeof recurringExpenses.$inferInsert;

/**
 * Jobs/Projetos - controle de projetos com receitas, custos e entregas
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }),
  referredByPartnerId: int("referredByPartnerId"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "cancelled"]).default("draft").notNull(),
  startDate: bigint("startDate", { mode: "number" }),
  endDate: bigint("endDate", { mode: "number" }),
  totalCharged: decimal("totalCharged", { precision: 12, scale: 2 }),
  jobType: mysqlEnum("jobType", ["freelance", "client"]).default("client").notNull(),
  stage: mysqlEnum("stage", ["briefing", "producao", "edicao", "entrega", "pagamento"]).default("briefing").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Job Deliveries - entregas de um job
 */
export const jobDeliveries = mysqlTable("jobDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "delivered"]).default("pending").notNull(),
  deliveredAt: bigint("deliveredAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobDelivery = typeof jobDeliveries.$inferSelect;
export type InsertJobDelivery = typeof jobDeliveries.$inferInsert;

/**
 * Job Costs - custos de um job (fornecedores contratados, aluguel, etc)
 */
export const jobCosts = mysqlTable("jobCosts", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  supplierName: varchar("supplierName", { length: 255 }),
  supplierId: int("supplierId"),
  categoryId: int("categoryId"),
  paidAt: bigint("paidAt", { mode: "number" }),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  transactionId: int("transactionId"),
  paymentSource: mysqlEnum("paymentSource", ["cash", "card"]).default("cash").notNull(),
  cardId: int("cardId"),
  linkedTransactionId: int("linkedTransactionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobCost = typeof jobCosts.$inferSelect;
export type InsertJobCost = typeof jobCosts.$inferInsert;

/**
 * Job Payments - recebimentos de um job (parcelas do cliente)
 */
export const jobPayments = mysqlTable("jobPayments", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: bigint("dueDate", { mode: "number" }).notNull(),
  receivedAt: bigint("receivedAt", { mode: "number" }),
  status: mysqlEnum("status", ["pending", "received"]).default("pending").notNull(),
  transactionId: int("transactionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobPayment = typeof jobPayments.$inferSelect;
export type InsertJobPayment = typeof jobPayments.$inferInsert;

/**
 * Category Learning - aprendizado automático de categorias por padrão de merchant/descrição
 */
export const categoryLearning = mysqlTable("categoryLearning", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  merchantPattern: varchar("merchantPattern", { length: 255 }).notNull(),
  categoryId: int("categoryId").notNull(),
  confirmCount: int("confirmCount").default(1).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CategoryLearning = typeof categoryLearning.$inferSelect;
export type InsertCategoryLearning = typeof categoryLearning.$inferInsert;

/**
 * Quotes - orçamentos/propostas comerciais
 */
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "sent", "approved", "rejected"]).default("draft").notNull(),
  validUntil: bigint("validUntil", { mode: "number" }),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  convertedJobId: int("convertedJobId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/**
 * Quote Items - itens de um orçamento (diárias, edição, equipamento, etc)
 */
export const quoteItems = mysqlTable("quoteItems", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = typeof quoteItems.$inferInsert;

/**
 * Assets - bens e patrimônio (câmeras, lentes, computadores, veículos)
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["camera", "lens", "lighting", "audio", "computer", "software", "vehicle", "furniture", "other"]).default("other").notNull(),
  purchaseValue: decimal("purchaseValue", { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal("currentValue", { precision: 12, scale: 2 }),
  purchaseDate: bigint("purchaseDate", { mode: "number" }).notNull(),
  usefulLifeYears: int("usefulLifeYears").default(5).notNull(),
  depreciationRate: decimal("depreciationRate", { precision: 5, scale: 2 }).default("20.00").notNull(),
  serialNumber: varchar("serialNumber", { length: 100 }),
  notes: text("notes"),
  scope: mysqlEnum("scope", ["pj", "pf"]).default("pj").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Accountant Invites - convites para contadora acessar o sistema
 */
export const accountantInvites = mysqlTable("accountantInvites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  invitedBy: int("invitedBy").notNull(),
  acceptedBy: int("acceptedBy"),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountantInvite = typeof accountantInvites.$inferSelect;
export type InsertAccountantInvite = typeof accountantInvites.$inferInsert;

/**
 * Partners - parceiros de indicação
 */
export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

/**
 * Cash Balance - saldo em caixa (editável manualmente)
 */
export const cashBalance = mysqlTable("cashBalance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CashBalance = typeof cashBalance.$inferSelect;

/**
 * Cash Movements - histórico de movimentações do caixa
 */
export const cashMovements = mysqlTable("cashMovements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  type: mysqlEnum("type", ["deposit", "withdrawal", "adjustment"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  previousBalance: decimal("previousBalance", { precision: 12, scale: 2 }).notNull(),
  newBalance: decimal("newBalance", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  date: bigint("date", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CashMovement = typeof cashMovements.$inferSelect;
export type InsertCashMovement = typeof cashMovements.$inferInsert;

/**
 * Company Data - dados legais da empresa
 */
export const companyData = mysqlTable("companyData", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  cnpj: varchar("cnpj", { length: 20 }),
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
  cnae: varchar("cnae", { length: 100 }),
  capitalSocial: varchar("capitalSocial", { length: 50 }),
  dataAbertura: varchar("dataAbertura", { length: 20 }),
  situacao: varchar("situacao", { length: 50 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  logoUrl: text("logoUrl"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyData = typeof companyData.$inferSelect;

/**
 * Goals - metas financeiras e de negócio
 */
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["revenue", "profit", "jobs", "custom"]).notNull(),
  targetValue: decimal("targetValue", { precision: 12, scale: 2 }).notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;


/**
 * Feedback - sugestões e bugs reportados pelos usuários
 */
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  type: mysqlEnum("type", ["suggestion", "bug"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "in_progress", "done", "dismissed"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;


/**
 * Calendar Events - eventos de agenda
 */
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startAt: bigint("startAt", { mode: "number" }).notNull(),
  endAt: bigint("endAt", { mode: "number" }),
  allDay: boolean("allDay").default(false).notNull(),
  eventType: mysqlEnum("eventType", ["manual", "job_start", "job_end", "delivery_deadline", "payment_due", "workday"]).default("manual").notNull(),
  color: varchar("color", { length: 7 }).default("#EE770E").notNull(),
  jobId: int("jobId"),
  workDayId: int("workDayId"),
  googleEventId: varchar("googleEventId", { length: 255 }),
  source: mysqlEnum("source", ["local", "google"]).default("local").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Quotations - orçamentos profissionais
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().default(1),
  number: varchar("number", { length: 20 }).notNull(), // e.g. "001/2026"
  clientId: int("clientId"), // FK to clients table (optional)
  clientName: varchar("clientName", { length: 255 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 20 }),
  clientDocument: varchar("clientDocument", { length: 20 }), // CNPJ or CPF
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, approved, rejected
  issueDate: timestamp("issueDate").notNull().defaultNow(),
  validityDays: int("validityDays").notNull().default(15),
  subtotal: varchar("subtotal", { length: 20 }).notNull().default("0"),
  discountType: varchar("discountType", { length: 10 }), // percent or fixed
  discountValue: varchar("discountValue", { length: 20 }),
  total: varchar("total", { length: 20 }).notNull().default("0"),
  paymentConditions: text("paymentConditions"), // e.g. "50% na aprovação, 50% na entrega"
  paymentMethod: varchar("paymentMethod", { length: 100 }), // PIX, transferência, etc.
  notes: text("notes"), // observações gerais
  bankDetails: text("bankDetails"), // dados bancários para rodapé
  jobId: int("jobId"), // se convertido em job
  shareToken: varchar("shareToken", { length: 64 }), // token for public link
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * QuotationItems - itens/serviços do orçamento
 */
export const quotationItems = mysqlTable("quotationItems", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitPrice: varchar("unitPrice", { length: 20 }).notNull(),
  totalPrice: varchar("totalPrice", { length: 20 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;

/**
 * Push notification subscriptions for Web Push API
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Notification preferences per user
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  recurrenceDue: boolean("recurrenceDue").default(true).notNull(),
  jobPaymentPending: boolean("jobPaymentPending").default(true).notNull(),
  quotationExpiring: boolean("quotationExpiring").default(true).notNull(),
  goalReached: boolean("goalReached").default(true).notNull(),
  planLimitReaching: boolean("planLimitReaching").default(true).notNull(),
  cardStatementDue: boolean("cardStatementDue").default(true).notNull(),
  jobWithoutDelivery: boolean("jobWithoutDelivery").default(true).notNull(),
  weeklySummary: boolean("weeklySummary").default(true).notNull(),
  irAlert: boolean("irAlert").default(true).notNull(),
  overduePayment: boolean("overduePayment").default(true).notNull(),
  dailyAgenda: boolean("dailyAgenda").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Google Calendar OAuth tokens per user
 */
export const googleCalendarTokens = mysqlTable("google_calendar_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  calendarId: varchar("calendarId", { length: 255 }).default("primary").notNull(),
  syncToken: text("syncToken"),
  lastSyncAt: bigint("lastSyncAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert;


/**
 * Temporary codes for linking Telegram accounts to app users.
 */
export const telegramLinkingCodes = mysqlTable("telegramLinkingCodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TelegramLinkingCode = typeof telegramLinkingCodes.$inferSelect;
export type InsertTelegramLinkingCode = typeof telegramLinkingCodes.$inferInsert;
