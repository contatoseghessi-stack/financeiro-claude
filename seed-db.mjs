import { drizzle } from "drizzle-orm/mysql2";
import { cards, categories, taxReminders } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding cards...");
  await db.insert(cards).values([
    { name: "Empresa com assinatura", type: "pj", color: "#6366f1", icon: "building-2" },
    { name: "Pessoal", type: "pf", color: "#f59e0b", icon: "user" },
    { name: "Familiar", type: "pf", color: "#ec4899", icon: "heart" },
  ]).onDuplicateKeyUpdate({ set: { name: cards.name } });

  console.log("Seeding categories...");
  await db.insert(categories).values([
    { name: "Alimentação", icon: "utensils", color: "#ef4444", isDefault: true },
    { name: "Transporte", icon: "car", color: "#f97316", isDefault: true },
    { name: "Assinaturas", icon: "repeat", color: "#8b5cf6", isDefault: true },
    { name: "Serviços", icon: "wrench", color: "#06b6d4", isDefault: true },
    { name: "Equipamentos", icon: "camera", color: "#10b981", isDefault: true },
    { name: "Marketing", icon: "megaphone", color: "#f59e0b", isDefault: true },
    { name: "Saúde", icon: "heart-pulse", color: "#ec4899", isDefault: true },
    { name: "Educação", icon: "graduation-cap", color: "#6366f1", isDefault: true },
    { name: "Lazer", icon: "gamepad-2", color: "#14b8a6", isDefault: true },
    { name: "Moradia", icon: "home", color: "#a855f7", isDefault: true },
    { name: "Impostos", icon: "receipt", color: "#dc2626", isDefault: true },
    { name: "Clientes", icon: "briefcase", color: "#2563eb", isDefault: true },
    { name: "Outros", icon: "tag", color: "#64748b", isDefault: true },
  ]).onDuplicateKeyUpdate({ set: { name: categories.name } });

  console.log("Seeding tax reminders...");
  await db.insert(taxReminders).values([
    {
      name: "DAS - Simples Nacional",
      description: "Documento de Arrecadação do Simples Nacional. Vencimento mensal no dia 20.",
      type: "das",
      dueDay: 20,
      dueMonth: null,
      isRecurring: true,
      isActive: true,
    },
    {
      name: "IRPF - Declaração Anual",
      description: "Declaração de Imposto de Renda Pessoa Física. Prazo final em 31 de maio.",
      type: "irpf",
      dueDay: 31,
      dueMonth: 5,
      isRecurring: true,
      isActive: true,
    },
  ]).onDuplicateKeyUpdate({ set: { name: taxReminders.name } });

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
