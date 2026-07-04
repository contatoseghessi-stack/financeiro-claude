import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, TrendingDown, DollarSign, FileText, BarChart3, Package } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AccountantDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const startDate = useMemo(() => new Date(year, month, 1).getTime(), [year, month]);
  const endDate = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59).getTime(), [year, month]);

  const { data: dashboard } = trpc.dashboard.summary.useQuery({ startDate, endDate });
  const { data: irData } = trpc.fiscal.annualSummary.useQuery({ year });
  const { data: cashFlow } = trpc.dashboard.cashFlow.useQuery();
  const { data: assets } = trpc.assets.list.useQuery();
  const { data: dreData } = trpc.dashboard.dre.useQuery({ month: month + 1, year });

  const years = useMemo(() => {
    const arr = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) arr.push(y);
    return arr;
  }, []);

  const totalIncome = (dashboard?.totals?.income || 0) + (dashboard?.jobTotals?.income || 0);
  const totalExpense = (dashboard?.totals?.expense || 0) + (dashboard?.jobTotals?.expense || 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" /> Painel Contábil
          </h1>
          <p className="text-muted-foreground">Visão consolidada da saúde financeira da empresa</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-green-400" /> Receitas do Mês
            </div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="w-4 h-4 text-red-400" /> Despesas do Mês
            </div>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" /> Saldo do Mês
            </div>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Margem Líquida
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0.0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DRE Mensal */}
      {dreData && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> DRE - {monthNames[month]} {year}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 font-bold border-b border-border">
                <span>RECEITA BRUTA</span>
                <span className="text-green-400">{formatCurrency(Number(dreData.receitaBruta))}</span>
              </div>
              <div className="flex justify-between py-1 pl-4">
                <span className="text-muted-foreground">Receitas de Jobs</span>
                <span>{formatCurrency(Number(dreData.receitaBruta) - Number(dreData.outrasReceitas))}</span>
              </div>
              <div className="flex justify-between py-1 pl-4">
                <span className="text-muted-foreground">Outras Receitas</span>
                <span>{formatCurrency(Number(dreData.outrasReceitas))}</span>
              </div>
              <div className="flex justify-between py-2 font-bold border-b border-border">
                <span>(-) CUSTOS DIRETOS</span>
                <span className="text-red-400">-{formatCurrency(Number(dreData.custosDirectos))}</span>
              </div>
              <div className="flex justify-between py-2 font-bold border-b border-border bg-muted/30 px-2 rounded">
                <span>= LUCRO BRUTO</span>
                <span className={Number(dreData.lucroBruto) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(Number(dreData.lucroBruto))}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold border-b border-border">
                <span>(-) DESPESAS OPERACIONAIS</span>
                <span className="text-red-400">-{formatCurrency(Number(dreData.despesasFixas))}</span>
              </div>
              <div className="flex justify-between py-2 font-bold bg-muted/50 px-2 rounded text-lg">
                <span>= RESULTADO LÍQUIDO</span>
                <span className={Number(dreData.lucroLiquido) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(Number(dreData.lucroLiquido))}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Margem Líquida</span>
                <span className="font-medium">{Number(dreData.receitaBruta) > 0 ? ((Number(dreData.lucroLiquido) / Number(dreData.receitaBruta)) * 100).toFixed(1) : '0.0'}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Anual */}
      {irData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">PJ - Acumulado {year}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Faturamento Bruto</span><span className="text-green-400">{formatCurrency(irData.pj.totalIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Despesas</span><span className="text-red-400">{formatCurrency(irData.pj.totalExpenses)}</span></div>
              <div className="flex justify-between font-bold border-t border-border pt-2"><span>Lucro Líquido</span><span className={irData.pj.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(irData.pj.netProfit)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Simples Nacional (6%)</span><span className="text-yellow-400">{formatCurrency(irData.pj.simplesEstimate)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">PF - Acumulado {year}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Rendimentos</span><span className="text-green-400">{formatCurrency(irData.pf.totalIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Despesas</span><span className="text-red-400">{formatCurrency(irData.pf.totalExpenses)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deduções (Saúde + Educação)</span><span className="text-green-400">{formatCurrency(irData.pf.totalDeductible)}</span></div>
              <div className="flex justify-between font-bold border-t border-border pt-2"><span>IRPF Estimado</span><span className="text-yellow-400">{formatCurrency(Math.max(0, irData.pf.irpfEstimate))}</span></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Patrimônio */}
      {assets && assets.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Patrimônio ({assets.length} bens)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2">Bem</th>
                  <th className="text-center py-2">Categoria</th>
                  <th className="text-right py-2">Valor Aquisição</th>
                  <th className="text-center py-2">PJ/PF</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset: any) => (
                  <tr key={asset.id} className="border-b border-border/20">
                    <td className="py-2">{asset.name}</td>
                    <td className="text-center capitalize">{asset.category}</td>
                    <td className="text-right">{formatCurrency(Number(asset.purchaseValue))}</td>
                    <td className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${asset.scope === 'pj' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {asset.scope?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Fluxo de Caixa */}
      {cashFlow && cashFlow.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fluxo de Caixa Projetado (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2">Mês</th>
                  <th className="text-right py-2">Receitas</th>
                  <th className="text-right py-2">Despesas</th>
                  <th className="text-right py-2">Saldo</th>
                  <th className="text-right py-2">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {cashFlow.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="py-2">{item.monthLabel}</td>
                    <td className="text-right text-green-400">{formatCurrency(item.income)}</td>
                    <td className="text-right text-red-400">{formatCurrency(item.expense)}</td>
                    <td className={`text-right ${item.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(item.balance)}</td>
                    <td className={`text-right font-medium ${item.accumulated >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(item.accumulated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
