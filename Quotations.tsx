import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Trash2, FileText, Send, Copy, ArrowRight, Pencil, X, Search,
  ChevronDown, MoreHorizontal, Eye, Download, Link2, Check
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  sortOrder: number;
}

export default function Quotations() {

  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sendEmailDialog, setSendEmailDialog] = useState<{ id: number; email: string } | null>(null);
  const [emailMessage, setEmailMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Form state
  const [form, setForm] = useState({
    number: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientDocument: "",
    validityDays: 15,
    paymentMethod: "",
    paymentConditions: "",
    notes: "",
    bankDetails: "",
    discountType: "fixed" as "fixed" | "percent",
    discountValue: "",
  });
  const [items, setItems] = useState<QuotationItem[]>([
    { description: "", quantity: 1, unitPrice: "", totalPrice: "0", sortOrder: 0 },
  ]);

  // Client autocomplete
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientHighlightedIndex, setClientHighlightedIndex] = useState(-1);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientsQuery = trpc.clients.search.useQuery(
    { query: clientSearch },
    { enabled: clientSearch.length >= 1 }
  );
  const createClientMutation = trpc.clients.create.useMutation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node) &&
        clientInputRef.current && !clientInputRef.current.contains(e.target as Node)
      ) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Queries
  const quotationsQuery = trpc.quotations.list.useQuery({ status: statusFilter });
  const nextNumberQuery = trpc.quotations.getNextNumber.useQuery(undefined, { enabled: view === "form" && !editingId });
  const detailQuery = trpc.quotations.getById.useQuery({ id: viewingId! }, { enabled: !!viewingId });
  const companyQuery = trpc.company.get.useQuery();

  // Mutations
  const createMutation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      toast.success("Orçamento criado!");
      quotationsQuery.refetch();
      setView("list");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.quotations.update.useMutation({
    onSuccess: () => {
      toast.success("Orçamento atualizado!");
      quotationsQuery.refetch();
      setView("list");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      toast.success("Orçamento excluído!");
      quotationsQuery.refetch();
    },
  });
  const duplicateMutation = trpc.quotations.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Orçamento duplicado!");
      quotationsQuery.refetch();
    },
  });
  const statusMutation = trpc.quotations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      quotationsQuery.refetch();
      if (viewingId) detailQuery.refetch();
    },
  });
  const sendEmailMutation = trpc.quotations.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
      setSendEmailDialog(null);
      setEmailMessage("");
      quotationsQuery.refetch();
    },
    onError: (e) => toast.error("Erro ao enviar: " + e.message),
  });
  const convertToJobMutation = trpc.quotations.convertToJob.useMutation({
    onSuccess: (data) => {
      toast.success(`Job #${data.jobId} criado a partir do orçamento`);
      quotationsQuery.refetch();
      setView("list");
    },
    onError: (e) => toast.error(e.message),
  });

  const shareLinkMutation = trpc.quotations.generateShareLink.useMutation();

  function resetForm() {
    setForm({
      number: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientDocument: "",
      validityDays: 15,
      paymentMethod: "",
      paymentConditions: "",
      notes: "",
      bankDetails: "",
      discountType: "fixed",
      discountValue: "",
    });
    setItems([{ description: "", quantity: 1, unitPrice: "", totalPrice: "0", sortOrder: 0 }]);
    setEditingId(null);
    setClientSearch("");
  }

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
  }, [items]);

  const discount = useMemo(() => {
    const val = parseFloat(form.discountValue) || 0;
    if (form.discountType === "percent") return subtotal * val / 100;
    return val;
  }, [form.discountType, form.discountValue, subtotal]);

  const total = subtotal - discount;

  function updateItem(index: number, field: keyof QuotationItem, value: any) {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? value : updated[index].quantity;
        const price = field === "unitPrice" ? parseFloat(value) || 0 : parseFloat(updated[index].unitPrice) || 0;
        updated[index].totalPrice = (qty * price).toFixed(2);
      }
      return updated;
    });
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: "", totalPrice: "0", sortOrder: prev.length }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!form.clientName.trim()) {
      toast.error("Preencha o nome do cliente");
      return;
    }
    if (items.some(i => !i.description.trim())) {
      toast.error("Preencha a descrição de todos os itens");
      return;
    }

    // Auto-create client if not in the system
    if (form.clientName.trim()) {
      const clientResults = clientsQuery.data || [];
      const exactMatch = clientResults.find((c: any) => c.companyName?.toLowerCase() === form.clientName.trim().toLowerCase());
      if (!exactMatch) {
        try {
          await createClientMutation.mutateAsync({
            companyName: form.clientName.trim(),
            email: form.clientEmail || undefined,
            phone: form.clientPhone || undefined,
            cnpj: form.clientDocument || undefined,
          });
        } catch { /* ignore if already exists */ }
      }
    }

    const payload = {
      number: form.number || nextNumberQuery.data || "",
      clientName: form.clientName,
      clientEmail: form.clientEmail || null,
      clientPhone: form.clientPhone || null,
      clientDocument: form.clientDocument || null,
      validityDays: form.validityDays,
      subtotal: subtotal.toFixed(2),
      discountType: form.discountValue ? form.discountType : null,
      discountValue: form.discountValue || null,
      total: total.toFixed(2),
      paymentConditions: form.paymentConditions || null,
      paymentMethod: form.paymentMethod || null,
      notes: form.notes || null,
      bankDetails: form.bankDetails || null,
      items: items.map((item, idx) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice || "0",
        totalPrice: item.totalPrice,
        sortOrder: idx,
      })),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleEdit(quotation: any) {
    setForm({
      number: quotation.number,
      clientName: quotation.clientName || "",
      clientEmail: quotation.clientEmail || "",
      clientPhone: quotation.clientPhone || "",
      clientDocument: quotation.clientDocument || "",
      validityDays: quotation.validityDays || 15,
      paymentMethod: quotation.paymentMethod || "",
      paymentConditions: quotation.paymentConditions || "",
      notes: quotation.notes || "",
      bankDetails: quotation.bankDetails || "",
      discountType: (quotation.discountType as "fixed" | "percent") || "fixed",
      discountValue: quotation.discountValue || "",
    });
    setItems(quotation.items?.length > 0 ? quotation.items.map((i: any) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      sortOrder: i.sortOrder || 0,
    })) : [{ description: "", quantity: 1, unitPrice: "", totalPrice: "0", sortOrder: 0 }]);
    setEditingId(quotation.id);
    setClientSearch(quotation.clientName || "");
    setView("form");
  }

  function handleNew() {
    resetForm();
    setView("form");
  }

  function handleSelectClient(client: any) {
    setForm(prev => ({
      ...prev,
      clientName: client.companyName || client.name || "",
      clientEmail: client.email || "",
      clientPhone: client.phone || "",
      clientDocument: client.cnpj || client.cpf || "",
    }));
    setClientSearch(client.companyName || client.name || "");
    setShowClientDropdown(false);
    setClientHighlightedIndex(-1);
  }

  async function handleCreateAndSelectClient(name: string) {
    try {
      await createClientMutation.mutateAsync({
        companyName: name,
        email: form.clientEmail || undefined,
        phone: form.clientPhone || undefined,
        cnpj: form.clientDocument || undefined,
      });
      setForm(prev => ({ ...prev, clientName: name }));
      setClientSearch(name);
      setShowClientDropdown(false);
      setClientHighlightedIndex(-1);
      toast.success(`Contratante "${name}" cadastrado!`);
    } catch {
      toast.error("Erro ao criar contratante");
    }
  }

  // Filtered list
  const filteredQuotations = useMemo(() => {
    const list = quotationsQuery.data || [];
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((q: any) =>
      q.clientName?.toLowerCase().includes(term) ||
      q.number?.toLowerCase().includes(term)
    );
  }, [quotationsQuery.data, searchTerm]);

  // ─── DETAIL VIEW ───
  if (view === "detail" && viewingId) {
    const q = detailQuery.data;
    if (!q) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setView("list"); setViewingId(null); }}>
            ← Voltar
          </Button>
          <div className="flex gap-2">
            {q.status === "draft" && (
              <Button variant="outline" size="sm" onClick={() => handleEdit(q)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
            {(q.status === "draft" || q.status === "sent") && (
              <Button size="sm" onClick={() => setSendEmailDialog({ id: q.id, email: q.clientEmail || "" })}>
                <Send className="h-4 w-4 mr-1" /> Enviar por Email
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const result = await shareLinkMutation.mutateAsync({ id: q.id });
                const url = `${window.location.origin}/proposta/${result.token}`;
                try {
                  await navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  toast.success("Link copiado! Envie para o cliente.");
                  setTimeout(() => setCopiedLink(false), 2000);
                } catch {
                  // Clipboard API may fail in some contexts
                  prompt("Copie o link abaixo:", url);
                  toast.success("Link gerado com sucesso!");
                }
              } catch (e: any) {
                toast.error(e?.message || "Erro ao gerar link");
              }
            }}>
              {copiedLink ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
              {copiedLink ? "Copiado!" : "Link"}
            </Button>
            {q.status === "sent" && (
              <>
                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => statusMutation.mutate({ id: q.id, status: "approved" })}>
                  Aprovar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: q.id, status: "rejected" })}>
                  Recusar
                </Button>
              </>
            )}
            {q.status === "approved" && !q.jobId && (
              <Button size="sm" onClick={() => convertToJobMutation.mutate({ id: q.id })}>
                <ArrowRight className="h-4 w-4 mr-1" /> Converter em Job
              </Button>
            )}
          </div>
        </div>

        {/* Quotation Preview */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-primary">{companyQuery.data?.nomeFantasia || companyQuery.data?.razaoSocial || "Minha Empresa"}</h2>
                <p className="text-xs text-muted-foreground">
                  {companyQuery.data?.cnpj && `CNPJ: ${companyQuery.data.cnpj}`}
                  {companyQuery.data?.endereco && ` | ${companyQuery.data.endereco}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {companyQuery.data?.email}{companyQuery.data?.telefone && ` | ${companyQuery.data.telefone}`}
                </p>
              </div>
              <div className="text-right">
                {companyQuery.data?.logoUrl && (
                  <img src={companyQuery.data.logoUrl} alt="Logo" className="h-12 object-contain ml-auto mb-1" />
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[q.status] || ""}`}>
                  {statusLabels[q.status] || q.status}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-lg font-bold uppercase tracking-wider text-primary">Orçamento</h1>
              <p className="text-sm text-muted-foreground">
                Nº {q.number} | Emissão: {q.issueDate ? new Date(q.issueDate).toLocaleDateString("pt-BR") : "-"} | Validade: {q.validityDays || 15} dias
              </p>
            </div>

            {/* Client & Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-2">Cliente</h3>
                {q.clientName && <p className="font-medium">{q.clientName}</p>}
                {q.clientDocument && <p className="text-sm text-muted-foreground">CPF/CNPJ: {q.clientDocument}</p>}
                {q.clientEmail && <p className="text-sm text-muted-foreground">{q.clientEmail}</p>}
                {q.clientPhone && <p className="text-sm text-muted-foreground">{q.clientPhone}</p>}
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-2">Condições</h3>
                {q.paymentMethod && <p className="text-sm"><strong>Pagamento:</strong> {q.paymentMethod}</p>}
                {q.paymentConditions && <p className="text-sm">{q.paymentConditions}</p>}
                <p className="text-sm"><strong>Validade:</strong> {q.validityDays || 15} dias</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-2 text-left w-10">#</th>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-center w-16">Qtd</th>
                    <th className="p-2 text-right w-28">Valor Unit.</th>
                    <th className="p-2 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(parseFloat(item.unitPrice))}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(parseFloat(item.totalPrice))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="p-2 text-right text-muted-foreground">Subtotal:</td>
                    <td className="p-2 text-right">{formatCurrency(parseFloat(q.subtotal))}</td>
                  </tr>
                  {q.discountValue && parseFloat(q.discountValue) > 0 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-right text-muted-foreground">
                        Desconto{q.discountType === "percent" ? ` (${q.discountValue}%)` : ""}:
                      </td>
                      <td className="p-2 text-right text-red-500">
                        - {formatCurrency(q.discountType === "percent" ? parseFloat(q.subtotal) * parseFloat(q.discountValue) / 100 : parseFloat(q.discountValue))}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-primary">
                    <td colSpan={4} className="p-2 text-right font-bold text-lg">TOTAL:</td>
                    <td className="p-2 text-right font-bold text-lg text-primary">{formatCurrency(parseFloat(q.total))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {q.notes && (
              <div>
                <h3 className="font-semibold text-sm mb-1">Observações</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{q.notes}</p>
              </div>
            )}

            {/* Bank Details */}
            {q.bankDetails && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-1">Dados Bancários</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{q.bankDetails}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-4 text-center text-xs text-muted-foreground">
              <p>Orçamento válido por {q.validityDays || 15} dias a partir da data de emissão.</p>
              <p className="mt-1">{companyQuery.data?.nomeFantasia || companyQuery.data?.razaoSocial || ""} {companyQuery.data?.cnpj ? `| CNPJ: ${companyQuery.data.cnpj}` : ""}</p>
            </div>
          </CardContent>
        </Card>

        {/* Send Email Dialog */}
        {sendEmailDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Enviar por Email
                  <Button variant="ghost" size="sm" onClick={() => setSendEmailDialog(null)}><X className="h-4 w-4" /></Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email do cliente</label>
                  <Input
                    value={sendEmailDialog.email}
                    onChange={(e) => setSendEmailDialog({ ...sendEmailDialog, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mensagem (opcional)</label>
                  <Textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Olá, segue o orçamento..."
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => sendEmailMutation.mutate({ id: sendEmailDialog.id, email: sendEmailDialog.email, message: emailMessage || undefined })}
                  disabled={sendEmailMutation.isPending || !sendEmailDialog.email}
                >
                  {sendEmailMutation.isPending ? "Enviando..." : "Enviar"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ─── FORM VIEW ───
  if (view === "form") {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{editingId ? "Editar Orçamento" : "Novo Orçamento"}</h1>
          <Button variant="ghost" onClick={() => { setView("list"); resetForm(); }}>← Voltar</Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Number & Validity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Nº Orçamento</label>
                <Input
                  value={form.number || nextNumberQuery.data || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="001/2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Validade (dias)</label>
                <Input
                  type="number"
                  value={form.validityDays}
                  onChange={(e) => setForm(prev => ({ ...prev, validityDays: parseInt(e.target.value) || 15 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <Input
                  value={form.paymentMethod}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  placeholder="PIX, Transferência, Cartão..."
                />
              </div>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Dados do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-sm font-medium">Nome / Empresa</label>
                  <Input
                    ref={clientInputRef}
                    value={clientSearch || form.clientName}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setForm(prev => ({ ...prev, clientName: e.target.value }));
                      setShowClientDropdown(true);
                      setClientHighlightedIndex(-1);
                    }}
                    onFocus={() => { if (clientSearch.length >= 1) setShowClientDropdown(true); setClientHighlightedIndex(-1); }}
                    onKeyDown={(e) => {
                      if (!showClientDropdown || clientSearch.length < 1) return;
                      const results = clientsQuery.data || [];
                      const hasCreate = !results.find((c: any) => c.companyName?.toLowerCase() === clientSearch.trim().toLowerCase()) && clientSearch.trim();
                      const totalItems = results.length + (hasCreate ? 1 : 0);
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setClientHighlightedIndex(prev => (prev + 1) % totalItems);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setClientHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
                      } else if (e.key === "Enter" && clientHighlightedIndex >= 0) {
                        e.preventDefault();
                        if (clientHighlightedIndex < results.length) {
                          handleSelectClient(results[clientHighlightedIndex]);
                        } else if (hasCreate) {
                          handleCreateAndSelectClient(clientSearch.trim());
                        }
                        setClientHighlightedIndex(-1);
                      } else if (e.key === "Escape") {
                        setShowClientDropdown(false);
                        setClientHighlightedIndex(-1);
                      }
                    }}
                    placeholder="Buscar ou criar contratante..."
                  />
                  {showClientDropdown && clientSearch.length >= 1 && (
                    <div ref={clientDropdownRef} className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {clientsQuery.isLoading && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                      )}
                      {(clientsQuery.data || []).map((client: any, idx: number) => (
                        <button
                          key={client.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${clientHighlightedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                          onClick={() => handleSelectClient(client)}
                        >
                          {client.companyName || client.name}
                          {client.cnpj && <span className="text-xs text-muted-foreground ml-2">{client.cnpj}</span>}
                        </button>
                      ))}
                      {!(clientsQuery.data || []).find((c: any) => c.companyName?.toLowerCase() === clientSearch.trim().toLowerCase()) && clientSearch.trim() && !clientsQuery.isLoading && (
                        <button
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm text-emerald-400 border-t border-border transition-colors ${clientHighlightedIndex === (clientsQuery.data || []).length ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                          onClick={() => handleCreateAndSelectClient(clientSearch.trim())}
                        >
                          + Cadastrar: "{clientSearch.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">CPF/CNPJ</label>
                  <Input
                    value={form.clientDocument}
                    onChange={(e) => setForm(prev => ({ ...prev, clientDocument: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={form.clientEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={form.clientPhone}
                    onChange={(e) => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                    placeholder="(51) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Itens / Serviços</h3>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_60px_100px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Descrição</span>
                  <span className="text-center">Qtd</span>
                  <span className="text-right">Valor Unit.</span>
                  <span className="text-right">Total</span>
                  <span></span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_100px_100px_32px] gap-2 items-center">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Ex: Diária de Fotografia"
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="h-9 text-sm text-center"
                      min={1}
                    />
                    <Input
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-sm text-right"
                    />
                    <div className="h-9 flex items-center justify-end text-sm font-medium px-2 bg-muted/50 rounded-md">
                      {formatCurrency(parseFloat(item.totalPrice) || 0)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-destructive"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount & Total */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-end gap-4">
                <span className="text-sm text-muted-foreground">Subtotal:</span>
                <span className="text-sm font-medium w-28 text-right">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground">Desconto:</span>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value as "fixed" | "percent" }))}
                  className="h-8 text-xs border rounded px-2 bg-background"
                >
                  <option value="fixed">R$</option>
                  <option value="percent">%</option>
                </select>
                <Input
                  value={form.discountValue}
                  onChange={(e) => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                  placeholder="0"
                  className="h-8 w-20 text-sm text-right"
                />
                {discount > 0 && <span className="text-sm text-red-500 w-28 text-right">- {formatCurrency(discount)}</span>}
              </div>
              <div className="flex items-center justify-end gap-4 border-t pt-2">
                <span className="text-lg font-bold">TOTAL:</span>
                <span className="text-lg font-bold text-primary w-28 text-right">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Conditions & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Condições de Pagamento</label>
                <Textarea
                  value={form.paymentConditions}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentConditions: e.target.value }))}
                  placeholder="Ex: 50% na aprovação, 50% na entrega"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dados Bancários</label>
                <Textarea
                  value={form.bankDetails}
                  onChange={(e) => setForm(prev => ({ ...prev, bankDetails: e.target.value }))}
                  placeholder="PIX: 00.000.000/0001-00&#10;Banco: ...&#10;Ag: ... CC: ..."
                  rows={3}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Escopo do trabalho, condições especiais..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setView("list"); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Orçamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus orçamentos profissionais</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou número..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "draft", "sent", "approved", "rejected"].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s === "all" ? "Todos" : statusLabels[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {quotationsQuery.isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredQuotations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
            <Button className="mt-4" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotations.map((q: any) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setViewingId(q.id); setView("detail"); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{q.number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[q.status] || ""}`}>
                        {statusLabels[q.status] || q.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {q.clientName || "Sem cliente"} • {q.issueDate ? new Date(q.issueDate).toLocaleDateString("pt-BR") : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{formatCurrency(parseFloat(q.total))}</span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => duplicateMutation.mutate({ id: q.id })} title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {q.status === "draft" && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: q.id })} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
