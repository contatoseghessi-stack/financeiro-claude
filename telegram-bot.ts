import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { extractDataFromImage, findDuplicates, uploadScanImage } from "./document-scan";
import {
  createTransaction,
  getAllCards,
  getAllCategories,
  getTransactions,
  getDashboardData,
  findCategoryByName,
  findCardByType,
  upsertTelegramSession,
  getActiveTelegramSessions,
  getAllTaxReminders,
  updateTaxReminderNotified,
  getJobs,
  getJobsMonthSummary,
  getJobPayments,
  getJobSummary,
  createJob,
  getUpcomingRecurrences,
  getWorkDaysSummary,
  getRecurringProjections,
  createCardStatement,
  lookupLearnedCategory,
  upsertCategoryLearning,
  getUncategorizedTransactions,
  updateTransactionCategory,
  getAllCategoryLearnings,
  createInstallmentPurchase,
  getAllCards as getAllCardsDb,
  getUnlinkedJobCostsByCard,
  createCategory,
  updateJobCost,
} from "./db";

const TELEGRAM_API = `https://api.telegram.org/bot${ENV.telegramBotToken}`;

// ========== MESSAGE PARSER ==========

interface ParsedTransaction {
  type: "income" | "expense";
  scope: "pj" | "pf";
  amount: number;
  description: string;
  cardName?: string;
}

export function parseMessage(text: string): ParsedTransaction | null {
  const normalized = text.trim().toLowerCase();

  // Pattern: "receita PJ 3000 cliente X"
  const incomeMatch = normalized.match(/^receita\s+(pj|pf)\s+([\d.,]+)\s+(.+)$/i);
  if (incomeMatch) {
    return {
      type: "income",
      scope: incomeMatch[1].toLowerCase() as "pj" | "pf",
      amount: parseAmount(incomeMatch[2]),
      description: incomeMatch[3].trim(),
    };
  }

  // Pattern: "despesa PJ 500 equipamento"
  const expenseMatch = normalized.match(/^despesa\s+(pj|pf)\s+([\d.,]+)\s+(.+)$/i);
  if (expenseMatch) {
    return {
      type: "expense",
      scope: expenseMatch[1].toLowerCase() as "pj" | "pf",
      amount: parseAmount(expenseMatch[2]),
      description: expenseMatch[3].trim(),
    };
  }

  // Pattern: "cartão PF 150 mercado" or "cartao PF 150 mercado"
  const cardMatch = normalized.match(/^cart[aã]o\s+(pj|pf)\s+([\d.,]+)\s+(.+)$/i);
  if (cardMatch) {
    return {
      type: "expense",
      scope: cardMatch[1].toLowerCase() as "pj" | "pf",
      amount: parseAmount(cardMatch[2]),
      description: cardMatch[3].trim(),
    };
  }

  // Pattern: "pj 3000 cliente X" or "pf 150 mercado" (shorthand)
  const shortMatch = normalized.match(/^(pj|pf)\s+([\d.,]+)\s+(.+)$/i);
  if (shortMatch) {
    return {
      type: "expense",
      scope: shortMatch[1].toLowerCase() as "pj" | "pf",
      amount: parseAmount(shortMatch[2]),
      description: shortMatch[3].trim(),
    };
  }

  return null;
}

// Pattern: "job Campanha Iguatemi 15000" or "job Campanha Iguatemi"
interface ParsedJob {
  name: string;
  totalCharged: string | null;
}

export function parseJobMessage(text: string): ParsedJob | null {
  const match = text.trim().match(/^job\s+(.+?)(?:\s+([\d.,]+))?$/i);
  if (!match) return null;
  const name = match[1].trim();
  const amount = match[2] ? parseAmount(match[2]).toFixed(2) : null;
  return { name, totalCharged: amount };
}

// Pattern: "parcelado PF 1200 12x TV Samsung" or "parcelado PJ 3000 6x equipamento"
interface ParsedInstallment {
  scope: "pj" | "pf";
  totalAmount: number;
  installments: number;
  description: string;
}

export function parseInstallmentMessage(text: string): ParsedInstallment | null {
  const match = text.trim().match(/^parcelado\s+(pj|pf)\s+([\d.,]+)\s+(\d+)x\s+(.+)$/i);
  if (!match) return null;
  return {
    scope: match[1].toLowerCase() as "pj" | "pf",
    totalAmount: parseAmount(match[2]),
    installments: parseInt(match[3], 10),
    description: match[4].trim(),
  };
}

function parseAmount(str: string): number {
  let cleaned = str.replace(/\s/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  return parseFloat(cleaned);
}

// ========== TELEGRAM API ==========

export async function sendTelegramMessage(chatId: string, text: string, parseMode: string = "HTML") {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    return res.json();
  } catch (err) {
    console.error("[Telegram] Failed to send message:", err);
  }
}

async function sendTelegramMessageWithButtons(chatId: string, text: string, buttons: Array<Array<{ text: string; callback_data: string }>>) {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    return res.json();
  } catch (err) {
    console.error("[Telegram] Failed to send message with buttons:", err);
  }
}

async function answerCallbackQuery(callbackQueryId: string) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch (err) {
    console.error("[Telegram] Failed to answer callback query:", err);
  }
}

// ========== COMMAND HANDLERS ==========

async function handleStart(chatId: string, firstName: string, username?: string) {
  await upsertTelegramSession({ chatId, firstName, username });
  await sendTelegramMessage(chatId,
    `🎬 <b>Fala, ${firstName}! Sou teu financeiro digital.</b>\n\n` +
    `Registra tuas transações direto aqui. Exemplos:\n\n` +
    `💳 <code>cartão PF 150 mercado</code>\n` +
    `💰 <code>receita PJ 3000 cliente X</code>\n` +
    `📊 <code>despesa PJ 500 equipamento</code>\n` +
    `⚡ <code>PF 80 uber</code> (atalho)\n` +
    `🎬 <code>job Campanha Iguatemi 15000</code>\n` +
    `💳 <code>parcelado PF 1200 12x TV Samsung</code>\n\n` +
    `📎 Manda a <b>foto ou PDF da fatura do cartão</b> que eu processo tudo!\n\n` +
    `<b>Comandos:</b>\n` +
    `/resumo - Resumo financeiro do mês\n` +
    `/cartoes - Gastos por cartão\n` +
    `/impostos - Próximos impostos\n` +
    `/jobs - Jobs ativos e lucro\n` +
    `/recorrencias - Próximas receitas/despesas recorrentes\n` +
    `/diarias - Resumo de diárias do mês\n` +
    `/projecao - Projeção financeira do ano\n` +
    `/ultimas - Últimas 5 transações\n` +
    `/ajuda - Lista de comandos`
  );
}

