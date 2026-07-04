import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);

  // Check recent transactions
  console.log("=== RECENT TRANSACTIONS (last 15) ===");
  const txns = await db.execute(sql`SELECT id, description, date, source, userId, categoryId, createdAt FROM transactions ORDER BY id DESC LIMIT 15`);
  console.table(txns[0]);

  // Check telegram sessions
  console.log("\n=== TELEGRAM SESSIONS ===");
  const sessions = await db.execute(sql`SELECT * FROM telegramSessions`);
  console.table(sessions[0]);

  // Check if there are any transactions from today
  console.log("\n=== TRANSACTIONS FROM TODAY ===");
  const today = await db.execute(sql`SELECT id, description, date, source, userId, categoryId, createdAt FROM transactions WHERE createdAt >= '2026-07-01' ORDER BY createdAt DESC`);
  console.table(today[0]);

  await conn.end();
}

main().catch(console.error);
