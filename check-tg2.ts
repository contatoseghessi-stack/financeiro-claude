import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const db = drizzle(conn);

  console.log("=== TELEGRAM SOURCE TRANSACTIONS ===");
  const tg = await db.execute(sql`SELECT id, description, date, source, userId, categoryId, createdAt FROM transactions WHERE source = 'telegram' ORDER BY id DESC LIMIT 10`);
  console.table(tg[0]);

  console.log("\n=== MOST RECENT TRANSACTION (any source) ===");
  const recent = await db.execute(sql`SELECT id, description, date, source, userId, categoryId, createdAt FROM transactions ORDER BY id DESC LIMIT 5`);
  console.table(recent[0]);

  console.log("\n=== INVOICE UPLOADS ===");
  const uploads = await db.execute(sql`SELECT * FROM invoiceUploads ORDER BY id DESC LIMIT 5`);
  console.table(uploads[0]);

  await conn.end();
}

main().catch(console.error);
