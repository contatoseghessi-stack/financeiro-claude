import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, Info, Copy, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const JOB_TYPES = [
  { value: "video_institucional", label: "Vídeo Institucional" },
  { value: "video_redes", label: "Conteúdo p/ Redes Sociais" },
  { value: "ensaio_foto", label: "Ensaio Fotográfico" },
  { value: "cobertura_evento", label: "Cobertura de Evento" },
  { value: "campanha_marca", label: "Campanha de Marca" },
  { value: "making_of", label: "Making Of" },
  { value: "edicao_video", label: "Edição de Vídeo" },
  { value: "drone", label: "Filmagem com Drone" },
  { value: "outro", label: "Outro" },
];

const URGENCY_LEVELS = [
  { value: "normal", label: "Normal", multiplier: 1.0, description: "Prazo confortável (7+ dias)" },
  { value: "urgente", label: "Urgente", multiplier: 1.3, description: "Prazo apertado (3-7 dias)" },
  { value: "emergencial", label: "Emergencial", multiplier: 1.6, description: "Pra ontem (1-2 dias)" },
];

export default function PriceCalculator() {
  const [jobType, setJobType] = useState("");
  const [hoursEstimated, setHoursEstimated] = useState("");
  const [extraCosts, setExtraCosts] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [calculated, setCalculated] = useState(false);

  // Fetch user's real financial data
  const { data: recurrences } = trpc.recurringExpenses.list.useQuery();
  const { data: priceStats } = trpc.jobs.priceStatsByType.useQuery();
  const currentYear = new Date().getFullYear();
  const { data: goals } = trpc.goals.list.useQuery({ year: currentYear });

  // Get the stats for the selected type
  const selectedTypeStats = useMemo(() => {
    if (!priceStats || !jobType) return null;
    return priceStats.typeStats[jobType] || null;
  }, [priceStats, jobType]);

  // Calculate real metrics from user data
  const metrics = useMemo(() => {
    const monthlyFixedExpenses = (recurrences || [])
      .reduce((sum: number, r: any) => sum + parseFloat(r.amount || "0"), 0);

    // Use type-specific average if available, otherwise global
    const avgTicket = selectedTypeStats && selectedTypeStats.count > 0
      ? selectedTypeStats.avg
      : (priceStats?.globalAvg || 0);

    const totalCompletedJobs = selectedTypeStats && selectedTypeStats.count > 0
      ? selectedTypeStats.count
      : (priceStats?.totalCompleted || 0);

    // Estimate monthly goal from goals or fallback
    const monthlyGoal = goals && goals.length > 0
      ? parseFloat((goals as any[])[0]?.targetValue || "0")
      : monthlyFixedExpenses * 2.5;

    // Average jobs per month (estimate from total / 12 or minimum 3)
    const avgJobsPerMonth = Math.max(totalCompletedJobs / 12, 3);

    return {
      monthlyFixedExpenses,
      avgTicket,
      monthlyGoal,
      avgJobsPerMonth,
      totalCompletedJobs,
    };
  }, [recurrences, priceStats, selectedTypeStats, goals]);

  // Reset calculation when type changes
  useEffect(() => {
    setCalculated(false);
  }, [jobType]);

  const calculation = useMemo(() => {
    if (!hoursEstimated || !calculated) return null;

    const hours = parseFloat(hoursEstimated);
    const extras = parseFloat(extraCosts || "0");
    if (isNaN(hours) || hours <= 0) return null;

    const { monthlyFixedExpenses, monthlyGoal, avgJobsPerMonth, avgTicket } = metrics;

    // Urgency multiplier
    const urgencyLevel = URGENCY_LEVELS.find(u => u.value === urgency) || URGENCY_LEVELS[0];
    const urgencyMultiplier = urgencyLevel.multiplier;

    // Cost per hour = (monthly fixed expenses / working hours per month)
    const workingHoursPerMonth = 160; // ~20 days * 8h
    const costPerHour = monthlyFixedExpenses / workingHoursPerMonth;

    // Minimum: covers costs + pró-labore basic
    const proLaboreMin = monthlyFixedExpenses * 0.5;
    const minPerHour = (monthlyFixedExpenses + proLaboreMin) / workingHoursPerMonth;
    const minPriceBase = Math.max(hours * minPerHour + extras, extras + 100);
    const minPrice = Math.round(minPriceBase * urgencyMultiplier);

    // Ideal: use type-specific average as strong reference
    let idealPriceBase: number;
    if (selectedTypeStats && selectedTypeStats.count >= 2) {
      // Use the type average as the ideal, scaled by hours
      const avgHoursPerJob = 8; // estimated average hours per job
      idealPriceBase = Math.max(
        selectedTypeStats.avg * (hours / avgHoursPerJob),
        minPriceBase * 1.3
      );
    } else {
      // Fallback: targets monthly goal
      const idealPerJob = monthlyGoal / avgJobsPerMonth;
      idealPriceBase = Math.max(idealPerJob * (hours / 8), minPriceBase * 1.4);
    }
    const idealPrice = Math.round(idealPriceBase * urgencyMultiplier);

    // Premium: 1.6x ideal or based on type max
    let premiumPriceBase: number;
    if (selectedTypeStats && selectedTypeStats.count >= 2 && selectedTypeStats.max > 0) {
      premiumPriceBase = Math.max(idealPriceBase * 1.6, selectedTypeStats.max * 0.9);
    } else {
      premiumPriceBase = Math.max(idealPriceBase * 1.8, avgTicket * 1.3);
    }
    const premiumPrice = Math.round(premiumPriceBase * urgencyMultiplier);

    return {
      minPrice,
      idealPrice,
      premiumPrice,
      costPerHour: Math.round(costPerHour),
      avgHistorical: avgTicket,
      urgencyMultiplier,
      urgencyLabel: urgencyLevel.label,
      breakdown: {
        fixedCostPortion: Math.round(hours * costPerHour),
        extraCosts: Math.round(extras),
        proLabore: Math.round(minPriceBase - extras - hours * costPerHour),
        urgencyAdded: urgencyMultiplier > 1 ? Math.round(minPriceBase * (urgencyMultiplier - 1)) : 0,
      },
    };
  }, [hoursEstimated, extraCosts, urgency, metrics, calculated, selectedTypeStats]);

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCalculate = () => {
    setCalculated(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />
          Quanto Cobrar?
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Calcule o preço ideal baseado nos seus dados reais.
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Job</CardTitle>
          <CardDescription>Preencha as informações para calcular o preço</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Job</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => {
                    const stats = priceStats?.typeStats[t.value];
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          {t.label}
                          {stats && stats.count > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              ({stats.count} jobs)
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {/* Show type-specific stats when selected */}
              {selectedTypeStats && selectedTypeStats.count > 0 && (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-2 space-y-1">
                  <p className="text-[10px] font-medium text-primary flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Histórico: {selectedTypeStats.count} jobs desse tipo
                  </p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>Média: <strong className="text-foreground">{formatCurrency(selectedTypeStats.avg)}</strong></span>
                    <span>Min: {formatCurrency(selectedTypeStats.min)}</span>
                    <span>Max: {formatCurrency(selectedTypeStats.max)}</span>
                  </div>
                </div>
              )}
              {selectedTypeStats && selectedTypeStats.count === 0 && jobType && (
                <p className="text-[10px] text-muted-foreground">
                  Sem histórico desse tipo. Usando média global.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Horas Estimadas</Label>
              <Input
                type="number"
                placeholder="Ex: 12"
                value={hoursEstimated}
                onChange={(e) => { setHoursEstimated(e.target.value); setCalculated(false); }}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Custos Extras (R$)</Label>
              <Input
                type="number"
                placeholder="Deslocamento, aluguel, etc"
                value={extraCosts}
                onChange={(e) => { setExtraCosts(e.target.value); setCalculated(false); }}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Urgência</Label>
              <Select value={urgency} onValueChange={(v) => { setUrgency(v); setCalculated(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label} ({u.multiplier > 1 ? `+${Math.round((u.multiplier - 1) * 100)}%` : "base"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {URGENCY_LEVELS.find(u => u.value === urgency)?.description}
              </p>
            </div>
          </div>

          <Button onClick={handleCalculate} disabled={!hoursEstimated} className="w-full md:w-auto">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Preço
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {calculation && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Minimum */}
            <Card className="border-red-500/30 bg-red-500/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-400">
              <CardContent className="p-3 sm:p-5 text-center space-y-1 sm:space-y-2">
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px] sm:text-xs">
                  Mínimo
                </Badge>
                <p className="text-base sm:text-3xl font-bold text-red-400">
                  {formatCurrency(calculation.minPrice)}
                </p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">
                  Cobre custos + pró-labore
                </p>
              </CardContent>
            </Card>

            {/* Ideal */}
            <Card className="border-green-500/30 bg-green-500/5 ring-2 ring-green-500/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-400 delay-100">
              <CardContent className="p-3 sm:p-5 text-center space-y-1 sm:space-y-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[9px] sm:text-xs">
                  Ideal ★
                </Badge>
                <p className="text-base sm:text-3xl font-bold text-green-400">
                  {formatCurrency(calculation.idealPrice)}
                </p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">
                  {selectedTypeStats && selectedTypeStats.count >= 2
                    ? "Baseado no teu histórico"
                    : "Margem saudável"}
                </p>
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="border-purple-500/30 bg-purple-500/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-400 delay-200">
              <CardContent className="p-3 sm:p-5 text-center space-y-1 sm:space-y-2">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[9px] sm:text-xs">
                  Premium
                </Badge>
                <p className="text-base sm:text-3xl font-bold text-purple-400">
                  {formatCurrency(calculation.premiumPrice)}
                </p>
                <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">
                  Mercado alto
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Como calculamos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Breakdown do Mínimo</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Custo fixo ({hoursEstimated}h × {formatCurrency(calculation.costPerHour)}/h)</span>
                      <span>{formatCurrency(calculation.breakdown.fixedCostPortion)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Custos extras</span>
                      <span>{formatCurrency(calculation.breakdown.extraCosts)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pró-labore mínimo</span>
                      <span>{formatCurrency(calculation.breakdown.proLabore)}</span>
                    </div>
                    {calculation.breakdown.urgencyAdded > 0 && (
                      <div className="flex justify-between text-sm text-amber-400">
                        <span>Adicional urgência ({calculation.urgencyLabel} +{Math.round((calculation.urgencyMultiplier - 1) * 100)}%)</span>
                        <span>+{formatCurrency(calculation.breakdown.urgencyAdded)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-sm font-medium">
                      <span>Total mínimo</span>
                      <span>{formatCurrency(calculation.minPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Seus Dados Reais</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Despesas fixas/mês</span>
                      <span>{formatCurrency(metrics.monthlyFixedExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Meta mensal</span>
                      <span>{formatCurrency(metrics.monthlyGoal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Média de jobs/mês</span>
                      <span>{metrics.avgJobsPerMonth.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>
                        {selectedTypeStats && selectedTypeStats.count > 0
                          ? `Ticket médio (${JOB_TYPES.find(t => t.value === jobType)?.label || "tipo"})`
                          : "Ticket médio global"}
                      </span>
                      <span className={selectedTypeStats && selectedTypeStats.count > 0 ? "text-primary font-medium" : ""}>
                        {formatCurrency(metrics.avgTicket)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Jobs completados ({selectedTypeStats && selectedTypeStats.count > 0 ? "tipo" : "total"})</span>
                      <span>{metrics.totalCompletedJobs}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Comparison */}
          {calculation.avgHistorical > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      Comparativo histórico
                      {selectedTypeStats && selectedTypeStats.count > 0 && (
                        <span className="text-muted-foreground font-normal">
                          {" "}— {JOB_TYPES.find(t => t.value === jobType)?.label}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTypeStats && selectedTypeStats.count > 0 ? (
                        <>
                          Teus {selectedTypeStats.count} jobs desse tipo cobraram em média{" "}
                          <strong className="text-foreground">{formatCurrency(selectedTypeStats.avg)}</strong>
                          {" "}(de {formatCurrency(selectedTypeStats.min)} a {formatCurrency(selectedTypeStats.max)}).
                          {calculation.idealPrice > selectedTypeStats.avg
                            ? " O preço ideal sugere que tu pode cobrar mais!"
                            : " Tu já está cobrando bem nessa faixa."}
                        </>
                      ) : (
                        <>
                          Teus jobs completados cobraram em média{" "}
                          <strong className="text-foreground">{formatCurrency(calculation.avgHistorical)}</strong>.
                          {calculation.idealPrice > calculation.avgHistorical
                            ? " O preço ideal sugere que tu pode cobrar mais!"
                            : " Tu já está cobrando acima do mínimo — bom sinal."}
                        </>
                      )}
                    </p>
                    {selectedTypeStats && selectedTypeStats.count > 0 && selectedTypeStats.jobs.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Ex: {selectedTypeStats.jobs.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons: Copy Text */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const jobLabel = JOB_TYPES.find(t => t.value === jobType)?.label || "Job";
                    const urgencyLabel = URGENCY_LEVELS.find(u => u.value === urgency);
                    const text = [
                      `ORÇAMENTO - ${jobLabel}`,
                      `${"-".repeat(30)}`,
                      ``,
                      `Tipo: ${jobLabel}`,
                      `Horas estimadas: ${hoursEstimated}h`,
                      `Custos extras: ${formatCurrency(parseFloat(extraCosts || "0"))}`,
                      urgencyLabel && urgencyLabel.multiplier > 1 ? `Urgência: ${urgencyLabel.label} (+${Math.round((urgencyLabel.multiplier - 1) * 100)}%)` : "",
                      ``,
                      `VALORES:`,
                      `  Mínimo:  ${formatCurrency(calculation.minPrice)}`,
                      `  Ideal:   ${formatCurrency(calculation.idealPrice)}`,
                      `  Premium: ${formatCurrency(calculation.premiumPrice)}`,
                      ``,
                      `BREAKDOWN:`,
                      `  Custo fixo (${hoursEstimated}h): ${formatCurrency(calculation.breakdown.fixedCostPortion)}`,
                      `  Custos extras: ${formatCurrency(calculation.breakdown.extraCosts)}`,
                      `  Pró-labore: ${formatCurrency(calculation.breakdown.proLabore)}`,
                      calculation.breakdown.urgencyAdded > 0 ? `  Urgência: +${formatCurrency(calculation.breakdown.urgencyAdded)}` : "",
                      ``,
                      selectedTypeStats && selectedTypeStats.count > 0
                        ? `Média histórica (${JOB_TYPES.find(t => t.value === jobType)?.label}): ${formatCurrency(selectedTypeStats.avg)} (${selectedTypeStats.count} jobs)`
                        : calculation.avgHistorical > 0 ? `Média histórica global: ${formatCurrency(calculation.avgHistorical)}` : "",
                    ].filter(Boolean).join("\n");

                    navigator.clipboard.writeText(text).then(() => {
                      toast.success("Orçamento copiado para a área de transferência!");
                    }).catch(() => {
                      toast.error("Não foi possível copiar. Tente novamente.");
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Texto
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Type Overview - show all types with their averages */}
      {priceStats && priceStats.totalCompleted > 0 && !calculated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Média por Tipo de Serviço
            </CardTitle>
            <CardDescription>
              Baseado nos seus {priceStats.totalCompleted} jobs completados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {JOB_TYPES.map((t) => {
                const stats = priceStats.typeStats[t.value];
                if (!stats || stats.count === 0) return null;
                return (
                  <div
                    key={t.value}
                    className="rounded-lg border p-3 space-y-1 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setJobType(t.value)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{t.label}</span>
                      <Badge variant="secondary" className="text-[9px]">{stats.count}</Badge>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(stats.avg)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(stats.min)} — {formatCurrency(stats.max)}
                    </p>
                  </div>
                );
              })}
            </div>
            {priceStats.globalAvg > 0 && (
              <div className="mt-4 pt-3 border-t text-sm text-muted-foreground flex justify-between">
                <span>Média global (todos os tipos)</span>
                <span className="font-medium text-foreground">{formatCurrency(priceStats.globalAvg)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
