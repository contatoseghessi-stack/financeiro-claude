import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(monthStr: string) {
  const [y, m] = monthStr.split("-");
  return `${monthNames[parseInt(m) - 1]}/${y.slice(2)}`;
}

export default function CashFlow() {
  const { data: cashFlow, isLoading } = trpc.dashboard.cashFlow.useQuery({ months: 12 });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-80 bg-muted rounded" /></CardContent></Card>
      </div>
    );
  }

  const data = cashFlow || [];
  const chartData = data.map(d => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  const currentMonth = data[0];
  const lastMonth = data[data.length - 1];
  const lowestMonth = data.reduce((min, d) => d.accumulated < min.accumulated ? d : min, data[0] || { accumulated: 0, month: "" });
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
  const hasNegative = data.some(d => d.accumulated < 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold">Fluxo de Caixa Projetado</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Projeção 12 meses (recorrências + jobs + transações)</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Atual</p>
                <p className={`text-sm sm:text-lg font-bold ${(currentMonth?.accumulated || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatCurrency(currentMonth?.accumulated || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo 12M</p>
                <p className={`text-sm sm:text-lg font-bold ${(lastMonth?.accumulated || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatCurrency(lastMonth?.accumulated || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 shrink-0">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Receita Proj.</p>
                <p className="text-sm sm:text-lg font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Despesa: {formatCurrency(totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasNegative && (
          <Card className="border-red-500/30">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Negativo</p>
                  <p className="text-sm sm:text-lg font-bold text-red-500">{formatCurrency(lowestMonth?.accumulated || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">em {formatMonth(lowestMonth?.month || "")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasNegative && (
          <Card className="border-emerald-500/30">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo Mín.</p>
                  <p className="text-sm sm:text-lg font-bold text-emerald-500">{formatCurrency(lowestMonth?.accumulated || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">em {formatMonth(lowestMonth?.month || "")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Accumulated Balance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAccumulated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="monthLabel" tick={{ fill: "#888", fontSize: 12 }} />
                <YAxis tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [formatCurrency(value), "Saldo"]}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="accumulated" stroke="#10b981" fillOpacity={1} fill="url(#colorAccumulated)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Income vs Expense Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas vs Despesas por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="monthLabel" tick={{ fill: "#888", fontSize: 12 }} />
                <YAxis tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Receitas" : "Despesas"]}
                />
                <Legend formatter={(value) => value === "income" ? "Receitas" : "Despesas"} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Receitas</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Despesas</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Saldo Mensal</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-2 font-medium">{formatMonth(row.month)}</td>
                    <td className="py-2.5 px-2 text-right text-emerald-500">{formatCurrency(row.income)}</td>
                    <td className="py-2.5 px-2 text-right text-red-500">{formatCurrency(row.expense)}</td>
                    <td className={`py-2.5 px-2 text-right font-medium ${row.balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {formatCurrency(row.balance)}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-bold ${row.accumulated >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {formatCurrency(row.accumulated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
