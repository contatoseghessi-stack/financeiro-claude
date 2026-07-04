import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import { recurringIncome, recurringExpenses, suppliers, clients } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

// Desabilitar FK checks temporariamente
await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

// Remover receitas recorrentes que NÃO são Iguatemi
await db.execute(sql`DELETE FROM recurringincome WHERE LOWER(description) NOT LIKE '%iguatemi%'`);
console.log("Removidas receitas recorrentes de teste (mantendo Iguatemi)");

// Remover TODAS as despesas recorrentes
await db.delete(recurringExpenses);
console.log("Removidas todas as despesas recorrentes de teste");

// Remover TODOS os fornecedores
await db.delete(suppliers);
console.log("Removidos todos os fornecedores de teste");

// Remover contratantes de teste (todos)
await db.delete(clients);
console.log("Removidos todos os contratantes de teste");

// Reabilitar FK checks
await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

// Verificar resultado
const remainingIncomes = await db.select().from(recurringIncome);
console.log(`\n=== RESULTADO FINAL ===`);
console.log(`Receitas recorrentes restantes: ${remainingIncomes.length}`);
for (const r of remainingIncomes) {
  console.log(`  ${r.description}: R$ ${r.amount} (${r.frequency})`);
}

const remainingExpenses = await db.select().from(recurringExpenses);
console.log(`Despesas recorrentes restantes: ${remainingExpenses.length}`);

const remainingSuppliers = await db.select().from(suppliers);
console.log(`Fornecedores restantes: ${remainingSuppliers.length}`);

const remainingClients = await db.select().from(clients);
console.log(`Contratantes restantes: ${remainingClients.length}`);

process.exit(0);
