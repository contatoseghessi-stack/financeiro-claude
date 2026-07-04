import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Search, Filter, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Transacoes() {
  const [filters, setFilters] = useState<{
    scope?: "pj" | "pf"; type?: "income" | "expense"; cardId?: number; categoryId?: number;
  }>({});
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.transactions.list.useQuery({
    ...filters,
    limit: 100,
  });
  const { data: cardsData } = trpc.cards.list.useQuery();
  const { data: categoriesData } = trpc.categories.list.useQuery();

  const utils = trpc.useUtils();
  const deleteTx = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Transação removida");
      utils.transactions.list.invalidate();
      utils.dashboard.summary.invalidate();
    },
  });

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!search) return data.items;
    return data.items.filter(tx => tx.description.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const getCardName = (cardId: number | null) => {
    if (!cardId || !cardsData) return "";
    return cardsData.find(c => c.id === cardId)?.name || "";
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId || !categoriesData) return "";
    return categoriesData.find(c => c.id === categoryId)?.name || "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Transações</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Histórico completo de receitas e despesas</p>
      </div>

      {/* Filters */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
              <Select value={filters.scope || "all"} onValueChange={v => setFilters(f => ({ ...f, scope: v === "all" ? undefined : v as any }))}>
                <SelectTrigger className="w-[100px] sm:w-[140px] h-9 shrink-0"><SelectValue placeholder="Escopo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="pf">PF</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.type || "all"} onValueChange={v => setFilters(f => ({ ...f, type: v === "all" ? undefined : v as any }))}>
                <SelectTrigger className="w-[110px] sm:w-[140px] h-9 shrink-0"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.cardId ? String(filters.cardId) : "all"} onValueChange={v => setFilters(f => ({ ...f, cardId: v === "all" ? undefined : parseInt(v) }))}>
                <SelectTrigger className="w-[130px] sm:w-[180px] h-9 shrink-0"><SelectValue placeholder="Cartão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {cardsData?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {filtered.length} transação{filtered.length !== 1 ? "ões" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
          ) : (
            filtered.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-all duration-150 hover:translate-x-0.5 group">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {tx.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${tx.scope === "pj" ? "bg-violet-500/10 text-violet-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {tx.scope === "pj" ? "PJ" : "PF"}
                      </span>
                      {getCardName(tx.cardId) && <span className="hidden sm:inline">{getCardName(tx.cardId)}</span>}
                      {getCategoryName(tx.categoryId) && <span className="hidden sm:inline">{getCategoryName(tx.categoryId)}</span>}
                      <span>{new Date(tx.date).toLocaleDateString("pt-BR")}</span>
                      {tx.source === "telegram" && <span className="text-blue-400">Telegram</span>}
                      {tx.source === "recurring" && <span className="text-purple-400">🔄</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                  <p className={`text-xs sm:text-sm font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(tx.amount))}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover transação?</AlertDialogTitle>
                        <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTx.mutate({ id: tx.id })}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
