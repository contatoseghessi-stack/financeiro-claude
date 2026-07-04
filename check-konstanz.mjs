import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.log('No DATABASE_URL'); return; }
  const conn = await mysql.createConnection(dbUrl);
  
  const [payments] = await conn.execute('SELECT id, jobId, description, amount, status, dueDate, receivedAt FROM jobPayments WHERE jobId = ?', [2220001]);
  console.log('Payments:', JSON.stringify(payments, null, 2));
  
  // Check what month the startDate falls in
  const startDate = 1781881200000;
  const d = new Date(startDate);
  console.log('\\nJob startDate:', d.toISOString(), '- Month:', d.getMonth(), 'Year:', d.getFullYear());
  
  // Check current month range for June 2026
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  console.log('\\nCurrent month range:', new Date(monthStart).toISOString(), 'to', new Date(monthEnd).toISOString());
  console.log('Job startDate in current month?', startDate >= monthStart && startDate <= monthEnd);
  
  await conn.end();
}
main().catch(e => console.error(e));
