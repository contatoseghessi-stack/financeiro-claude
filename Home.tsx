import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, Wallet, Building2, User, CreditCard, Plus,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, CalendarDays,
  RotateCcw, Briefcase, FileText, MoreVertical, Pencil, Trash2, Target, Calendar as CalendarIcon, Repeat,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444", "#6366f1"];

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

export default function Home() {
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showYearView, setShowYearView] = useState(false);
  const { user } = useAuth();

  const genMonthly = trpc.reports.generateMonthly.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório mensal gerado!");
      window.open(data.pdfUrl, "_blank");
    },
    onError: () => toast.error("Erro ao gerar relatório"),
  });
  const genAnnual = trpc.reports.generateAnnual.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório anual gerado!");
      window.open(data.pdfUrl, "_blank");
    },
    onError: () => toast.error("Erro ao gerar relatório"),
  });

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).getTime();
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const isFutureMonth = selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth());
  const monthName = `${MONTH_FULL[selectedMonth]} de ${selectedYear}`;

  const { data: dashboard, isLoading } = trpc.dashboard.summary.useQuery({ startDate, endDate });
  const { data: trend } = trpc.dashboard.trend.useQuery({ months: 12 });
  const { data: yearlyData } = trpc.dashboard.yearly.useQuery({ year: selectedYear });
  const { data: projections } = trpc.dashboard.projections.useQuery({ year: selectedYear });
  const { data: cardsData } = trpc.cards.list.useQuery();
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const { data: recentTx } = trpc.transactions.list.useQuery({ limit: 5, startDate, endDate });
  const { data: jobsSummary } = trpc.jobs.monthSummary.useQuery({ startDate, endDate });
  const { data: goalsData } = trpc.goals.list.useQuery({ year: selectedYear });
  const { data: prevYearData } = trpc.dashboard.yearly.useQuery({ year: selectedYear - 1 });

  // Weekly summary
  const weekRange = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { weekStart: monday.getTime(), weekEnd: sunday.getTime() };
  }, []);
  const { data: weekTx } = trpc.transactions.list.useQuery({ startDate: weekRange.weekStart, endDate: weekRange.weekEnd, limit: 200 });
  const { data: weekJobs } = trpc.jobs.list.useQuery();

  const weeklySummary = useMemo(() => {
    if (!weekTx) return { income: 0, expense: 0, jobsDelivered: 0 };
    let income = 0, expense = 0;
    for (const tx of weekTx.items || []) {
      const amt = parseFloat(tx.amount);
      if (tx.type === 'income') income += amt;
      else expense += amt;
    }
    const jobsDelivered = (weekJobs || []).filter((j: any) =>
      j.status === 'completed' && j.endDate && j.endDate >= weekRange.weekStart && j.endDate <= weekRange.weekEnd
    ).length;
    return { income, expense, jobsDelivered };
  }, [weekTx, weekJobs, weekRange]);

  // Year-over-year comparison
  const yearComparison = useMemo(() => {
    if (!yearlyData || !prevYearData) return null;
    const currentByMonth: Record<string, { income: number; expense: number }> = {};
    const prevByMonth: Record<string, { income: number; expense: number }> = {};
    for (const row of yearlyData) {
      const monthIdx = parseInt(row.month.split('-')[1]) - 1;
      if (!currentByMonth[monthIdx]) currentByMonth[monthIdx] = { income: 0, expense: 0 };
      if (row.type === 'income') currentByMonth[monthIdx].income += row.total;
      else currentByMonth[monthIdx].expense += row.total;
    }
    for (const row of prevYearData) {
      const monthIdx = parseInt(row.month.split('-')[1]) - 1;
      if (!prevByMonth[monthIdx]) prevByMonth[monthIdx] = { income: 0, expense: 0 };
      if (row.type === 'income') prevByMonth[monthIdx].income += row.total;
      else prevByMonth[monthIdx].expense += row.total;
    }
    return MONTH_NAMES.map((name, idx) => ({
      month: name,
      currentIncome: currentByMonth[idx]?.income || 0,
      prevIncome: prevByMonth[idx]?.income || 0,
      currentExpense: currentByMonth[idx]?.expense || 0,
      prevExpense: prevByMonth[idx]?.expense || 0,
    }));
  }, [yearlyData, prevYearData]);

  // Goals progress for current month
  const currentGoals = useMemo(() => {
    if (!goalsData) return [];
    return goalsData.filter((g: any) => g.month === selectedMonth + 1);
  }, [goalsData, selectedMonth]);

  const getGoalProgress = (goal: any) => {
    const target = parseFloat(goal.targetValue);
    if (target <= 0) return 0;
    let actual = 0;
    if (goal.type === 'revenue') actual = displayIncome;
    else if (goal.type === 'profit') actual = displayBalance;
    else if (goal.type === 'jobs') actual = jobsSummary?.activeJobs || 0;
    return Math.min(Math.round((actual / target) * 100), 200);
  };

  const [addOpen, setAddOpen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<"income" | "expense" | null>(null);

  // Query for detail sheet - all transactions of selected type in this month
  const { data: detailTx, isLoading: detailLoading } = trpc.transactions.list.useQuery(
    { type: detailSheet || undefined, startDate, endDate, limit: 200 },
    { enabled: !!detailSheet }
  );
  const [form, setForm] = useState({
    description: "", amount: "", type: "expense" as "income" | "expense",
    scope: "pf" as "pj" | "pf", cardId: "", categoryId: "",
  });

  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Edit/Delete state
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [editTx, setEditTx] = useState<{ id: number; description: string; amount: string; recurringIncomeId?: number | null; recurringExpenseId?: number | null; installmentGroupId?: string | null; source?: string | null } | null>(null);
  const [deleteTx, setDeleteTx] = useState<{ id: number; description: string; recurringIncomeId?: number | null; recurringExpenseId?: number | null; installmentGroupId?: string | null; source?: string | null } | null>(null);
  const [deleteScope, setDeleteScope] = useState<"single" | "all_future" | "all">("single");
  const [editForm, setEditForm] = useState({ description: "", amount: "" });

  const invalidateAll = () => {
    utils.dashboard.summary.invalidate();
    utils.dashboard.trend.invalidate();
    utils.dashboard.yearly.invalidate();
    utils.transactions.list.invalidate();
    utils.recurringIncome.list.invalidate();
    utils.recurringExpenses.list.invalidate();
  };

  // Delete single transaction
  const deleteSingleTx = trpc.transactions.delete.useMutation({
    onSuccess: () => { toast.success("Transação excluída!"); invalidateAll(); setDeleteTx(null); },
    onError: () => toast.error("Erro ao excluir"),
  });

  // Delete recurring income + all transactions
  const deleteRecIncome = trpc.recurringIncome.delete.useMutation({
    onSuccess: () => { toast.success("Recorrência e todas as transações excluídas!"); invalidateAll(); setDeleteTx(null); },
    onError: () => toast.error("Erro ao excluir recorrência"),
  });

  // Delete recurring expense + all transactions
  const deleteRecExpense = trpc.recurringExpenses.delete.useMutation({
    onSuccess: () => { toast.success("Recorrência e todas as transações excluídas!"); invalidateAll(); setDeleteTx(null); },
    onError: () => toast.error("Erro ao excluir recorrência"),
  });

  // Delete installment group (all)
  const deleteInstGroup = trpc.transactions.deleteInstallmentGroup.useMutation({
    onSuccess: () => { toast.success("Todas as parcelas excluídas!"); invalidateAll(); setDeleteTx(null); },
    onError: () => toast.error("Erro ao excluir parcelas"),
  });

  // Delete installment group future only
  const deleteInstGroupFuture = trpc.transactions.deleteInstallmentGroupFuture.useMutation({
    onSuccess: () => { toast.success("Parcelas futuras excluídas!"); invalidateAll(); setDeleteTx(null); },
    onError: () => toast.error("Erro ao excluir parcelas futuras"),
  });

  // Confirm receipt of a pending job payment
  const confirmReceiptMutation = trpc.jobs.payments.confirmReceipt.useMutation({
    onSuccess: () => { toast.success("Recebimento confirmado!"); invalidateAll(); },
    onError: () => toast.error("Erro ao confirmar recebimento"),
  });

  const confirmPaymentMutation = trpc.jobs.payments.confirmPayment.useMutation({
    onSuccess: () => { toast.success("Pagamento confirmado!"); invalidateAll(); },
    onError: () => toast.error("Erro ao confirmar pagamento"),
  });

  // Update single transaction
  const updateTx = trpc.transactions.update.useMutation({
    onSuccess: () => { toast.success("Transação atualizada!"); invalidateAll(); setEditTx(null); },
    onError: () => toast.error("Erro ao atualizar"),
  });

  // Update recurring income + regenerate
  const updateRecIncome = trpc.recurringIncome.update.useMutation({
    onSuccess: () => { toast.success("Recorrência atualizada em todos os meses!"); invalidateAll(); setEditTx(null); },
    onError: () => toast.error("Erro ao atualizar recorrência"),
  });

  // Update recurring expense + regenerate
  const updateRecExpense = trpc.recurringExpenses.update.useMutation({
    onSuccess: () => { toast.success("Recorrência atualizada em todos os meses!"); invalidateAll(); setEditTx(null); },
    onError: () => toast.error("Erro ao atualizar recorrência"),
  });

  // Update installment group future
  const updateInstGroupFuture = trpc.transactions.updateInstallmentGroupFuture.useMutation({
    onSuccess: () => { toast.success("Parcelas futuras atualizadas!"); invalidateAll(); setEditTx(null); },
    onError: () => toast.error("Erro ao atualizar parcelas"),
  });
  const createTx = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast.success("Transação registrada!");
      setAddOpen(false);
      setForm({ description: "", amount: "", type: "expense", scope: "pf", cardId: "", categoryId: "" });
      utils.dashboard.summary.invalidate();
      utils.dashboard.trend.invalidate();
      utils.dashboard.yearly.invalidate();
      utils.transactions.list.invalidate();
    },
    onError: () => toast.error("Erro ao registrar transação"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    createTx.mutate({
      description: form.description,
      amount: parseFloat(form.amount.replace(",", ".")).toFixed(2),
      type: form.type,
      scope: form.scope,
      cardId: form.cardId && form.cardId !== "none" ? parseInt(form.cardId) : null,
      categoryId: form.categoryId && form.categoryId !== "none" ? parseInt(form.categoryId) : null,
      date: Date.now(),
    });
  };

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); }
    else setSelectedMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); }
    else setSelectedMonth(m => m + 1);
  };

  const goToToday = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Current month projections (income from recurrences + pending job payments)
  const currentMonthProjections = useMemo(() => {
    if (!projections) return { income: 0, recurring: 0, jobs: 0, expense: 0 };
    const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    let income = 0, recurring = 0, jobsTotal = 0, expense = 0;
    for (const p of projections) {
      if (p.month === monthStr) {
        if (p.type === 'income') {
          income += p.total;
          if ((p as any).source === 'jobs') jobsTotal += p.total;
          else recurring += p.total;
        } else if (p.type === 'expense') {
          expense += p.total;
        }
      }
    }
    return { income, recurring, jobs: jobsTotal, expense };
  }, [projections, selectedYear, selectedMonth]);

  // Build yearly grid data with projections
  const yearlyGrid = useMemo(() => {
    const grid = MONTH_NAMES.map((name, idx) => ({
      name,
      index: idx,
      income: 0,
      expense: 0,
      projectedIncome: 0,
      projectedExpense: 0,
      balance: 0,
      isSelected: idx === selectedMonth,
      isCurrent: selectedYear === now.getFullYear() && idx === now.getMonth(),
      isFuture: selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && idx > now.getMonth()),
    }));

    if (yearlyData) {
      for (const row of yearlyData) {
        const monthIdx = parseInt(row.month.split("-")[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          if (row.type === "income") grid[monthIdx].income += row.total;
          else grid[monthIdx].expense += row.total;
        }
      }
    }

    if (projections) {
      for (const p of projections) {
        const monthIdx = parseInt(p.month.split("-")[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12 && p.type === 'income') {
          grid[monthIdx].projectedIncome += p.total;
        }
      }
    }

    for (const m of grid) {
      // For future months, use real data if available, otherwise projections
      const totalInc = m.isFuture ? (m.income > 0 ? m.income : m.projectedIncome) : m.income;
      const totalExp = m.expense; // Always show real expenses (recurring transactions are pre-generated)
      m.balance = totalInc - totalExp;
    }

    return grid;
  }, [yearlyData, projections, selectedMonth, selectedYear, now]);

  const yearTotals = useMemo(() => {
    return yearlyGrid.reduce((acc, m) => ({
      income: acc.income + (m.isFuture ? (m.income > 0 ? m.income : m.projectedIncome) : m.income),
      expense: acc.expense + m.expense, // Always include expenses (recurring are pre-generated)
    }), { income: 0, expense: 0 });
  }, [yearlyGrid]);

  const scopeData = useMemo(() => {
    if (!dashboard) return { pjIncome: 0, pjExpense: 0, pfIncome: 0, pfExpense: 0 };
    let pjIncome = 0, pjExpense = 0, pfIncome = 0, pfExpense = 0;
    for (const row of dashboard.byScope) {
      const val = parseFloat(String(row.total));
      if (row.scope === "pj" && row.type === "income") pjIncome = val;
      if (row.scope === "pj" && row.type === "expense") pjExpense = val;
      if (row.scope === "pf" && row.type === "income") pfIncome = val;
      if (row.scope === "pf" && row.type === "expense") pfExpense = val;
    }
    return { pjIncome, pjExpense, pfIncome, pfExpense };
  }, [dashboard]);

  const categorySpending = useMemo(() => {
    if (!dashboard || !categoriesData) return [];
    return categoriesData.map(cat => {
      const found = dashboard.byCategory.find(c => c.categoryId === cat.id);
      return { name: cat.name, value: found ? parseFloat(String(found.total)) : 0, color: cat.color };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [dashboard, categoriesData]);

  const trendData = useMemo(() => {
    if (!trend) return [];
    const months: Record<string, { month: string; receitas: number; despesas: number }> = {};
    for (const row of trend) {
      if (!months[row.month]) months[row.month] = { month: row.month, receitas: 0, despesas: 0 };
      const val = parseFloat(String(row.total));
      if (row.type === "income") months[row.month].receitas += val;
      else months[row.month].despesas += val;
    }
    return Object.values(months).map(m => ({
      ...m,
      month: new Date(m.month + "-15").toLocaleDateString("pt-BR", { month: "short" }),
    }));
  }, [trend]);

  const totalIncome = (dashboard?.totals.income || 0) + (dashboard?.jobTotals?.income || 0);
  const totalExpense = (dashboard?.totals.expense || 0) + (dashboard?.jobTotals?.expense || 0);
  const balance = totalIncome - totalExpense;

  // For future months, use real data from dashboard (recurring transactions are already generated in DB)
  // Fall back to projections only if dashboard has no data
  const displayIncome = isFutureMonth 
    ? (totalIncome > 0 ? totalIncome : currentMonthProjections.income) 
    : totalIncome;
  const displayExpense = isFutureMonth ? totalExpense : totalExpense;
  const displayBalance = displayIncome - displayExpense;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[140px] sm:min-w-[200px]">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight capitalize">{monthName}</h1>
              <p className="text-muted-foreground text-[10px] sm:text-sm hidden sm:block">
                {isFutureMonth ? "Projeção baseada em recorrências e jobs" : "Visão geral das suas finanças"}
              </p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-auto sm:px-2" onClick={goToToday}>
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline ml-1 text-xs">Hoje</span>
              </Button>
            )}
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova Transação</span><span className="sm:hidden">Nova</span></Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Transação</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Escopo</Label>
                  <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pf">Pessoal (PF)</SelectItem>
                      <SelectItem value="pj">Empresa (PJ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input placeholder="Ex: Mercado, Cliente X..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cartão</Label>
                  <Select value={form.cardId} onValueChange={v => setForm(f => ({ ...f, cardId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {cardsData?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {categoriesData?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createTx.isPending}>
                {createTx.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          <Button
            variant={showYearView ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5 shrink-0 text-xs"
            onClick={() => setShowYearView(!showYearView)}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Visão Anual
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 text-xs"
            disabled={genMonthly.isPending}
            onClick={() => genMonthly.mutate({ month: selectedMonth + 1, year: selectedYear, email: user?.email || "" })}
          >
            <FileText className="h-3.5 w-3.5" />
            {genMonthly.isPending ? "Gerando..." : "Relatório"}
          </Button>
        </div>
      </div>

      {/* Visão Anual */}
      {showYearView && (
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg font-bold">{selectedYear}</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap items-center">
                <span className="text-emerald-400">{formatCurrency(yearTotals.income)}</span>
                <span className="text-red-400">{formatCurrency(yearTotals.expense)}</span>
                <span className={yearTotals.income - yearTotals.expense >= 0 ? "text-emerald-400" : "text-red-400"}>
                  = {formatCurrency(yearTotals.income - yearTotals.expense)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={genAnnual.isPending}
                  onClick={() => genAnnual.mutate({ year: selectedYear, email: user?.email || "" })}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{genAnnual.isPending ? "Gerando..." : "Relatório Anual"}</span>
                  <span className="sm:hidden">{genAnnual.isPending ? "..." : "PDF"}</span>
                </Button>
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Valores reais
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500/40 border border-dashed border-emerald-500" /> Projeção (recorrências + jobs)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {yearlyGrid.map((m) => {
                const showIncome = m.isFuture ? (m.income > 0 ? m.income : m.projectedIncome) : m.income;
                const showExpense = m.expense; // Always show real expenses
                const hasProjection = m.isFuture && (m.projectedIncome > 0 || m.income > 0 || m.expense > 0);
                const hasReal = !m.isFuture && (m.income > 0 || m.expense > 0);

                return (
                  <button
                    key={m.index}
                    onClick={() => { setSelectedMonth(m.index); setShowYearView(false); }}
                    className={`
                      relative p-3 rounded-xl text-center transition-all duration-200 cursor-pointer
                      hover:scale-105 hover:shadow-lg
                      ${m.isSelected
                        ? "bg-primary/20 border-2 border-primary shadow-md"
                        : m.isCurrent
                          ? "bg-secondary/80 border border-primary/30"
                          : m.isFuture
                            ? "bg-secondary/20 border border-dashed border-border/30"
                            : "bg-secondary/40 border border-transparent hover:border-border/50"
                      }
                    `}
                  >
                    <p className={`text-xs font-bold mb-1.5 ${m.isSelected ? "text-primary" : m.isCurrent ? "text-primary/80" : "text-foreground"}`}>
                      {m.name}
                    </p>
                    {hasReal || hasProjection ? (
                      <div className="space-y-0.5">
                        <p className={`text-[10px] font-medium leading-tight ${m.isFuture ? "text-emerald-400/60" : "text-emerald-400"}`}>
                          +{formatCompact(showIncome)}
                        </p>
                        {showExpense > 0 && (
                          <p className={`text-[10px] font-medium leading-tight text-red-400`}>
                            -{formatCompact(showExpense)}
                          </p>
                        )}
                        <div className={`h-0.5 rounded-full mt-1 ${m.balance >= 0 ? "bg-emerald-500/40" : "bg-red-500/40"}`}>
                          <div
                            className={`h-full rounded-full ${m.balance >= 0 ? "bg-emerald-500" : "bg-red-500"} ${m.isFuture ? "opacity-50" : ""}`}
                            style={{ width: `${Math.min(100, Math.abs(m.balance) / Math.max(showIncome, showExpense, 1) * 100)}%` }}
                          />
                        </div>
                        {m.isFuture && (
                          <p className="text-[8px] text-muted-foreground/60 mt-0.5 italic">previsto</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">—</p>
                    )}
                    {m.isCurrent && (
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de projeção para meses futuros */}
      {isFutureMonth && (currentMonthProjections.income > 0 || displayExpense > 0) && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-primary/60" />
              <div>
                <p className="text-sm font-medium text-primary/80">Projeção do mês</p>
                <p className="text-xs text-muted-foreground">
                  Receitas previstas: {formatCurrency(displayIncome)}
                  {currentMonthProjections.recurring > 0 && ` (Recorrências: ${formatCurrency(currentMonthProjections.recurring)})`}
                  {currentMonthProjections.jobs > 0 && ` (Jobs: ${formatCurrency(currentMonthProjections.jobs)})`}
                  {displayExpense > 0 && ` • Despesas previstas: ${formatCurrency(displayExpense)}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sheet de detalhes (Receitas ou Despesas) */}
      <Sheet open={!!detailSheet} onOpenChange={(open) => { if (!open) setDetailSheet(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2">
              {detailSheet === "income" ? (
                <><div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-emerald-400" /></div> Receitas de {MONTH_FULL[selectedMonth]}</>
              ) : (
                <><div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-red-400" /></div> Despesas de {MONTH_FULL[selectedMonth]}</>
              )}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {detailTx?.items ? `${detailTx.items.length} transaç${detailTx.items.length !== 1 ? "ões" : "ão"}` : "Carregando..."}
              {detailTx?.items && detailTx.items.length > 0 && (
                <> — Total: <span className={detailSheet === "income" ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {formatCurrency(detailTx.items.filter(tx => (tx as any).source !== "job_pending").reduce((sum, tx) => sum + parseFloat(tx.amount), 0))}
                </span></>
              )}
            </p>
            {detailTx?.items && detailTx.items.filter(tx => (tx as any).source === "job_pending").length > 0 && (
              <p className="text-sm mt-1">
                <span className="text-amber-400 font-medium">
                  {detailSheet === "income" ? "Previsto a receber" : "Previsto a pagar"}: {formatCurrency(detailTx.items.filter(tx => (tx as any).source === "job_pending").reduce((sum, tx) => sum + parseFloat(tx.amount), 0))}
                </span>
              </p>
            )}
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4 space-y-2">
              {detailLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>
              ) : !detailTx?.items || detailTx.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma {detailSheet === "income" ? "receita" : "despesa"} neste mês
                </p>
              ) : (() => {
                // Group transactions by job, card, and recurring
                const grouped: Record<string, typeof detailTx.items> = {};
                const cardGrouped: Record<string, { cardName: string; cardColor: string; items: typeof detailTx.items }> = {};
                const recurringItems: typeof detailTx.items = [];
                const nonGroupedItems: typeof detailTx.items = [];
                
                detailTx.items.forEach(tx => {
                  const isJob = (tx as any).source === "job" || (tx as any).source === "job_pending";
                  const isRecurring = (tx as any).source === "recurring";
                  if (isJob) {
                    const jobName = tx.description.split(" - ")[0] || "Sem job";
                    if (!grouped[jobName]) grouped[jobName] = [];
                    grouped[jobName].push(tx);
                  } else if (tx.cardId && detailSheet === "expense") {
                    const card = cardsData?.find(c => c.id === tx.cardId);
                    const cardKey = String(tx.cardId);
                    if (!cardGrouped[cardKey]) {
                      cardGrouped[cardKey] = { cardName: card?.name || "Cart\u00e3o", cardColor: card?.color || "#8b5cf6", items: [] };
                    }
                    cardGrouped[cardKey].items.push(tx);
                  } else if (isRecurring) {
                    recurringItems.push(tx);
                  } else {
                    nonGroupedItems.push(tx);
                  }
                });
                const nonJobItems = nonGroupedItems;

                const toggleJobExpand = (jobName: string) => {
                  const newSet = new Set(expandedJobs);
                  if (newSet.has(jobName)) newSet.delete(jobName);
                  else newSet.add(jobName);
                  setExpandedJobs(newSet);
                };

                const renderTransactionItem = (tx: any) => {
                  const cardName = cardsData?.find(c => c.id === tx.cardId)?.name;
                  const catName = categoriesData?.find(c => c.id === tx.categoryId)?.name;
                  const isRecurring = tx.source === "recurring" && (tx.recurringIncomeId || tx.recurringExpenseId);
                  const isInstallment = !!tx.installmentGroupId;
                  const isJob = (tx as any).source === "job" || (tx as any).source === "job_pending";
                  const isJobPending = (tx as any).source === "job_pending";

                  return (
                    <div key={tx.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors group ${isJobPending ? "bg-amber-500/5 border border-amber-500/20" : "bg-secondary/50 hover:bg-secondary/80"}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isJobPending ? "bg-amber-500/10" : tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          {isJob ? <Briefcase className={`h-4 w-4 ${isJobPending ? "text-amber-400" : tx.type === "income" ? "text-emerald-400" : "text-red-400"}`} /> : tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{(tx.description.split(" - ").slice(1).join(" - ") || tx.description).replace(/\s*\(recorrente\)/gi, "")}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap items-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tx.scope === "pj" ? "bg-violet-500/10 text-violet-400" : "bg-amber-500/10 text-amber-400"}`}>
                              {tx.scope === "pj" ? "PJ" : "PF"}
                            </span>
                            {isRecurring && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 flex items-center gap-0.5"><Repeat className="h-2.5 w-2.5" />mensal</span>}
                            {isInstallment && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">parcela</span>}
                            {isJobPending && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400">pendente</span>}
                            {cardName && <span>{cardName}</span>}
                            {catName && <span>{catName}</span>}
                            <span>{new Date(tx.date).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <p className={`text-sm font-semibold whitespace-nowrap ${isJobPending ? "text-amber-400" : tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(tx.amount))}
                        </p>
                        {isJobPending && (tx as any).jobPaymentId && tx.type === "income" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 whitespace-nowrap"
                            onClick={() => confirmReceiptMutation.mutate({ id: (tx as any).jobPaymentId, jobId: (tx as any).jobId })}
                          >
                            Confirmar
                          </Button>
                        ) : isJobPending && (tx as any).jobCostId && tx.type === "expense" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 whitespace-nowrap"
                            onClick={() => confirmPaymentMutation.mutate({ id: (tx as any).jobCostId })}
                          >
                            Pagar
                          </Button>
                        ) : !isJob ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditTx(tx as any);
                                setEditForm({ description: tx.description, amount: tx.amount });
                              }}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-400" onClick={() => {
                                setDeleteTx(tx as any);
                                setDeleteScope("single");
                              }}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {/* Job groups */}
                    {Object.entries(grouped).map(([jobName, items]) => {
                      const totalAmount = items.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
                      const isExpanded = expandedJobs.has(jobName);
                      const pendingCount = items.filter(tx => (tx as any).source === "job_pending").length;
                      
                      return (
                        <div key={jobName} className="border border-cyan-500/20 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleJobExpand(jobName)}
                            className="w-full flex items-center justify-between p-3 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ChevronRight className={`h-4 w-4 text-cyan-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-cyan-300 truncate">{jobName}</p>
                                <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""} {pendingCount > 0 ? `(${pendingCount} pendente${pendingCount !== 1 ? "s" : ""})`  : ""}</p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-cyan-400 whitespace-nowrap">{detailSheet === "income" ? "+" : "-"}{formatCurrency(totalAmount)}</p>
                          </button>
                          {isExpanded && (
                            <div className="space-y-2 p-2 bg-secondary/20">
                              {items.map(renderTransactionItem)}
                              {pendingCount > 0 && (
                                <Button
                                  size="sm"
                                  className="w-full text-xs h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                                  onClick={() => {
                                    items.filter(tx => (tx as any).source === "job_pending").forEach(tx => {
                                      if ((tx as any).jobPaymentId && detailSheet === "income") {
                                        confirmReceiptMutation.mutate({ id: (tx as any).jobPaymentId, jobId: (tx as any).jobId });
                                      } else if ((tx as any).jobCostId && detailSheet === "expense") {
                                        confirmPaymentMutation.mutate({ id: (tx as any).jobCostId });
                                      }
                                    });
                                  }}
                                >
                                  {detailSheet === "income" ? "Confirmar Todos" : "Pagar Todos"} ({pendingCount})
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Card groups (expenses only) */}
                    {Object.entries(cardGrouped).map(([cardKey, { cardName, cardColor, items }]) => {
                      const totalAmount = items.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
                      const isExpanded = expandedJobs.has(`card-${cardKey}`);
                      
                      return (
                        <div key={`card-${cardKey}`} className="border rounded-lg overflow-hidden" style={{ borderColor: cardColor + "40" }}>
                          <button
                            onClick={() => toggleJobExpand(`card-${cardKey}`)}
                            className="w-full flex items-center justify-between p-3 transition-colors hover:opacity-80"
                            style={{ backgroundColor: cardColor + "08" }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} style={{ color: cardColor }} />
                              <div className="flex items-center gap-2 min-w-0">
                                <CreditCard className="h-4 w-4 shrink-0" style={{ color: cardColor }} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: cardColor }}>{cardName}</p>
                                  <p className="text-xs text-muted-foreground">{items.length} gasto{items.length !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="text-sm font-semibold whitespace-nowrap" style={{ color: cardColor }}>-{formatCurrency(totalAmount)}</p>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="space-y-2 p-2 bg-secondary/20">
                              {items.map(renderTransactionItem)}
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-8"
                                style={{ borderColor: cardColor + "50", color: cardColor }}
                                onClick={() => setLocation('/cartoes')}
                              >
                                Ver detalhes por categoria
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Recurring group */}
                    {recurringItems.length > 0 && (() => {
                      const totalRecurring = recurringItems.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
                      const isExpanded = expandedJobs.has('recurring-group');
                      return (
                        <div className="border border-violet-500/20 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleJobExpand('recurring-group')}
                            className="w-full flex items-center justify-between p-3 bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ChevronRight className={`h-4 w-4 text-violet-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              <div className="flex items-center gap-2 min-w-0">
                                <Repeat className="h-4 w-4 text-violet-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-violet-300">{detailSheet === "income" ? "Receitas Fixas" : "Despesas Fixas"}</p>
                                  <p className="text-xs text-muted-foreground">{recurringItems.length} {detailSheet === "income" ? "receita" : "despesa"}{recurringItems.length !== 1 ? "s" : ""} mensal{recurringItems.length !== 1 ? "is" : ""}</p>
                                </div>
                              </div>
                            </div>
                            <p className={`text-sm font-semibold whitespace-nowrap ${detailSheet === "income" ? "text-emerald-400" : "text-violet-400"}`}>
                              {detailSheet === "income" ? "+" : "-"}{formatCurrency(totalRecurring)}
                            </p>
                          </button>
                          {isExpanded && (
                            <div className="space-y-2 p-2 bg-secondary/20">
                              {recurringItems.map(renderTransactionItem)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {/* Non-grouped items */}
                    {nonJobItems.map(renderTransactionItem)}
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialog de Editar Transação */}
      <Dialog open={!!editTx} onOpenChange={(open) => { if (!open) setEditTx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editTx) return;
            const isRecurring = editTx.source === "recurring";
            const isInstallment = !!editTx.installmentGroupId;

            if (isRecurring && editTx.recurringIncomeId) {
              updateRecIncome.mutate({ id: editTx.recurringIncomeId, description: editForm.description, amount: parseFloat(editForm.amount.replace(",", ".")).toFixed(2) });
            } else if (isRecurring && editTx.recurringExpenseId) {
              updateRecExpense.mutate({ id: editTx.recurringExpenseId, description: editForm.description, amount: parseFloat(editForm.amount.replace(",", ".")).toFixed(2) });
            } else if (isInstallment && editTx.installmentGroupId) {
              updateInstGroupFuture.mutate({ groupId: editTx.installmentGroupId, description: editForm.description, amount: parseFloat(editForm.amount.replace(",", ".")).toFixed(2) });
            } else {
              updateTx.mutate({ id: editTx.id, description: editForm.description, amount: parseFloat(editForm.amount.replace(",", ".")).toFixed(2) });
            }
          }} className="space-y-4">
            {editTx?.source === "recurring" && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-purple-300">Esta é uma transação recorrente. A alteração será aplicada em <strong>todos os meses</strong> (passados e futuros).</p>
              </div>
            )}
            {editTx?.installmentGroupId && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm text-orange-300">Esta é uma parcela. A alteração será aplicada nas <strong>parcelas futuras</strong>.</p>
              </div>
            )}
            <div>
              <Label>Descrição</Label>
              <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditTx(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Excluir Transação */}
      <AlertDialog open={!!deleteTx} onOpenChange={(open) => { if (!open) setDeleteTx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTx?.source === "recurring" ? (
                <>
                  <strong>"{deleteTx.description}"</strong> é uma transação recorrente.
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="deleteScope" checked={deleteScope === "single"} onChange={() => setDeleteScope("single")} className="accent-red-500" />
                      <span>Excluir apenas esta transação</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="deleteScope" checked={deleteScope === "all"} onChange={() => setDeleteScope("all")} className="accent-red-500" />
                      <span>Excluir a recorrência e <strong>todas</strong> as transações geradas</span>
                    </label>
                  </div>
                </>
              ) : deleteTx?.installmentGroupId ? (
                <>
                  <strong>"{deleteTx.description}"</strong> é uma parcela.
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="deleteScope" checked={deleteScope === "single"} onChange={() => setDeleteScope("single")} className="accent-red-500" />
                      <span>Excluir apenas esta parcela</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="deleteScope" checked={deleteScope === "all_future"} onChange={() => setDeleteScope("all_future")} className="accent-red-500" />
                      <span>Excluir todas as parcelas <strong>futuras</strong></span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="deleteScope" checked={deleteScope === "all"} onChange={() => setDeleteScope("all")} className="accent-red-500" />
                      <span>Excluir <strong>todas</strong> as parcelas do grupo</span>
                    </label>
                  </div>
                </>
              ) : (
                <>Tem certeza que deseja excluir <strong>"{deleteTx?.description}"</strong>? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
              if (!deleteTx) return;
              const isRecurring = deleteTx.source === "recurring";
              const isInstallment = !!deleteTx.installmentGroupId;

              if (deleteScope === "all" && isRecurring) {
                if (deleteTx.recurringIncomeId) deleteRecIncome.mutate({ id: deleteTx.recurringIncomeId });
                else if (deleteTx.recurringExpenseId) deleteRecExpense.mutate({ id: deleteTx.recurringExpenseId });
              } else if (deleteScope === "all" && isInstallment) {
                deleteInstGroup.mutate({ groupId: deleteTx.installmentGroupId! });
              } else if (deleteScope === "all_future" && isInstallment) {
                deleteInstGroupFuture.mutate({ groupId: deleteTx.installmentGroupId! });
              } else {
                deleteSingleTx.mutate({ id: deleteTx.id });
              }
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card
          className={`border-border/50 bg-card/80 backdrop-blur cursor-pointer hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all animate-in fade-in-0 slide-in-from-bottom-3 duration-300 ${isFutureMonth ? "border-dashed" : ""}`}
          onClick={() => setDetailSheet("income")}
        >
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Receitas {isFutureMonth && <span className="text-primary/60">(prev.)</span>}
                </p>
                <p className={`text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 ${isFutureMonth ? "text-emerald-400/70" : "text-emerald-400"}`}>
                  {formatCurrency(displayIncome)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 hidden sm:block">Clique para ver detalhes</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-border/50 bg-card/80 backdrop-blur cursor-pointer hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 transition-all animate-in fade-in-0 slide-in-from-bottom-3 duration-300 delay-75 ${isFutureMonth ? "border-dashed" : ""}`}
          onClick={() => setDetailSheet("expense")}
        >
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Despesas {isFutureMonth && <span className="text-primary/60">(prev.)</span>}
                </p>
                <p className={`text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 ${isFutureMonth ? "text-red-400/70" : "text-red-400"}`}>
                  {formatCurrency(displayExpense)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 hidden sm:block">Clique para ver detalhes</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 bg-card/80 backdrop-blur animate-in fade-in-0 slide-in-from-bottom-3 duration-300 delay-150 ${isFutureMonth ? "border-dashed" : ""}`}>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Saldo {isFutureMonth && <span className="text-primary/60">(prev.)</span>}
                </p>
                <p className={`text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 ${displayBalance >= 0 ? (isFutureMonth ? "text-emerald-400/70" : "text-emerald-400") : (isFutureMonth ? "text-red-400/70" : "text-red-400")}`}>
                  {formatCurrency(displayBalance)}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur animate-in fade-in-0 slide-in-from-bottom-3 duration-300 delay-200">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">PJ vs PF</p>
                <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 mt-0.5 sm:mt-1">
                  <span className="text-xs sm:text-sm"><Building2 className="h-3 w-3 inline mr-0.5" />{formatCurrency(scopeData.pjExpense)}</span>
                  <span className="text-xs sm:text-sm"><User className="h-3 w-3 inline mr-0.5" />{formatCurrency(scopeData.pfExpense)}</span>
                </div>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in-0 duration-500 delay-300">
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#e5e7eb" }}
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                  <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Registre transações para ver a evolução
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categorySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categorySpending} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {categorySpending.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                  <Legend formatter={(value) => <span style={{ color: "#d1d5db", fontSize: 12 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                {isFutureMonth ? "Projeções não incluem categorias" : "Registre despesas para ver o gráfico"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Jobs do Mês */}
      {jobsSummary && (jobsSummary.activeJobs > 0 || !isFutureMonth) && (
        <Card
          className="border-border/50 bg-card/80 backdrop-blur cursor-pointer hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          onClick={() => setLocation("/jobs")}
        >
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Jobs do Mês</p>
                <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2">
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-blue-400">{jobsSummary.activeJobs}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">job{jobsSummary.activeJobs !== 1 ? "s" : ""} ativo{jobsSummary.activeJobs !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="h-8 sm:h-10 border-l border-border/50" />
                  <div>
                    <p className={`text-lg sm:text-2xl font-bold ${jobsSummary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(jobsSummary.totalProfit)}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">lucro total</p>
                  </div>
                </div>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Semanal + Metas do Mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in-0 duration-400 delay-100">
        {/* Resumo da Semana */}
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Resumo da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center">
                <p className="text-base sm:text-2xl font-bold text-emerald-400">{formatCurrency(weeklySummary.income)}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Receitas</p>
              </div>
              <div className="text-center">
                <p className="text-base sm:text-2xl font-bold text-red-400">{formatCurrency(weeklySummary.expense)}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Despesas</p>
              </div>
              <div className="text-center">
                <p className="text-base sm:text-2xl font-bold text-blue-400">{weeklySummary.jobsDelivered}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Jobs entregues</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className={`text-sm font-medium text-center ${weeklySummary.income - weeklySummary.expense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Saldo: {formatCurrency(weeklySummary.income - weeklySummary.expense)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metas do Mês */}
        <Card className="border-border/50 bg-card/80 backdrop-blur cursor-pointer hover:border-primary/30 transition-all" onClick={() => setLocation('/metas')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Metas de {MONTH_FULL[selectedMonth]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentGoals.length > 0 ? (
              <div className="space-y-3">
                {currentGoals.slice(0, 3).map((goal: any) => {
                  const progress = getGoalProgress(goal);
                  const isAchieved = progress >= 100;
                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate">{goal.title}</span>
                        <span className={isAchieved ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isAchieved ? 'bg-emerald-500' : progress > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {currentGoals.length > 3 && <p className="text-[10px] text-muted-foreground text-center">+{currentGoals.length - 3} metas</p>}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Target className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhuma meta definida para este mês</p>
                <p className="text-[10px]">Clique para criar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparativo Ano a Ano */}
      {showYearView && yearComparison && (
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comparativo {selectedYear - 1} vs {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yearComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Bar dataKey="prevIncome" fill="#10b98166" radius={[2, 2, 0, 0]} name={`Receita ${selectedYear - 1}`} />
                <Bar dataKey="currentIncome" fill="#10b981" radius={[2, 2, 0, 0]} name={`Receita ${selectedYear}`} />
                <Legend formatter={(value) => <span style={{ color: '#d1d5db', fontSize: 11 }}>{value}</span>} />
              </BarChart>
            </ResponsiveContainer>
            {/* Growth summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/50">
              {(() => {
                const totalCurrent = yearComparison.reduce((s, m) => s + m.currentIncome, 0);
                const totalPrev = yearComparison.reduce((s, m) => s + m.prevIncome, 0);
                const growth = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev * 100) : 0;
                const totalCurrentExp = yearComparison.reduce((s, m) => s + m.currentExpense, 0);
                const totalPrevExp = yearComparison.reduce((s, m) => s + m.prevExpense, 0);
                return (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Receita {selectedYear - 1}</p>
                      <p className="text-sm font-bold">{formatCurrency(totalPrev)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Receita {selectedYear}</p>
                      <p className="text-sm font-bold">{formatCurrency(totalCurrent)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Crescimento</p>
                      <p className={`text-sm font-bold ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Despesas {selectedYear}</p>
                      <p className="text-sm font-bold text-red-400">{formatCurrency(totalCurrentExp)}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Últimas Transações */}
      <div className="animate-in fade-in-0 duration-400 delay-150">
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTx?.items.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {tx.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {tx.scope === "pj" ? "PJ" : "PF"} • {new Date(tx.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <p className={`text-xs sm:text-sm font-semibold shrink-0 ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(tx.amount))}
                </p>
              </div>
            ))}
            {(!recentTx?.items || recentTx.items.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isFutureMonth ? "Mês futuro — valores baseados em recorrências" : "Nenhuma transação neste mês"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