async function handleResumo(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

  const data = await getDashboardData(startOfMonth, endOfMonth, userId);
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  let pjExpense = 0, pjIncome = 0, pfExpense = 0, pfIncome = 0;
  for (const row of data.byScope) {
    const val = parseFloat(String(row.total));
    if (row.scope === "pj" && row.type === "expense") pjExpense = val;
    if (row.scope === "pj" && row.type === "income") pjIncome = val;
    if (row.scope === "pf" && row.type === "expense") pfExpense = val;
    if (row.scope === "pf" && row.type === "income") pfIncome = val;
  }

  const msg =
    `📊 <b>Resumo Financeiro - ${monthName}</b>\n\n` +
    `🏢 <b>PJ (Empresa)</b>\n` +
    `   Receitas: R$ ${pjIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `   Despesas: R$ ${pjExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `   Saldo: R$ ${(pjIncome - pjExpense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` +
    `👤 <b>PF (Pessoal/Familiar)</b>\n` +
    `   Receitas: R$ ${pfIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `   Despesas: R$ ${pfExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `   Saldo: R$ ${(pfIncome - pfExpense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` +
    `💰 <b>Total Geral</b>\n` +
    `   Receitas: R$ ${data.totals.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `   Despesas: R$ ${data.totals.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `   Saldo: R$ ${(data.totals.income - data.totals.expense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  await sendTelegramMessage(chatId, msg);
}

async function handleCartoes(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

  const allCards = await getAllCards(userId);
  const data = await getDashboardData(startOfMonth, endOfMonth, userId);
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  let msg = `💳 <b>Gastos por Cartão - ${monthName}</b>\n\n`;

  for (const card of allCards) {
    const cardData = data.byCard.find(c => c.cardId === card.id);
    const total = cardData ? parseFloat(String(cardData.total)) : 0;
    const icon = card.type === "pj" ? "🏢" : "👤";
    msg += `${icon} <b>${card.name}</b>\n   R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n`;
  }

  const noCard = data.byCard.find(c => c.cardId === null);
  if (noCard) {
    const total = parseFloat(String(noCard.total));
    msg += `📝 <b>Sem cartão</b>\n   R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  }

  await sendTelegramMessage(chatId, msg);
}

async function handleImpostos(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const reminders = await getAllTaxReminders(userId);
  const now = new Date();

  let msg = `🏛 <b>Próximos Impostos</b>\n\n`;

  if (reminders.length === 0) {
    msg += `Nenhum imposto cadastrado.`;
    await sendTelegramMessage(chatId, msg);
    return;
  }

  for (const reminder of reminders) {
    let nextDue: Date;
    if (reminder.type === "das") {
      nextDue = new Date(now.getFullYear(), now.getMonth(), reminder.dueDay);
      if (nextDue < now) {
        nextDue = new Date(now.getFullYear(), now.getMonth() + 1, reminder.dueDay);
      }
    } else {
      nextDue = new Date(now.getFullYear(), (reminder.dueMonth || 5) - 1, reminder.dueDay);
      if (nextDue < now) {
        nextDue = new Date(now.getFullYear() + 1, (reminder.dueMonth || 5) - 1, reminder.dueDay);
      }
    }

    const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const urgency = daysUntil <= 5 ? "🔴" : daysUntil <= 15 ? "🟡" : "🟢";

    msg += `${urgency} <b>${reminder.name}</b>\n`;
    msg += `   Vencimento: ${nextDue.toLocaleDateString("pt-BR")}\n`;
    msg += `   ${daysUntil > 0 ? `Faltam ${daysUntil} dias` : "VENCIDO!"}\n`;
    if (reminder.description) msg += `   ${reminder.description}\n`;
    msg += `\n`;
  }

  await sendTelegramMessage(chatId, msg);
}

// ========== NEW COMMANDS ==========

async function handleJobs(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const monthSummary = await getJobsMonthSummary(startOfMonth, endOfMonth, userId);
  const activeJobs = await getJobs({ status: "in_progress", userId });

  let msg = `🎬 <b>Jobs - ${monthName}</b>\n\n`;
  msg += `📊 Jobs ativos: <b>${monthSummary.activeJobs}</b>\n`;
  msg += `💰 Lucro total: <b>R$ ${monthSummary.totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>\n\n`;

  if (activeJobs.length === 0) {
    msg += `Nenhum job em andamento no momento.`;
  } else {
    msg += `<b>Em andamento:</b>\n`;
    for (const job of activeJobs.slice(0, 8)) {
      const summary = await getJobSummary(job.id);
      const pendingPayments = await getJobPayments(job.id);
      const pending = pendingPayments.filter((p: any) => p.status === "pending");
      const pendingTotal = pending.reduce((sum: number, p: any) => sum + parseFloat(String(p.amount)), 0);

      msg += `\n🔹 <b>${job.name}</b>`;
      if (job.clientName) msg += ` (${job.clientName})`;
      msg += `\n`;
      msg += `   Lucro: R$ ${summary.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Margem: ${summary.margin.toFixed(0)}%\n`;
      if (pending.length > 0) {
        msg += `   ⏳ ${pending.length} recebimento(s) pendente(s): R$ ${pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
      }
    }
  }

  await sendTelegramMessage(chatId, msg);
}

async function handleRecorrencias(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const upcoming = await getUpcomingRecurrences(30, userId);

  let msg = `🔄 <b>Recorrências - Próximos 30 dias</b>\n\n`;

  if (upcoming.income.length === 0 && upcoming.expenses.length === 0) {
    msg += `Nenhuma recorrência prevista para os próximos 30 dias.`;
    await sendTelegramMessage(chatId, msg);
    return;
  }

  if (upcoming.income.length > 0) {
    msg += `💰 <b>Receitas:</b>\n`;
    let totalIncome = 0;
    for (const inc of upcoming.income) {
      const date = new Date(inc.nextOccurrence!).toLocaleDateString("pt-BR");
      const amount = parseFloat(String(inc.amount));
      totalIncome += amount;
      msg += `   ${date} - ${inc.description}: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    }
    msg += `   <b>Total: R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>\n\n`;
  }

  if (upcoming.expenses.length > 0) {
    msg += `💳 <b>Despesas:</b>\n`;
    let totalExpense = 0;
    for (const exp of upcoming.expenses) {
      const date = new Date(exp.nextOccurrence!).toLocaleDateString("pt-BR");
      const amount = parseFloat(String(exp.amount));
      totalExpense += amount;
      msg += `   ${date} - ${exp.description}: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    }
    msg += `   <b>Total: R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>\n`;
  }

  await sendTelegramMessage(chatId, msg);
}

async function handleDiarias(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const summary = await getWorkDaysSummary(startOfMonth, endOfMonth, userId);

  let msg = `📅 <b>Diárias - ${monthName}</b>\n\n`;
  msg += `📊 Dias trabalhados: <b>${summary.count}</b>\n`;
  msg += `💰 Valor total: <b>R$ ${summary.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>\n\n`;

  if (summary.byClient && summary.byClient.length > 0) {
    msg += `<b>Por cliente:</b>\n`;
    for (const client of summary.byClient) {
      const total = parseFloat(String(client.total || 0));
      msg += `   ${client.clientName || "Sem cliente"}: ${client.count} dia(s) - R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    }
  } else {
    msg += `Nenhuma diária registrada este mês.`;
  }

  await sendTelegramMessage(chatId, msg);
}

async function handleProjecao(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const now = new Date();
  const year = now.getFullYear();
  const projections = await getRecurringProjections(year, userId);

  let msg = `📈 <b>Projeção Financeira - ${year}</b>\n\n`;

  if (projections.length === 0) {
    msg += `Nenhuma receita recorrente ativa para projetar.`;
    await sendTelegramMessage(chatId, msg);
    return;
  }

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  let totalYear = 0;

  for (const p of projections) {
    const monthIdx = parseInt(p.month.split("-")[1]) - 1;
    const monthLabel = monthNames[monthIdx];
    const isPast = monthIdx < now.getMonth();
    const isCurrent = monthIdx === now.getMonth();
    const marker = isCurrent ? "👉 " : isPast ? "✅ " : "   ";
    totalYear += p.total;
    msg += `${marker}${monthLabel}: R$ ${p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  }

  msg += `\n💰 <b>Total projetado: R$ ${totalYear.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>`;

  await sendTelegramMessage(chatId, msg);
}

async function handleUltimas(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const result = await getTransactions({ limit: 5, userId });
  const items = result.items;

  let msg = `📋 <b>Últimas 5 Transações</b>\n\n`;

  if (items.length === 0) {
    msg += `Nenhuma transação registrada.`;
    await sendTelegramMessage(chatId, msg);
    return;
  }

  for (const t of items) {
    const date = new Date(t.date).toLocaleDateString("pt-BR");
    const typeEmoji = t.type === "income" ? "💰" : "💳";
    const scopeLabel = t.scope.toUpperCase();
    const amount = parseFloat(String(t.amount));
    msg += `${typeEmoji} <b>${date}</b> [${scopeLabel}]\n`;
    msg += `   ${t.description}: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n`;
  }

  await sendTelegramMessage(chatId, msg);
}

async function handleAjuda(chatId: string) {
  await sendTelegramMessage(chatId,
    `📋 <b>Comandos Disponíveis</b>\n\n` +
    `<b>Registrar transações:</b>\n` +
    `💳 <code>cartão PF 150 mercado</code>\n` +
    `💰 <code>receita PJ 3000 cliente X</code>\n` +
    `📊 <code>despesa PJ 500 equipamento</code>\n` +
    `⚡ <code>PF 80 uber</code> (atalho)\n\n` +
    `<b>Criar job rápido:</b>\n` +
    `🎬 <code>job Campanha Iguatemi 15000</code>\n` +
    `🎬 <code>job Vídeo Institucional</code> (sem valor)\n\n` +
    `<b>Compra parcelada:</b>\n` +
    `💳 <code>parcelado PF 1200 12x TV Samsung</code>\n` +
    `💳 <code>parcelado PJ 3000 6x equipamento</code>\n\n` +
    `<b>Fatura de cartão:</b>\n` +
    `📎 Manda a <b>foto ou PDF</b> da fatura que eu processo automaticamente!\n\n` +
    `<b>Consultas:</b>\n` +
    `/resumo - Resumo financeiro do mês\n` +
    `/cartoes - Gastos por cartão\n` +
    `/impostos - Próximos impostos\n` +
    `/jobs - Jobs ativos e lucro\n` +
    `/recorrencias - Recorrências dos próximos 30 dias\n` +
    `/diarias - Diárias do mês\n` +
    `/projecao - Projeção financeira do ano\n` +
    `/ultimas - Últimas 5 transações\n` +
    `/revisar - Revisar transações sem categoria\n` +
    `/ajuda - Esta mensagem\n\n` +
    `<b>Categorizar transações:</b>\n` +
    `Após /revisar, responde: <code>1 alimentação, 2 equipamento</code>\n\n` +
    `<b>Dicas:</b>\n` +
    `• Use PJ para gastos da empresa\n` +
    `• Use PF para gastos pessoais/familiares\n` +
    `• Valores aceitam vírgula: 1.500,00 ou 150,50\n` +
    `• Parcelado: informe escopo, valor total, Nx e descrição`
  );
}

// ========== RESOLVE USER FROM TELEGRAM ==========

async function resolveUserIdFromChat(chatId: string): Promise<number> {
  const { getUserIdByChatId } = await import("./db");
  const userId = await getUserIdByChatId(chatId);
  if (userId) return userId;
  // Fallback: owner (userId=1) for backward compatibility
  return 1;
}

// ========== PROCESS TRANSACTION MESSAGE ==========

async function handleTransactionMessage(chatId: string, parsed: ParsedTransaction) {
  const userId = await resolveUserIdFromChat(chatId);
  const allCards = await getAllCards(userId);
  const cardsForScope = allCards.filter(c => c.type === parsed.scope);

  let cardId: number | null = null;
  if (cardsForScope.length > 0) {
    cardId = cardsForScope[0].id;
  }

  const allCats = await getAllCategories(userId);
  let categoryId: number | null = null;

  const descLower = parsed.description.toLowerCase();
  const categoryMap: Record<string, string[]> = {
    "alimentação": ["mercado", "supermercado", "restaurante", "lanche", "almoço", "jantar", "café", "ifood", "comida", "padaria"],
    "transporte": ["uber", "99", "gasolina", "combustível", "estacionamento", "ônibus", "táxi", "pedágio"],
    "assinaturas": ["netflix", "spotify", "adobe", "assinatura", "plano", "mensalidade"],
    "serviços": ["serviço", "manutenção", "reparo", "conserto", "limpeza"],
    "equipamentos": ["câmera", "lente", "equipamento", "tripé", "luz", "microfone", "computador", "notebook"],
    "marketing": ["marketing", "anúncio", "ads", "campanha", "publicidade"],
    "saúde": ["médico", "remédio", "farmácia", "academia", "consulta", "exame", "plano de saúde"],
    "educação": ["curso", "faculdade", "livro", "aula", "workshop", "mentoria"],
    "lazer": ["cinema", "show", "viagem", "passeio", "ingresso", "bar"],
    "moradia": ["aluguel", "condomínio", "luz", "água", "internet", "gás"],
    "impostos": ["imposto", "das", "irpf", "taxa", "tributo"],
    "clientes": ["cliente", "projeto", "job", "freela"],
  };

  for (const [catName, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => descLower.includes(kw))) {
      const cat = allCats.find(c => c.name.toLowerCase() === catName);
      if (cat) { categoryId = cat.id; break; }
    }
  }

  await createTransaction({
    description: parsed.description,
    amount: parsed.amount.toFixed(2),
    type: parsed.type,
    scope: parsed.scope,
    cardId,
    categoryId,
    source: "telegram",
    date: Date.now(),
    userId,
  });

  const typeEmoji = parsed.type === "income" ? "💰" : "💳";
  const scopeLabel = parsed.scope === "pj" ? "PJ" : "PF";
  const cardName = cardId ? allCards.find(c => c.id === cardId)?.name || "" : "";
  const catName = categoryId ? allCats.find(c => c.id === categoryId)?.name || "" : "";

  let msg = `${typeEmoji} <b>${parsed.type === "income" ? "Receita" : "Despesa"} registrada!</b>\n\n`;
  msg += `💵 Valor: R$ ${parsed.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  msg += `📋 ${parsed.description}\n`;
  msg += `🏷 ${scopeLabel}`;
  if (cardName) msg += ` • ${cardName}`;
  if (catName) msg += ` • ${catName}`;

  await sendTelegramMessage(chatId, msg);
}

// ========== HANDLE JOB CREATION ==========

async function handleJobMessage(chatId: string, parsed: ParsedJob) {
  try {
    const userId = await resolveUserIdFromChat(chatId);
    const result = await createJob({
      name: parsed.name,
      totalCharged: parsed.totalCharged,
      status: "draft",
      userId,
    });

    let msg = `🎬 <b>Job criado!</b>\n\n`;
    msg += `📋 ${parsed.name}\n`;
    if (parsed.totalCharged) {
      msg += `💰 Valor: R$ ${parseFloat(parsed.totalCharged).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    }
    msg += `📌 Status: Rascunho\n\n`;
    msg += `Acessa o sistema pra adicionar entregas, custos e recebimentos.`;

    await sendTelegramMessage(chatId, msg);
  } catch (err) {
    console.error("[Telegram] Failed to create job:", err);
    await sendTelegramMessage(chatId, `❌ Erro ao criar o job. Tenta de novo.`);
  }
}

// ========== HANDLE CARD STATEMENT (PHOTO/PDF) ==========

async function handleCardStatement(chatId: string, fileId: string, fileName: string, mimeType: string, forceScope?: "pj" | "pf") {
  try {
    const userId = await resolveUserIdFromChat(chatId);
    await sendTelegramMessage(chatId, `⏳ Recebendo fatura... processando com IA. Pode levar alguns segundos.`);

    // 1. Get file URL from Telegram
    const fileInfoRes = await fetch(`${TELEGRAM_API}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      await sendTelegramMessage(chatId, `❌ Não consegui baixar o arquivo. Tenta mandar de novo.`);
      return;
    }

    const telegramFileUrl = `https://api.telegram.org/file/bot${ENV.telegramBotToken}/${fileInfo.result.file_path}`;

    // 2. Download file
    const fileRes = await fetch(telegramFileUrl);
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer());

    // 3. Upload to S3
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `card-statements/telegram/${timestamp}-${safeName}`;
    const contentType = mimeType || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const { url: fileUrl, key: fileKey } = await storagePut(s3Key, fileBuffer, contentType);

    // 4. Get all cards and categories for context
    const allCards = await getAllCards(userId);
    const allCats = await getAllCategories(userId);
    const cardNames = allCards.map(c => `${c.name} (${c.type.toUpperCase()}, id:${c.id})`).join(", ");
    const catNames = allCats.map(c => `${c.name} (id:${c.id})`).join(", ");

    // 5. Send to LLM for extraction
    const isImage = contentType.startsWith("image/");
    const contentParts: any[] = [
      {
        type: "text",
        text: `Você é um assistente financeiro. Analise esta fatura de cartão de crédito e extraia TODOS os lançamentos/transações.

Para cada lançamento, retorne:
- description: descrição do lançamento (manter nome original da fatura)
- amount: valor em reais (número decimal, sem R$)
- date: data do lançamento no formato YYYY-MM-DD (se não tiver data exata, use o mês/ano da fatura)
- categoryId: o ID numérico da categoria mais adequada dentre estas: ${catNames}. SEMPRE tente categorizar! Use null SOMENTE se realmente não se encaixar em nenhuma.
- cardId: o cartão mais provável dentre estes: ${cardNames}. Se não souber, use null.
- scope: "${forceScope || "pf"}" (use SEMPRE este valor para TODOS os lançamentos)

IMPORTANTE:
- Extraia TODOS os lançamentos, não pule nenhum
- Valores devem ser números (ex: 150.50, não "R$ 150,50")
- Se a fatura mostrar o nome do cartão, use o cardId correspondente
- SEMPRE categorize! Exemplos: supermercado/ifood/restaurante → Alimentação, uber/gasolina → Transporte, netflix/spotify → Assinaturas, farmácia → Saúde
- Use o ID numérico da categoria no campo categoryId (não o nome)

Retorne um JSON com a estrutura:
{
  "cardName": "nome do cartão se identificável",
  "month": número do mês (1-12),
  "year": ano (ex: 2026),
  "transactions": [
    { "description": "...", "amount": 0.00, "date": "YYYY-MM-DD", "categoryId": null ou número, "cardId": null ou número, "scope": "pf" ou "pj" }
  ]
}`
      }
    ];

    if (isImage) {
      contentParts.push({
        type: "image_url",
        image_url: { url: fileUrl, detail: "high" }
      });
    } else {
      contentParts.push({
        type: "file_url",
        file_url: { url: fileUrl, mime_type: "application/pdf" }
      });
    }

    const llmResponse = await invokeLLM({
      messages: [
        { role: "user", content: contentParts }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "card_statement_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              cardName: { type: ["string", "null"], description: "Nome do cartão identificado" },
              month: { type: "integer", description: "Mês da fatura (1-12)" },
              year: { type: "integer", description: "Ano da fatura" },
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    amount: { type: "number" },
                    date: { type: "string" },
                    categoryId: { type: ["integer", "null"] },
                    cardId: { type: ["integer", "null"] },
                    scope: { type: "string", enum: ["pj", "pf"] },
                  },
                  required: ["description", "amount", "date", "scope"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cardName", "month", "year", "transactions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = llmResponse.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      await sendTelegramMessage(chatId, `❌ Não consegui processar a fatura. A IA não retornou dados. Tenta mandar uma foto mais nítida.`);
      return;
    }

    let extracted: any;
    try {
      extracted = JSON.parse(content);
    } catch {
      await sendTelegramMessage(chatId, `❌ Erro ao interpretar a fatura. Tenta mandar uma foto mais nítida ou o PDF.`);
      return;
    }

    const txns = extracted.transactions || [];
    if (txns.length === 0) {
      await sendTelegramMessage(chatId, `🤔 Não encontrei lançamentos na fatura. Tenta mandar uma imagem mais clara ou o PDF completo.`);
      return;
    }

    // 6. Save card statement record
    const statementCardId = txns[0]?.cardId || (allCards.length > 0 ? allCards[0].id : 1);
    try {
      await createCardStatement({
        userId,
        cardId: statementCardId,
        fileName: safeName,
        fileKey,
        fileUrl,
        month: extracted.month || new Date().getMonth() + 1,
        year: extracted.year || new Date().getFullYear(),
        status: "completed",
        extractedData: content,
      });
    } catch (err) {
      console.error("[Telegram] Failed to save card statement:", err);
    }

    // 7. Create transactions with fallback categorization
    const categoryMap: Record<string, string[]> = {
      "alimentação": ["mercado", "supermercado", "restaurante", "lanche", "almoço", "jantar", "café", "ifood", "comida", "padaria", "burger", "pizza", "sushi", "açougue", "hortifruti", "pão", "bakery", "food", "mcdonald", "subway", "starbucks", "rappi"],
      "transporte": ["uber", "99", "gasolina", "combustível", "estacionamento", "ônibus", "táxi", "pedágio", "posto", "shell", "ipiranga", "br distribuidora", "sem parar", "conectcar", "cabify"],
      "assinaturas": ["netflix", "spotify", "adobe", "assinatura", "plano", "mensalidade", "amazon prime", "disney", "hbo", "youtube", "apple", "google one", "icloud", "chatgpt", "openai", "notion", "canva", "figma", "dropbox"],
      "serviços": ["serviço", "manutenção", "reparo", "conserto", "limpeza", "lavanderia", "costura"],
      "equipamentos": ["câmera", "lente", "equipamento", "tripé", "luz", "microfone", "computador", "notebook", "monitor", "teclado", "mouse", "ssd", "hd", "memória", "drone"],
      "marketing": ["marketing", "anúncio", "ads", "campanha", "publicidade", "google ads", "meta ads", "facebook", "instagram"],
      "saúde": ["médico", "remédio", "farmácia", "academia", "consulta", "exame", "plano de saúde", "drogaria", "drogasil", "panvel", "raia", "hospital", "clínica", "dentista", "psicólogo", "nutricionista"],
      "educação": ["curso", "faculdade", "livro", "aula", "workshop", "mentoria", "udemy", "alura", "puc", "universidade", "escola"],
      "lazer": ["cinema", "show", "viagem", "passeio", "ingresso", "bar", "teatro", "parque", "hotel", "airbnb", "booking"],
      "moradia": ["aluguel", "condomínio", "luz", "água", "internet", "gás", "ceee", "corsan", "dmae", "claro", "vivo", "tim", "oi", "energia"],
      "impostos": ["imposto", "das", "irpf", "taxa", "tributo", "inss", "icms", "iss"],
      "vestuário": ["roupa", "calçado", "tênis", "camiseta", "calça", "jaqueta", "renner", "zara", "c&a", "riachuelo", "nike", "adidas", "loja"],
      "clientes": ["cliente", "projeto", "job", "freela"],
    };

    let created = 0;
    let linked = 0;
    const byCategory: Record<string, number> = {};

    // Fetch unlinked job costs for this card to auto-match
    const unlinkedJobCosts = await getUnlinkedJobCostsByCard(statementCardId, userId);
    const remainingJobCosts = [...unlinkedJobCosts];

    for (const t of txns) {
      try {
        const txDate = t.date ? new Date(t.date + "T12:00:00").getTime() : Date.now();
        const txAmount = parseFloat(t.amount.toFixed(2));

        // Auto-link: check if this transaction matches an unlinked job cost by amount
        const matchIdx = remainingJobCosts.findIndex(jc => {
          const jcAmount = parseFloat(String(jc.amount));
          return Math.abs(jcAmount - txAmount) < 0.01;
        });

        if (matchIdx >= 0) {
          // Found a matching job cost — create the transaction but link it
          const matchedCost = remainingJobCosts[matchIdx];
          remainingJobCosts.splice(matchIdx, 1);

          // Create the transaction (it represents the card charge)
          const cardIdVal = t.cardId || statementCardId;
          const txResult = await createTransaction({
            description: t.description,
            amount: t.amount.toFixed(2),
            type: "expense",
            scope: forceScope || t.scope || "pf",
            cardId: cardIdVal,
            categoryId: matchedCost.categoryId ?? null,
            source: "telegram",
            date: txDate,
            userId,
          });

          // Link the job cost to this transaction so it's not counted twice
          const txId = Number((txResult as any)[0]?.insertId || 0);
          await updateJobCost(matchedCost.id, {
            linkedTransactionId: txId || null,
            status: "paid",
            paidAt: txDate,
          }, userId);

          created++;
          linked++;

          const mcCatId = matchedCost.categoryId;
          const catObj = mcCatId ? allCats.find(c => c.id === mcCatId) : null;
          const catLabel = catObj ? catObj.name : "Custos de Jobs";
          byCategory[catLabel] = (byCategory[catLabel] || 0) + t.amount;
          continue;
        }

        // Use LLM categoryId if valid, otherwise fallback to learned patterns, then keyword matching
        let catId = t.categoryId ? (allCats.find(c => c.id === t.categoryId) ? t.categoryId : null) : null;
        
        if (!catId) {
          // Fallback 1: check learned category patterns from previous user responses
          const learned = await lookupLearnedCategory(t.description || "");
          if (learned && learned.confirmCount >= 1) {
            catId = learned.categoryId;
          }
        }
        
        if (!catId) {
          // Fallback 2: keyword matching on description
          const descLower = (t.description || "").toLowerCase();
          for (const [catName, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(kw => descLower.includes(kw))) {
              const cat = allCats.find(c => c.name.toLowerCase() === catName);
              if (cat) { catId = cat.id; break; }
            }
          }
        }
        
        const cardIdVal = t.cardId || statementCardId;

        await createTransaction({
          description: t.description,
          amount: t.amount.toFixed(2),
          type: "expense",
          scope: forceScope || t.scope || "pf",
          cardId: cardIdVal,
          categoryId: catId,
          source: "telegram",
          date: txDate,
          userId,
        });

        created++;

        // Track by category for summary
        const catObj = catId ? allCats.find(c => c.id === catId) : null;
        const catLabel = catObj ? catObj.name : "Sem categoria";
        byCategory[catLabel] = (byCategory[catLabel] || 0) + t.amount;
      } catch (err) {
        console.error("[Telegram] Failed to create transaction from statement:", err);
      }
    }

    // 8. Send summary
    let msg = `✅ <b>Fatura processada!</b>\n\n`;
    msg += `📄 ${created} lançamento(s) registrado(s)\n`;
    if (linked > 0) {
      msg += `🔗 ${linked} vinculado(s) a custos de Jobs (sem duplicação)\n`;
    }
    if (extracted.cardName) msg += `💳 Cartão: ${extracted.cardName}\n`;
    msg += `📅 Referência: ${extracted.month}/${extracted.year}\n\n`;

    const totalAmount = txns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    msg += `💰 <b>Total: R$ ${totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>\n\n`;

    const categorizedCats = Object.entries(byCategory).filter(([c]) => c !== "Sem categoria").sort((a, b) => b[1] - a[1]);
    const semCatTotal = byCategory["Sem categoria"] || 0;

    if (categorizedCats.length > 0) {
      msg += `\u2705 <b>Categorizados:</b>\n`;
      for (const [cat, total] of categorizedCats) {
        msg += `   ${cat}: R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
      }
    }

    if (semCatTotal > 0) {
      msg += `\n\u2753 <b>Sem categoria:</b> R$ ${semCatTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
      msg += `\nUsa /revisar pra categorizar esses itens rapidinho! \ud83d\udc46`;
    }

    await sendTelegramMessage(chatId, msg);

  } catch (err) {
    console.error("[Telegram] Card statement processing error:", err);
    await sendTelegramMessage(chatId, `❌ Erro ao processar a fatura. Tenta de novo ou manda em outro formato.`);
  }
}

// ========== REVIEW UNCATEGORIZED ==========

// In-memory store for pending card statements awaiting PJ/PF selection
const pendingStatements: Map<string, { fileId: string; fileName: string; mimeType: string }> = new Map();

// In-memory store for pending single receipt scans awaiting confirmation
interface PendingReceiptScan {
  extracted: {
    description: string;
    amount: number;
    type: "income" | "expense";
    scope: "pj" | "pf";
    date: number;
    category?: string;
    supplier?: string;
  };
  imageUrl: string;
  hasDuplicates: boolean;
  duplicateDesc?: string;
}
const pendingReceiptScans: Map<string, PendingReceiptScan> = new Map();

// In-memory store for pending review sessions (chatId -> list of uncategorized txns)
const pendingReviews: Map<string, Array<{ id: number; description: string; amount: number; date: number }>> = new Map();

async function handleRevisar(chatId: string) {
  const userId = await resolveUserIdFromChat(chatId);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Look back 3 months to catch recent uploads with dates in previous months
  const uncategorized = await getUncategorizedTransactions(month, year, userId, 3);

  if (uncategorized.length === 0) {
    await sendTelegramMessage(chatId, `\u2705 <b>Tudo categorizado!</b>\n\nN\u00e3o tem transa\u00e7\u00f5es sem categoria nos \u00faltimos 3 meses.`);
    return;
  }

  // Store the list for this chat
  const items = uncategorized.map(t => ({
    id: t.id,
    description: t.description,
    amount: parseFloat(String(t.amount)),
    date: t.date,
  }));
  pendingReviews.set(chatId, items);

  // Get all categories for reference
  const allCats = await getAllCategories(userId);
  const catList = allCats.map(c => c.name).join(", ");

  let msg = `\ud83d\udccb <b>Transa\u00e7\u00f5es sem categoria</b>\n\n`;
  msg += `<b>${uncategorized.length} item(ns) precisam de categoria:</b>\n\n`;

  for (let i = 0; i < items.length; i++) {
    const t = items[i];
    const date = new Date(t.date).toLocaleDateString("pt-BR");
    msg += `<b>${i + 1}.</b> ${t.description}\n`;
    msg += `    R$ ${t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} \u2022 ${date}\n\n`;
  }

  msg += `\n<b>Categorias dispon\u00edveis:</b>\n${catList}\n\n`;
  msg += `<b>Responde assim:</b>\n`;
  msg += `<code>1 alimenta\u00e7\u00e3o, 2 transporte, 3 assinaturas</code>\n\n`;
  msg += `Ou <code>todos alimenta\u00e7\u00e3o</code> pra categorizar todos de uma vez.`;

  await sendTelegramMessage(chatId, msg);
}

/**
 * Parse categorization response. Supports:
 * - Multiline: "1 manus\n2 anúncios\n3 AliExpress" (one per line)
 * - Comma-separated: "1 alimentação, 2 transporte, 3 assinaturas"
 * - All at once: "todos alimentação"
 */
export function parseCategorizeResponse(text: string): Array<{ index: number | "all"; category: string }> | null {
  const normalized = text.trim();
  
  // Check for "todos <category>"
  const allMatch = normalized.match(/^todos?\s+(.+)$/i);
  if (allMatch) {
    return [{ index: "all", category: allMatch[1].trim().toLowerCase() }];
  }

  // Split by newlines first, then by commas/semicolons as fallback
  const lines = normalized.split(/\n/).map(l => l.trim()).filter(Boolean);
  let parts: string[];
  
  if (lines.length > 1) {
    // Multiline format: each line is "number category"
    parts = lines;
  } else {
    // Single line: split by comma/semicolon
    parts = normalized.split(/[,;]+/).map(p => p.trim()).filter(Boolean);
  }

  const results: Array<{ index: number | "all"; category: string }> = [];

  for (const part of parts) {
    const match = part.match(/^(\d+)[.\s)]+(.+)$/);
    if (match) {
      results.push({ index: parseInt(match[1]), category: match[2].trim().toLowerCase() });
    }
  }

  return results.length > 0 ? results : null;
}

// Store pending category creation requests
const pendingCategoryCreations: Map<string, {
  parsed: Array<{ index: number | "all"; category: string }>;
  unknownCategories: string[];
}> = new Map();

async function handleCategorizarResposta(chatId: string, text: string): Promise<boolean> {
  // FIRST: Check if user is responding to category creation prompt ("sim"/"não")
  const pendingCreation = pendingCategoryCreations.get(chatId);
  if (pendingCreation) {
    const normalized = text.trim().toLowerCase();
    if (normalized === "sim" || normalized === "s" || normalized === "yes" || normalized === "criar") {
      return handleCreateCategoriesAndCategorize(chatId);
    } else if (normalized === "não" || normalized === "nao" || normalized === "n" || normalized === "cancelar") {
      pendingCategoryCreations.delete(chatId);
      pendingReviews.delete(chatId);
      await sendTelegramMessage(chatId, `\u274c Categorização cancelada. As transações continuam sem categoria.\n\nUsa /revisar pra tentar de novo com categorias existentes.`);
      return true;
    }
  }

  const pending = pendingReviews.get(chatId);
  if (!pending || pending.length === 0) return false;

  const parsed = parseCategorizeResponse(text);
  if (!parsed) return false;

  const userId = await resolveUserIdFromChat(chatId);
  const allCats = await getAllCategories(userId);
  let categorized = 0;
  const results: string[] = [];
  const unknownCategories: string[] = [];
  const unknownItems: Array<{ index: number | "all"; category: string }> = [];

  for (const item of parsed) {
    // Find category by name (fuzzy match)
    const cat = allCats.find(c => 
      c.name.toLowerCase() === item.category ||
      c.name.toLowerCase().startsWith(item.category) ||
      item.category.startsWith(c.name.toLowerCase())
    );

    if (!cat) {
      if (!unknownCategories.includes(item.category)) {
        unknownCategories.push(item.category);
      }
      unknownItems.push(item);
      continue;
    }

    if (item.index === "all") {
      for (const txn of pending) {
        await updateTransactionCategory(txn.id, cat.id, userId);
        await upsertCategoryLearning(txn.description, cat.id, userId);
        categorized++;
      }
      results.push(`\u2705 Todos (${pending.length}) \u2192 ${cat.name}`);
    } else {
      const idx = item.index - 1;
      if (idx >= 0 && idx < pending.length) {
        const txn = pending[idx];
        await updateTransactionCategory(txn.id, cat.id, userId);
        await upsertCategoryLearning(txn.description, cat.id, userId);
        categorized++;
        results.push(`\u2705 ${item.index}. ${txn.description} \u2192 ${cat.name}`);
      } else {
        results.push(`\u274c Número ${item.index} não existe na lista`);
      }
    }
  }

  // If there are unknown categories, ask user if they want to create them
  if (unknownCategories.length > 0) {
    // Store the full parsed list and unknown categories for later
    pendingCategoryCreations.set(chatId, { parsed, unknownCategories });

    let msg = ``;
    if (categorized > 0) {
      msg += `\ud83c\udff7 <b>Parcialmente categorizado (${categorized}/${parsed.length}):</b>\n`;
      msg += results.join("\n");
      msg += `\n\n`;
    }
    msg += `\u2753 <b>Categorias não encontradas:</b>\n`;
    msg += unknownCategories.map(c => `   \u2022 ${c}`).join("\n");
    msg += `\n\n<b>Deseja criar essas categorias?</b>\nResponde <b>sim</b> pra criar e categorizar, ou <b>não</b> pra cancelar.`;

    await sendTelegramMessage(chatId, msg);
    return true;
  }

  // All categorized successfully
  pendingReviews.delete(chatId);

  let msg = `\ud83c\udff7 <b>Categorização atualizada!</b>\n\n`;
  msg += results.join("\n");
  msg += `\n\n\ud83e\udde0 Aprendi os padrões! Na próxima fatura vou categorizar automaticamente.`;

  const remaining = pending.length - categorized;
  if (remaining > 0) {
    msg += `\n\n\u26a0\ufe0f Ainda tem ${remaining} sem categoria. Usa /revisar pra ver.`;
  }

  await sendTelegramMessage(chatId, msg);
  return true;
}

async function handleCreateCategoriesAndCategorize(chatId: string): Promise<boolean> {
  const creationData = pendingCategoryCreations.get(chatId);
  if (!creationData) return false;

  const pending = pendingReviews.get(chatId);
  if (!pending || pending.length === 0) {
    pendingCategoryCreations.delete(chatId);
    await sendTelegramMessage(chatId, `\u274c Sessão expirada. Usa /revisar pra começar de novo.`);
    return true;
  }

  const userId = await resolveUserIdFromChat(chatId);
  const { parsed, unknownCategories } = creationData;

  // Create the new categories
  const createdCats: Array<{ name: string; id: number }> = [];
  for (const catName of unknownCategories) {
    try {
      const result = await createCategory({ name: catName.charAt(0).toUpperCase() + catName.slice(1), userId });
      const insertId = (result as any)[0]?.insertId || (result as any).insertId;
      if (insertId) {
        createdCats.push({ name: catName, id: insertId });
      }
    } catch (err) {
      console.error(`[Telegram] Failed to create category "${catName}":`, err);
    }
  }

  // Now re-run categorization with the new categories available
  const allCats = await getAllCategories(userId);
  let categorized = 0;
  const results: string[] = [];

  for (const item of parsed) {
    const cat = allCats.find(c => 
      c.name.toLowerCase() === item.category ||
      c.name.toLowerCase().startsWith(item.category) ||
      item.category.startsWith(c.name.toLowerCase())
    );

    if (!cat) {
      results.push(`\u274c "${item.category}" - falhou ao criar`);
      continue;
    }

    if (item.index === "all") {
      for (const txn of pending) {
        await updateTransactionCategory(txn.id, cat.id, userId);
        await upsertCategoryLearning(txn.description, cat.id, userId);
        categorized++;
      }
      results.push(`\u2705 Todos (${pending.length}) \u2192 ${cat.name}`);
    } else {
      const idx = item.index - 1;
      if (idx >= 0 && idx < pending.length) {
        const txn = pending[idx];
        await updateTransactionCategory(txn.id, cat.id, userId);
        await upsertCategoryLearning(txn.description, cat.id, userId);
        categorized++;
        results.push(`\u2705 ${item.index}. ${txn.description} \u2192 ${cat.name}`);
      }
    }
  }

  // Clear state
  pendingReviews.delete(chatId);
  pendingCategoryCreations.delete(chatId);

  let msg = `\ud83c\udff7 <b>Categorias criadas e transações categorizadas!</b>\n\n`;
  if (createdCats.length > 0) {
    msg += `\ud83c\udd95 <b>Novas categorias:</b> ${createdCats.map(c => c.name).join(", ")}\n\n`;
  }
  msg += results.join("\n");
  msg += `\n\n\ud83e\udde0 Aprendi os padrões! Na próxima fatura vou categorizar automaticamente.`;

  const remaining = pending.length - categorized;
  if (remaining > 0) {
    msg += `\n\n\u26a0\ufe0f Ainda tem ${remaining} sem categoria. Usa /revisar pra ver.`;
  }

  await sendTelegramMessage(chatId, msg);
  return true;
}

// ========== INSTALLMENT HANDLER ==========

async function handleInstallmentMessage(chatId: string, parsed: ParsedInstallment) {
  try {
    const userId = await resolveUserIdFromChat(chatId);
    const perInstallment = Math.round((parsed.totalAmount / parsed.installments) * 100) / 100;
    const result = await createInstallmentPurchase({
      description: parsed.description,
      totalAmount: parsed.totalAmount.toFixed(2),
      installments: parsed.installments,
      type: "expense",
      scope: parsed.scope,
      cardId: null,
      categoryId: null,
      firstDate: Date.now(),
      userId,
    });

    const scopeLabel = parsed.scope === "pj" ? "PJ (Empresa)" : "PF (Pessoal)";
    await sendTelegramMessage(chatId,
      `\u2705 <b>Compra parcelada registrada!</b>\n\n` +
      `\ud83d\udcdd ${parsed.description}\n` +
      `\ud83d\udcb0 Total: R$ ${parsed.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
      `\ud83d\udcc6 ${parsed.installments}x de R$ ${perInstallment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
      `\ud83c\udfe2 Escopo: ${scopeLabel}\n\n` +
      `As parcelas foram criadas automaticamente para os pr\u00f3ximos ${parsed.installments} meses.`
    );
  } catch (err) {
    console.error("[Telegram] Failed to create installment:", err);
    await sendTelegramMessage(chatId, `\u274c Erro ao registrar parcelado. Tenta de novo.`);
  }
}

// ========== WEBHOOK HANDLER ==========

export async function handleTelegramWebhook(body: any) {
  // Handle callback queries (inline button presses)
  const callbackQuery = body?.callback_query;
  if (callbackQuery) {
    const cbChatId = String(callbackQuery.message?.chat?.id);
    const cbData = callbackQuery.data;
    await answerCallbackQuery(callbackQuery.id);

    if (cbData === "scan_receipt") {
      const pending = pendingStatements.get(cbChatId);
      if (pending) {
        pendingStatements.delete(cbChatId);
        return handleSingleReceiptScan(cbChatId, pending.fileId, pending.fileName, pending.mimeType);
      } else {
        await sendTelegramMessage(cbChatId, `⚠️ Não encontrei o documento pendente. Manda de novo.`);
      }
      return;
    }

    if (cbData === "scope_pj" || cbData === "scope_pf") {
      const pending = pendingStatements.get(cbChatId);
      if (pending) {
        pendingStatements.delete(cbChatId);
        const scope = cbData === "scope_pj" ? "pj" : "pf";
        return handleCardStatement(cbChatId, pending.fileId, pending.fileName, pending.mimeType, scope);
      } else {
        await sendTelegramMessage(cbChatId, `⚠️ Não encontrei a fatura pendente. Manda de novo a foto/PDF.`);
      }
    }

    if (cbData === "receipt_confirm") {
      const pendingScan = pendingReceiptScans.get(cbChatId);
      if (pendingScan) {
        pendingReceiptScans.delete(cbChatId);
        return confirmReceiptScan(cbChatId, pendingScan);
      } else {
        await sendTelegramMessage(cbChatId, `⚠️ Não encontrei o recibo pendente. Manda de novo.`);
      }
      return;
    }

    if (cbData === "receipt_ignore") {
      pendingReceiptScans.delete(cbChatId);
      await sendTelegramMessage(cbChatId, `✅ Recibo ignorado. Nenhuma transação criada.`);
      return;
    }

    if (cbData === "receipt_pj" || cbData === "receipt_pf") {
      const pendingScan = pendingReceiptScans.get(cbChatId);
      if (pendingScan) {
        pendingScan.extracted.scope = cbData === "receipt_pj" ? "pj" : "pf";
        pendingReceiptScans.delete(cbChatId);
        return confirmReceiptScan(cbChatId, pendingScan);
      }
      return;
    }

    return;
  }

  const message = body?.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = (message.text || "").trim();
  const firstName = message.from?.first_name || "Amigo";
  const username = message.from?.username;

  // Save session
  await upsertTelegramSession({ chatId, firstName, username });

  // Handle photo/document (card statement) - ask PJ or PF first
  if (message.photo || message.document) {
    let fileId: string | null = null;
    let fileName = "fatura";
    let mimeType = "image/jpeg";

    if (message.photo) {
      const photos = message.photo;
      fileId = photos[photos.length - 1].file_id;
      fileName = `fatura-${Date.now()}.jpg`;
      mimeType = "image/jpeg";
    } else if (message.document) {
      const doc = message.document;
      const docMime = doc.mime_type || "";
      if (docMime === "application/pdf" || docMime.startsWith("image/")) {
        fileId = doc.file_id;
        fileName = doc.file_name || `fatura-${Date.now()}`;
        mimeType = docMime;
      }
    }

    if (fileId) {
      // Check if user sent a caption indicating it's a single receipt
      const caption = (message.caption || "").trim().toLowerCase();
      const isReceipt = caption.includes("recibo") || caption.includes("nf") || caption.includes("nota") || caption.includes("cupom") || caption.includes("avulso") || caption.includes("gasto");

      if (isReceipt) {
        // Single receipt flow - scan and extract single transaction
        return handleSingleReceiptScan(chatId, fileId, fileName, mimeType);
      }

      // Default: full invoice flow - ask PJ/PF then process as card statement
      pendingStatements.set(chatId, { fileId, fileName, mimeType });
      await sendTelegramMessageWithButtons(chatId,
        `📎 Recebi o documento! O que é isso?`,
        [
          [{ text: "🧾 Recibo/NF avulso", callback_data: "scan_receipt" }],
          [{ text: "🏢 Fatura PJ", callback_data: "scope_pj" }],
          [{ text: "👤 Fatura PF", callback_data: "scope_pf" }],
        ]
      );
      return;
    }
  }

  // Text commands
  if (!text) return;

  // Commands
  if (text.startsWith("/start")) return handleStart(chatId, firstName, username);
  if (text.startsWith("/resumo")) return handleResumo(chatId);
  if (text.startsWith("/cartoes") || text.startsWith("/cartões")) return handleCartoes(chatId);
  if (text.startsWith("/impostos")) return handleImpostos(chatId);
  if (text.startsWith("/jobs")) return handleJobs(chatId);
  if (text.startsWith("/recorrencias") || text.startsWith("/recorrências")) return handleRecorrencias(chatId);
  if (text.startsWith("/diarias") || text.startsWith("/diárias")) return handleDiarias(chatId);
  if (text.startsWith("/projecao") || text.startsWith("/projeção")) return handleProjecao(chatId);
  if (text.startsWith("/ultimas") || text.startsWith("/últimas")) return handleUltimas(chatId);
  if (text.startsWith("/ajuda") || text.startsWith("/help")) return handleAjuda(chatId);
  if (text.startsWith("/revisar")) return handleRevisar(chatId);
  if (text.startsWith("/vincular")) return handleVincular(chatId, text, username, firstName);
  if (text.startsWith("/desvincular")) return handleDesvincular(chatId);

  // Try to parse as categorization response (if there's a pending review)
  const categorized = await handleCategorizarResposta(chatId, text);
  if (categorized) return;

  // Try to parse as installment purchase
  const parsedInstallment = parseInstallmentMessage(text);
  if (parsedInstallment) {
    return handleInstallmentMessage(chatId, parsedInstallment);
  }

  // Try to parse as job creation
  const parsedJob = parseJobMessage(text);
  if (parsedJob) {
    return handleJobMessage(chatId, parsedJob);
  }

  // Try to parse as transaction
  const parsed = parseMessage(text);
  if (parsed) {
    return handleTransactionMessage(chatId, parsed);
  }

  // Unknown message
  await sendTelegramMessage(chatId,
    `🤔 Não entendi. Tenta assim:\n\n` +
    `<code>cartão PF 150 mercado</code>\n` +
    `<code>receita PJ 3000 cliente X</code>\n` +
    `<code>job Campanha Iguatemi 15000</code>\n` +
    `<code>parcelado PF 1200 12x TV Samsung</code>\n\n` +
    `📎 Ou manda a <b>foto/PDF da fatura</b> do cartão!\n\n` +
    `Digita /ajuda pra ver todos os comandos.`
  );
}

// ========== ACCOUNT LINKING ==========

async function handleVincular(chatId: string, text: string, username?: string, firstName?: string) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return sendTelegramMessage(chatId,
      `🔗 <b>Vincular conta</b>\n\n` +
      `Para vincular teu Telegram à tua conta no app, gere um código na página de Configurações do app e depois mande:\n\n` +
      `<code>/vincular SEU_CODIGO</code>\n\n` +
      `O código expira em 5 minutos.`
    );
  }
  const code = parts[1].toUpperCase();
  const { consumeTelegramLinkingCode, linkTelegramToUser } = await import("./db");
  const userId = await consumeTelegramLinkingCode(code);
  if (!userId) {
    return sendTelegramMessage(chatId,
      `❌ Código inválido ou expirado. Gere um novo código no app e tente novamente.`
    );
  }
  await linkTelegramToUser(chatId, userId, username, firstName);
  return sendTelegramMessage(chatId,
    `✅ <b>Conta vinculada com sucesso!</b>\n\n` +
    `Agora tudo que tu mandar aqui vai direto pra tua conta no app. ` +
    `Manda /ajuda pra ver os comandos disponíveis.`
  );
}

async function handleDesvincular(chatId: string) {
  const { unlinkTelegram } = await import("./db");
  await unlinkTelegram(chatId);
  return sendTelegramMessage(chatId,
    `🔓 <b>Conta desvinculada.</b>\n\n` +
    `Teu Telegram não está mais conectado a nenhuma conta. ` +
    `Para vincular novamente, gere um novo código no app e use /vincular.`
  );
}

// ========== SINGLE RECEIPT SCAN ==========

async function handleSingleReceiptScan(chatId: string, fileId: string, fileName: string, mimeType: string) {
  try {
    const userId = await resolveUserIdFromChat(chatId);
    await sendTelegramMessage(chatId, `📷 Analisando recibo/NF... pode levar alguns segundos.`);

    // 1. Get file URL from Telegram
    const fileInfoRes = await fetch(`${TELEGRAM_API}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      await sendTelegramMessage(chatId, `❌ Não consegui baixar o arquivo. Tenta mandar de novo.`);
      return;
    }

    const telegramFileUrl = `https://api.telegram.org/file/bot${ENV.telegramBotToken}/${fileInfo.result.file_path}`;

    // 2. Download file
    const fileRes = await fetch(telegramFileUrl);
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer());

    // 3. Upload to S3
    const { url: imageUrl } = await uploadScanImage(fileBuffer, userId, mimeType);

    // 4. Extract data using LLM vision
    const extracted = await extractDataFromImage(imageUrl);

    // 5. Check for duplicates (45-day window)
    const duplicates = await findDuplicates(extracted, userId, 45);
    const hasDuplicates = duplicates.length > 0;

    // 6. Format date for display
    const dateStr = new Date(extracted.date).toLocaleDateString("pt-BR");
    const scopeLabel = extracted.scope === "pj" ? "PJ" : "PF";

    let msg = `🧾 <b>Dados extraídos do recibo:</b>\n\n`;
    msg += `📝 ${extracted.description}\n`;
    msg += `💵 R$ ${extracted.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    msg += `📅 ${dateStr}\n`;
    msg += `🏷 ${extracted.category || "outros"}\n`;
    msg += `🏢 ${scopeLabel}\n`;
    if (extracted.supplier) msg += `🏪 ${extracted.supplier}\n`;

    if (hasDuplicates) {
      const dup = duplicates[0];
      const dupDate = new Date(dup.date).toLocaleDateString("pt-BR");
      msg += `\n⚠️ <b>Possível duplicata encontrada:</b>\n`;
      msg += `"${dup.description}" R$ ${parseFloat(dup.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${dupDate}\n`;
      msg += `Similaridade: ${Math.round(dup.similarity * 100)}%\n`;
    }

    // Store pending scan for confirmation
    pendingReceiptScans.set(chatId, {
      extracted: {
        description: extracted.description,
        amount: extracted.amount,
        type: extracted.type,
        scope: extracted.scope,
        date: extracted.date,
        category: extracted.category,
        supplier: extracted.supplier,
      },
      imageUrl,
      hasDuplicates,
      duplicateDesc: hasDuplicates ? duplicates[0].description : undefined,
    });

    // Ask for confirmation with PJ/PF choice
    const buttons = hasDuplicates
      ? [
          [{ text: "✅ Criar mesmo assim (PJ)", callback_data: "receipt_pj" }, { text: "✅ Criar (PF)", callback_data: "receipt_pf" }],
          [{ text: "❌ Ignorar (duplicata)", callback_data: "receipt_ignore" }],
        ]
      : [
          [{ text: "🏢 Confirmar PJ", callback_data: "receipt_pj" }, { text: "👤 Confirmar PF", callback_data: "receipt_pf" }],
          [{ text: "❌ Cancelar", callback_data: "receipt_ignore" }],
        ];

    await sendTelegramMessageWithButtons(chatId, msg, buttons);
  } catch (err) {
    console.error("[Telegram] Failed to scan receipt:", err);
    await sendTelegramMessage(chatId, `❌ Erro ao analisar o recibo. Tenta mandar uma foto mais nítida.`);
  }
}

async function confirmReceiptScan(chatId: string, scan: PendingReceiptScan) {
  try {
    const userId = await resolveUserIdFromChat(chatId);
    const allCats = await getAllCategories(userId);

    // Try to match category
    let categoryId: number | null = null;
    if (scan.extracted.category) {
      const catLower = scan.extracted.category.toLowerCase();
      const cat = allCats.find(c => c.name.toLowerCase().includes(catLower) || catLower.includes(c.name.toLowerCase()));
      if (cat) categoryId = cat.id;
    }

    await createTransaction({
      description: scan.extracted.description,
      amount: scan.extracted.amount.toFixed(2),
      type: scan.extracted.type,
      scope: scan.extracted.scope,
      date: scan.extracted.date,
      categoryId,
      source: "scan",
      userId,
    });

    const scopeLabel = scan.extracted.scope === "pj" ? "PJ" : "PF";
    const typeEmoji = scan.extracted.type === "income" ? "💰" : "💳";
    await sendTelegramMessage(chatId,
      `${typeEmoji} <b>${scan.extracted.type === "income" ? "Receita" : "Despesa"} registrada!</b>\n\n` +
      `📝 ${scan.extracted.description}\n` +
      `💵 R$ ${scan.extracted.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
      `🏷 ${scopeLabel}\n\n` +
      `✅ Criado a partir do scan do recibo!`
    );
  } catch (err) {
    console.error("[Telegram] Failed to confirm receipt scan:", err);
    await sendTelegramMessage(chatId, `❌ Erro ao salvar a transação. Tenta de novo.`);
  }
}

// ========== TAX REMINDER CHECKER ==========

export async function checkTaxReminders() {
  // Scheduled job runs for the owner (userId 1)
  const userId = 1;
  const reminders = await getAllTaxReminders(userId);
  const sessions = await getActiveTelegramSessions();
  const now = new Date();

  for (const reminder of reminders) {
    let nextDue: Date;
    if (reminder.type === "das") {
      nextDue = new Date(now.getFullYear(), now.getMonth(), reminder.dueDay);
      if (nextDue < now) continue;
    } else {
      nextDue = new Date(now.getFullYear(), (reminder.dueMonth || 5) - 1, reminder.dueDay);
      if (nextDue < now) continue;
    }

    const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil === 7 || daysUntil === 3 || daysUntil === 1 || daysUntil === 0) {
      const lastNotified = reminder.lastNotified || 0;
      const hoursSinceNotified = (Date.now() - lastNotified) / (1000 * 60 * 60);
      if (hoursSinceNotified < 20) continue;

      const urgency = daysUntil <= 1 ? "🚨" : daysUntil <= 3 ? "⚠️" : "📅";
      const msg = `${urgency} <b>Lembrete: ${reminder.name}</b>\n\n` +
        `Vencimento: ${nextDue.toLocaleDateString("pt-BR")}\n` +
        `${daysUntil === 0 ? "VENCE HOJE!" : `Faltam ${daysUntil} dias`}\n` +
        (reminder.description ? `\n${reminder.description}` : "");

      for (const session of sessions) {
        await sendTelegramMessage(session.chatId, msg);
      }
      await updateTaxReminderNotified(reminder.id);
    }
  }
}

// ========== MONTHLY SUMMARY ==========

export async function sendMonthlySummary() {
  const sessions = await getActiveTelegramSessions();
  if (sessions.length === 0) return;

  // Scheduled job runs for the owner (userId 1)
  const userId = 1;
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfLastMonth = lastMonth.getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();

  const data = await getDashboardData(startOfLastMonth, endOfLastMonth, userId);
  const allCards = await getAllCards(userId);
  const monthName = lastMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  let msg = `📊 <b>Resumo Mensal - ${monthName}</b>\n\n`;

  msg += `💳 <b>Por Cartão:</b>\n`;
  for (const card of allCards) {
    const cardData = data.byCard.find(c => c.cardId === card.id);
    const total = cardData ? parseFloat(String(cardData.total)) : 0;
    msg += `   ${card.name}: R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  }

  msg += `\n🏢 <b>PJ:</b> Receita R$ ${data.byScope.filter(s => s.scope === "pj" && s.type === "income").reduce((a, b) => a + parseFloat(String(b.total)), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Despesa R$ ${data.byScope.filter(s => s.scope === "pj" && s.type === "expense").reduce((a, b) => a + parseFloat(String(b.total)), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  msg += `👤 <b>PF:</b> Receita R$ ${data.byScope.filter(s => s.scope === "pf" && s.type === "income").reduce((a, b) => a + parseFloat(String(b.total)), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Despesa R$ ${data.byScope.filter(s => s.scope === "pf" && s.type === "expense").reduce((a, b) => a + parseFloat(String(b.total)), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;

  msg += `\n💰 <b>Saldo:</b> R$ ${(data.totals.income - data.totals.expense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  for (const session of sessions) {
    await sendTelegramMessage(session.chatId, msg);
  }
}

// ========== SETUP WEBHOOK ==========

export async function setupTelegramWebhook(baseUrl: string) {
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    console.log("[Telegram] Webhook setup:", data);
    return data;
  } catch (err) {
    console.error("[Telegram] Failed to setup webhook:", err);
  }
}
