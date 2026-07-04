import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL!;

async function main() {
  const conn = await mysql.createConnection(dbUrl);
  
  // Get all users
  const [users] = await conn.query('SELECT id, name, email, openId, role FROM users ORDER BY id');
  console.log('\n=== ALL USERS ===');
  console.table(users);

  // Check Doug's data
  const dougId = 13260001;
  console.log(`\n=== DATA FOR USER ${dougId} ===`);
  
  const tables = ['transactions', 'jobs', 'categories', 'cards', 'clients', 'recurringExpenses', 'recurringIncome', 'suppliers'];
  for (const t of tables) {
    const [rows]: any = await conn.query(`SELECT COUNT(*) as c FROM ${t} WHERE userId = ?`, [dougId]);
    console.log(`${t}: ${rows[0].c} records`);
  }

  // Check OWNER_OPEN_ID
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  console.log(`\nOWNER_OPEN_ID env: ${ownerOpenId}`);
  
  const [doug]: any = await conn.query('SELECT openId, name, role FROM users WHERE id = ?', [dougId]);
  if (doug.length > 0) {
    console.log(`Doug's openId: ${doug[0].openId}`);
    console.log(`Doug's role: ${doug[0].role}`);
    console.log(`Is owner match: ${doug[0].openId === ownerOpenId}`);
  }

  // Check recent transactions for Doug
  const [recentTx]: any = await conn.query('SELECT id, description, amount, date, scope FROM transactions WHERE userId = ? ORDER BY id DESC LIMIT 5', [dougId]);
  console.log('\n=== RECENT TRANSACTIONS ===');
  console.table(recentTx);

  await conn.end();
}

main().catch(console.error);
