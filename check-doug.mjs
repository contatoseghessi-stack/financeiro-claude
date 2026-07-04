import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Read DATABASE_URL from the project's env
const envContent = readFileSync('/home/ubuntu/financeiro-euge/.env', 'utf-8');
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='))?.replace('DATABASE_URL=', '').replace(/"/g, '');

const conn = await mysql.createConnection(dbUrl);

// Get all users
const [users] = await conn.query('SELECT id, name, email, openId, role FROM users ORDER BY id');
console.log('\n=== USERS ===');
console.table(users);

// Check Doug's data specifically
const dougId = 13260001;
console.log(`\n=== DATA FOR USER ${dougId} ===`);

const tables = ['transactions', 'jobs', 'categories', 'cards', 'clients', 'recurringExpenses', 'recurringIncome'];
for (const table of tables) {
  const [rows] = await conn.query(`SELECT COUNT(*) as count FROM ${table} WHERE userId = ?`, [dougId]);
  console.log(`${table}: ${rows[0].count} records`);
}

// Check OWNER_OPEN_ID
const ownerOpenId = envContent.split('\n').find(l => l.startsWith('OWNER_OPEN_ID='))?.replace('OWNER_OPEN_ID=', '').replace(/"/g, '');
console.log(`\nOWNER_OPEN_ID: ${ownerOpenId}`);

// Check if Doug's openId matches
const [dougUser] = await conn.query('SELECT openId, name, role FROM users WHERE id = ?', [dougId]);
console.log(`Doug's openId: ${dougUser[0]?.openId}`);
console.log(`Doug's role: ${dougUser[0]?.role}`);
console.log(`Is owner match: ${dougUser[0]?.openId === ownerOpenId}`);

await conn.end();
