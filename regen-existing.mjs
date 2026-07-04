import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

// Get all existing recurring income records
const incomeRecords = await db.execute(sql`SELECT * FROM recurringIncome WHERE isActive = 1`);
console.log("Existing recurring income:", incomeRecords[0].length, "records");

// Get all existing recurring expense records  
const expenseRecords = await db.execute(sql`SELECT * FROM recurringExpenses WHERE isActive = 1`);
console.log("Existing recurring expenses:", expenseRecords[0].length, "records");

// For each recurring income, generate transactions
for (const rec of incomeRecords[0]) {
  console.log(`\nGenerating transactions for: ${rec.description} (R$ ${rec.amount})`);
  
  // Delete existing recurring transactions for this record
  await db.execute(sql`DELETE FROM transactions WHERE recurringIncomeId = ${rec.id}`);
  
  const startDate = new Date(Number(rec.startDate));
  const endDate = rec.endDate ? new Date(Number(rec.endDate)) : new Date(startDate.getFullYear() + 2, 11, 31);
  const dayOfMonth = rec.dayOfMonth || 1;
  
  const stepMonths = rec.frequency === "monthly" ? 1
    : rec.frequency === "quarterly" ? 3
    : rec.frequency === "semiannual" ? 6
    : 12;
  
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), Math.min(dayOfMonth, 28));
  let count = 0;
  
  while (current <= endDate) {
    const txDate = current.getTime();
    const desc = `${rec.description} (recorrente)`;
    const amount = rec.amount;
    
    await db.execute(sql`INSERT INTO transactions (description, amount, type, scope, source, recurringIncomeId, date) VALUES (${desc}, ${amount}, 'income', 'pj', 'recurring', ${rec.id}, ${txDate})`);
    count++;
    current = new Date(current.getFullYear(), current.getMonth() + stepMonths, Math.min(dayOfMonth, 28));
  }
  
  console.log(`  Generated ${count} transactions`);
}

// For each recurring expense, generate transactions
for (const rec of expenseRecords[0]) {
  console.log(`\nGenerating transactions for expense: ${rec.description} (R$ ${rec.amount})`);
  
  await db.execute(sql`DELETE FROM transactions WHERE recurringExpenseId = ${rec.id}`);
  
  const startDate = new Date(Number(rec.startDate));
  const endDate = rec.endDate ? new Date(Number(rec.endDate)) : new Date(startDate.getFullYear() + 2, 11, 31);
  const dayOfMonth = rec.dayOfMonth || 1;
  
  const stepMonths = rec.frequency === "monthly" ? 1
    : rec.frequency === "quarterly" ? 3
    : rec.frequency === "semiannual" ? 6
    : 12;
  
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), Math.min(dayOfMonth, 28));
  let count = 0;
  
  while (current <= endDate) {
    const txDate = current.getTime();
    const desc = `${rec.description} (recorrente)`;
    const amount = rec.amount;
    const catId = rec.categoryId || null;
    
    await db.execute(sql`INSERT INTO transactions (description, amount, type, scope, source, recurringExpenseId, categoryId, date) VALUES (${desc}, ${amount}, 'expense', 'pj', 'recurring', ${rec.id}, ${catId}, ${txDate})`);
    count++;
    current = new Date(current.getFullYear(), current.getMonth() + stepMonths, Math.min(dayOfMonth, 28));
  }
  
  console.log(`  Generated ${count} transactions`);
}

console.log("\nDone! All recurring transactions generated.");
process.exit(0);
