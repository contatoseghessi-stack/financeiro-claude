import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, RotateCcw, Calendar,
  FileText, Receipt, Users, BarChart3, Edit2, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const RECENT_STORAGE_KEY = "workdays_recent_fields";
const MAX_RECENT = 2;

function getRecentValues(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveRecentValue(field: string, value: string) {
  if (!value.trim()) return;
  const recent = getRecentValues();
  const list = recent[field] || [];
  // Remove duplicates (case-insensitive) and add to front
  const filtered = list.filter(v => v.toLowerCase() !== value.trim().toLowerCase());
  recent[field] = [value.trim(), ...filtered].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent)); } catch {}
}

export default function WorkDays() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [billingMonths, setBillingMonths] = useState<{ month: number; year: number }[]>([]);
  const [billingClient, setBillingClient] = useState<string>("");

  // Form state
  const [formClient, setFormClient] = useState("");
  const [formService, setFormService] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");

  // Recent field values (memory)
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [recentValues, setRecentValues] = useState<Record<string, string[]>>(getRecentValues);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [clientHighlightedIndex, setClientHighlightedIndex] = useState(-1);
  const serviceInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const rateDropdownRef = useRef<HTMLDivElement>(null);

  // Client autocomplete state
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const { data: clientResults = [] } = trpc.clients.search.useQuery(
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
      // Close recent value dropdowns
      if (
        serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node) &&
        serviceInputRef.current && !serviceInputRef.current.contains(e.target as Node) &&
        rateDropdownRef.current && !rateDropdownRef.current.contains(e.target as Node) &&
        rateInputRef.current && !rateInputRef.current.contains(e.target as Node)
      ) {
        setFocusedField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const monthName = viewMode === "year" ? String(selectedYear) : `${MONTH_FULL[selectedMonth]} de ${selectedYear}`;

  // Queries
  const { data: workDays = [], refetch: refetchList } = trpc.workDays.list.useQuery(
    viewMode === "year"
      ? { year: selectedYear, clientName: selectedClient || undefined }
      : { month: selectedMonth + 1, year: selectedYear, clientName: selectedClient || undefined }
  );
  const { data: contractors = [], refetch: refetchContractors } = trpc.workDays.contractors.useQuery();
  const { data: summary, refetch: refetchSummary } = trpc.workDays.summary.useQuery({
    startDate: viewMode === "year"
      ? new Date(selectedYear, 0, 1).getTime()
      : new Date(selectedYear, selectedMonth, 1).getTime(),
    endDate: viewMode === "year"
      ? new Date(selectedYear, 11, 31, 23, 59, 59).getTime()
      : new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).getTime(),
  });

  const utils = trpc.useUtils();
  const invalidateAll = () => {
    refetchList();
    refetchContractors();
    refetchSummary();
    utils.dashboard.summary.invalidate();
    utils.transactions.list.invalidate();
  };

  // Mutations
  const createMutation = trpc.workDays.create.useMutation({ onSuccess: () => { invalidateAll(); setShowCreateDialog(false); resetForm(); toast.success("Diária registrada!"); } });
  const updateMutation = trpc.workDays.update.useMutation({ onSuccess: () => { invalidateAll(); setEditingItem(null); toast.success("Diária atualizada!"); } });
  const deleteMutation = trpc.workDays.delete.useMutation({ onSuccess: () => { invalidateAll(); toast.success("Diária excluída!"); } });
  const billingMutation = trpc.workDays.generateBilling.useMutation({
    onSuccess: (data) => {
      invalidateAll();
      setShowBillingDialog(false);
      setBillingMonths([]);
      toast.success(`Cobrança gerada! ${data.count} diárias = R$ ${data.total.toFixed(2).replace(".", ",")}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const reportMutation = trpc.workDays.generateReport.useMutation({
    onSuccess: (data) => {
      setShowReportDialog(false);
      if (data.pdfUrl) window.open(data.pdfUrl, "_blank");
      toast.success("Relatório gerado!");
    },
    onError: (err) => toast.error(err.message),
  });

  // Navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); }
    else setSelectedMonth(m => m + 1);
  };
  const goToToday = () => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth()); };

  const resetForm = () => {
    setFormClient(""); setFormService(""); setFormRate(""); setFormDate(new Date().toISOString().split("T")[0]); setFormNotes("");
    setClientSearch("");
  };

  const handleSelectClient = (client: { id: number; companyName: string }) => {
    setFormClient(client.companyName);
    setClientSearch(client.companyName);
    setShowClientDropdown(false);
  };

  const handleCreateAndSelectClient = async (name: string) => {
    try {
      await createClientMutation.mutateAsync({ companyName: name });
      setFormClient(name);
      setClientSearch(name);
      setShowClientDropdown(false);
      toast.success(`Contratante "${name}" cadastrado!`);
    } catch {
      toast.error("Erro ao criar contratante");
    }
  };

  const handleCreate = async () => {
    if (!formClient || !formService || !formRate) { toast.error("Preencha todos os campos obrigatórios"); return; }
    // Auto-create client if it doesn't exist in the system
    if (clientSearch.trim() && formClient) {
      const exactMatch = clientResults.find((c: any) => c.companyName.toLowerCase() === formClient.toLowerCase());
      if (!exactMatch) {
        try {
          await createClientMutation.mutateAsync({ companyName: formClient });
        } catch { /* ignore if already exists */ }
      }
    }
    // Save recent values for field memory
    saveRecentValue("serviceType", formService);
    saveRecentValue("dailyRate", formRate);
    setRecentValues(getRecentValues());

    createMutation.mutate({
      clientName: formClient,
      serviceType: formService,
      dailyRate: formRate,
      date: new Date(formDate + "T12:00:00").getTime(),
      notes: formNotes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingItem) return;
    // Save recent values for field memory
    if (formService) saveRecentValue("serviceType", formService);
    if (formRate) saveRecentValue("dailyRate", formRate);
    setRecentValues(getRecentValues());

    updateMutation.mutate({
      id: editingItem.id,
      clientName: formClient || undefined,
      serviceType: formService || undefined,
      dailyRate: formRate || undefined,
      date: formDate ? new Date(formDate + "T12:00:00").getTime() : undefined,
      notes: formNotes,
    });
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormClient(item.clientName);
    setClientSearch(item.clientName);
    setFormService(item.serviceType);
    setFormRate(String(item.dailyRate));
    setFormDate(new Date(item.date).toISOString().split("T")[0]);
    setFormNotes(item.notes || "");
  };

  // Group work days by client for display
  const groupedByClient = useMemo(() => {
    const groups: Record<string, { displayName: string; items: any[] }> = {};
    for (const wd of workDays) {
      const key = wd.clientName.toLowerCase();
      if (!groups[key]) groups[key] = { displayName: wd.clientName, items: [] };
      groups[key].items.push(wd);
    }
    return Object.entries(groups)
      .map(([, v]) => [v.displayName, v.items] as [string, any[]])
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [workDays]);

  // Annual summary by month
  const annualByMonth = useMemo(() => {
    if (viewMode !== "year") return [];
    const months: Record<number, { total: number; count: number }> = {};
    for (const wd of workDays) {
      const m = new Date(wd.date).getMonth();
      if (!months[m]) months[m] = { total: 0, count: 0 };
      months[m].total += parseFloat(wd.dailyRate || "0");
      months[m].count += 1;
    }
    return Array.from({ length: 12 }, (_, i) => ({ month: i, ...(months[i] || { total: 0, count: 0 }) }));
  }, [workDays, viewMode]);

  // Billing month toggle
  const toggleBillingMonth = (month: number, year: number) => {
    setBillingMonths(prev => {
      const exists = prev.find(m => m.month === month && m.year === year);
      if (exists) return prev.filter(m => !(m.month === month && m.year === year));
      return [...prev, { month, year }];
    });
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => viewMode === "year" ? setSelectedYear(y => y - 1) : goToPrevMonth()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <h1 className="text-2xl font-bold tracking-tight capitalize">{monthName}</h1>
            <p className="text-muted-foreground text-sm">Controle de diárias de trabalho</p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => viewMode === "year" ? setSelectedYear(y => y + 1) : goToNextMonth()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {viewMode === "month" && !isCurrentMonth && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={goToToday}>
              <RotateCcw className="h-3 w-3" /> Hoje
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs px-3 h-6">Mensal</TabsTrigger>
              <TabsTrigger value="year" className="text-xs px-3 h-6">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowReportDialog(true)}>
            <FileText className="h-3.5 w-3.5" /> Relatório
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => { setBillingClient(selectedClient || ""); setShowBillingDialog(true); }}>
            <Receipt className="h-3.5 w-3.5" /> Gerar Cobrança
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-3.5 w-3.5" /> Nova Diária
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold text-emerald-500">{formatCurrency(summary?.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Diárias</p>
            <p className="text-xl font-bold text-blue-500">{summary?.count || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Contratantes</p>
            <p className="text-xl font-bold text-purple-500">{summary?.byClient?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Média/Diária</p>
            <p className="text-xl font-bold text-amber-500">
              {summary?.count ? formatCurrency((summary.total || 0) / summary.count) : "R$ 0,00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client Filter */}
      {contractors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedClient === null ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setSelectedClient(null)}
          >
            <Users className="h-3 w-3 mr-1" /> Todos
          </Button>
          {contractors.map((c: any) => (
            <Button
              key={c.clientName}
              variant={selectedClient?.toLowerCase() === c.clientName.toLowerCase() ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setSelectedClient(selectedClient?.toLowerCase() === c.clientName.toLowerCase() ? null : c.clientName)}
            >
              {c.clientName} <Badge variant="secondary" className="ml-1 text-[10px] px-1">{c.count}</Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Annual View */}
      {viewMode === "year" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Resumo Anual por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {annualByMonth.map(({ month, total, count }) => (
                <div
                  key={month}
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                    count > 0 ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => { setViewMode("month"); setSelectedMonth(month); }}
                >
                  <p className="text-xs font-medium text-muted-foreground">{MONTH_SHORT[month]}</p>
                  <p className="text-sm font-bold">{count > 0 ? formatCurrency(total) : "-"}</p>
                  {count > 0 && <p className="text-[10px] text-muted-foreground">{count} diárias</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly View - Grouped by Client */}
      {viewMode === "month" && (
        <>
          {groupedByClient.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma diária registrada</p>
                <p className="text-sm">Clique em "Nova Diária" para começar</p>
              </CardContent>
            </Card>
          ) : (
            groupedByClient.map(([client, items]) => (
              <Card key={client}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{client}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{items.length} diárias</Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {formatCurrency(items.reduce((sum: number, wd: any) => sum + parseFloat(wd.dailyRate || "0"), 0))}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {items.sort((a: any, b: any) => a.date - b.date).map((wd: any) => (
                      <div key={wd.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 group">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-[70px]">{formatDate(wd.date)}</span>
                          <span className="text-sm font-medium">{wd.serviceType}</span>
                          {wd.notes && <span className="text-xs text-muted-foreground hidden md:inline">— {wd.notes}</span>}
                          {wd.status === "invoiced" && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">Faturado</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-500">{formatCurrency(parseFloat(wd.dailyRate))}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEdit(wd)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteMutation.mutate({ id: wd.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingItem} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setEditingItem(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Diária" : "Nova Diária"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium">Contratante *</label>
              <Input
                ref={clientInputRef}
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setFormClient(e.target.value);
                  setShowClientDropdown(true);
                  setClientHighlightedIndex(-1);
                }}
                onFocus={() => { if (clientSearch.length >= 1) setShowClientDropdown(true); setClientHighlightedIndex(-1); }}
                onKeyDown={(e) => {
                  if (!showClientDropdown || clientSearch.length < 1) return;
                  const hasCreate = !clientResults.find((c: any) => c.companyName.toLowerCase() === clientSearch.trim().toLowerCase()) && clientSearch.trim();
                  const totalItems = clientResults.length + (hasCreate ? 1 : 0);
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setClientHighlightedIndex(prev => (prev + 1) % totalItems);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setClientHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
                  } else if (e.key === "Enter" && clientHighlightedIndex >= 0) {
                    e.preventDefault();
                    if (clientHighlightedIndex < clientResults.length) {
                      handleSelectClient(clientResults[clientHighlightedIndex]);
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
                <div ref={clientDropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {clientResults.map((c: any, idx: number) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${clientHighlightedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                      onClick={() => handleSelectClient(c)}
                    >
                      {c.companyName}
                    </button>
                  ))}
                  {!clientResults.find((c: any) => c.companyName.toLowerCase() === clientSearch.trim().toLowerCase()) && clientSearch.trim() && (
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm text-emerald-400 border-t border-border transition-colors ${clientHighlightedIndex === clientResults.length ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                      onClick={() => handleCreateAndSelectClient(clientSearch.trim())}
                    >
                      + Cadastrar: "{clientSearch.trim()}"
                    </button>
                  )}
                  {clientResults.length === 0 && !clientSearch.trim() && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum contratante encontrado</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="text-sm font-medium">Tipo de Serviço *</label>
              <Input
                ref={serviceInputRef}
                value={formService}
                onChange={(e) => { setFormService(e.target.value); setHighlightedIndex(-1); }}
                onFocus={() => { setFocusedField("serviceType"); setHighlightedIndex(-1); }}
                onKeyDown={(e) => {
                  const items = recentValues.serviceType || [];
                  if (focusedField !== "serviceType" || items.length === 0 || formService) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev + 1) % items.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev - 1 + items.length) % items.length);
                  } else if (e.key === "Enter" && highlightedIndex >= 0) {
                    e.preventDefault();
                    setFormService(items[highlightedIndex]);
                    setFocusedField(null);
                    setHighlightedIndex(-1);
                  } else if (e.key === "Escape") {
                    setFocusedField(null);
                    setHighlightedIndex(-1);
                  }
                }}
                placeholder="Ex: Videomaker, Fotógrafo..."
              />
              {focusedField === "serviceType" && (recentValues.serviceType?.length ?? 0) > 0 && !formService && (
                <div ref={serviceDropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Recentes
                  </div>
                  {recentValues.serviceType!.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${highlightedIndex === i ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                      onClick={() => { setFormService(v); setFocusedField(null); setHighlightedIndex(-1); }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-sm font-medium">Valor da Diária *</label>
                <Input
                  ref={rateInputRef}
                  type="number"
                  step="0.01"
                  value={formRate}
                  onChange={(e) => { setFormRate(e.target.value); setHighlightedIndex(-1); }}
                  onFocus={() => { setFocusedField("dailyRate"); setHighlightedIndex(-1); }}
                  onKeyDown={(e) => {
                    const items = recentValues.dailyRate || [];
                    if (focusedField !== "dailyRate" || items.length === 0 || formRate) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex(prev => (prev + 1) % items.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex(prev => (prev - 1 + items.length) % items.length);
                    } else if (e.key === "Enter" && highlightedIndex >= 0) {
                      e.preventDefault();
                      setFormRate(items[highlightedIndex]);
                      setFocusedField(null);
                      setHighlightedIndex(-1);
                    } else if (e.key === "Escape") {
                      setFocusedField(null);
                      setHighlightedIndex(-1);
                    }
                  }}
                  placeholder="0.00"
                />
                {focusedField === "dailyRate" && (recentValues.dailyRate?.length ?? 0) > 0 && !formRate && (
                  <div ref={rateDropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Recentes
                    </div>
                    {recentValues.dailyRate!.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${highlightedIndex === i ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                        onClick={() => { setFormRate(v); setFocusedField(null); setHighlightedIndex(-1); }}
                      >
                        R$ {parseFloat(v).toFixed(2).replace(".", ",")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observações opcionais..." rows={2} />
            </div>
            <Button className="w-full" onClick={editingItem ? handleUpdate : handleCreate} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Salvar Alterações" : "Registrar Diária"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione o contratante e os meses para gerar uma receita no dashboard.</p>
            <div>
              <label className="text-sm font-medium">Contratante *</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={billingClient}
                onChange={(e) => setBillingClient(e.target.value)}
              >
                <option value="">Selecione...</option>
                {contractors.map((c: any) => <option key={c.clientName} value={c.clientName}>{c.clientName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Meses para cobrar *</label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const isSelected = billingMonths.some(m => m.month === i + 1 && m.year === selectedYear);
                  return (
                    <button
                      key={i}
                      className={`p-2 rounded-md text-xs font-medium border transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted/60 border-border"
                      }`}
                      onClick={() => toggleBillingMonth(i + 1, selectedYear)}
                    >
                      {MONTH_SHORT[i]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ano: {selectedYear}</p>
            </div>
            {billingMonths.length > 0 && billingClient && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <p className="text-sm font-medium text-emerald-500">
                  {billingMonths.length} {billingMonths.length === 1 ? "mês" : "meses"} selecionado{billingMonths.length > 1 ? "s" : ""} para {billingClient}
                </p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => billingMutation.mutate({ clientName: billingClient, months: billingMonths })}
              disabled={!billingClient || billingMonths.length === 0 || billingMutation.isPending}
            >
              {billingMutation.isPending ? "Gerando..." : "Gerar Cobrança como Receita"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar Relatório de Diárias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-20 flex-col gap-1"
                onClick={() => reportMutation.mutate({
                  type: "monthly",
                  month: selectedMonth + 1,
                  year: selectedYear,
                  clientName: selectedClient || undefined,
                  email: user?.email || "",
                })}
                disabled={reportMutation.isPending}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Mensal Detalhado</span>
                <span className="text-[10px] text-muted-foreground">{MONTH_SHORT[selectedMonth]}/{selectedYear}</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-1"
                onClick={() => reportMutation.mutate({
                  type: "annual",
                  year: selectedYear,
                  clientName: selectedClient || undefined,
                  email: user?.email || "",
                })}
                disabled={reportMutation.isPending}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Anual Resumido</span>
                <span className="text-[10px] text-muted-foreground">{selectedYear}</span>
              </Button>
            </div>
            {selectedClient && (
              <p className="text-xs text-muted-foreground text-center">Filtrado por: {selectedClient}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
