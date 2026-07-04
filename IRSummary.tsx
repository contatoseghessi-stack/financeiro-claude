import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, TrendingUp, TrendingDown, AlertTriangle, Building2, User, Package } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function IRSummary() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = trpc.fiscal.annualSummary.useQuery({ year });

  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y >= currentYear - 5; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumo Anual - Imposto de Renda</h1>
          <p className="text-muted-foreground">Consolidação de dados para declaração IR</p>
        </div>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando dados de {year}...</div>
      ) : !data ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum dado encontrado para {year}</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Estimativa Total de Impostos */}
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-sm text-muted-foreground">Estimativa Total de Impostos ({year})</div>
                  <div className="text-3xl font-bold text-yellow-400">{formatCurrency(data.totalTaxEstimate)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Simples Nacional: {formatCurrency(data.pj.simplesEstimate)} + IRPF: {formatCurrency(Math.max(0, data.pf.irpfEstimate))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PJ Section */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> Pessoa Jurídica (PJ)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Faturamento Bruto</div>
                  <div className="text-xl font-bold text-green-400">{formatCurrency(data.pj.totalIncome)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Despesas PJ</div>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(data.pj.totalExpenses)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Lucro Líquido</div>
                  <div className={`text-xl font-bold ${data.pj.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(data.pj.netProfit)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Simples Nacional (6%)</div>
                  <div className="text-xl font-bold text-yellow-400">{formatCurrency(data.pj.simplesEstimate)}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* PF Section */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" /> Pessoa Física (PF)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Rendimentos PF</div>
                  <div className="text-xl font-bold text-green-400">{formatCurrency(data.pf.totalIncome)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Despesas PF</div>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(data.pf.totalExpenses)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Base de Cálculo</div>
                  <div className="text-xl font-bold">{formatCurrency(data.pf.taxableIncome)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">IRPF Estimado</div>
                  <div className="text-xl font-bold text-yellow-400">{formatCurrency(Math.max(0, data.pf.irpfEstimate))}</div>
                </CardContent>
              </Card>
            </div>

            {/* Deduções */}
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Deduções</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <div>
                      <div className="font-medium">Saúde</div>
                      <div className="text-xs text-muted-foreground">Consultas, plano, farmácia (sem limite)</div>
                    </div>
                    <div className="text-green-400 font-medium">{formatCurrency(data.pf.deductibleHealth)}</div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <div>
                      <div className="font-medium">Educação</div>
                      <div className="text-xs text-muted-foreground">Cursos, faculdade (limite: R$ 3.561,50/ano)</div>
                    </div>
                    <div className="text-green-400 font-medium">{formatCurrency(data.pf.deductibleEducation)}</div>
                  </div>
                  <div className="flex justify-between items-center py-2 font-bold">
                    <div>Total Dedutível</div>
                    <div className="text-green-400">{formatCurrency(data.pf.totalDeductible)}</div>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 text-sm">
                  <strong>Dica:</strong> Para aumentar suas deduções, classifique as despesas PF com a categoria fiscal correta. 
                  Vá em cada transação PF e marque como "Saúde" ou "Educação" quando aplicável.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bens e Direitos */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-400" /> Bens e Direitos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total de Bens</div>
                  <div className="text-xl font-bold">{data.assets.count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Valor de Aquisição</div>
                  <div className="text-xl font-bold text-blue-400">{formatCurrency(data.assets.totalPurchaseValue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Valor Atual (Depreciado)</div>
                  <div className="text-xl font-bold text-green-400">{formatCurrency(data.assets.totalCurrentValue)}</div>
                </CardContent>
              </Card>
            </div>
            {data.assets.items.length > 0 && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-2">Bem</th>
                        <th className="text-right py-2">Aquisição</th>
                        <th className="text-right py-2">Valor Atual</th>
                        <th className="text-center py-2">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.assets.items.map((asset: any) => (
                        <tr key={asset.id} className="border-b border-border/20">
                          <td className="py-2">{asset.name}</td>
                          <td className="text-right">{formatCurrency(Number(asset.purchaseValue))}</td>
                          <td className="text-right text-green-400">{formatCurrency(Number(asset.currentValue) || 0)}</td>
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
          </div>

          {/* Tabela IRPF */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Tabela IRPF Referência</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2">Faixa (Anual)</th>
                    <th className="text-center py-2">Alíquota</th>
                    <th className="text-right py-2">Dedução</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20"><td className="py-2">Até R$ 26.963,23</td><td className="text-center">Isento</td><td className="text-right">-</td></tr>
                  <tr className="border-b border-border/20"><td className="py-2">R$ 26.963,24 a R$ 33.919,80</td><td className="text-center">7,5%</td><td className="text-right">R$ 2.013,70</td></tr>
                  <tr className="border-b border-border/20"><td className="py-2">R$ 33.919,81 a R$ 45.012,60</td><td className="text-center">15%</td><td className="text-right">R$ 4.257,57</td></tr>
                  <tr className="border-b border-border/20"><td className="py-2">R$ 45.012,61 a R$ 55.976,16</td><td className="text-center">22,5%</td><td className="text-right">R$ 7.633,51</td></tr>
                  <tr><td className="py-2">Acima de R$ 55.976,16</td><td className="text-center">27,5%</td><td className="text-right">R$ 10.432,32</td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
