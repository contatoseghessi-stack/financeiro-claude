import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ArrowRight, Trash2, Edit, ChevronLeft, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(typeof value === "string" ? parseFloat(value) : value);

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  sent: { label: "Enviado", color: "bg-blue-500/20 text-blue-400" },
  approved: { label: "Aprovado", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { label: "Recusado", color: "bg-red-500/20 text-red-400" },
};

export default function Quotes() {
  // ALL hooks must be called before any conditional returns
  const { canUseFeature } = usePlan();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string | undefined>();

  const { data: quotes, refetch } = trpc.quotes.list.useQuery(filter ? { status: filter } : undefined);
  const { data: clients } = trpc.clients.list.useQuery();

  // Conditional returns AFTER all hooks
  if (!canUseFeature("quotes")) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <UpgradePrompt feature="Orçamentos" requiredPlan="pro" description="Crie orçamentos profissionais, envie para contratantes e converta em jobs automaticamente." />
      </div>
    );
  }

  if (selectedId) {
    return <QuoteDetail id={selectedId} onBack={() => { setSelectedId(null); refetch(); }} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Crie propostas comerciais e converta em Jobs</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[undefined, "draft", "sent", "approved", "rejected"].map(s => (
          <Button
            key={s || "all"}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s ? statusMap[s].label : "Todos"}
          </Button>
        ))}
      </div>

      {/* List */}
      {(!quotes || quotes.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum orçamento encontrado</p>
            <p className="text-sm">Crie seu primeiro orçamento clicando no botão acima</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {quotes.map(q => (
            <Card key={q.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedId(q.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{q.title}</p>
                    <p className="text-sm text-muted-foreground">{q.clientName || "Sem cliente"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={statusMap[q.status]?.color || ""}>{statusMap[q.status]?.label || q.status}</Badge>
                  <p className="font-bold text-lg">{formatCurrency(q.totalAmount || 0)}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateQuoteDialog open={showCreate} onClose={() => setShowCreate(false)} clients={clients || []} onCreated={(id) => { setShowCreate(false); refetch(); setSelectedId(id); }} />
    </div>
  );
}

function CreateQuoteDialog({ open, onClose, clients, onCreated }: { open: boolean; onClose: () => void; clients: any[]; onCreated: (id: number) => void }) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<number | undefined>();
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");

  const createMut = trpc.quotes.create.useMutation({
    onSuccess: (data) => {
      toast.success("Orçamento criado!");
      setTitle(""); setClientId(undefined); setClientName(""); setDescription("");
      onCreated(data.id);
    },
    onError: () => toast.error("Erro ao criar orçamento"),
  });

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Cobertura Evento Corporativo" />
          </div>
          <div>
            <label className="text-sm font-medium">Cliente</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={clientId || ""}
              onChange={e => {
                const id = e.target.value ? parseInt(e.target.value) : undefined;
                setClientId(id);
                const cl = clients.find(c => c.id === id);
                setClientName(cl?.companyName || "");
              }}
            >
              <option value="">Selecionar cliente (opcional)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes do serviço proposto..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createMut.mutate({ title, clientId, clientName: selectedClient?.companyName || clientName, description })} disabled={!title || createMut.isPending}>
            {createMut.isPending ? "Criando..." : "Criar Orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuoteDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: quote, refetch } = trpc.quotes.getById.useQuery({ id });
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState("");
  const [editStatus, setEditStatus] = useState(false);

  const addItemMut = trpc.quotes.items.create.useMutation({
    onSuccess: () => { toast.success("Item adicionado!"); refetch(); setShowAddItem(false); setItemDesc(""); setItemQty(1); setItemPrice(""); },
    onError: () => toast.error("Erro ao adicionar item"),
  });
  const deleteItemMut = trpc.quotes.items.delete.useMutation({
    onSuccess: () => { toast.success("Item removido!"); refetch(); },
  });
  const updateStatusMut = trpc.quotes.update.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); setEditStatus(false); },
  });
  const convertMut = trpc.quotes.convertToJob.useMutation({
    onSuccess: () => { toast.success("Orçamento convertido em Job!"); refetch(); },
    onError: () => toast.error("Erro ao converter"),
  });
  const deleteMut = trpc.quotes.delete.useMutation({
    onSuccess: () => { toast.success("Orçamento excluído!"); onBack(); },
  });

  if (!quote) return <div className="p-6"><p>Carregando...</p></div>;

  const subtotal = parseFloat(String(itemPrice || "0")) * itemQty;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{quote.title}</h1>
          <p className="text-sm text-muted-foreground">{quote.clientName || "Sem cliente"}</p>
        </div>
        <Badge className={statusMap[quote.status]?.color || ""}>{statusMap[quote.status]?.label}</Badge>
      </div>

      {quote.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{quote.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          <Button size="sm" onClick={() => setShowAddItem(true)} className="gap-1"><Plus className="h-3 w-3" /> Adicionar Item</Button>
        </CardHeader>
        <CardContent>
          {quote.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item adicionado. Adicione itens como diárias, edição, equipamento, etc.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-5">Descrição</div>
                <div className="col-span-2 text-right">Qtd</div>
                <div className="col-span-2 text-right">Valor Unit.</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>
              {quote.items.map((item: any) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-sm py-2 border-b border-border/50">
                  <div className="col-span-5">{item.description}</div>
                  <div className="col-span-2 text-right">{item.quantity}</div>
                  <div className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</div>
                  <div className="col-span-2 text-right font-medium">{formatCurrency(item.subtotal)}</div>
                  <div className="col-span-1 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItemMut.mutate({ id: item.id })}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-3">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(quote.totalAmount || 0)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Ex: Diária de filmagem" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input type="number" min={1} value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="text-sm font-medium">Valor Unitário (R$)</label>
                <Input value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {subtotal > 0 && (
              <p className="text-sm text-muted-foreground">Subtotal: <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
            <Button
              disabled={!itemDesc || !itemPrice || addItemMut.isPending}
              onClick={() => addItemMut.mutate({
                quoteId: id,
                description: itemDesc,
                quantity: itemQty,
                unitPrice: parseFloat(itemPrice).toFixed(2),
                subtotal: subtotal.toFixed(2),
              })}
            >
              {addItemMut.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {quote.status === "draft" && (
          <Button variant="outline" onClick={() => updateStatusMut.mutate({ id, status: "sent" })}>
            Marcar como Enviado
          </Button>
        )}
        {quote.status === "sent" && (
          <>
            <Button onClick={() => updateStatusMut.mutate({ id, status: "approved" })} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              Aprovar
            </Button>
            <Button variant="outline" onClick={() => updateStatusMut.mutate({ id, status: "rejected" })} className="text-red-500 border-red-500/30">
              Recusar
            </Button>
          </>
        )}
        {quote.status === "approved" && !quote.convertedJobId && (
          <Button onClick={() => convertMut.mutate({ id })} className="gap-2" disabled={convertMut.isPending}>
            <Briefcase className="h-4 w-4" /> Converter em Job
          </Button>
        )}
        {quote.convertedJobId && (
          <Badge className="bg-emerald-500/20 text-emerald-400 text-sm py-1.5 px-3">
            Convertido em Job #{quote.convertedJobId}
          </Badge>
        )}
        <Button variant="outline" className="text-red-500 border-red-500/30 ml-auto" onClick={() => {
          if (confirm("Tem certeza que deseja excluir este orçamento?")) deleteMut.mutate({ id });
        }}>
          <Trash2 className="h-4 w-4 mr-1" /> Excluir
        </Button>
      </div>
    </div>
  );
}
