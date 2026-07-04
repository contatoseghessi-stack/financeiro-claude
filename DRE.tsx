import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const monthNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function DRELine({ label, value, indent = 0, bold = false, highlight = false, negative = false }: {
  label: string; value: number; indent?: number; bold?: boolean; highlight?: boolean; negative?: boolean;
}) {
  const color = highlight
    ? value >= 0 ? "text-emerald-500" : "text-red-500"
    : negative ? "text-red-400" : "text-foreground";
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? "font-bold border-t border-border" : ""} ${highlight ? "bg-muted/30 rounded px-2 -mx-2" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold" : "text-muted-foreground"}`} style={{ paddingLeft: indent * 16 }}>{label}</span>
      <span className={`text-sm font-mono ${color} ${bold ? "text-base" : ""}`}>{formatCurrency(value)}</span>
    </div>
  );
}

export default function DRE() {
  // ALL hooks must be called before any conditional returns
  const { canUseFeature } = usePlan();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState<"monthly" | "annual">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { data: dre, isLoading } = trpc.dashboard.dre.useQuery({ year, month: view === "monthly" ? selectedMonth : undefined });
  const { data: dreAnual, isLoading: isLoadingAnual } = trpc.dashboard.dreAnual.useQuery({ year });

  // Conditional returns AFTER all hooks
  if (!canUseFeature("dre")) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">DRE - Demonstrativo de Resultado</h1>
        <UpgradePrompt feature="DRE" requiredPlan="pro" description="Visualize o demonstrativo de resultado do exercício com detalhamento mensal e anual. Disponível no plano Pro." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">DRE - Demonstrativo de Resultado</h1>
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-96 bg-muted rounded" /></CardContent></Card>
      </div>
    );
  }

  const chartData = dreAnual?.months.map((m, i) => ({
    month: monthNamesShort[i],
    receita: m.receitaBruta,
    custos: m.custosDirectos,
    despesas: m.despesasFixas + m.despesasVariaveis,
    lucro: m.lucroLiquido,
  })) || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold">DRE - Demonstrativo</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Receitas, custos e lucro</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-bold text-lg min-w-[60px] text-center">{year}</span>
          <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "monthly" ? "default" : "outline"} size="sm" onClick={() => setView("monthly")} className="gap-1">
            <Calendar className="h-3 w-3" /> Mensal
          </Button>
          <Button variant={view === "annual" ? "default" : "outline"} size="sm" onClick={() => setView("annual")} className="gap-1">
            <TrendingUp className="h-3 w-3" /> Anual
          </Button>
        </div>
        {view === "monthly" && (
          <div className="flex gap-1 flex-wrap">
            {monthNamesShort.map((m, i) => (
              <Button key={i} variant={selectedMonth === i ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedMonth(i)}>
                {m}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* DRE Statement */}
      {dre && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              DRE - {dre.period}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <DRELine label="RECEITA BRUTA" value={dre.receitaBruta} bold highlight />
            <DRELine label="Receitas PJ" value={dre.breakdown.receitasPJ} indent={1} />
            <DRELine label="Receitas PF" value={dre.breakdown.receitasPF} indent={1} />

            <div className="h-3" />
            <DRELine label="(-) CUSTOS DIRETOS" value={-dre.custosDirectos} bold negative />
            <DRELine label="Custos com Fornecedores (Jobs)" value={dre.breakdown.custosFornecedores} indent={1} negative />

            <div className="h-3" />
            <DRELine label="= LUCRO BRUTO" value={dre.lucroBruto} bold highlight />

            <div className="h-3" />
            <DRELine label="(-) DESPESAS FIXAS" value={-dre.despesasFixas} bold negative />
            <DRELine label="Despesas Recorrentes" value={dre.breakdown.despesasRecorrentes} indent={1} negative />

            <div className="h-3" />
            <DRELine label="(-) DESPESAS VARIÁVEIS" value={-dre.despesasVariaveis} bold negative />
            <DRELine label="Despesas de Cartão" value={dre.breakdown.despesasCartao} indent={1} negative />
            <DRELine label="Despesas Avulsas" value={dre.breakdown.despesasAvulsas} indent={1} negative />

            <div className="h-3" />
            <DRELine label="= LUCRO OPERACIONAL" value={dre.lucroOperacional} bold highlight />

            <div className="h-6" />
            <div className={`p-3 sm:p-4 rounded-lg ${dre.lucroLiquido >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm sm:text-lg">LUCRO LÍQUIDO</span>
                <span className={`text-lg sm:text-2xl font-bold font-mono ${dre.lucroLiquido >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatCurrency(dre.lucroLiquido)}
                </span>
              </div>
              {dre.receitaBruta > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Margem líquida: {((dre.lucroLiquido / dre.receitaBruta) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annual Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução Mensal - {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { receita: "Receita", custos: "Custos", despesas: "Despesas", lucro: "Lucro" };
                      return [formatCurrency(value), labels[name] || name];
                    }}
                  />
                  <Legend formatter={(value) => {
                    const labels: Record<string, string> = { receita: "Receita", custos: "Custos", despesas: "Despesas", lucro: "Lucro" };
                    return labels[value] || value;
                  }} />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annual Summary Table */}
      {dreAnual && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Mensal - {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mês</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Custos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Despesas</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Lucro</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {dreAnual.months.map((m, i) => {
                    const margin = m.receitaBruta > 0 ? (m.lucroLiquido / m.receitaBruta) * 100 : 0;
                    return (
                      <tr key={i} className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${selectedMonth === i && view === "monthly" ? "bg-muted/30" : ""}`} onClick={() => { setView("monthly"); setSelectedMonth(i); }}>
                        <td className="py-2.5 px-2 font-medium">{monthNamesShort[i]}</td>
                        <td className="py-2.5 px-2 text-right text-emerald-500">{formatCurrency(m.receitaBruta)}</td>
                        <td className="py-2.5 px-2 text-right text-amber-500">{formatCurrency(m.custosDirectos)}</td>
                        <td className="py-2.5 px-2 text-right text-red-500">{formatCurrency(m.despesasFixas + m.despesasVariaveis)}</td>
                        <td className={`py-2.5 px-2 text-right font-bold ${m.lucroLiquido >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {formatCurrency(m.lucroLiquido)}
                        </td>
                        <td className={`py-2.5 px-2 text-right ${margin >= 30 ? "text-emerald-500" : margin >= 10 ? "text-amber-500" : "text-red-500"}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-3 px-2">TOTAL</td>
                    <td className="py-3 px-2 text-right text-emerald-500">{formatCurrency(dreAnual.totals.receitaBruta)}</td>
                    <td className="py-3 px-2 text-right text-amber-500">{formatCurrency(dreAnual.totals.custosDirectos)}</td>
                    <td className="py-3 px-2 text-right text-red-500">{formatCurrency(dreAnual.totals.despesasFixas + dreAnual.totals.despesasVariaveis)}</td>
                    <td className={`py-3 px-2 text-right ${dreAnual.totals.lucroLiquido >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {formatCurrency(dreAnual.totals.lucroLiquido)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {dreAnual.totals.receitaBruta > 0 ? ((dreAnual.totals.lucroLiquido / dreAnual.totals.receitaBruta) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
