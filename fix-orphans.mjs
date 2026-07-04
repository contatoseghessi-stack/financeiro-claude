import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

// Check orphan references
const orphanInc = await db.execute(sql`SELECT ri.id, ri.description, ri.clientId FROM recurringincome ri LEFT JOIN clients c ON ri.clientId = c.id WHERE c.id IS NULL`);
const rows = (orphanInc)[0] || orphanInc;
console.log('Orphan recurringIncome:', JSON.stringify(rows));

if (Array.isArray(rows) && rows.length > 0) {
  console.log('Fixing: making clientId nullable and clearing orphan refs...');
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.execute(sql`ALTER TABLE recurringincome MODIFY clientId int NULL`);
  await db.execute(sql`UPDATE recurringincome SET clientId = NULL WHERE clientId NOT IN (SELECT id FROM clients)`);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  console.log('Fixed orphan references!');
} else {
  console.log('No orphan references found.');
}

// Verify
const final = await db.execute(sql`SELECT id, description, amount, clientId FROM recurringincome`);
console.log('Final recurringIncome:', JSON.stringify((final)[0] || final));

process.exit(0);
