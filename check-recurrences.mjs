import { readFileSync } from "fs";
import mysql from "mysql2/promise";

const envContent = readFileSync("/home/ubuntu/financeiro-euge/.env", "utf8");
const dbUrl = envContent.match(/DATABASE_URL=(.*)/)?.[1]?.trim();
if (!dbUrl) { console.error("No DATABASE_URL found"); process.exit(1); }

const conn = await mysql.createConnection(dbUrl);

const [recExpenses] = await conn.query("SELECT id, description, amount, frequency, startDate, endDate, isActive FROM recurringExpenses");
console.log("=== RECURRING EXPENSES ===");
for (const r of recExpenses) {
  console.log(`  ID=${r.id} desc="${r.description}" amount=${r.amount} freq=${r.frequency} start=${new Date(Number(r.startDate)).toISOString()} end=${r.endDate ? new Date(Number(r.endDate)).toISOString() : "null"} active=${r.isActive}`);
}

const [recIncome] = await conn.query("SELECT id, description, amount, frequency, startDate, endDate, isActive FROM recurringIncome");
console.log("\n=== RECURRING INCOME ===");
for (const r of recIncome) {
  console.log(`  ID=${r.id} desc="${r.description}" amount=${r.amount} freq=${r.frequency} start=${new Date(Number(r.startDate)).toISOString()} end=${r.endDate ? new Date(Number(r.endDate)).toISOString() : "null"} active=${r.isActive}`);
}

const [monthCounts] = await conn.query(`
  SELECT 
    DATE_FORMAT(FROM_UNIXTIME(date/1000), '%Y-%m') as month,
    type,
    COUNT(*) as cnt,
    SUM(amount) as total
  FROM transactions 
  WHERE source='recurring'
  GROUP BY month, type
  ORDER BY month
`);
console.log("\n=== RECURRING TX PER MONTH ===");
for (const m of monthCounts) {
  console.log(`  ${m.month} ${m.type}: count=${m.cnt} total=${m.total}`);
}

const [totalTx] = await conn.query("SELECT COUNT(*) as cnt FROM transactions WHERE source='recurring'");
console.log(`\nTotal recurring transactions: ${totalTx[0].cnt}`);

await conn.end();
