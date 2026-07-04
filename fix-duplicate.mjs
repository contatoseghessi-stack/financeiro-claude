import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

// O job 270001 foi criado na primeira execução (sem pagamento), e o 270002 na segunda (completo)
// Vou verificar qual tem pagamento e manter esse

const [payments1] = await conn.execute('SELECT COUNT(*) as cnt FROM jobPayments WHERE jobId = 270001');
const [payments2] = await conn.execute('SELECT COUNT(*) as cnt FROM jobPayments WHERE jobId = 270002');

console.log('Job 270001 pagamentos:', payments1[0].cnt);
console.log('Job 270002 pagamentos:', payments2[0].cnt);

// Delete the duplicate (270001 was created without payment)
const deleteId = 270001;
const keepId = 270002;

// Check which one to delete - the one without payment
if (payments1[0].cnt === 0) {
  console.log('Removendo job duplicado 270001 (sem pagamento)...');
  await conn.execute('DELETE FROM jobDeliveries WHERE jobId = ?', [deleteId]);
  await conn.execute('DELETE FROM jobCosts WHERE jobId = ?', [deleteId]);
  await conn.execute('DELETE FROM jobPayments WHERE jobId = ?', [deleteId]);
  await conn.execute('DELETE FROM jobs WHERE id = ?', [deleteId]);
  console.log('Job 270001 removido');
} else {
  console.log('Removendo job duplicado 270002 (sem pagamento)...');
  await conn.execute('DELETE FROM jobDeliveries WHERE jobId = ?', [keepId]);
  await conn.execute('DELETE FROM jobCosts WHERE jobId = ?', [keepId]);
  await conn.execute('DELETE FROM jobPayments WHERE jobId = ?', [keepId]);
  await conn.execute('DELETE FROM jobs WHERE id = ?', [keepId]);
  console.log('Job 270002 removido');
}

// Also remove duplicate client if any
const [clientDups] = await conn.execute("SELECT id FROM clients WHERE companyName LIKE '%Persone%' ORDER BY id");
console.log('Clientes Persone:', clientDups.map(c => c.id));

// Verify final state
const [finalJobs] = await conn.execute('SELECT id, name, status, clientName, totalCharged FROM jobs ORDER BY id');
console.log('\n--- Jobs finais ---');
console.log(JSON.stringify(finalJobs, null, 2));

const [finalCosts] = await conn.execute('SELECT id, jobId, description, amount, supplierName FROM jobCosts ORDER BY id');
console.log('\n--- Custos finais ---');
console.log(JSON.stringify(finalCosts, null, 2));

const [finalDeliveries] = await conn.execute('SELECT id, jobId, description, status FROM jobDeliveries ORDER BY id');
console.log('\n--- Entregas finais ---');
console.log(JSON.stringify(finalDeliveries, null, 2));

const [finalPayments] = await conn.execute('SELECT id, jobId, description, amount, status FROM jobPayments ORDER BY id');
console.log('\n--- Pagamentos finais ---');
console.log(JSON.stringify(finalPayments, null, 2));

await conn.end();
console.log('\nDone!');
