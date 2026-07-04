import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const db = drizzle(conn);

  console.log("=== TELEGRAM TRANSACTIONS - cardId and categoryId ===");
  const tg = await db.execute(sql`SELECT id, description, amount, cardId, categoryId, scope FROM transactions WHERE source = 'telegram' ORDER BY id DESC LIMIT 34`);
  console.table(tg[0]);

  console.log("\n=== USER'S CARDS ===");
  const cards = await db.execute(sql`SELECT id, name, lastDigits, userId FROM cards WHERE userId = 1`);
  console.table(cards[0]);

  console.log("\n=== USER'S CATEGORIES ===");
  const cats = await db.execute(sql`SELECT id, name, userId FROM categories WHERE userId = 1`);
  console.table(cats[0]);

  await conn.end();
}

main().catch(console.error);
