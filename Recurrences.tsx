import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, ArrowDownCircle, ArrowUpCircle, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function Recurrences() {
  const utils = trpc.useUtils();
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  const [incomeForm, setIncomeForm] = useState({
    clientId: 0,
    description: "",
    amount: "",
    frequency: "monthly" as string,
    dayOfMonth: 1,
    startDate: Date.now(),
  });

  const [expenseForm, setExpenseForm] = useState({
    supplierId: 0,
    description: "",
    amount: "",
    frequency: "monthly" as string,
    dayOfMonth: 1,
    startDate: Date.now(),
    categoryId: 0,
  });

  const { data: income = [], refetch: refetchIncome } = trpc.recurringIncome.list.useQuery();
  const { data: expenses = [], refetch: refetchExpenses } = trpc.recurringExpenses.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  const createIncomeMutation = trpc.recurringIncome.create.useMutation();
  const updateIncomeMutation = trpc.recurringIncome.update.useMutation();
  const deleteIncomeMutation = trpc.recurringIncome.delete.useMutation();

  const createExpenseMutation = trpc.recurringExpenses.create.useMutation();
  const updateExpenseMutation = trpc.recurringExpenses.update.useMutation();
  const deleteExpenseMutation = trpc.recurringExpenses.delete.useMutation();

  const resetIncomeForm = () => {
    setIncomeForm({ clientId: 0, description: "", amount: "", frequency: "monthly", dayOfMonth: 1, startDate: Date.now() });
    setEditingIncomeId(null);
  };

  const resetExpenseForm = () => {
    setExpenseForm({ supplierId: 0, description: "", amount: "", frequency: "monthly", dayOfMonth: 1, startDate: Date.now(), categoryId: 0 });
    setEditingExpenseId(null);
  };

  const handleSubmitIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingIncomeId) {
        await updateIncomeMutation.mutateAsync({ id: editingIncomeId, ...incomeForm } as any);
        toast.success("Recebimento atualizado! Transações regeneradas.");
      } else {
        await createIncomeMutation.mutateAsync(incomeForm as any);
        toast.success("Recebimento criado! Transações geradas em todos os meses.");
      }
      resetIncomeForm();
      setIsIncomeOpen(false);
      refetchIncome();
      utils.dashboard.summary.invalidate();
      utils.dashboard.trend.invalidate();
      utils.transactions.list.invalidate();
    } catch (error) {
      toast.error("Erro ao salvar recebimento");
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpenseId) {
        await updateExpenseMutation.mutateAsync({ id: editingExpenseId, ...expenseForm } as any);
        toast.success("Cobrança atualizada! Transações regeneradas.");
      } else {
        await createExpenseMutation.mutateAsync(expenseForm as any);
        toast.success("Cobrança criada! Transações geradas em todos os meses.");
      }
      resetExpenseForm();
      setIsExpenseOpen(false);
      refetchExpenses();
      utils.dashboard.summary.invalidate();
      utils.dashboard.trend.invalidate();
      utils.transactions.list.invalidate();
    } catch (error) {
      toast.error("Erro ao salvar cobrança");
    }
  };

  const frequencyLabel = (f: string) => {
    const map: Record<string, string> = { monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual" };
    return map[f] || f;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg sm:text-3xl font-bold">Recorrências</h1>

      <Tabs defaultValue="income">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="income" className="text-xs sm:text-sm flex-1 sm:flex-initial">Recebimentos</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm flex-1 sm:flex-initial">Cobranças</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4">
          <Dialog open={isIncomeOpen} onOpenChange={(open) => { setIsIncomeOpen(open); if (!open) resetIncomeForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={resetIncomeForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Recebimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingIncomeId ? "Editar" : "Novo"} Recebimento Recorrente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitIncome} className="space-y-4">
                <div className="space-y-2">
                  <Label>Contratante (opcional)</Label>
                  <Select
                    value={incomeForm.clientId ? String(incomeForm.clientId) : "none"}
                    onValueChange={(v) => setIncomeForm({ ...incomeForm, clientId: v === "none" ? 0 : parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar contratante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input placeholder="Ex: Contrato Iguatemi" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input placeholder="0.00" type="number" step="0.01" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia do mês</Label>
                    <Input type="number" min="1" max="31" value={incomeForm.dayOfMonth} onChange={(e) => setIncomeForm({ ...incomeForm, dayOfMonth: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={incomeForm.frequency} onValueChange={(v) => setIncomeForm({ ...incomeForm, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="semiannual">Semestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createIncomeMutation.isPending || updateIncomeMutation.isPending}>
                  {(createIncomeMutation.isPending || updateIncomeMutation.isPending) ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {income.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowDownCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum recebimento recorrente</h3>
                <p className="text-sm text-muted-foreground">Cadastre contratos e recebimentos que se repetem todo mês.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {income.map((rec) => (
              <Card key={rec.id} className="hover:-translate-y-0.5 transition-all duration-200">
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm sm:text-lg truncate">{rec.description}</CardTitle>
                        <p className="text-xs sm:text-sm text-green-400 font-medium">R$ {parseFloat(rec.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 sm:gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingIncomeId(rec.id);
                        setIncomeForm({
                          clientId: rec.clientId ?? 0,
                          description: rec.description,
                          amount: rec.amount,
                          frequency: rec.frequency as any,
                          dayOfMonth: rec.dayOfMonth || 1,
                          startDate: rec.startDate,
                        });
                        setIsIncomeOpen(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await deleteIncomeMutation.mutateAsync({ id: rec.id });
                        toast.success("Recebimento deletado!");
                        refetchIncome();
                        utils.dashboard.summary.invalidate();
                        utils.dashboard.trend.invalidate();
                        utils.transactions.list.invalidate();
                      }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{frequencyLabel(rec.frequency)} (dia {rec.dayOfMonth})</span>
                  </div>
                  <p className="text-muted-foreground">Próximo: {new Date(rec.nextOccurrence).toLocaleDateString('pt-BR')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Dialog open={isExpenseOpen} onOpenChange={(open) => { setIsExpenseOpen(open); if (!open) resetExpenseForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={resetExpenseForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Cobrança
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpenseId ? "Editar" : "Nova"} Cobrança Recorrente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label>Fornecedor (opcional)</Label>
                  <Select
                    value={expenseForm.supplierId ? String(expenseForm.supplierId) : "none"}
                    onValueChange={(v) => setExpenseForm({ ...expenseForm, supplierId: v === "none" ? 0 : parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input placeholder="Ex: Aluguel escritório" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input placeholder="0.00" type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia do mês</Label>
                    <Input type="number" min="1" max="31" value={expenseForm.dayOfMonth} onChange={(e) => setExpenseForm({ ...expenseForm, dayOfMonth: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={expenseForm.frequency} onValueChange={(v) => setExpenseForm({ ...expenseForm, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="semiannual">Semestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>
                  {(createExpenseMutation.isPending || updateExpenseMutation.isPending) ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {expenses.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowUpCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma cobrança recorrente</h3>
                <p className="text-sm text-muted-foreground">Cadastre despesas fixas como aluguel, assinaturas, etc.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {expenses.map((rec) => (
              <Card key={rec.id} className="hover:-translate-y-0.5 transition-all duration-200">
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm sm:text-lg truncate">{rec.description}</CardTitle>
                        <p className="text-xs sm:text-sm text-red-400 font-medium">R$ {parseFloat(rec.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 sm:gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingExpenseId(rec.id);
                        setExpenseForm({
                          supplierId: rec.supplierId,
                          description: rec.description,
                          amount: rec.amount,
                          frequency: rec.frequency as any,
                          dayOfMonth: rec.dayOfMonth || 1,
                          startDate: rec.startDate,
                          categoryId: rec.categoryId || 0,
                        });
                        setIsExpenseOpen(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await deleteExpenseMutation.mutateAsync({ id: rec.id });
                        toast.success("Cobrança deletada!");
                        refetchExpenses();
                        utils.dashboard.summary.invalidate();
                        utils.dashboard.trend.invalidate();
                        utils.transactions.list.invalidate();
                      }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{frequencyLabel(rec.frequency)} (dia {rec.dayOfMonth})</span>
                  </div>
                  <p className="text-muted-foreground">Próximo: {new Date(rec.nextOccurrence).toLocaleDateString('pt-BR')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
