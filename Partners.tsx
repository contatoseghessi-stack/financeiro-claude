import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Users, Trophy, ChevronLeft, ChevronRight, RotateCcw, Phone, Mail, StickyNote, ArrowLeft, Briefcase, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(ts: number | string | null) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "string" ? ts : Number(ts));
  return d.toLocaleDateString("pt-BR");
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

// Partner Detail View
function PartnerDetail({ partnerId, onBack }: { partnerId: number; onBack: () => void }) {
  const { data, isLoading } = trpc.partners.detail.useQuery({ id: partnerId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Parceiro não encontrado.</p>
      </div>
    );
  }

  const { partner, jobs, stats } = data;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{partner.name}</h1>
        <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
          {partner.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {partner.phone}
            </span>
          )}
          {partner.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {partner.email}
            </span>
          )}
          {partner.notes && (
            <span className="flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" /> {partner.notes}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl sm:text-2xl font-bold">{stats.totalJobs}</p>
            <p className="text-xs text-muted-foreground">Jobs indicados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-lg sm:text-2xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Receita gerada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-xl sm:text-2xl font-bold">{stats.completedJobs}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-xl sm:text-2xl font-bold">{stats.activeJobs}</p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Histórico de Jobs Indicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum job indicado por este parceiro ainda.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: any) => (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{job.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {job.clientName && <span>{job.clientName}</span>}
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.totalCharged && (
                      <span className="text-sm font-semibold text-green-400">
                        {formatCurrency(parseFloat(String(job.totalCharged)))}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] || "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Partners() {
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed for API
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });
  const [viewingPartnerId, setViewingPartnerId] = useState<number | null>(null);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  const monthName = `${MONTH_FULL[selectedMonth - 1]} de ${selectedYear}`;

  const goToPrevMonth = () => {
    if (selectedMonth === 1) { setSelectedYear(y => y - 1); setSelectedMonth(12); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 12) { setSelectedYear(y => y + 1); setSelectedMonth(1); }
    else setSelectedMonth(m => m + 1);
  };
  const goToToday = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const { data: partners = [], refetch } = trpc.partners.list.useQuery();
  const { data: ranking = [] } = trpc.partners.ranking.useQuery({ month: selectedMonth, year: selectedYear });
  const createMutation = trpc.partners.create.useMutation();
  const updateMutation = trpc.partners.update.useMutation();
  const deleteMutation = trpc.partners.delete.useMutation();

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast.success("Parceiro atualizado!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Parceiro cadastrado!");
      }
      resetForm();
      setIsOpen(false);
      refetch();
    } catch {
      toast.error("Erro ao salvar parceiro");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este parceiro? As indicações de jobs serão desvinculadas.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Parceiro excluído!");
      refetch();
    } catch {
      toast.error("Erro ao excluir parceiro");
    }
  };

  const handleEdit = (partner: any) => {
    setEditingId(partner.id);
    setFormData({
      name: partner.name,
      phone: partner.phone || "",
      email: partner.email || "",
      notes: partner.notes || "",
    });
    setIsOpen(true);
  };

  // If viewing a partner detail, show that view
  if (viewingPartnerId) {
    return <PartnerDetail partnerId={viewingPartnerId} onBack={() => setViewingPartnerId(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Parceiros
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Quem indica seus jobs</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Parceiro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Parceiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
                <Input placeholder="Nome do parceiro" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                <Input placeholder="(51) 99999-0000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">E-mail</label>
                <Input type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Observações</label>
                <Textarea placeholder="Notas sobre o parceiro..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ranking Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Ranking de Indicações
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">{monthName}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentMonth && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 ml-1" onClick={goToToday}>
                  <RotateCcw className="h-3 w-3" /> Hoje
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma indicação neste mês</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => setViewingPartnerId(item.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? "bg-amber-500/20 text-amber-400" :
                    idx === 1 ? "bg-zinc-400/20 text-zinc-300" :
                    idx === 2 ? "bg-orange-600/20 text-orange-400" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.phone && <p className="text-xs text-muted-foreground">{item.phone}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{item.jobCount}</span>
                    <p className="text-xs text-muted-foreground">{item.jobCount === 1 ? "indicação" : "indicações"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partners List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Todos os Parceiros ({partners.length})</h2>
        {partners.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum parceiro cadastrado</h3>
              <p className="text-sm text-muted-foreground">Cadastre parceiros aqui ou eles serão criados automaticamente ao preencher o campo "Indicado por" em um Job.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner: any) => (
              <Card
                key={partner.id}
                className="group hover:shadow-md transition-all cursor-pointer"
                onClick={() => setViewingPartnerId(partner.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold truncate flex-1">{partner.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(partner)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(partner.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {partner.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {partner.phone}
                      </p>
                    )}
                    {partner.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {partner.email}
                      </p>
                    )}
                    {partner.notes && (
                      <p className="flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5" />
                        <span className="truncate">{partner.notes}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
