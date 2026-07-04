import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, X, ShoppingBag, Calendar, DollarSign, Hash, ChevronRight } from "lucide-react";

export default function Installments() {
  const [showForm, setShowForm] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"all" | "pj" | "pf">("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; groupId: string; description: string }>({ open: false, groupId: "", description: "" });
  const [deleteScope, setDeleteScope] = useState<"future" | "all">("future");
  const [form, setForm] = useState({
    description: "",
    totalAmount: "",
    installments: "3",
    type: "expense" as "income" | "expense",
    scope: "pf" as "pj" | "pf",
    cardId: "",
    categoryId: "",
    firstDate: new Date().toISOString().split("T")[0],
  });

  const cards = trpc.cards.list.useQuery();
  const categories = trpc.categories.list.useQuery();
  const groups = trpc.transactions.installmentGroups.useQuery(
    scopeFilter !== "all" ? { scope: scopeFilter } : undefined
  );

  const createMutation = trpc.transactions.createInstallment.useMutation({
    onSuccess: (data) => {
      toast.success(`Parcelamento criado! ${data.count} parcelas geradas.`);
      setShowForm(false);
      setForm({ description: "", totalAmount: "", installments: "3", type: "expense", scope: "pf", cardId: "", categoryId: "", firstDate: new Date().toISOString().split("T")[0] });
      groups.refetch();
    },
    onError: (err) => toast.error(`Erro ao criar parcelamento: ${err.message}`),
  });

  const deleteAllMutation = trpc.transactions.deleteInstallmentGroup.useMutation({
    onSuccess: () => {
      toast.success("Todas as parcelas foram excluídas");
      groups.refetch();
      setDeleteDialog({ open: false, groupId: "", description: "" });
    },
  });

  const deleteFutureMutation = trpc.transactions.deleteInstallmentGroupFuture.useMutation({
    onSuccess: () => {
      toast.success("Parcelas futuras excluídas (as já pagas foram mantidas)");
      groups.refetch();
      setDeleteDialog({ open: false, groupId: "", description: "" });
    },
  });

  const handleDelete = () => {
    if (deleteScope === "all") {
      deleteAllMutation.mutate({ groupId: deleteDialog.groupId });
    } else {
      deleteFutureMutation.mutate({ groupId: deleteDialog.groupId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.totalAmount || !form.firstDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createMutation.mutate({
      description: form.description,
      totalAmount: form.totalAmount,
      installments: parseInt(form.installments),
      type: form.type,
      scope: form.scope,
      cardId: form.cardId ? parseInt(form.cardId) : null,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      firstDate: new Date(form.firstDate + "T12:00:00").getTime(),
    });
  };

  const perInstallment = useMemo(() => {
    const total = parseFloat(form.totalAmount);
    const n = parseInt(form.installments);
    if (!total || !n || n < 2) return 0;
    return Math.round((total / n) * 100) / 100;
  }, [form.totalAmount, form.installments]);

  const totalPending = useMemo(() => {
    if (!groups.data) return 0;
    return groups.data.reduce((sum, g) => {
      const remaining = (g.installmentTotal || 0) - (Number(g.paidCount) || 0);
      const perInst = parseFloat(String(g.totalAmount)) / (g.installmentTotal || 1);
      return sum + remaining * perInst;
    }, 0);
  }, [groups.data]);

  const totalActive = groups.data?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compras Parceladas</h1>
          <p className="text-sm text-zinc-400 mt-1">Gerencie suas compras parceladas PF e PJ</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#EE770E] hover:bg-[#d66a0d] text-white">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? "Cancelar" : "Novo Parcelamento"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#EE770E]/10">
                <ShoppingBag className="w-5 h-5 text-[#EE770E]" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Parcelamentos Ativos</p>
                <p className="text-xl font-bold text-white">{totalActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total a Pagar</p>
                <p className="text-xl font-bold text-red-400">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-700/50">
                <Calendar className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Filtro</p>
                <div className="flex gap-1 mt-1">
                  {(["all", "pj", "pf"] as const).map((s) => (
                    <button key={s} onClick={() => setScopeFilter(s)} className={`px-2 py-0.5 text-xs rounded ${scopeFilter === s ? "bg-[#EE770E] text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                      {s === "all" ? "Todos" : s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Novo Parcelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Descrição *</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: MacBook Pro, Câmera Canon R6..." className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Valor Total (R$) *</Label>
                  <Input value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="Ex: 12000.00" className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Número de Parcelas *</Label>
                  <Input type="number" min="2" max="60" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Data da 1ª Parcela *</Label>
                  <Input type="date" value={form.firstDate} onChange={(e) => setForm({ ...form, firstDate: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Escopo</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as any })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pf">PF (Pessoal)</SelectItem>
                      <SelectItem value="pj">PJ (Empresa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Cartão (opcional)</Label>
                  <Select value={form.cardId} onValueChange={(v) => setForm({ ...form, cardId: v })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nenhum</SelectItem>
                      {cards.data?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.type.toUpperCase()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Categoria (opcional)</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nenhuma</SelectItem>
                      {categories.data?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {perInstallment > 0 && (
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-[#EE770E]" />
                    <span className="text-sm font-medium text-white">Preview do Parcelamento</span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    <span className="font-bold text-[#EE770E]">{form.installments}x</span> de{" "}
                    <span className="font-bold text-white">R$ {perInstallment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    {" "}= Total{" "}
                    <span className="font-bold text-white">R$ {parseFloat(form.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    De {new Date(form.firstDate + "T12:00:00").toLocaleDateString("pt-BR")} até{" "}
                    {(() => { const d = new Date(form.firstDate + "T12:00:00"); d.setMonth(d.getMonth() + parseInt(form.installments) - 1); return d.toLocaleDateString("pt-BR"); })()}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700 text-zinc-300">Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-[#EE770E] hover:bg-[#d66a0d] text-white">
                  {createMutation.isPending ? "Criando..." : "Criar Parcelamento"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Installment Groups List */}
      <div className="space-y-3">
        {groups.isLoading && <div className="text-center py-8 text-zinc-500">Carregando...</div>}

        {groups.data && groups.data.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Nenhum parcelamento encontrado</p>
              <p className="text-xs text-zinc-600 mt-1">Clique em &quot;Novo Parcelamento&quot; para começar</p>
            </CardContent>
          </Card>
        )}

        {groups.data?.map((group) => {
          const total = parseFloat(String(group.totalAmount));
          const paid = Number(group.paidCount) || 0;
          const totalInst = group.installmentTotal || 1;
          const remaining = totalInst - paid;
          const perInst = total / totalInst;
          const progress = (paid / totalInst) * 100;
          const cardName = cards.data?.find((c) => c.id === group.cardId)?.name;
          const catName = categories.data?.find((c) => c.id === group.categoryId)?.name;

          return (
            <Card key={group.installmentGroupId} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${group.scope === "pj" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {group.scope?.toUpperCase()}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${group.type === "expense" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                        {group.type === "expense" ? "Despesa" : "Receita"}
                      </span>
                      {cardName && <span className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400">{cardName}</span>}
                      {catName && <span className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400">{catName}</span>}
                    </div>
                    <h3 className="text-white font-medium">{group.description}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-zinc-400">Total: <span className="text-white font-medium">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></span>
                      <span className="text-zinc-400">Parcela: <span className="text-white font-medium">R$ {perInst.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#EE770E] rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400 whitespace-nowrap">{paid}/{totalInst}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                      <span>
                        {new Date(Number(group.firstDate)).toLocaleDateString("pt-BR")}
                        <ChevronRight className="w-3 h-3 inline mx-1" />
                        {new Date(Number(group.lastDate)).toLocaleDateString("pt-BR")}
                      </span>
                      {remaining > 0 && <span className="text-amber-400">Faltam {remaining} parcela{remaining > 1 ? "s" : ""} (R$ {(remaining * perInst).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</span>}
                      {remaining === 0 && <span className="text-green-400">Quitado!</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeleteScope("future");
                      setDeleteDialog({ open: true, groupId: group.installmentGroupId!, description: group.description || "este parcelamento" });
                    }}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Excluir Parcelamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-300">
              O que deseja fazer com <span className="font-medium text-white">&quot;{deleteDialog.description}&quot;</span>?
            </p>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deleteScope === "future" ? "border-[#EE770E] bg-[#EE770E]/5" : "border-zinc-700 hover:border-zinc-600"}`}>
                <input type="radio" name="deleteScope" value="future" checked={deleteScope === "future"} onChange={() => setDeleteScope("future")} className="mt-0.5 accent-[#EE770E]" />
                <div>
                  <p className="text-sm font-medium text-white">Excluir parcelas futuras</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Mantém as parcelas já pagas e remove apenas as que ainda não venceram</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deleteScope === "all" ? "border-red-500 bg-red-500/5" : "border-zinc-700 hover:border-zinc-600"}`}>
                <input type="radio" name="deleteScope" value="all" checked={deleteScope === "all"} onChange={() => setDeleteScope("all")} className="mt-0.5 accent-red-500" />
                <div>
                  <p className="text-sm font-medium text-white">Excluir todas as parcelas</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Remove o parcelamento inteiro, incluindo parcelas já pagas</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, groupId: "", description: "" })} className="border-zinc-700 text-zinc-300">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteAllMutation.isPending || deleteFutureMutation.isPending}
              className={deleteScope === "all" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#EE770E] hover:bg-[#d66a0d] text-white"}
            >
              {(deleteAllMutation.isPending || deleteFutureMutation.isPending) ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
