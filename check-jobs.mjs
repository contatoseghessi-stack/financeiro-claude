import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

const [jobs] = await conn.execute('SELECT id, name, status, clientName, totalCharged FROM jobs ORDER BY id');
console.log('--- JOBS ---');
console.log(JSON.stringify(jobs, null, 2));

const [costs] = await conn.execute('SELECT * FROM jobCosts ORDER BY id');
console.log('\n--- CUSTOS ---');
console.log(JSON.stringify(costs, null, 2));

const [deliveries] = await conn.execute('SELECT * FROM jobDeliveries ORDER BY id');
console.log('\n--- ENTREGAS ---');
console.log(JSON.stringify(deliveries, null, 2));

const [payments] = await conn.execute('SELECT * FROM jobPayments ORDER BY id');
console.log('\n--- PAGAMENTOS ---');
console.log(JSON.stringify(payments, null, 2));

await conn.end();
