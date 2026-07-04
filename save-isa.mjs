import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Raw query to get all jobs
const [jobRows] = await conn.execute("SELECT * FROM jobs");
console.log("=== ALL JOBS ===");
console.log(JSON.stringify(jobRows, null, 2));

// Get payments for each job
for (const job of jobRows) {
  const [payments] = await conn.execute("SELECT * FROM jobPayments WHERE jobId = ?", [job.id]);
  const [costs] = await conn.execute("SELECT * FROM jobCosts WHERE jobId = ?", [job.id]);
  const [deliveries] = await conn.execute("SELECT * FROM jobDeliveries WHERE jobId = ?", [job.id]);
  console.log(`\n=== JOB ${job.id}: ${job.name} ===`);
  console.log("Payments:", JSON.stringify(payments, null, 2));
  console.log("Costs:", JSON.stringify(costs, null, 2));
  console.log("Deliveries:", JSON.stringify(deliveries, null, 2));
}

await conn.end();
