import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  
  const [rows] = await conn.execute(
    "SELECT id, description, cardId, categoryId FROM transactions WHERE source = 'telegram' AND id >= 3000001 ORDER BY id ASC LIMIT 10"
  );
  console.log("=== TELEGRAM TRANSACTIONS (recent) ===");
  console.table(rows);

  const [cards] = await conn.execute(
    "SELECT id, name, type, userId FROM cards WHERE userId = 1"
  );
  console.log("\n=== USER CARDS ===");
  console.table(cards);

  const [cats] = await conn.execute(
    "SELECT id, name FROM categories WHERE userId = 1 AND id >= 180001 ORDER BY id ASC"
  );
  console.log("\n=== NEW CATEGORIES (created by AI) ===");
  console.table(cats);

  await conn.end();
}

main().catch(console.error);
