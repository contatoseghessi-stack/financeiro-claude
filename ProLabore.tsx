import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Shield, Calculator, AlertTriangle, CheckCircle } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ProLabore() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = trpc.fiscal.proLabore.useQuery({ months });

  const recommendationLabel: Record<string, string> = {
    conservative: "Conservador",
    moderate: "Moderado",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sugestão de Pró-labore</h1>
          <p className="text-muted-foreground">Quanto tirar de salário baseado no faturamento</p>
        </div>
        <Select value={String(months)} onValueChange={v => setMonths(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Calculando sugestão...</div>
      ) : !data ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sem dados suficientes para calcular</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Médias do Período */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Médias Mensais (últimos {months} meses)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-green-400" /> Faturamento PJ
                  </div>
                  <div className="text-xl font-bold text-green-400">{formatCurrency(data.averages.monthlyIncome)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4 text-red-400" /> Despesas PJ
                  </div>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(data.averages.monthlyExpenses)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Lucro Mensal</div>
                  <div className={`text-xl font-bold ${data.averages.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(data.averages.monthlyProfit)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Custos Fixos</div>
                  <div className="text-xl font-bold text-orange-400">{formatCurrency(data.averages.monthlyFixedCosts)}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reservas */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Reservas Recomendadas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/10">
                  <div className="text-sm text-muted-foreground">Margem de Segurança (20%)</div>
                  <div className="text-lg font-bold text-blue-400">{formatCurrency(data.reserves.safetyMargin)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Para reinvestimento e emergências</div>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10">
                  <div className="text-sm text-muted-foreground">Reserva Tributária</div>
                  <div className="text-lg font-bold text-yellow-400">{formatCurrency(data.reserves.taxReserve)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{data.reserves.taxLabel || 'Simples Nacional estimado'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sugestões de Salário */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5" /> Sugestões de Pró-labore
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className={`${data.recommendation === 'conservative' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                <CardContent className="pt-6">
                  {data.recommendation === 'conservative' && (
                    <div className="flex items-center gap-1 text-green-400 text-xs font-medium mb-2">
                      <CheckCircle className="w-3 h-3" /> Recomendado
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">Conservador (30%)</div>
                  <div className="text-2xl font-bold text-green-400">{formatCurrency(data.suggestions.conservative)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Mais seguro, sobra mais pra empresa</div>
                </CardContent>
              </Card>
              <Card className={`${data.recommendation === 'moderate' ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                <CardContent className="pt-6">
                  {data.recommendation === 'moderate' && (
                    <div className="flex items-center gap-1 text-blue-400 text-xs font-medium mb-2">
                      <CheckCircle className="w-3 h-3" /> Recomendado
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">Moderado (40%)</div>
                  <div className="text-2xl font-bold text-blue-400">{formatCurrency(data.suggestions.moderate)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Equilíbrio entre salário e empresa</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Agressivo (50%)</div>
                  <div className="text-2xl font-bold text-orange-400">{formatCurrency(data.suggestions.aggressive)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Mais salário, menos reserva</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Calculado</div>
                  <div className="text-2xl font-bold text-purple-400">{formatCurrency(data.suggestions.calculated)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Lucro - reservas - impostos</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Explicação */}
          <Card>
            <CardHeader><CardTitle className="text-base">Como funciona o cálculo?</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                O pró-labore é o "salário" que tu tira da empresa. O ideal é que seja sustentável e não comprometa a saúde financeira do negócio.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between"><span>Faturamento médio mensal</span><span className="font-medium text-foreground">{formatCurrency(data.averages.monthlyIncome)}</span></div>
                <div className="flex justify-between"><span>(-) Despesas médias mensais</span><span className="font-medium text-red-400">-{formatCurrency(data.averages.monthlyExpenses)}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-2"><span>= Lucro médio mensal</span><span className="font-medium text-foreground">{formatCurrency(data.averages.monthlyProfit)}</span></div>
                <div className="flex justify-between"><span>(-) Margem de segurança (20%)</span><span className="font-medium text-blue-400">-{formatCurrency(data.reserves.safetyMargin)}</span></div>
                <div className="flex justify-between"><span>(-) Reserva tributária ({data.reserves.taxLabel || '6%'})</span><span className="font-medium text-yellow-400">-{formatCurrency(data.reserves.taxReserve)}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-2 font-bold"><span>= Pró-labore calculado</span><span className="text-purple-400">{formatCurrency(data.suggestions.calculated)}</span></div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p>
                  <strong>Importante:</strong> Esses valores são estimativas baseadas nos seus dados. 
                  Consulte sua contadora para definir o pró-labore ideal considerando aspectos tributários e previdenciários.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
