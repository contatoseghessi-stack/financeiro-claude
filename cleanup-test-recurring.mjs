import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

// Delete test recurring expenses transactions
await db.execute(sql`DELETE FROM transactions WHERE recurringExpenseId IN (30009, 30010)`);
console.log("Deleted test recurring expense transactions");

// Delete test recurring expenses
await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
await db.execute(sql`DELETE FROM recurringExpenses WHERE id IN (30009, 30010)`);
await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
console.log("Deleted test recurring expenses");

// Verify what's left
const remaining = await db.execute(sql`SELECT * FROM recurringIncome WHERE isActive = 1`);
console.log("Remaining recurring income:", remaining[0]);

const remainingExp = await db.execute(sql`SELECT * FROM recurringExpenses WHERE isActive = 1`);
console.log("Remaining recurring expenses:", remainingExp[0]);

const txCount = await db.execute(sql`SELECT source, COUNT(*) as cnt FROM transactions GROUP BY source`);
console.log("Transaction counts by source:", txCount[0]);

process.exit(0);
