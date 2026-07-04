import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

// 1. Delete test jobs and their related data
const testJobIds = [240002, 240003, 240004, 240005]; // Job Entregas Test, Job Delete Delivery Test, Job Custos Test, Job Pagamentos Test

console.log('--- Limpando dados de teste ---');

for (const jobId of testJobIds) {
  await conn.execute('DELETE FROM jobDeliveries WHERE jobId = ?', [jobId]);
  await conn.execute('DELETE FROM jobCosts WHERE jobId = ?', [jobId]);
  await conn.execute('DELETE FROM jobPayments WHERE jobId = ?', [jobId]);
}
await conn.execute('DELETE FROM jobs WHERE id IN (?, ?, ?, ?)', testJobIds);
console.log('Jobs de teste removidos:', testJobIds);

// 2. Get clientId for "Persone Eventos"
const [clients] = await conn.execute("SELECT id FROM clients WHERE companyName LIKE '%Persone%'");
let clientId = null;
if (clients.length > 0) {
  clientId = clients[0].id;
  console.log('Cliente Persone Eventos encontrado, id:', clientId);
} else {
  console.log('Cliente Persone Eventos não encontrado, criando...');
  const [result] = await conn.execute(
    "INSERT INTO clients (companyName, createdAt, updatedAt) VALUES ('Persone Eventos', NOW(), NOW())"
  );
  clientId = result.insertId;
  console.log('Cliente criado, id:', clientId);
}

// 3. Create job "Persone House"
const endDate = new Date('2026-05-31T23:59:59').getTime();
const [jobResult] = await conn.execute(
  `INSERT INTO jobs (name, clientId, clientName, status, endDate, totalCharged, createdAt, updatedAt) 
   VALUES ('Persone House', ?, 'Persone Eventos', 'in_progress', ?, '5500.00', NOW(), NOW())`,
  [clientId, endDate]
);
const jobId = jobResult.insertId;
console.log('\n--- Job Persone House criado, id:', jobId, '---');

// 4. Create deliveries
const deliveries = [
  { description: 'Video inauguração', status: 'delivered', deliveredAt: Date.now() },
  { description: 'Fotos Inauguração', status: 'delivered', deliveredAt: Date.now() },
  { description: 'Entrevistas', status: 'pending', deliveredAt: null },
];

for (const d of deliveries) {
  await conn.execute(
    'INSERT INTO jobDeliveries (jobId, description, status, deliveredAt, createdAt) VALUES (?, ?, ?, ?, NOW())',
    [jobId, d.description, d.status, d.deliveredAt]
  );
}
console.log('Entregas criadas:', deliveries.length);

// 5. Create costs
const costs = [
  { description: 'Videomaker + edição', amount: '1200.00', supplierName: 'yuri', status: 'pending' },
  { description: 'Storymaker', amount: '700.00', supplierName: 'Bia Duarte', status: 'pending' },
  { description: 'Fotografo', amount: '1000.00', supplierName: 'Léo', status: 'pending' },
  { description: 'Entrevistas', amount: '600.00', supplierName: 'Gustavo Bonadeu', status: 'pending' },
];

for (const c of costs) {
  await conn.execute(
    'INSERT INTO jobCosts (jobId, description, amount, supplierName, status, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
    [jobId, c.description, c.amount, c.supplierName, c.status]
  );
}
console.log('Custos criados:', costs.length, '- Total: R$ 3.500,00');

// 6. Create payment
await conn.execute(
  `INSERT INTO jobPayments (jobId, description, amount, dueDate, status, createdAt) 
   VALUES (?, 'Pagamento - por pix', '5500.00', ?, 'pending', NOW())`,
  [jobId, Date.now()]
);
console.log('Recebimento criado: R$ 5.500,00 (pendente)');

// 7. Verify
const [finalJobs] = await conn.execute('SELECT id, name, status, clientName, totalCharged FROM jobs ORDER BY id');
console.log('\n--- Jobs finais ---');
console.log(JSON.stringify(finalJobs, null, 2));

await conn.end();
console.log('\nDone!');
