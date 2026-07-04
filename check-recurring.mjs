import { drizzle } from 'drizzle-orm/mysql2';
import { recurringIncome, recurringExpenses, transactions } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

const incomes = await db.select().from(recurringIncome);
console.log("=== RECEITAS RECORRENTES ===");
for (const r of incomes) {
  console.log(`  ${r.description}: R$ ${r.amount} (${r.frequency})`);
}
console.log(`Total: ${incomes.length} receitas recorrentes\n`);

const expenses = await db.select().from(recurringExpenses);
console.log("=== DESPESAS RECORRENTES ===");
for (const r of expenses) {
  console.log(`  ${r.description}: R$ ${r.amount} (${r.frequency})`);
}
console.log(`Total: ${expenses.length} despesas recorrentes`);

process.exit(0);
