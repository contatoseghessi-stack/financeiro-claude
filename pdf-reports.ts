import { getTransactions, getAllCards, getAllCategories, getWorkDays, getWorkDaysSummary, getJobById, getJobSummary, getJobDeliveries, getJobCosts, getJobPayments, getDashboardData } from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("pt-BR");

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── SHARED STYLES ──────────────────────────────────────────────────────────
const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, -apple-system, sans-serif; color: #1a1a2e; background: #fff; line-height: 1.5; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 15px; }
    .header { break-inside: avoid; }
    .section { break-inside: avoid; }
  }
  .page { max-width: 800px; margin: 0 auto; padding: 40px 30px; }
  .header { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: #fff; padding: 40px 30px; border-radius: 12px; margin-bottom: 30px; }
  .header h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
  .header .subtitle { font-size: 14px; opacity: 0.8; }
  .header .brand { font-size: 11px; opacity: 0.5; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 16px; font-weight: 700; color: #302b63; border-bottom: 2px solid #302b63; padding-bottom: 6px; margin-bottom: 16px; }
  .grid { display: grid; gap: 12px; }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .metric { background: #f8f9fc; border: 1px solid #e8eaf0; border-radius: 8px; padding: 16px; text-align: center; }
  .metric .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 4px; }
  .metric .value { font-size: 22px; font-weight: 700; }
  .metric .value.green { color: #059669; }
  .metric .value.red { color: #dc2626; }
  .metric .value.blue { color: #2563eb; }
  .metric .value.purple { color: #7c3aed; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f3f8; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  .bar-container { background: #e5e7eb; border-radius: 4px; height: 8px; margin-top: 4px; }
  .bar-fill { height: 8px; border-radius: 4px; background: linear-gradient(90deg, #302b63, #667eea); }
  .print-btn { position: fixed; top: 16px; right: 16px; background: #302b63; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 1000; }
  .print-btn:hover { background: #24243e; }
`;

// ─── MONTHLY REPORT ─────────────────────────────────────────────────────────
export async function generateMonthlyReportHTML(month: number, year: number, userId?: number): Promise<string> {
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const txData = await getTransactions({ startDate, endDate, userId });
  const txList = Array.isArray(txData) ? txData : txData?.items || [];
  const cards = await getAllCards(userId);
  const categories = await getAllCategories(userId);
  const workDays = await getWorkDaysSummary(startDate, endDate, userId);

  // Job data for the month
  const dashData = await getDashboardData(startDate, endDate, userId);
  const jobIncome = dashData.jobTotals.income;
  const jobExpense = dashData.jobTotals.expense;
  const jobPendingIncome = dashData.jobTotals.pendingIncome;
  const jobPendingExpense = dashData.jobTotals.pendingExpense;

  // Aggregate
  let incomePJ = 0, incomePF = 0, expensePJ = 0, expensePF = 0;
  const byCard: Record<number, number> = {};
  const byCat: Record<number, number> = {};

  txList.forEach((t: any) => {
    const amt = parseFloat(String(t.amount));
    if (t.type === "income") {
      if (t.scope === "pf") incomePF += amt; else incomePJ += amt;
    } else {
      if (t.scope === "pf") expensePF += amt; else expensePJ += amt;
      if (t.cardId) byCard[t.cardId] = (byCard[t.cardId] || 0) + amt;
      if (t.categoryId) byCat[t.categoryId] = (byCat[t.categoryId] || 0) + amt;
    }
  });

  const totalIncome = incomePJ + incomePF + jobIncome;
  const totalExpense = expensePJ + expensePF + jobExpense;
  const balance = totalIncome - totalExpense;

  // Previous month comparison
  const prevStart = new Date(year, month - 2, 1).getTime();
  const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999).getTime();
  const prevTxData = await getTransactions({ startDate: prevStart, endDate: prevEnd, userId });
  const prevTxList = Array.isArray(prevTxData) ? prevTxData : prevTxData?.items || [];
  let prevIncome = 0, prevExpense = 0;
  prevTxList.forEach((t: any) => {
    const amt = parseFloat(String(t.amount));
    if (t.type === "income") prevIncome += amt; else prevExpense += amt;
  });

  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1) : "—";
  const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense * 100).toFixed(1) : "—";

  // Card rows
  const cardRows = Object.entries(byCard)
    .map(([id, total]) => {
      const card = cards.find(c => c.id === Number(id));
      return { name: card?.name || "Desconhecido", total };
    })
    .sort((a, b) => b.total - a.total);

  // Category rows with percentage bars
  const catRows = Object.entries(byCat)
    .map(([id, total]) => {
      const cat = categories.find(c => c.id === Number(id));
      return { name: cat?.name || "Sem categoria", total };
    })
    .sort((a, b) => b.total - a.total);
  const maxCat = catRows[0]?.total || 1;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Mensal - ${monthNames[month - 1]} ${year}</title><style>${baseStyles}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">\uD83D\uDDA8\uFE0F Salvar como PDF</button>
<div class="page">
  <div class="header">
    <h1>Relatório Financeiro Mensal</h1>
    <div class="subtitle">${monthNames[month - 1]} de ${year}</div>
    <div class="brand">Estúdio Criativo Eugê</div>
  </div>

  <div class="section">
    <div class="section-title">Resumo Geral</div>
    <div class="grid grid-4">
      <div class="metric"><div class="label">Receitas</div><div class="value green">${formatCurrency(totalIncome)}</div></div>
      <div class="metric"><div class="label">Despesas</div><div class="value red">${formatCurrency(totalExpense)}</div></div>
      <div class="metric"><div class="label">Saldo</div><div class="value ${balance >= 0 ? 'blue' : 'red'}">${formatCurrency(balance)}</div></div>
      <div class="metric"><div class="label">Transações</div><div class="value">${txList.length}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">PJ vs PF</div>
    <div class="grid grid-2">
      <div class="metric">
        <div class="label">Receita PJ</div><div class="value green">${formatCurrency(incomePJ)}</div>
      </div>
      <div class="metric">
        <div class="label">Receita PF</div><div class="value green">${formatCurrency(incomePF)}</div>
      </div>
      <div class="metric">
        <div class="label">Despesa PJ</div><div class="value red">${formatCurrency(expensePJ)}</div>
      </div>
      <div class="metric">
        <div class="label">Despesa PF</div><div class="value red">${formatCurrency(expensePF)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Comparativo com Mês Anterior</div>
    <div class="grid grid-2">
      <div class="metric">
        <div class="label">Variação Receitas</div>
        <div class="value ${Number(incomeChange) >= 0 ? 'green' : 'red'}">${incomeChange === "—" ? "—" : `${Number(incomeChange) >= 0 ? "+" : ""}${incomeChange}%`}</div>
      </div>
      <div class="metric">
        <div class="label">Variação Despesas</div>
        <div class="value ${Number(expenseChange) <= 0 ? 'green' : 'red'}">${expenseChange === "—" ? "—" : `${Number(expenseChange) >= 0 ? "+" : ""}${expenseChange}%`}</div>
      </div>
    </div>
  </div>

  ${cardRows.length > 0 ? `
  <div class="section">
    <div class="section-title">Gastos por Cartão</div>
    <table>
      <thead><tr><th>Cartão</th><th class="text-right">Total</th></tr></thead>
      <tbody>${cardRows.map(c => `<tr><td>${c.name}</td><td class="text-right">${formatCurrency(c.total)}</td></tr>`).join("")}</tbody>
    </table>
  </div>` : ""}

  ${catRows.length > 0 ? `
  <div class="section">
    <div class="section-title">Despesas por Categoria</div>
    <table>
      <thead><tr><th>Categoria</th><th class="text-right">Valor</th><th style="width:30%">Proporção</th></tr></thead>
      <tbody>${catRows.map(c => `<tr>
        <td>${c.name}</td>
        <td class="text-right">${formatCurrency(c.total)}</td>
        <td><div class="bar-container"><div class="bar-fill" style="width:${(c.total / maxCat * 100).toFixed(0)}%"></div></div></td>
      </tr>`).join("")}</tbody>
    </table>
  </div>` : ""}

  ${(jobIncome > 0 || jobExpense > 0 || jobPendingIncome > 0 || jobPendingExpense > 0) ? `
  <div class="section">
    <div class="section-title">Jobs (Projetos)</div>
    <div class="grid grid-2">
      <div class="metric"><div class="label">Receita Jobs (Recebido)</div><div class="value green">${formatCurrency(jobIncome)}</div></div>
      <div class="metric"><div class="label">Custos Jobs (Pago)</div><div class="value red">${formatCurrency(jobExpense)}</div></div>
      <div class="metric"><div class="label">A Receber (Pendente)</div><div class="value blue">${formatCurrency(jobPendingIncome)}</div></div>
      <div class="metric"><div class="label">A Pagar (Pendente)</div><div class="value purple">${formatCurrency(jobPendingExpense)}</div></div>
    </div>
  </div>` : ""}

  ${workDays.count > 0 ? `
  <div class="section">
    <div class="section-title">Diárias de Trabalho</div>
    <div class="grid grid-2">
      <div class="metric"><div class="label">Total Faturado</div><div class="value green">${formatCurrency(workDays.total)}</div></div>
      <div class="metric"><div class="label">Dias Trabalhados</div><div class="value">${workDays.count}</div></div>
    </div>
  </div>` : ""}

  <div class="footer">
    <p>Relatório gerado automaticamente pelo Financeiro Eugê em ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
</div></body></html>`;
}

// ─── ANNUAL REPORT ──────────────────────────────────────────────────────────
export async function generateAnnualReportHTML(year: number, userId?: number): Promise<string> {
  const monthlyData: Array<{ month: string; income: number; expense: number; balance: number; txCount: number }> = [];
  let yearIncome = 0, yearExpense = 0, yearTxCount = 0;

  for (let m = 1; m <= 12; m++) {
    const startDate = new Date(year, m - 1, 1).getTime();
    const endDate = new Date(year, m, 0, 23, 59, 59, 999).getTime();
    const txData = await getTransactions({ startDate, endDate, userId });
    const txList = Array.isArray(txData) ? txData : txData?.items || [];

    let income = 0, expense = 0;
    txList.forEach((t: any) => {
      const amt = parseFloat(String(t.amount));
      if (t.type === "income") income += amt; else expense += amt;
    });

    yearIncome += income;
    yearExpense += expense;
    yearTxCount += txList.length;

    monthlyData.push({
      month: monthNames[m - 1].substring(0, 3),
      income,
      expense,
      balance: income - expense,
      txCount: txList.length,
    });
  }

  const yearBalance = yearIncome - yearExpense;
  const avgMonthlyIncome = yearIncome / 12;
  const avgMonthlyExpense = yearExpense / 12;
  const bestMonth = monthlyData.reduce((best, m) => m.balance > best.balance ? m : best, monthlyData[0]);
  const worstMonth = monthlyData.reduce((worst, m) => m.balance < worst.balance ? m : worst, monthlyData[0]);

  // Category totals for the year
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  const allTxData = await getTransactions({ startDate: yearStart, endDate: yearEnd, userId });
  const allTxList = Array.isArray(allTxData) ? allTxData : allTxData?.items || [];
  const categories = await getAllCategories(userId);
  const byCat: Record<number, number> = {};
  let incomePJ = 0, incomePF = 0, expensePJ = 0, expensePF = 0;

  allTxList.forEach((t: any) => {
    const amt = parseFloat(String(t.amount));
    if (t.type === "income") {
      if (t.scope === "pf") incomePF += amt; else incomePJ += amt;
    } else {
      if (t.scope === "pf") expensePF += amt; else expensePJ += amt;
      if (t.categoryId) byCat[t.categoryId] = (byCat[t.categoryId] || 0) + amt;
    }
  });

  const catRows = Object.entries(byCat)
    .map(([id, total]) => {
      const cat = categories.find(c => c.id === Number(id));
      return { name: cat?.name || "Sem categoria", total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Anual - ${year}</title><style>${baseStyles}
    .month-row td { font-size: 12px; }
    .month-row .positive { color: #059669; }
    .month-row .negative { color: #dc2626; }
  </style></head><body>
<button class="print-btn no-print" onclick="window.print()">\uD83D\uDDA8\uFE0F Salvar como PDF</button>
<div class="page">
  <div class="header">
    <h1>Relatório Financeiro Anual</h1>
    <div class="subtitle">${year}</div>
    <div class="brand">Estúdio Criativo Eugê</div>
  </div>

  <div class="section">
    <div class="section-title">Resumo do Ano</div>
    <div class="grid grid-4">
      <div class="metric"><div class="label">Receita Total</div><div class="value green">${formatCurrency(yearIncome)}</div></div>
      <div class="metric"><div class="label">Despesa Total</div><div class="value red">${formatCurrency(yearExpense)}</div></div>
      <div class="metric"><div class="label">Lucro Líquido</div><div class="value ${yearBalance >= 0 ? 'blue' : 'red'}">${formatCurrency(yearBalance)}</div></div>
      <div class="metric"><div class="label">Transações</div><div class="value">${yearTxCount}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Médias e Destaques</div>
    <div class="grid grid-4">
      <div class="metric"><div class="label">Média Receita/Mês</div><div class="value green">${formatCurrency(avgMonthlyIncome)}</div></div>
      <div class="metric"><div class="label">Média Despesa/Mês</div><div class="value red">${formatCurrency(avgMonthlyExpense)}</div></div>
      <div class="metric"><div class="label">Melhor Mês</div><div class="value blue">${bestMonth.month}</div></div>
      <div class="metric"><div class="label">Pior Mês</div><div class="value red">${worstMonth.month}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">PJ vs PF — Ano Completo</div>
    <div class="grid grid-4">
      <div class="metric"><div class="label">Receita PJ</div><div class="value green">${formatCurrency(incomePJ)}</div></div>
      <div class="metric"><div class="label">Receita PF</div><div class="value green">${formatCurrency(incomePF)}</div></div>
      <div class="metric"><div class="label">Despesa PJ</div><div class="value red">${formatCurrency(expensePJ)}</div></div>
      <div class="metric"><div class="label">Despesa PF</div><div class="value red">${formatCurrency(expensePF)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Evolução Mês a Mês</div>
    <table>
      <thead><tr><th>Mês</th><th class="text-right">Receitas</th><th class="text-right">Despesas</th><th class="text-right">Saldo</th><th class="text-center">Qtd</th></tr></thead>
      <tbody>${monthlyData.map(m => `<tr class="month-row">
        <td><strong>${m.month}</strong></td>
        <td class="text-right positive">${formatCurrency(m.income)}</td>
        <td class="text-right negative">${formatCurrency(m.expense)}</td>
        <td class="text-right ${m.balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(m.balance)}</td>
        <td class="text-center">${m.txCount}</td>
      </tr>`).join("")}
      <tr style="font-weight:700; background:#f1f3f8;">
        <td>TOTAL</td>
        <td class="text-right" style="color:#059669">${formatCurrency(yearIncome)}</td>
        <td class="text-right" style="color:#dc2626">${formatCurrency(yearExpense)}</td>
        <td class="text-right" style="color:${yearBalance >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(yearBalance)}</td>
        <td class="text-center">${yearTxCount}</td>
      </tr></tbody>
    </table>
  </div>

  ${catRows.length > 0 ? `
  <div class="section">
    <div class="section-title">Top 10 Categorias de Despesa</div>
    <table>
      <thead><tr><th>Categoria</th><th class="text-right">Total Anual</th><th class="text-right">Média/Mês</th></tr></thead>
      <tbody>${catRows.map(c => `<tr>
        <td>${c.name}</td>
        <td class="text-right">${formatCurrency(c.total)}</td>
        <td class="text-right">${formatCurrency(c.total / 12)}</td>
      </tr>`).join("")}</tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    <p>Relatório gerado automaticamente pelo Financeiro Eugê em ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
</div></body></html>`;
}

// ─── JOB REPORT ─────────────────────────────────────────────────────────────
export async function generateJobReportHTML(jobId: number, userId?: number): Promise<string> {
  const job = await getJobById(jobId);
  if (!job) throw new Error("Job não encontrado");

  const summary = await getJobSummary(jobId);
  const deliveries = await getJobDeliveries(jobId);
  const costs = await getJobCosts(jobId);
  const payments = await getJobPayments(jobId);

  const statusLabel: Record<string, string> = {
    draft: "Rascunho", in_progress: "Em Andamento", completed: "Concluído", cancelled: "Cancelado",
  };
  const statusBadge: Record<string, string> = {
    draft: "badge-gray", in_progress: "badge-blue", completed: "badge-green", cancelled: "badge-red",
  };

  const margin = summary.totalPayments > 0
    ? ((summary.totalPayments - summary.totalCosts) / summary.totalPayments * 100).toFixed(1)
    : "0.0";

  const deliveryRows = deliveries.map((d: any) => `<tr>
    <td>${d.description}</td>
    <td class="text-center"><span class="badge ${d.status === 'delivered' ? 'badge-green' : 'badge-yellow'}">${d.status === 'delivered' ? 'Entregue' : 'Pendente'}</span></td>
  </tr>`).join("");

  const costRows = costs.map((c: any) => `<tr>
    <td>${c.description}</td>
    <td class="text-right">${formatCurrency(parseFloat(String(c.amount)))}</td>
    <td>${c.supplierName || "—"}</td>
  </tr>`).join("");

  const paymentRows = payments.map((p: any) => `<tr>
    <td>${p.description}</td>
    <td class="text-right">${formatCurrency(parseFloat(String(p.amount)))}</td>
    <td class="text-center">${p.expectedDate ? formatDate(p.expectedDate) : "—"}</td>
    <td class="text-center">${p.receivedDate ? formatDate(p.receivedDate) : "—"}</td>
    <td class="text-center"><span class="badge ${p.status === 'received' ? 'badge-green' : 'badge-yellow'}">${p.status === 'received' ? 'Recebido' : 'Pendente'}</span></td>
  </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório - ${job.name}</title><style>${baseStyles}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">\uD83D\uDDA8\uFE0F Salvar como PDF</button>
<div class="page">
  <div class="header">
    <h1>Relatório do Projeto</h1>
    <div class="subtitle">${job.name}</div>
    <div class="brand">Estúdio Criativo Eugê</div>
  </div>

  <div class="section">
    <div class="section-title">Informações do Projeto</div>
    <div class="grid grid-3">
      <div class="metric"><div class="label">Status</div><div class="value"><span class="badge ${statusBadge[job.status] || 'badge-gray'}">${statusLabel[job.status] || job.status}</span></div></div>
      <div class="metric"><div class="label">Cliente</div><div class="value" style="font-size:14px">${job.clientName || "—"}</div></div>
      <div class="metric"><div class="label">Período</div><div class="value" style="font-size:12px">${job.startDate ? formatDate(job.startDate) : "—"} → ${job.endDate ? formatDate(job.endDate) : "—"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Resumo Financeiro</div>
    <div class="grid grid-4">
      <div class="metric"><div class="label">Valor Cobrado</div><div class="value green">${formatCurrency(summary.totalPayments)}</div></div>
      <div class="metric"><div class="label">Custos</div><div class="value red">${formatCurrency(summary.totalCosts)}</div></div>
      <div class="metric"><div class="label">Lucro</div><div class="value ${summary.profit >= 0 ? 'blue' : 'red'}">${formatCurrency(summary.profit)}</div></div>
      <div class="metric"><div class="label">Margem</div><div class="value purple">${margin}%</div></div>
    </div>
  </div>

  ${deliveries.length > 0 ? `
  <div class="section">
    <div class="section-title">Entregas (${deliveries.filter((d: any) => d.status === 'delivered').length}/${deliveries.length})</div>
    <table>
      <thead><tr><th>Descrição</th><th class="text-center">Status</th></tr></thead>
      <tbody>${deliveryRows}</tbody>
    </table>
  </div>` : ""}

  ${costs.length > 0 ? `
  <div class="section">
    <div class="section-title">Custos do Projeto</div>
    <table>
      <thead><tr><th>Descrição</th><th class="text-right">Valor</th><th>Fornecedor</th></tr></thead>
      <tbody>${costRows}
      <tr style="font-weight:700; background:#f1f3f8;">
        <td>TOTAL</td>
        <td class="text-right">${formatCurrency(summary.totalCosts)}</td>
        <td></td>
      </tr></tbody>
    </table>
  </div>` : ""}

  ${payments.length > 0 ? `
  <div class="section">
    <div class="section-title">Recebimentos</div>
    <table>
      <thead><tr><th>Descrição</th><th class="text-right">Valor</th><th class="text-center">Previsto</th><th class="text-center">Recebido</th><th class="text-center">Status</th></tr></thead>
      <tbody>${paymentRows}
      <tr style="font-weight:700; background:#f1f3f8;">
        <td>TOTAL</td>
        <td class="text-right">${formatCurrency(summary.totalPayments)}</td>
        <td colspan="3"></td>
      </tr></tbody>
    </table>
  </div>` : ""}

  ${job.notes ? `
  <div class="section">
    <div class="section-title">Observações</div>
    <p style="color:#4b5563; font-size:13px;">${job.notes}</p>
  </div>` : ""}

  <div class="footer">
    <p>Relatório gerado automaticamente pelo Financeiro Eugê em ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
</div></body></html>`;
}

// ─── GENERATE PDF & SEND ────────────────────────────────────────────────────
export async function generateAndSendReport(
  type: "monthly" | "annual" | "job",
  params: { month?: number; year?: number; jobId?: number },
  email: string,
  userId?: number
): Promise<{ pdfUrl: string; sent: boolean }> {
  let html: string;
  let fileName: string;

  if (type === "monthly") {
    html = await generateMonthlyReportHTML(params.month!, params.year!, userId);
    fileName = `relatorio-mensal-${params.year}-${String(params.month!).padStart(2, "0")}.html`;
  } else if (type === "annual") {
    html = await generateAnnualReportHTML(params.year!, userId);
    fileName = `relatorio-anual-${params.year}.html`;
  } else {
    html = await generateJobReportHTML(params.jobId!, userId);
    const job = await getJobById(params.jobId!);
    const safeName = (job?.name || "projeto").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    fileName = `relatorio-job-${safeName}.html`;
  }

  // Upload HTML to S3 (the HTML is self-contained and renders beautifully in browsers)
  const s3Key = `reports/${Date.now()}-${fileName}`;
  const { url: reportUrl } = await storagePut(s3Key, html, "text/html");

  // Notify owner with the report link
  const typeLabel = type === "monthly" ? "Mensal" : type === "annual" ? "Anual" : "do Projeto";
  const sent = await notifyOwner({
    title: `📊 Relatório ${typeLabel} Pronto`,
    content: `Seu relatório financeiro ${typeLabel.toLowerCase()} foi gerado com sucesso!\n\nAcesse aqui: ${reportUrl}\n\nEnviado para: ${email}`,
  });

  return { pdfUrl: reportUrl, sent };
}


// ─── WORK DAYS (DIÁRIAS) REPORTS ──────────────────────────────────────────────

export async function generateWorkDaysReportHTML(
  type: "monthly" | "annual",
  params: { month?: number; year: number; clientName?: string },
  userId?: number
): Promise<string> {
  if (type === "monthly" && !params.month) throw new Error("Month required for monthly report");

  const year = params.year;
  const month = params.month;

  if (type === "monthly") {
    // Monthly detailed report
    const start = new Date(year, month! - 1, 1).getTime();
    const end = new Date(year, month!, 0, 23, 59, 59).getTime();
    const items = await getWorkDays({ userId, month, year });
    const filtered = params.clientName
      ? items.filter((wd: any) => wd.clientName.toLowerCase() === params.clientName!.toLowerCase())
      : items;

    // Group by client (case-insensitive)
    const byClient: Record<string, { displayName: string; items: any[] }> = {};
    for (const wd of filtered) {
      const key = wd.clientName.toLowerCase();
      if (!byClient[key]) byClient[key] = { displayName: wd.clientName, items: [] };
      byClient[key].items.push(wd);
    }

    const total = filtered.reduce((sum: number, wd: any) => sum + parseFloat(wd.dailyRate || "0"), 0);

    let clientSections = "";
    for (const [, { displayName, items: days }] of Object.entries(byClient)) {
      const clientTotal = days.reduce((sum: number, wd: any) => sum + parseFloat(wd.dailyRate || "0"), 0);
      clientSections += `
        <div class="section">
          <div class="section-title">${displayName}</div>
          <table>
            <thead><tr><th>Data</th><th>Serviço</th><th>Notas</th><th class="text-right">Valor</th></tr></thead>
            <tbody>
              ${days.sort((a: any, b: any) => a.date - b.date).map((wd: any) => `
                <tr>
                  <td>${formatDate(wd.date)}</td>
                  <td>${wd.serviceType}</td>
                  <td>${wd.notes || "-"}</td>
                  <td class="text-right">${formatCurrency(parseFloat(wd.dailyRate))}</td>
                </tr>
              `).join("")}
              <tr style="font-weight:700;border-top:2px solid #302b63;">
                <td colspan="3">Subtotal (${days.length} diárias)</td>
                <td class="text-right">${formatCurrency(clientTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
      <div class="page">
        <div class="header">
          <h1>Relatório de Diárias - ${monthNames[month! - 1]} ${year}</h1>
          <div class="subtitle">${params.clientName ? `Contratante: ${params.clientName}` : "Todos os contratantes"}</div>
          <div class="brand">EUGÊ. financeiro</div>
        </div>
        <div class="section">
          <div class="grid grid-3">
            <div class="metric"><div class="label">Total</div><div class="value green">${formatCurrency(total)}</div></div>
            <div class="metric"><div class="label">Diárias</div><div class="value blue">${filtered.length}</div></div>
            <div class="metric"><div class="label">Contratantes</div><div class="value purple">${Object.keys(byClient).length}</div></div>
          </div>
        </div>
        ${clientSections}
      </div>
    </body></html>`;
  } else {
    // Annual summary report
    const allItems = await getWorkDays({ userId, year });
    const filtered = params.clientName
      ? allItems.filter((wd: any) => wd.clientName.toLowerCase() === params.clientName!.toLowerCase())
      : allItems;

    // Group by client (case-insensitive)
    const byClientRaw: Record<string, { displayName: string; total: number; count: number; months: Set<number> }> = {};
    for (const wd of filtered) {
      const key = wd.clientName.toLowerCase();
      if (!byClientRaw[key]) byClientRaw[key] = { displayName: wd.clientName, total: 0, count: 0, months: new Set() };
      byClientRaw[key].total += parseFloat(wd.dailyRate || "0");
      byClientRaw[key].count += 1;
      byClientRaw[key].months.add(new Date(wd.date).getMonth());
    }
    const byClient = Object.fromEntries(
      Object.entries(byClientRaw).map(([k, v]) => [v.displayName, { total: v.total, count: v.count, months: v.months }])
    );

    const grandTotal = filtered.reduce((sum: number, wd: any) => sum + parseFloat(wd.dailyRate || "0"), 0);

    // Monthly breakdown
    const byMonth: Record<number, { total: number; count: number }> = {};
    for (const wd of filtered) {
      const m = new Date(wd.date).getMonth();
      if (!byMonth[m]) byMonth[m] = { total: 0, count: 0 };
      byMonth[m].total += parseFloat(wd.dailyRate || "0");
      byMonth[m].count += 1;
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
      <div class="page">
        <div class="header">
          <h1>Relatório Anual de Diárias - ${year}</h1>
          <div class="subtitle">${params.clientName ? `Contratante: ${params.clientName}` : "Todos os contratantes"}</div>
          <div class="brand">EUGÊ. financeiro</div>
        </div>
        <div class="section">
          <div class="grid grid-3">
            <div class="metric"><div class="label">Total Anual</div><div class="value green">${formatCurrency(grandTotal)}</div></div>
            <div class="metric"><div class="label">Total Diárias</div><div class="value blue">${filtered.length}</div></div>
            <div class="metric"><div class="label">Contratantes</div><div class="value purple">${Object.keys(byClient).length}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Resumo por Contratante</div>
          <table>
            <thead><tr><th>Contratante</th><th class="text-center">Diárias</th><th class="text-center">Meses Ativos</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              ${Object.entries(byClient).sort((a, b) => b[1].total - a[1].total).map(([client, data]) => `
                <tr>
                  <td>${client}</td>
                  <td class="text-center">${data.count}</td>
                  <td class="text-center">${data.months.size}</td>
                  <td class="text-right">${formatCurrency(data.total)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Resumo Mensal</div>
          <table>
            <thead><tr><th>Mês</th><th class="text-center">Diárias</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              ${Array.from({ length: 12 }, (_, i) => i).filter(m => byMonth[m]).map(m => `
                <tr>
                  <td>${monthNames[m]}</td>
                  <td class="text-center">${byMonth[m].count}</td>
                  <td class="text-right">${formatCurrency(byMonth[m].total)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </body></html>`;
  }
}

export async function generateWorkDaysReport(
  type: "monthly" | "annual",
  params: { month?: number; year: number; clientName?: string },
  email: string,
  userId?: number
): Promise<{ pdfUrl: string; sent: boolean }> {
  const html = await generateWorkDaysReportHTML(type, params, userId);
  const monthStr = params.month ? `-${String(params.month).padStart(2, "0")}` : "";
  const clientStr = params.clientName ? `-${params.clientName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}` : "";
  const fileName = `relatorio-diarias-${type}${monthStr}-${params.year}${clientStr}.html`;

  const s3Key = `reports/${Date.now()}-${fileName}`;
  const { url: reportUrl } = await storagePut(s3Key, html, "text/html");

  const typeLabel = type === "monthly" ? "Mensal" : "Anual";
  const sent = await notifyOwner({
    title: `📋 Relatório de Diárias ${typeLabel} Pronto`,
    content: `Seu relatório de diárias ${typeLabel.toLowerCase()} foi gerado com sucesso!\n\nAcesse aqui: ${reportUrl}\n\nEnviado para: ${email}`,
  });

  return { pdfUrl: reportUrl, sent };
}


// ─── QUOTATION PDF ──────────────────────────────────────────────────────────

export async function generateQuotationPDF(quotation: any, company: any): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const formatCurrencyStr = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const issueDate = quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");
  const validUntil = quotation.issueDate
    ? new Date(new Date(quotation.issueDate).getTime() + (quotation.validityDays || 15) * 86400000).toLocaleDateString("pt-BR")
    : new Date(Date.now() + (quotation.validityDays || 15) * 86400000).toLocaleDateString("pt-BR");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header - Company name
  const companyName = company?.nomeFantasia || company?.razaoSocial || "Minha Empresa";
  doc.setFontSize(18);
  doc.setTextColor(48, 43, 99); // #302b63
  doc.text(companyName, margin, y + 7);
  y += 10;

  // Company details
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const companyDetails: string[] = [];
  if (company?.cnpj) companyDetails.push(`CNPJ: ${company.cnpj}`);
  if (company?.endereco) {
    let addr = company.endereco;
    if (company.cidade) addr += `, ${company.cidade}`;
    if (company.estado) addr += ` - ${company.estado}`;
    companyDetails.push(addr);
  }
  if (company?.email || company?.telefone) {
    companyDetails.push([company.email, company.telefone].filter(Boolean).join(" | "));
  }
  companyDetails.forEach(line => {
    y += 4;
    doc.text(line, margin, y);
  });

  // Separator line
  y += 6;
  doc.setDrawColor(48, 43, 99);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(48, 43, 99);
  doc.text("ORÇAMENTO", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Nº ${quotation.number} | Emissão: ${issueDate} | Validade: ${validUntil}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // Client info box
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, y, (pageWidth - margin * 2 - 5) / 2, 30, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("CLIENTE", margin + 4, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  let clientY = y + 10;
  if (quotation.clientName) { doc.text(quotation.clientName, margin + 4, clientY); clientY += 5; }
  if (quotation.clientDocument) { doc.setFontSize(9); doc.text(`CPF/CNPJ: ${quotation.clientDocument}`, margin + 4, clientY); clientY += 4; }
  if (quotation.clientEmail) { doc.setFontSize(9); doc.text(quotation.clientEmail, margin + 4, clientY); clientY += 4; }
  if (quotation.clientPhone) { doc.setFontSize(9); doc.text(quotation.clientPhone, margin + 4, clientY); }

  // Conditions box
  const boxX = margin + (pageWidth - margin * 2 - 5) / 2 + 5;
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(boxX, y, (pageWidth - margin * 2 - 5) / 2, 30, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("CONDIÇÕES", boxX + 4, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  let condY = y + 10;
  if (quotation.paymentMethod) { doc.text(`Pagamento: ${quotation.paymentMethod}`, boxX + 4, condY); condY += 5; }
  if (quotation.paymentConditions) { doc.setFontSize(9); doc.text(quotation.paymentConditions, boxX + 4, condY); condY += 4; }
  doc.setFontSize(9);
  doc.text(`Validade: ${quotation.validityDays || 15} dias`, boxX + 4, condY);

  y += 38;

  // Items table
  const items = (quotation.items || []).map((item: any, idx: number) => [
    String(idx + 1),
    item.description || "",
    String(item.quantity || 1),
    formatCurrencyStr(item.unitPrice),
    formatCurrencyStr(item.totalPrice),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: items,
    theme: "grid",
    headStyles: { fillColor: [48, 43, 99], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // Subtotal, discount, total
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Subtotal: ${formatCurrencyStr(quotation.subtotal)}`, pageWidth - margin, y, { align: "right" });
  y += 5;

  if (quotation.discountValue && parseFloat(quotation.discountValue) > 0) {
    const discountLabel = quotation.discountType === "percent" ? `Desconto (${quotation.discountValue}%):` : "Desconto:";
    const discountAmount = quotation.discountType === "percent"
      ? parseFloat(quotation.subtotal) * parseFloat(quotation.discountValue) / 100
      : parseFloat(quotation.discountValue);
    doc.setTextColor(231, 76, 60);
    doc.text(`${discountLabel} -${formatCurrencyStr(discountAmount)}`, pageWidth - margin, y, { align: "right" });
    y += 5;
  }

  doc.setFontSize(13);
  doc.setTextColor(48, 43, 99);
  doc.text(`TOTAL: ${formatCurrencyStr(quotation.total)}`, pageWidth - margin, y + 2, { align: "right" });
  y += 12;

  // Notes
  if (quotation.notes) {
    doc.setFontSize(11);
    doc.setTextColor(48, 43, 99);
    doc.text("Observações", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(quotation.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 5;
  }

  // Bank details
  if (quotation.bankDetails) {
    doc.setFillColor(240, 240, 245);
    const bankLines = doc.splitTextToSize(quotation.bankDetails, pageWidth - margin * 2 - 8);
    const bankBoxH = bankLines.length * 4 + 12;
    doc.roundedRect(margin, y, pageWidth - margin * 2, bankBoxH, 2, 2, "F");
    doc.setFontSize(10);
    doc.setTextColor(48, 43, 99);
    doc.text("Dados Bancários", margin + 4, y + 6);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(bankLines, margin + 4, y + 12);
    y += bankBoxH + 5;
  }

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Orçamento válido por ${quotation.validityDays || 15} dias a partir da data de emissão.`, pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text(`${companyName}${company?.cnpj ? ` | CNPJ: ${company.cnpj}` : ""}`, pageWidth / 2, y, { align: "center" });

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
