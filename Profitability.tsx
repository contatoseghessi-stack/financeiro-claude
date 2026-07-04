import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  in_progress: { label: "Em Andamento", color: "bg-blue-500/20 text-blue-400" },
  completed: { label: "Concluído", color: "bg-emerald-500/20 text-emerald-400" },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400" },
};

export default function Profitability() {
  const { data: jobs, isLoading } = trpc.dashboard.profitability.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Rentabilidade por Job</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const data = jobs || [];
  const completedJobs = data.filter(j => j.status === "completed" || j.status === "in_progress");
  const totalProfit = completedJobs.reduce((sum, j) => sum + j.profit, 0);
  const totalRevenue = completedJobs.reduce((sum, j) => sum + j.totalPayments, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const bestJob = completedJobs.reduce((best, j) => j.profit > (best?.profit || -Infinity) ? j : best, null as any);
  const worstJob = completedJobs.reduce((worst, j) => j.margin < (worst?.margin || Infinity) ? j : worst, null as any);

  const chartData = completedJobs
    .filter(j => j.totalPayments > 0 || j.totalCosts > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 15)
    .map(j => ({
      name: j.name.length > 20 ? j.name.slice(0, 20) + "..." : j.name,
      profit: j.profit,
      margin: j.margin,
    }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rentabilidade por Job</h1>
        <p className="text-sm text-muted-foreground">Compare receita vs custos de cada projeto</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro Total</p>
                <p className={`text-lg font-bold ${totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem Média</p>
                <p className="text-lg font-bold">{avgMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {bestJob && (
          <Card className="border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mais Rentável</p>
                  <p className="text-sm font-bold truncate max-w-[150px]">{bestJob.name}</p>
                  <p className="text-xs text-emerald-500">{formatCurrency(bestJob.profit)} ({bestJob.margin.toFixed(0)}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {worstJob && (
          <Card className="border-amber-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingDown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Menor Margem</p>
                  <p className="text-sm font-bold truncate max-w-[150px]">{worstJob.name}</p>
                  <p className="text-xs text-amber-500">{formatCurrency(worstJob.profit)} ({worstJob.margin.toFixed(0)}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Profit Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Lucro por Job</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 11 }} width={150} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                    formatter={(value: number) => [formatCurrency(value), "Lucro"]}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum job cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Job</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Custos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Lucro</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(job => (
                    <tr key={job.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-2 font-medium">{job.name}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{job.clientName || "-"}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge className={`text-xs ${statusMap[job.status]?.color || ""}`}>{statusMap[job.status]?.label || job.status}</Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right text-emerald-500">{formatCurrency(job.totalPayments)}</td>
                      <td className="py-2.5 px-2 text-right text-red-500">{formatCurrency(job.totalCosts)}</td>
                      <td className={`py-2.5 px-2 text-right font-bold ${job.profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {formatCurrency(job.profit)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-medium ${job.margin >= 50 ? "text-emerald-500" : job.margin >= 20 ? "text-amber-500" : "text-red-500"}`}>
                        {job.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
