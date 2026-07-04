import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tag, ChevronLeft, ChevronRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Categorias() {
  const { data: categories, isLoading: catsLoading } = trpc.categories.list.useQuery();
  const { data: cardsData } = trpc.cards.list.useQuery();
  const utils = trpc.useUtils();

  // Month navigation state
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Scope filter: "all" | "pj" | "pf"
  const [scopeFilter, setScopeFilter] = useState<"all" | "pj" | "pf">("all");

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).getTime();
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  const monthName = `${MONTH_FULL[selectedMonth]} de ${selectedYear}`;

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Dashboard data for category summary
  const { data: dashboard, isLoading: dashLoading } = trpc.dashboard.summary.useQuery({ startDate, endDate });

  // Drill-down state
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const selectedCatName = useMemo(() => {
    if (selectedCatId === null) return "";
    if (selectedCatId === 0) return "Sem categoria";
    return categories?.find(c => c.id === selectedCatId)?.name || "Categoria";
  }, [selectedCatId, categories]);

  // Query transactions for the selected category
  const { data: catTx, isLoading: catTxLoading } = trpc.transactions.list.useQuery(
    {
      categoryId: selectedCatId === 0 ? undefined : (selectedCatId || undefined),
      scope: scopeFilter !== "all" ? scopeFilter : undefined,
      type: "expense" as const,
      startDate,
      endDate,
      limit: 500,
    },
    { enabled: selectedCatId !== null }
  );

  // For "Sem categoria" we need to filter client-side since categoryId=undefined returns all
  const filteredTx = useMemo(() => {
    if (!catTx?.items) return [];
    if (selectedCatId === 0) {
      return catTx.items.filter((tx: any) => !tx.categoryId);
    }
    return catTx.items;
  }, [catTx, selectedCatId]);

  // Update transaction category mutation
  const updateTx = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada!");
      utils.transactions.list.invalidate();
      utils.dashboard.summary.invalidate();
    },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });

  const handleChangeCategory = (txId: number, newCatId: string) => {
    const catIdNum = newCatId === "none" ? null : parseInt(newCatId);
    updateTx.mutate({ id: txId, categoryId: catIdNum });
  };

  // Category CRUD
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "", color: "#8b5cf6" });
  const [editId, setEditId] = useState<number | null>(null);

  const createCat = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada!");
      setAddOpen(false);
      setForm({ name: "", icon: "", color: "#8b5cf6" });
      utils.categories.list.invalidate();
    },
    onError: () => toast.error("Erro ao criar categoria"),
  });

  const updateCat = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada!");
      setEditOpen(false);
      utils.categories.list.invalidate();
    },
  });

  const deleteCat = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Categoria removida");
      utils.categories.list.invalidate();
    },
  });

  const openEdit = (cat: { id: number; name: string; icon: string | null; color: string | null }) => {
    setEditId(cat.id);
    setForm({ name: cat.name, icon: cat.icon || "", color: cat.color || "#8b5cf6" });
    setEditOpen(true);
  };

  // Build category spending data with scope filter
  const categorySpending = useMemo(() => {
    if (!dashboard?.byCategory || !categories) return [];

    // Group by categoryId, filtering by scope
    const grouped: Record<number, { total: number; count: number }> = {};
    for (const bc of dashboard.byCategory as any[]) {
      if (scopeFilter !== "all" && bc.scope !== scopeFilter) continue;
      const catId = bc.categoryId || 0;
      if (!grouped[catId]) grouped[catId] = { total: 0, count: 0 };
      grouped[catId].total += parseFloat(String(bc.total || 0));
      grouped[catId].count += (bc.count || 0);
    }

    const result = Object.entries(grouped).map(([idStr, data]) => {
      const id = parseInt(idStr);
      const cat = categories.find(c => c.id === id);
      return {
        id,
        name: cat?.name || "Sem categoria",
        icon: cat?.icon || null,
        color: cat?.color || "#6b7280",
        total: data.total,
        count: data.count,
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    return result;
  }, [dashboard, categories, scopeFilter]);

  const totalSpending = categorySpending.reduce((sum, c) => sum + c.total, 0);
  const maxSpending = categorySpending.length > 0 ? categorySpending[0].total : 1;

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight capitalize min-w-[220px] text-center">{monthName}</h1>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Scope filter */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setScopeFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scopeFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setScopeFilter("pj")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scopeFilter === "pj" ? "bg-violet-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              PJ
            </button>
            <button
              onClick={() => setScopeFilter("pf")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scopeFilter === "pf" ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              PF
            </button>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); createCat.mutate(form); }} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Alimentação" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Ícone (emoji)</Label>
                  <Input placeholder="🍔" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
                </div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-10 rounded cursor-pointer border-0" />
                    <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createCat.isPending}>
                  {createCat.isPending ? "Criando..." : "Criar Categoria"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Categoria</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (editId) updateCat.mutate({ id: editId, ...form }); }} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Ícone (emoji)</Label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-10 rounded cursor-pointer border-0" />
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateCat.isPending}>Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drill-down Sheet */}
      <Sheet open={selectedCatId !== null} onOpenChange={(open) => { if (!open) setSelectedCatId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              </div>
              {selectedCatName} — {MONTH_FULL[selectedMonth]}
              {scopeFilter !== "all" && (
                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${scopeFilter === "pj" ? "bg-violet-500/20 text-violet-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {scopeFilter.toUpperCase()}
                </span>
              )}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {catTxLoading ? "Carregando..." : `${filteredTx.length} transaç${filteredTx.length !== 1 ? "ões" : "ão"}`}
              {filteredTx.length > 0 && (
                <> — Total: <span className="text-red-400 font-semibold">
                  {formatCurrency(filteredTx.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0))}
                </span></>
              )}
            </p>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4 space-y-2">
              {catTxLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>
              ) : filteredTx.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma transação nesta categoria neste mês
                </p>
              ) : (
                filteredTx.map((tx: any) => {
                  const cardName = cardsData?.find((c: any) => c.id === tx.cardId)?.name;
                  const currentCatId = tx.categoryId ? String(tx.categoryId) : "none";
                  return (
                    <div key={tx.id} className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-red-500/10">
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tx.description}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tx.scope === "pj" ? "bg-violet-500/10 text-violet-400" : "bg-amber-500/10 text-amber-400"}`}>
                                {tx.scope === "pj" ? "PJ" : "PF"}
                              </span>
                              {cardName && <span>{cardName}</span>}
                              <span>{new Date(tx.date).toLocaleDateString("pt-BR")}</span>
                              {tx.source === "telegram" && <span className="text-blue-400">via Telegram</span>}
                              {tx.source === "recurring" && <span className="text-purple-400">recorrente</span>}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap text-red-400">
                          -{formatCurrency(parseFloat(tx.amount))}
                        </p>
                      </div>
                      {/* Category change selector */}
                      <div className="flex items-center gap-2 pl-12">
                        <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Select
                          value={currentCatId}
                          onValueChange={(val) => handleChangeCategory(tx.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs w-full bg-background/50">
                            <SelectValue placeholder="Selecionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem categoria</SelectItem>
                            {categories?.map(cat => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo">Resumo do Mês</TabsTrigger>
          <TabsTrigger value="gerenciar">Gerenciar Categorias</TabsTrigger>
        </TabsList>

        {/* Monthly Summary Tab */}
        <TabsContent value="resumo" className="space-y-4">
          {/* Total Card */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total de Despesas {scopeFilter !== "all" && <span className="font-medium">({scopeFilter.toUpperCase()})</span>}
                  </p>
                  <p className="text-3xl font-bold text-red-400">{formatCurrency(totalSpending)}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {categorySpending.length} categoria(s) com gastos
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {dashLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>
              ))}
            </div>
          ) : categorySpending.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-8 text-center">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma despesa {scopeFilter !== "all" ? `${scopeFilter.toUpperCase()} ` : ""}categorizada neste mês</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {categorySpending.map((cat) => {
                const pct = totalSpending > 0 ? (cat.total / totalSpending) * 100 : 0;
                const barPct = (cat.total / maxSpending) * 100;
                return (
                  <Card
                    key={cat.id || "none"}
                    className="border-border/50 bg-card/80 backdrop-blur hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedCatId(cat.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + "20" }}>
                            {cat.icon || <Tag className="h-4 w-4" style={{ color: cat.color }} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">{cat.count} transaç{cat.count !== 1 ? "ões" : "ão"} — {pct.toFixed(1)}% do total</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold" style={{ color: cat.color }}>{formatCurrency(cat.total)}</p>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: cat.color }} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Manage Categories Tab */}
        <TabsContent value="gerenciar" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catsLoading ? (
              [1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)
            ) : categories?.length === 0 ? (
              <Card className="col-span-full border-border/50 bg-card/80">
                <CardContent className="p-8 text-center">
                  <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma categoria criada</p>
                </CardContent>
              </Card>
            ) : (
              categories?.map(cat => (
                <Card key={cat.id} className="border-border/50 bg-card/80 backdrop-blur group hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: (cat.color || "#8b5cf6") + "20" }}>
                          {cat.icon || <Tag className="h-4 w-4" style={{ color: cat.color || "#8b5cf6" }} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cat.name}</p>
                          {cat.isDefault && <p className="text-[10px] text-muted-foreground">Padrão</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!cat.isDefault && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
                                <AlertDialogDescription>Transações com esta categoria não serão removidas.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCat.mutate({ id: cat.id })}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
