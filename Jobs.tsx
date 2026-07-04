import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Briefcase, TrendingUp, ArrowLeft, Package, Receipt, Wallet, ChevronRight, ChevronLeft, CheckCircle2, Clock, XCircle, FileText, RotateCcw, CalendarDays, Users, BarChart3, Copy } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";

const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em andamento",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  draft: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
  in_progress: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  completed: "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
  cancelled: "bg-red-600/20 text-red-400 border-red-600/30",
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  in_progress: <Clock className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR");
}

function toISODate(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

export default function Jobs() {
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).getTime();
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const monthName = `${MONTH_FULL[selectedMonth]} de ${selectedYear}`;

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

  const [jobForm, setJobForm] = useState({
    name: "",
    clientName: "",
    referredByPartnerId: null as number | null,
    referredByPartnerName: "",
    status: "draft" as string,
    jobType: "client" as string,
    startDate: "",
    endDate: "",
    totalCharged: "",
    notes: "",
  });

  // Partner autocomplete state
  const [partnerSearch, setPartnerSearch] = useState("");
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const partnerInputRef = useRef<HTMLInputElement>(null);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);
  const { data: partnerResults = [] } = trpc.partners.search.useQuery(
    { query: partnerSearch },
    { enabled: partnerSearch.length >= 1 }
  );
  const createPartnerMutation = trpc.partners.create.useMutation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        partnerDropdownRef.current && !partnerDropdownRef.current.contains(e.target as Node) &&
        partnerInputRef.current && !partnerInputRef.current.contains(e.target as Node)
      ) {
        setShowPartnerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter jobs that overlap with selected month
  const { data: allJobs = [], refetch: refetchJobs } = trpc.jobs.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const jobsList = useMemo(() => {
    return allJobs.filter((job: any) => {
      // Filter by jobType
      if (jobTypeFilter !== "all" && job.jobType !== jobTypeFilter) return false;
      // A job is visible in a month if its startDate falls within the selected month.
      // If no startDate, use createdAt as fallback.
      const jobDate = job.startDate || (job.createdAt ? new Date(job.createdAt).getTime() : 0);
      if (!jobDate) return false;
      return jobDate >= startDate && jobDate <= endDate;
    });
  }, [allJobs, startDate, endDate, jobTypeFilter]);

  const createMutation = trpc.jobs.create.useMutation();
  const updateMutation = trpc.jobs.update.useMutation();
  const deleteMutation = trpc.jobs.delete.useMutation();

  const resetForm = () => {
    setJobForm({ name: "", clientName: "", referredByPartnerId: null, referredByPartnerName: "", status: "draft", jobType: "client", startDate: "", endDate: "", totalCharged: "", notes: "" });
    setPartnerSearch("");
    setEditingJobId(null);
  };

  const handleSelectPartner = (partner: { id: number; name: string }) => {
    setJobForm({ ...jobForm, referredByPartnerId: partner.id, referredByPartnerName: partner.name });
    setPartnerSearch(partner.name);
    setShowPartnerDropdown(false);
  };

  const handleCreateAndSelectPartner = async (name: string) => {
    try {
      const newPartner = await createPartnerMutation.mutateAsync({ name });
      if (newPartner) {
        setJobForm({ ...jobForm, referredByPartnerId: newPartner.id, referredByPartnerName: newPartner.name });
        setPartnerSearch(newPartner.name);
      }
      setShowPartnerDropdown(false);
      toast.success(`Parceiro "${name}" criado!`);
    } catch {
      toast.error("Erro ao criar parceiro");
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // If user typed a name but didn't select from dropdown, auto-create
      let finalPartnerId = jobForm.referredByPartnerId;
      if (partnerSearch.trim() && !finalPartnerId) {
        // Check if there's an exact match
        const exactMatch = partnerResults.find((p: any) => p.name.toLowerCase() === partnerSearch.trim().toLowerCase());
        if (exactMatch) {
          finalPartnerId = exactMatch.id;
        } else {
          // Auto-create
          const newPartner = await createPartnerMutation.mutateAsync({ name: partnerSearch.trim() });
          if (newPartner) finalPartnerId = newPartner.id;
        }
      }

      const payload: any = {
        name: jobForm.name,
        clientName: jobForm.clientName || null,
        referredByPartnerId: finalPartnerId || null,
        status: jobForm.status as any,
        jobType: jobForm.jobType as any,
        startDate: jobForm.startDate ? new Date(jobForm.startDate + "T12:00:00").getTime() : null,
        endDate: jobForm.endDate ? new Date(jobForm.endDate + "T12:00:00").getTime() : null,
        totalCharged: jobForm.totalCharged || null,
        notes: jobForm.notes || null,
      };

      if (editingJobId) {
        await updateMutation.mutateAsync({ id: editingJobId, ...payload });
        toast.success("Job atualizado!");
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast.success("Job criado!");
        resetForm();
        setIsCreateOpen(false);
        refetchJobs();
        // Auto-navigate to the new job detail
        if (result?.id) {
          setSelectedJobId(result.id);
        }
        return;
      }
      resetForm();
      setIsCreateOpen(false);
      refetchJobs();
    } catch (error) {
      toast.error("Erro ao salvar job");
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este job? Todas as entregas, custos e recebimentos serão removidos.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Job excluído!");
      refetchJobs();
    } catch {
      toast.error("Erro ao excluir job");
    }
  };

  // Annual view data
  const annualJobs = useMemo(() => {
    if (viewMode !== "year") return [];
    return allJobs.filter((job: any) => {
      // Filter by jobType
      if (jobTypeFilter !== "all" && job.jobType !== jobTypeFilter) return false;
      const jobStart = job.startDate ? new Date(job.startDate).getFullYear() : null;
      const jobEnd = job.endDate ? new Date(job.endDate).getFullYear() : null;
      if (!jobStart && !jobEnd) return true;
      if (jobStart && jobStart <= selectedYear && (!jobEnd || new Date(job.endDate).getFullYear() >= selectedYear)) return true;
      if (jobEnd && new Date(job.endDate).getFullYear() >= selectedYear && (!jobStart || new Date(job.startDate).getFullYear() <= selectedYear)) return true;
      return false;
    });
  }, [allJobs, selectedYear, viewMode, jobTypeFilter]);

  const annualByMonth = useMemo(() => {
    const months: { month: number; jobs: any[] }[] = Array.from({ length: 12 }, (_, i) => ({ month: i, jobs: [] }));
    annualJobs.forEach((job: any) => {
      const start = job.startDate ? new Date(job.startDate) : null;
      const end = job.endDate ? new Date(job.endDate) : null;
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(selectedYear, m, 1).getTime();
        const mEnd = new Date(selectedYear, m + 1, 0, 23, 59, 59).getTime();
        const jobStart = start ? start.getTime() : 0;
        const jobEnd = end ? end.getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000;
        if (jobStart <= mEnd && jobEnd >= mStart) {
          months[m].jobs.push(job);
        }
      }
    });
    return months;
  }, [annualJobs, selectedYear]);

  // If a job is selected, show detail view
  if (selectedJobId) {
    return <JobDetail jobId={selectedJobId} onBack={() => { setSelectedJobId(null); refetchJobs(); }} />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Month Navigation Header - Mobile First */}
      <div className="space-y-3">
        {/* Row 1: Navigation arrows + title + new job button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => viewMode === "year" ? setSelectedYear(y => y - 1) : goToPrevMonth()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[140px] md:min-w-[200px]">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight capitalize">{viewMode === "year" ? selectedYear : monthName}</h1>
              <p className="text-muted-foreground text-xs">Jobs / Projetos</p>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => viewMode === "year" ? setSelectedYear(y => y + 1) : goToNextMonth()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && viewMode === "month" && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goToToday} title="Voltar para hoje">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9" onClick={resetForm}>
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Novo Job</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingJobId ? "Editar" : "Novo"} Job</DialogTitle>
            </DialogHeader>
            <form id="create-job-form" onSubmit={handleSubmitJob} className="space-y-4 overflow-y-auto flex-1 pr-1 overscroll-contain touch-pan-y">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome do Job *</label>
                <Input placeholder="Ex: Campanha Iguatemi" value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Cliente</label>
                <Input placeholder="Nome do cliente (opcional)" value={jobForm.clientName} onChange={(e) => setJobForm({ ...jobForm, clientName: e.target.value })} />
              </div>
              <div className="relative">
                <label className="text-sm text-muted-foreground mb-1 block">Indicado por</label>
                <Input
                  ref={partnerInputRef}
                  placeholder="Nome de quem indicou (opcional)"
                  value={partnerSearch}
                  onChange={(e) => {
                    setPartnerSearch(e.target.value);
                    setShowPartnerDropdown(true);
                    if (!e.target.value) {
                      setJobForm({ ...jobForm, referredByPartnerId: null, referredByPartnerName: "" });
                    }
                  }}
                  onFocus={() => { if (partnerSearch.length >= 1) setShowPartnerDropdown(true); }}
                />
                {showPartnerDropdown && partnerSearch.length >= 1 && (
                  <div ref={partnerDropdownRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {partnerResults.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
                        onClick={() => handleSelectPartner(p)}
                      >
                        {p.name}
                      </button>
                    ))}
                    {!partnerResults.find((p: any) => p.name.toLowerCase() === partnerSearch.trim().toLowerCase()) && partnerSearch.trim() && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm text-emerald-400 border-t border-border transition-colors"
                        onClick={() => handleCreateAndSelectPartner(partnerSearch.trim())}
                      >
                        + Criar: "{partnerSearch.trim()}"
                      </button>
                    )}
                    {partnerResults.length === 0 && !partnerSearch.trim() && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum parceiro encontrado</div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                  <select value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                    <option value="client">🟢 Cliente Final</option>
                    <option value="freelance">🟣 Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                    <option value="draft">Rascunho</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="completed">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Valor Cobrado</label>
                  <Input type="number" step="0.01" placeholder="R$ 0,00" value={jobForm.totalCharged} onChange={(e) => setJobForm({ ...jobForm, totalCharged: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Início</label>
                  <Input type="date" value={jobForm.startDate} onChange={(e) => setJobForm({ ...jobForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Fim</label>
                  <Input type="date" value={jobForm.endDate} onChange={(e) => setJobForm({ ...jobForm, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Observações</label>
                <Textarea placeholder="Notas sobre o projeto..." value={jobForm.notes} onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })} rows={3} />
              </div>
            </form>
            <div className="flex-shrink-0 pt-3 pb-1 border-t border-border flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" form="create-job-form" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingJobId ? "Salvar" : "Criar Job")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* Row 2: View mode + type filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex gap-0.5 bg-muted rounded-md p-0.5 shrink-0">
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" className="h-8 px-2.5 text-xs" onClick={() => setViewMode("month")}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" /> Mês
            </Button>
            <Button variant={viewMode === "year" ? "default" : "ghost"} size="sm" className="h-8 px-2.5 text-xs" onClick={() => setViewMode("year")}>
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Ano
            </Button>
          </div>
          <div className="w-px h-5 bg-border shrink-0" />
          <div className="flex gap-0.5 bg-muted rounded-md p-0.5 shrink-0">
            <Button variant={jobTypeFilter === "all" ? "default" : "ghost"} size="sm" className="h-8 px-2.5 text-xs" onClick={() => setJobTypeFilter("all")}>
              Todos
            </Button>
            <Button variant={jobTypeFilter === "freelance" ? "default" : "ghost"} size="sm" className="h-8 px-2.5 text-xs" onClick={() => setJobTypeFilter("freelance")}>
              🟣 Free
            </Button>
            <Button variant={jobTypeFilter === "client" ? "default" : "ghost"} size="sm" className="h-8 px-2.5 text-xs" onClick={() => setJobTypeFilter("client")}>
              🟢 Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* Annual View */}
      {viewMode === "year" && (
        <>
          <Card className="bg-gradient-to-r from-[#EE770E]/10 to-transparent border-[#EE770E]/20">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#EE770E]/20">
                  <Briefcase className="w-5 h-5 text-[#EE770E]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Jobs em {selectedYear}</p>
                  <p className="text-2xl font-bold">{annualJobs.length}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Finalizados</p>
                  <p className="font-bold text-emerald-400">{annualJobs.filter((j: any) => j.status === "completed").length}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Em andamento</p>
                  <p className="font-bold text-blue-400">{annualJobs.filter((j: any) => j.status === "in_progress").length}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Faturamento</p>
                  <p className="font-bold text-[#EE770E]">{formatCurrency(annualJobs.reduce((s: number, j: any) => s + (j.totalCharged || 0), 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {annualByMonth.map(({ month, jobs }) => (
              <Card key={month} className={`${jobs.length === 0 ? "opacity-50" : ""}`}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-6">{String(month + 1).padStart(2, "0")}</span>
                      {MONTH_FULL[month]}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                {jobs.length > 0 && (
                  <CardContent className="pt-0 px-4 pb-3">
                    <div className="space-y-2">
                      {jobs.map((job: any) => (
                        <div
                          key={`${month}-${job.id}`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${job.jobType === "freelance" ? "bg-purple-600/20 text-purple-400 border-purple-600/30" : "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"}`}>
                              {job.jobType === "freelance" ? "🟣" : "🟢"}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[job.status]}`}>
                              {statusIcons[job.status]}
                              {statusLabels[job.status]}
                            </span>
                            <span className="text-sm font-medium">{job.name}</span>
                            {job.clientName && <span className="text-xs text-muted-foreground">• {job.clientName}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {job.totalCharged && <span className="text-sm font-medium text-[#EE770E]">{formatCurrency(job.totalCharged)}</span>}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Monthly View */}
      {viewMode === "month" && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "Todos" },
              { value: "in_progress", label: "Em andamento" },
              { value: "draft", label: "Rascunho" },
              { value: "completed", label: "Finalizados" },
              { value: "cancelled", label: "Cancelados" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Jobs list */}
          {jobsList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">Nenhum job encontrado</h3>
                <p className="text-sm text-muted-foreground">Crie seu primeiro job para começar a controlar projetos e lucros.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobsList.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onSelect={() => setSelectedJobId(job.id)}
                  onEdit={() => {
                    setEditingJobId(job.id);
                    setJobForm({
                      name: job.name,
                      clientName: job.clientName || "",
                      referredByPartnerId: job.referredByPartnerId || null,
                      referredByPartnerName: (job as any).partnerName || "",
                      status: job.status,
                      jobType: (job as any).jobType || "client",
                      startDate: toISODate(job.startDate),
                      endDate: toISODate(job.endDate),
                      totalCharged: job.totalCharged ? String(job.totalCharged) : "",
                      notes: job.notes || "",
                    });
                    setPartnerSearch((job as any).partnerName || "");
                    setIsCreateOpen(true);
                  }}
                  onDelete={() => handleDeleteJob(job.id)}
                  onDuplicate={() => {
                    setEditingJobId(null);
                    setJobForm({
                      name: job.name + " (cópia)",
                      clientName: job.clientName || "",
                      referredByPartnerId: job.referredByPartnerId || null,
                      referredByPartnerName: (job as any).partnerName || "",
                      status: "active",
                      jobType: (job as any).jobType || "client",
                      startDate: "",
                      endDate: "",
                      totalCharged: job.totalCharged ? String(job.totalCharged) : "",
                      notes: job.notes || "",
                    });
                    setPartnerSearch((job as any).partnerName || "");
                    setIsCreateOpen(true);
                    toast.info("Job duplicado! Ajuste as datas e salve.");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JobCard({ job, onSelect, onEdit, onDelete, onDuplicate }: { job: any; onSelect: () => void; onEdit: () => void; onDelete: () => void; onDuplicate: () => void }) {
  return (
    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group active:scale-[0.98]" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Title */}
            <CardTitle className="text-base md:text-lg truncate leading-tight">{job.name}</CardTitle>
            {/* Client + badges row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`${job.jobType === "freelance" ? "bg-purple-600/20 text-purple-400 border-purple-600/30" : "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"} text-[10px] px-1.5 py-0 h-5`}>
                {job.jobType === "freelance" ? "🟣 Free" : "🟢 Cliente"}
              </Badge>
              <Badge className={`${statusColors[job.status]} text-[10px] px-1.5 py-0 h-5 flex items-center gap-0.5`}>
                {statusIcons[job.status]}
                {statusLabels[job.status]}
              </Badge>
              {job.clientName && <span className="text-xs text-muted-foreground truncate">{job.clientName}</span>}
            </div>
            {/* Bottom row: value + dates */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
              {job.totalCharged && (
                <span className="font-semibold text-emerald-400 text-sm">
                  {formatCurrency(parseFloat(job.totalCharged))}
                </span>
              )}
              {job.startDate && (
                <span className="hidden sm:inline">{formatDate(job.startDate)}{job.endDate ? ` → ${formatDate(job.endDate)}` : ""}</span>
              )}
              {job.startDate && (
                <span className="sm:hidden">{formatDate(job.startDate)}</span>
              )}
            </div>
          </div>
          {/* Actions - visible on mobile, hover on desktop */}
          <div className="flex flex-col sm:flex-row gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Editar">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicar">
              <Copy className="w-3.5 h-3.5 text-blue-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Excluir">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== JOB DETAIL ====================

function JobDetail({ jobId, onBack }: { jobId: number; onBack: () => void }) {
  const { data: job, refetch, isLoading } = trpc.jobs.getById.useQuery({ id: jobId });
  const { user } = useAuth();
  const genJobReport = trpc.reports.generateJob.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório do job gerado!");
      window.open(data.pdfUrl, "_blank");
    },
    onError: () => toast.error("Erro ao gerar relatório"),
  });

  // Delivery form
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<number | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({ description: "" });
  const createDelivery = trpc.jobs.deliveries.create.useMutation();
  const updateDelivery = trpc.jobs.deliveries.update.useMutation();
  const deleteDelivery = trpc.jobs.deliveries.delete.useMutation();

  // Cards for payment source
  const { data: cards = [] } = trpc.cards.list.useQuery();

  // Cost form
  const [isCostOpen, setIsCostOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [costForm, setCostForm] = useState({ description: "", amount: "", supplierName: "", status: "pending" as string, paidAt: "", paymentSource: "cash" as string, cardId: null as number | null });
  const createCost = trpc.jobs.costs.create.useMutation();
  const updateCost = trpc.jobs.costs.update.useMutation();
  const deleteCost = trpc.jobs.costs.delete.useMutation();

  // Supplier autocomplete state
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const { data: supplierResults = [] } = trpc.suppliers.search.useQuery(
    { query: supplierSearch },
    { enabled: supplierSearch.length >= 1 }
  );
  const createSupplierMutation = trpc.suppliers.create.useMutation();

  // Close supplier dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node) &&
        supplierInputRef.current && !supplierInputRef.current.contains(e.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Payment form
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({ description: "", amount: "", dueDate: "", status: "pending" as string, receivedAt: "" });
  const createPayment = trpc.jobs.payments.create.useMutation();
  const updatePayment = trpc.jobs.payments.update.useMutation();
  const deletePayment = trpc.jobs.payments.delete.useMutation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        <p>Job não encontrado.</p>
      </div>
    );
  }

  const summary = job.summary || { totalCosts: 0, totalPayments: 0, profit: 0, margin: 0, deliveredCount: 0, totalDeliveries: 0, pendingPayments: 0 };

  const resetDeliveryForm = () => {
    setDeliveryForm({ description: "" });
    setEditingDeliveryId(null);
  };

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDeliveryId) {
        await updateDelivery.mutateAsync({ id: editingDeliveryId, jobId, description: deliveryForm.description });
        toast.success("Entrega atualizada!");
      } else {
        await createDelivery.mutateAsync({ jobId, description: deliveryForm.description });
        toast.success("Entrega adicionada!");
      }
      resetDeliveryForm();
      setIsDeliveryOpen(false);
      refetch();
    } catch { toast.error("Erro ao salvar entrega"); }
  };

  const handleEditDelivery = (d: any) => {
    setEditingDeliveryId(d.id);
    setDeliveryForm({ description: d.description });
    setIsDeliveryOpen(true);
  };

  const handleToggleDelivery = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "pending" ? "delivered" : "pending";
      await updateDelivery.mutateAsync({
        id,
        jobId,
        status: newStatus as any,
        deliveredAt: newStatus === "delivered" ? Date.now() : null,
      });
      refetch();
    } catch { toast.error("Erro ao atualizar entrega"); }
  };

  const resetCostForm = () => {
    setCostForm({ description: "", amount: "", supplierName: "", status: "pending", paidAt: "", paymentSource: "cash", cardId: null });
    setSupplierSearch("");
    setEditingCostId(null);
  };

  const handleSelectSupplier = (supplier: { id: number; companyName: string }) => {
    setCostForm({ ...costForm, supplierName: supplier.companyName });
    setSupplierSearch(supplier.companyName);
    setShowSupplierDropdown(false);
  };

  const handleCreateAndSelectSupplier = async (name: string) => {
    try {
      await createSupplierMutation.mutateAsync({ companyName: name });
      setCostForm({ ...costForm, supplierName: name });
      setSupplierSearch(name);
      setShowSupplierDropdown(false);
      toast.success(`Fornecedor "${name}" cadastrado!`);
    } catch {
      toast.error("Erro ao cadastrar fornecedor");
    }
  };

  const handleSubmitCost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paidAtTs = costForm.paidAt ? new Date(costForm.paidAt + "T12:00:00").getTime() : null;
      if (editingCostId) {
        await updateCost.mutateAsync({
          id: editingCostId,
          description: costForm.description,
          amount: costForm.amount,
          supplierName: costForm.supplierName || null,
          status: costForm.status as any,
          paidAt: paidAtTs,
          paymentSource: costForm.paymentSource as any,
          cardId: costForm.paymentSource === "card" ? costForm.cardId : null,
        });
        toast.success("Custo atualizado!");
      } else {
        await createCost.mutateAsync({
          jobId,
          description: costForm.description,
          amount: costForm.amount,
          supplierName: costForm.supplierName || null,
          status: costForm.status as any,
          paidAt: paidAtTs,
          paymentSource: costForm.paymentSource as any,
          cardId: costForm.paymentSource === "card" ? costForm.cardId : null,
        });
        toast.success("Custo adicionado!");
      }
      resetCostForm();
      setIsCostOpen(false);
      refetch();
    } catch { toast.error("Erro ao salvar custo"); }
  };

  const handleEditCost = (c: any) => {
    setEditingCostId(c.id);
    setCostForm({
      description: c.description,
      amount: String(c.amount),
      supplierName: c.supplierName || "",
      status: c.status,
      paidAt: toISODate(c.paidAt),
      paymentSource: c.paymentSource || "cash",
      cardId: c.cardId || null,
    });
    setSupplierSearch(c.supplierName || "");
    setIsCostOpen(true);
  };

  const resetPaymentForm = () => {
    setPaymentForm({ description: "", amount: "", dueDate: "", status: "pending", receivedAt: "" });
    setEditingPaymentId(null);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const receivedAtTs = paymentForm.receivedAt ? new Date(paymentForm.receivedAt + "T12:00:00").getTime() : null;
      if (editingPaymentId) {
        await updatePayment.mutateAsync({
          id: editingPaymentId,
          jobId,
          description: paymentForm.description,
          amount: paymentForm.amount,
          dueDate: new Date(paymentForm.dueDate + "T12:00:00").getTime(),
          status: paymentForm.status as any,
          receivedAt: receivedAtTs,
        });
        toast.success("Recebimento atualizado!");
      } else {
        await createPayment.mutateAsync({
          jobId,
          description: paymentForm.description,
          amount: paymentForm.amount,
          dueDate: new Date(paymentForm.dueDate + "T12:00:00").getTime(),
          status: paymentForm.status as any,
          receivedAt: receivedAtTs,
        });
        toast.success("Recebimento adicionado!");
      }
      resetPaymentForm();
      setIsPaymentOpen(false);
      refetch();
    } catch { toast.error("Erro ao salvar recebimento"); }
  };

  const handleEditPayment = (p: any) => {
    setEditingPaymentId(p.id);
    setPaymentForm({
      description: p.description,
      amount: String(p.amount),
      dueDate: toISODate(p.dueDate),
      status: p.status,
      receivedAt: toISODate(p.receivedAt),
    });
    setIsPaymentOpen(true);
  };

  const handleMarkReceived = async (payment: any) => {
    try {
      await updatePayment.mutateAsync({
        id: payment.id,
        jobId,
        status: "received",
        receivedAt: Date.now(),
      });
      toast.success("Recebimento confirmado! Receita PJ criada.");
      refetch();
    } catch { toast.error("Erro ao confirmar recebimento"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h1 className="text-xl sm:text-3xl font-bold leading-tight">{job.name}</h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`${job.jobType === "freelance" ? "bg-purple-600/20 text-purple-400 border-purple-600/30" : "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"} text-xs flex items-center gap-1`}>
              {job.jobType === "freelance" ? "🟣 Freelance" : "🟢 Cliente Final"}
            </Badge>
            <Badge className={`${statusColors[job.status]} text-xs flex items-center gap-1`}>
              {statusIcons[job.status]}
              {statusLabels[job.status]}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {job.clientName && <span>Cliente: {job.clientName}</span>}
          {(job.startDate || job.endDate) && (
            <span>{job.startDate ? formatDate(job.startDate) : "?"} → {job.endDate ? formatDate(job.endDate) : "em aberto"}</span>
          )}
        </div>
        {job.notes && <p className="text-xs sm:text-sm text-muted-foreground italic">{job.notes}</p>}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 w-full sm:w-auto"
          disabled={genJobReport.isPending}
          onClick={() => genJobReport.mutate({ jobId, email: user?.email || "" })}
        >
          <FileText className="w-4 h-4" />
          {genJobReport.isPending ? "Gerando..." : "Relatório PDF"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-emerald-600/20">
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Receita</p>
            <p className="text-base md:text-xl font-bold text-emerald-400 mt-0.5">{formatCurrency(summary.totalPayments)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-600/20">
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Custos</p>
            <p className="text-base md:text-xl font-bold text-red-400 mt-0.5">{formatCurrency(summary.totalCosts)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-600/20">
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Lucro</p>
            <p className={`text-base md:text-xl font-bold mt-0.5 ${summary.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(summary.profit)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-600/20">
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Margem</p>
            <p className={`text-base md:text-xl font-bold mt-0.5 ${summary.margin >= 0 ? "text-purple-400" : "text-red-400"}`}>
              {summary.margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Entregas, Custos, Recebimentos */}
      <Tabs defaultValue="deliveries">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="deliveries" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Entregas</span>
            <span className="sm:hidden">Entr.</span>
            <span className="text-muted-foreground">({job.deliveries?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span>Custos</span>
            <span className="text-muted-foreground">({job.costs?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Recebimentos</span>
            <span className="sm:hidden">Receb.</span>
            <span className="text-muted-foreground">({job.payments?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* ENTREGAS */}
        <TabsContent value="deliveries" className="space-y-4 mt-4">
          <Dialog open={isDeliveryOpen} onOpenChange={(open) => { setIsDeliveryOpen(open); if (!open) resetDeliveryForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetDeliveryForm}>
                <Plus className="w-4 h-4 mr-2" /> Nova Entrega
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingDeliveryId ? "Editar" : "Nova"} Entrega</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmitDelivery} className="space-y-4">
                <Input placeholder="Descrição da entrega" value={deliveryForm.description} onChange={(e) => setDeliveryForm({ description: e.target.value })} required />
                <Button type="submit" className="w-full" disabled={createDelivery.isPending || updateDelivery.isPending}>
                  {(createDelivery.isPending || updateDelivery.isPending) ? "Salvando..." : (editingDeliveryId ? "Salvar Alterações" : "Adicionar")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {(!job.deliveries || job.deliveries.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma entrega cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {job.deliveries.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <button
                    onClick={() => handleToggleDelivery(d.id, d.status)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      d.status === "delivered" ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/50 hover:border-emerald-500"
                    }`}
                  >
                    {d.status === "delivered" && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`flex-1 ${d.status === "delivered" ? "line-through text-muted-foreground" : ""}`}>
                    {d.description}
                  </span>
                  {d.deliveredAt && <span className="text-xs text-muted-foreground">{formatDate(d.deliveredAt)}</span>}
                  <Button variant="ghost" size="sm" onClick={() => handleEditDelivery(d)}>
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteDelivery.mutateAsync({ id: d.id }).then(() => { refetch(); toast.success("Entrega removida"); })}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {summary.deliveredCount}/{summary.totalDeliveries} entregas concluídas
          </div>
        </TabsContent>

        {/* CUSTOS */}
        <TabsContent value="costs" className="space-y-4 mt-4">
          <Dialog open={isCostOpen} onOpenChange={(open) => { setIsCostOpen(open); if (!open) resetCostForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetCostForm}>
                <Plus className="w-4 h-4 mr-2" /> Novo Custo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCostId ? "Editar" : "Novo"} Custo do Job</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmitCost} className="space-y-4">
                <Input placeholder="Descrição (ex: Freelancer edição)" value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} required />
                <Input type="number" step="0.01" placeholder="Valor (R$)" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} required />
                <div className="relative">
                  <Input
                    ref={supplierInputRef}
                    placeholder="Fornecedor (opcional)"
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                  />
                  {showSupplierDropdown && (supplierResults.length > 0 || supplierSearch.length > 0) && (
                    <div ref={supplierDropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      {supplierResults.length > 0 ? (
                        <>
                          {supplierResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectSupplier(s)}
                              className="w-full text-left px-3 py-2 hover:bg-secondary/50 border-b last:border-b-0 text-sm"
                            >
                              {s.companyName}
                            </button>
                          ))}
                          {supplierSearch.length > 0 && !supplierResults.find(s => s.companyName.toLowerCase() === supplierSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => handleCreateAndSelectSupplier(supplierSearch)}
                              className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 text-emerald-400 border-t text-sm font-medium"
                            >
                              + Cadastrar "{supplierSearch}"
                            </button>
                          )}
                        </>
                      ) : supplierSearch.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleCreateAndSelectSupplier(supplierSearch)}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 text-emerald-400 text-sm font-medium"
                        >
                          + Cadastrar "{supplierSearch}"
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Forma de Pagamento</label>
                  <select value={costForm.paymentSource} onChange={(e) => setCostForm({ ...costForm, paymentSource: e.target.value, cardId: e.target.value === "cash" ? null : costForm.cardId })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                    <option value="cash">PIX / Dinheiro / Transferência</option>
                    <option value="card">Cartão de Crédito</option>
                  </select>
                </div>
                {costForm.paymentSource === "card" && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Cartão</label>
                    <select value={costForm.cardId || ""} onChange={(e) => setCostForm({ ...costForm, cardId: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                      <option value="">Selecione o cartão...</option>
                      {cards.map((card: any) => (
                        <option key={card.id} value={card.id}>{card.name} ({card.type})</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">💡 Ao importar a fatura, esse custo será vinculado automaticamente (sem duplicar)</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                    <select value={costForm.status} onChange={(e) => setCostForm({ ...costForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Data Pagamento</label>
                    <Input type="date" value={costForm.paidAt} onChange={(e) => setCostForm({ ...costForm, paidAt: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createCost.isPending || updateCost.isPending}>
                  {(createCost.isPending || updateCost.isPending) ? "Salvando..." : (editingCostId ? "Salvar Alterações" : "Adicionar Custo")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {(!job.costs || job.costs.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum custo cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {/* Resumo de custos */}
              <div className="grid grid-cols-3 gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-secondary/50 border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold text-sm">{formatCurrency(job.costs.reduce((s: number, c: any) => s + parseFloat(c.amount), 0))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-semibold text-sm text-emerald-400">{formatCurrency(job.costs.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + parseFloat(c.amount), 0))}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="font-semibold text-sm text-amber-400">{formatCurrency(job.costs.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + parseFloat(c.amount), 0))}</p>
                </div>
              </div>
              {job.costs.map((c: any) => (
                <div key={c.id} className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.description}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {c.supplierName && <span className="text-xs text-muted-foreground">{c.supplierName}</span>}
                          {c.paymentSource === "card" && (
                            <span className="text-xs text-blue-400">
                              💳 {c.linkedTransactionId ? "Vinculado" : "Aguardando"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCost(c)}>
                        <Edit2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCost.mutateAsync({ id: c.id }).then(() => { refetch(); toast.success("Custo removido"); })}>
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-4">
                    <Badge variant={c.status === "paid" ? "default" : "outline"} className="text-[10px] h-5">
                      {c.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                    <span className="font-semibold text-sm text-red-400">{formatCurrency(parseFloat(c.amount))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RECEBIMENTOS */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <Dialog open={isPaymentOpen} onOpenChange={(open) => { setIsPaymentOpen(open); if (!open) resetPaymentForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetPaymentForm}>
                <Plus className="w-4 h-4 mr-2" /> Novo Recebimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingPaymentId ? "Editar" : "Novo"} Recebimento do Job</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <Input placeholder="Descrição (ex: Parcela 1/3)" value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} required />
                <Input type="number" step="0.01" placeholder="Valor (R$)" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data Prevista de Recebimento *</label>
                  <Input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                    <select value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                      <option value="pending">Pendente</option>
                      <option value="received">Recebido</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Data Recebimento</label>
                    <Input type="date" value={paymentForm.receivedAt} onChange={(e) => setPaymentForm({ ...paymentForm, receivedAt: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createPayment.isPending || updatePayment.isPending}>
                  {(createPayment.isPending || updatePayment.isPending) ? "Salvando..." : (editingPaymentId ? "Salvar Alterações" : "Adicionar Recebimento")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {(!job.payments || job.payments.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum recebimento cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {job.payments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${p.status === "received" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Previsto: {formatDate(p.dueDate)}
                          {p.receivedAt && ` | Recebido: ${formatDate(p.receivedAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPayment(p)}>
                        <Edit2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePayment.mutateAsync({ id: p.id }).then(() => { refetch(); toast.success("Recebimento removido"); })}>
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.status === "received" ? "default" : "outline"} className="text-[10px] h-5">
                        {p.status === "received" ? "Recebido" : "Pendente"}
                      </Badge>
                      {p.status === "pending" && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleMarkReceived(p)}>
                          Confirmar
                        </Button>
                      )}
                    </div>
                    <span className="font-semibold text-sm text-emerald-400">{formatCurrency(parseFloat(p.amount))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {summary.pendingPayments > 0 && (
            <p className="text-sm text-amber-400">{summary.pendingPayments} recebimento(s) pendente(s)</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
