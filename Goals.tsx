import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Target, TrendingUp, Briefcase, Star } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const TYPE_LABELS: Record<string, string> = {
  revenue: "Faturamento",
  profit: "Lucro",
  jobs: "Qtd Jobs",
  custom: "Personalizada",
};

const TYPE_ICONS: Record<string, typeof Target> = {
  revenue: TrendingUp,
  profit: Target,
  jobs: Briefcase,
  custom: Star,
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Goals() {
  // ALL hooks must be called before any conditional returns
  const { canUseFeature } = usePlan();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    type: "revenue" as "revenue" | "profit" | "jobs" | "custom",
    targetValue: "",
    month: now.getMonth() + 1,
    notes: "",
  });

  const { data: goals, refetch } = trpc.goals.list.useQuery({ year });
  const { data: dashboardData } = trpc.dashboard.summary.useQuery({
    startDate: new Date(year, 0, 1).getTime(),
    endDate: new Date(year, 11, 31, 23, 59, 59).getTime(),
  });
  const { data: yearlySummary } = trpc.dashboard.yearly.useQuery({ year });
  const { data: jobsSummary } = trpc.jobs.list.useQuery();

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => { refetch(); setDialogOpen(false); resetForm(); toast.success("Meta criada!"); },
  });
  const updateMutation = trpc.goals.update.useMutation({
    onSuccess: () => { refetch(); setDialogOpen(false); resetForm(); toast.success("Meta atualizada!"); },
  });
  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Meta removida!"); },
  });

  const resetForm = () => {
    setForm({ title: "", type: "revenue", targetValue: "", month: now.getMonth() + 1, notes: "" });
    setEditingGoal(null);
  };

  const handleSubmit = () => {
    if (!form.title || !form.targetValue) { toast.error("Preencha título e valor da meta"); return; }
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, ...form, year });
    } else {
      createMutation.mutate({ ...form, year, notes: form.notes || null });
    }
  };

  const handleEdit = (goal: any) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      type: goal.type,
      targetValue: goal.targetValue,
      month: goal.month,
      notes: goal.notes || "",
    });
    setDialogOpen(true);
  };

  // Calculate actual values per month for comparison
  const monthlyActuals = useMemo(() => {
    const actuals: Record<number, { revenue: number; profit: number; jobs: number }> = {};
    for (let m = 1; m <= 12; m++) {
      actuals[m] = { revenue: 0, profit: 0, jobs: 0 };
    }

    // Revenue from yearly summary
    if (yearlySummary && Array.isArray(yearlySummary)) {
      for (const row of yearlySummary) {
        const monthNum = parseInt(String(row.month).split("-")[1]);
        if (row.type === "income") {
          actuals[monthNum].revenue += row.total;
        } else if (row.type === "expense") {
          actuals[monthNum].profit -= row.total;
        }
      }
      // profit = revenue - expense
      for (let m = 1; m <= 12; m++) {
        actuals[m].profit += actuals[m].revenue;
      }
    }

    // Jobs count per month
    if (jobsSummary && Array.isArray(jobsSummary)) {
      for (const job of jobsSummary) {
        if (job.createdAt) {
          const d = new Date(job.createdAt);
          if (d.getFullYear() === year) {
            actuals[d.getMonth() + 1].jobs += 1;
          }
        }
      }
    }

    return actuals;
  }, [yearlySummary, jobsSummary, year]);

  // Group goals by month
  const goalsByMonth = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    if (goals) {
      for (const g of goals) {
        if (grouped[g.month]) grouped[g.month].push(g);
      }
    }
    return grouped;
  }, [goals]);

  // Conditional return AFTER all hooks to avoid React #310 error
  if (!canUseFeature("goals")) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Metas</h1>
        <UpgradePrompt feature="Metas financeiras" requiredPlan="pro" description="Defina metas de faturamento, lucro e quantidade de jobs. Acompanhe o progresso mês a mês." />
      </div>
    );
  }

  const getProgress = (goal: any) => {
    const actual = monthlyActuals[goal.month];
    if (!actual) return 0;
    const target = parseFloat(goal.targetValue);
    if (target === 0) return 100;
    let current = 0;
    if (goal.type === "revenue") current = actual.revenue;
    else if (goal.type === "profit") current = actual.profit;
    else if (goal.type === "jobs") current = actual.jobs;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getActualValue = (goal: any) => {
    const actual = monthlyActuals[goal.month];
    if (!actual) return 0;
    if (goal.type === "revenue") return actual.revenue;
    if (goal.type === "profit") return actual.profit;
    if (goal.type === "jobs") return actual.jobs;
    return 0;
  };

  // Summary stats
  const totalGoals = goals?.length || 0;
  const achievedGoals = goals?.filter(g => getProgress(g) >= 100).length || 0;
  const avgProgress = totalGoals > 0 ? Math.round((goals || []).reduce((sum, g) => sum + getProgress(g), 0) / totalGoals) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Metas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Defina e acompanhe suas metas</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-semibold w-16 text-center">{year}</span>
            <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Meta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                  <Input placeholder="Ex: Faturar R$30k" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as "revenue" | "profit" | "jobs" | "custom" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Faturamento</SelectItem>
                        <SelectItem value="profit">Lucro</SelectItem>
                        <SelectItem value="jobs">Qtd Jobs</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Mês</label>
                    <Select value={String(form.month)} onValueChange={v => setForm({ ...form, month: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Valor Alvo {form.type === "jobs" ? "(quantidade)" : "(R$)"}
                  </label>
                  <Input type="number" step="0.01" placeholder={form.type === "jobs" ? "Ex: 10" : "Ex: 30000"} value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Notas (opcional)</label>
                  <Input placeholder="Observações..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingGoal ? "Salvar" : "Criar Meta"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Metas</p>
            <p className="text-2xl font-bold mt-1">{totalGoals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Metas Atingidas</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{achievedGoals}/{totalGoals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Progresso Médio</p>
            <p className="text-2xl font-bold mt-1">{avgProgress}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals by Month */}
      <div className="space-y-4">
        {MONTHS.map((monthName, idx) => {
          const monthGoals = goalsByMonth[idx + 1];
          if (!monthGoals || monthGoals.length === 0) return null;
          return (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{monthName} {year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {monthGoals.map((goal: any) => {
                  const progress = getProgress(goal);
                  const actual = getActualValue(goal);
                  const target = parseFloat(goal.targetValue);
                  const Icon = TYPE_ICONS[goal.type] || Target;
                  const isAchieved = progress >= 100;
                  return (
                    <div key={goal.id} className="border rounded-lg p-3 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isAchieved ? "text-emerald-400" : "text-muted-foreground"}`} />
                          <span className="font-medium text-sm">{goal.title}</span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{TYPE_LABELS[goal.type]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(goal)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteMutation.mutate({ id: goal.id })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>
                          {goal.type === "jobs" ? `${actual} de ${target} jobs` : `${formatCurrency(actual)} de ${formatCurrency(target)}`}
                        </span>
                        <span className={isAchieved ? "text-emerald-400 font-semibold" : ""}>{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isAchieved ? "bg-emerald-500" : progress > 50 ? "bg-amber-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      {goal.notes && <p className="text-xs text-muted-foreground mt-1">{goal.notes}</p>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {totalGoals === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhuma meta definida</h3>
              <p className="text-sm text-muted-foreground">Crie sua primeira meta para acompanhar seu progresso em {year}.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
