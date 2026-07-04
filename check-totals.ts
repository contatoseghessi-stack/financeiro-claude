import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);

  // Total of all telegram transactions
  const [totalAll] = await conn.execute(
    "SELECT COUNT(*) as cnt, SUM(amount) as total FROM transactions WHERE source = 'telegram' AND userId = 1"
  );
  console.log("=== ALL TELEGRAM TRANSACTIONS TOTAL ===");
  console.table(totalAll);

  // Breakdown by month (using the date field which is a timestamp in ms)
  const [byMonth] = await conn.execute(`
    SELECT 
      YEAR(FROM_UNIXTIME(date/1000)) as yr,
      MONTH(FROM_UNIXTIME(date/1000)) as mo,
      COUNT(*) as cnt,
      SUM(amount) as total
    FROM transactions 
    WHERE source = 'telegram' AND userId = 1
    GROUP BY yr, mo
    ORDER BY yr, mo
  `);
  console.log("\n=== TELEGRAM TRANSACTIONS BY MONTH ===");
  console.table(byMonth);

  // Check June specifically - what's the total for cardId=1 in June
  const juneStart = new Date(2026, 5, 1).getTime(); // June 1
  const juneEnd = new Date(2026, 6, 0, 23, 59, 59).getTime(); // June 30
  const [juneCard] = await conn.execute(
    `SELECT cardId, COUNT(*) as cnt, SUM(amount) as total 
     FROM transactions 
     WHERE userId = 1 AND date >= ? AND date <= ? AND type = 'expense'
     GROUP BY cardId`,
    [juneStart, juneEnd]
  );
  console.log(`\n=== JUNE 2026 EXPENSES BY CARD (date range: ${juneStart} - ${juneEnd}) ===`);
  console.table(juneCard);

  // Check May
  const mayStart = new Date(2026, 4, 1).getTime();
  const mayEnd = new Date(2026, 5, 0, 23, 59, 59).getTime();
  const [mayCard] = await conn.execute(
    `SELECT cardId, COUNT(*) as cnt, SUM(amount) as total 
     FROM transactions 
     WHERE userId = 1 AND date >= ? AND date <= ? AND type = 'expense'
     GROUP BY cardId`,
    [mayStart, mayEnd]
  );
  console.log(`\n=== MAY 2026 EXPENSES BY CARD (date range: ${mayStart} - ${mayEnd}) ===`);
  console.table(mayCard);

  // Check if there are transactions with cardId=1 that have NULL categoryId (the ones that were "sem categoria")
  const [uncategorized] = await conn.execute(
    `SELECT id, description, amount, date, categoryId, cardId 
     FROM transactions 
     WHERE source = 'telegram' AND userId = 1 AND categoryId IS NULL`
  );
  console.log("\n=== TELEGRAM TRANSACTIONS STILL WITHOUT CATEGORY ===");
  console.table(uncategorized);

  // Check the older telegram transactions (id < 3000001) - these might be the ones from the first upload that had no categories
  const [oldTelegram] = await conn.execute(
    `SELECT id, description, amount, date, categoryId, cardId 
     FROM transactions 
     WHERE source = 'telegram' AND userId = 1 AND id < 3000001
     ORDER BY id ASC`
  );
  console.log("\n=== OLDER TELEGRAM TRANSACTIONS (id < 3000001) ===");
  console.table(oldTelegram);

  await conn.end();
}

main().catch(console.error);
