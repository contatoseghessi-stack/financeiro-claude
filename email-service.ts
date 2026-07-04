import { getDb, getTransactions, getWorkDaysSummary, getAllCards } from "./db";
import { invokeLLM } from "./_core/llm";

interface MonthlyReportData {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCard: Array<{ cardName: string; total: number }>;
  topCategories: Array<{ name: string; total: number }>;
  workDaysSummary: { total: number; count: number };
}

export async function generateMonthlyReport(month: number, year: number): Promise<MonthlyReportData> {
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

  const transactionsData = await getTransactions({ startDate, endDate });
  const cards = await getAllCards();
  const workDaysSummary = await getWorkDaysSummary(startDate, endDate);

  let totalIncome = 0;
  let totalExpense = 0;
  const byCard: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  const transactions = Array.isArray(transactionsData) ? transactionsData : transactionsData?.items || [];
  transactions.forEach((t: any) => {
    const amount = parseFloat(String(t.amount));
    if (t.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }

    if (t.cardId) {
      const card = cards.find((c) => c.id === t.cardId);
      if (card) {
        byCard[card.name] = (byCard[card.name] || 0) + (t.type === "expense" ? amount : -amount);
      }
    }
  });

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return {
    month: monthNames[month - 1],
    year,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCard: Object.entries(byCard).map(([cardName, total]) => ({ cardName, total })),
    topCategories: Object.entries(byCategory)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    workDaysSummary: {
      total: workDaysSummary.total,
      count: workDaysSummary.count,
    },
  };
}

export async function generateEmailReportHTML(data: MonthlyReportData): Promise<string> {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cardRows = data.byCard
    .map(
      (card) =>
        `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${card.cardName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(card.total)}</td>
      </tr>`,
    )
    .join("");

  const categoryRows = data.topCategories
    .map(
      (cat) =>
        `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${cat.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(cat.total)}</td>
      </tr>`,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .card h2 { margin-top: 0; color: #374151; font-size: 18px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .summary-item { background: #f9fafb; padding: 15px; border-radius: 6px; text-align: center; }
        .summary-item .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .summary-item .value { font-size: 24px; font-weight: bold; color: #1f2937; margin-top: 5px; }
        .summary-item.positive .value { color: #10b981; }
        .summary-item.negative .value { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Relatório Financeiro</h1>
          <p>${data.month} de ${data.year}</p>
        </div>

        <div class="card">
          <h2>Resumo do Mês</h2>
          <div class="summary">
            <div class="summary-item positive">
              <div class="label">Receitas</div>
              <div class="value">${formatCurrency(data.totalIncome)}</div>
            </div>
            <div class="summary-item negative">
              <div class="label">Despesas</div>
              <div class="value">${formatCurrency(data.totalExpense)}</div>
            </div>
          </div>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="color: #0369a1; font-size: 12px; text-transform: uppercase;">Saldo</div>
            <div style="font-size: 28px; font-weight: bold; color: ${data.balance >= 0 ? "#10b981" : "#ef4444"}; margin-top: 5px;">
              ${formatCurrency(data.balance)}
            </div>
          </div>
        </div>

        ${
          data.byCard.length > 0
            ? `
        <div class="card">
          <h2>💳 Gastos por Cartão</h2>
          <table>
            <thead>
              <tr>
                <th>Cartão</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cardRows}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          data.workDaysSummary.count > 0
            ? `
        <div class="card">
          <h2>💼 Diárias de Trabalho</h2>
          <div class="summary">
            <div class="summary-item positive">
              <div class="label">Total Faturado</div>
              <div class="value">${formatCurrency(data.workDaysSummary.total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Quantidade</div>
              <div class="value">${data.workDaysSummary.count}</div>
            </div>
          </div>
        </div>
        `
            : ""
        }

        <div class="footer">
          <p>Relatório gerado automaticamente pelo Financeiro Eugê</p>
          <p>Acesse seu painel em: <a href="https://finanbot-jpdrhywc.manus.space" style="color: #667eea;">finanbot-jpdrhywc.manus.space</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function extractInvoiceTransactions(
  pdfUrl: string,
): Promise<Array<{ description: string; amount: number; date: Date }>> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente especializado em extrair informações de faturas. Analise o PDF fornecido e extraia todas as transações (descrição, valor e data). Retorne um JSON com array de transações.",
        },
        {
          role: "user",
          content: `Por favor, extraia todas as transações desta fatura em PDF. Retorne um JSON válido com este formato: {"transactions": [{"description": "string", "amount": number, "date": "YYYY-MM-DD"}]}`,
        },
      ],
      response_format: {
        type: "json_schema" as any,
        json_schema: {
          name: "invoice_transactions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    amount: { type: "number" },
                    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                  },
                  required: ["description", "amount", "date"],
                },
              },
            },
            required: ["transactions"],
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return [];

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);
    return parsed.transactions.map((t: any) => ({
      description: t.description,
      amount: t.amount,
      date: new Date(t.date),
    }));
  } catch (error: any) {
    console.error("[Invoice Extraction] Error:", error);
    return [];
  }
}
