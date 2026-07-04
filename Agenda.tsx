import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Calendar, Briefcase, Truck, DollarSign, Clock, Trash2, Edit2, Copy, RefreshCw, Unlink, CloudUpload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const EVENT_COLORS: Record<string, string> = {
  manual: "#EE770E",
  job_start: "#22c55e",
  job_end: "#ef4444",
  delivery_deadline: "#a855f7",
  payment_due: "#3b82f6",
  workday: "#eab308",
};

const EVENT_LABELS: Record<string, string> = {
  manual: "Evento",
  job_start: "Início Job",
  job_end: "Fim Job",
  delivery_deadline: "Entrega",
  payment_due: "Pagamento",
  workday: "Diária",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Agenda() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    color: "#EE770E",
  });

  // Get date range for the month
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  // Fetch calendar events
  const { data: calendarEvents = [], refetch } = trpc.calendar.list.useQuery({ startDate, endDate });

  // Fetch jobs for auto-events
  const { data: allJobs = [] } = trpc.jobs.list.useQuery();

  // Fetch work days for auto-events
  const { data: workDaysData } = trpc.workDays.list.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });
  const workDays = workDaysData?.workDays || [];

  // Generate auto-events from jobs and work days
  const autoEvents = useMemo(() => {
    const events: Array<{ id: string; title: string; startAt: number; endAt?: number; eventType: string; color: string; isAuto: true; jobId?: number }> = [];

    // Job start/end dates
    allJobs.forEach((job: any) => {
      if (job.startDate && job.startDate >= startDate && job.startDate <= endDate) {
        events.push({
          id: `job_start_${job.id}`,
          title: `Início: ${job.name}`,
          startAt: job.startDate,
          eventType: "job_start",
          color: EVENT_COLORS.job_start,
          isAuto: true,
          jobId: job.id,
        });
      }
      if (job.endDate && job.endDate >= startDate && job.endDate <= endDate) {
        events.push({
          id: `job_end_${job.id}`,
          title: `Fim: ${job.name}`,
          startAt: job.endDate,
          eventType: "job_end",
          color: EVENT_COLORS.job_end,
          isAuto: true,
          jobId: job.id,
        });
      }
      // Job deliveries deadlines
      if (job.deliveries) {
        job.deliveries.forEach((d: any) => {
          if (d.deadline && d.deadline >= startDate && d.deadline <= endDate && d.status === "pending") {
            events.push({
              id: `delivery_${d.id}`,
              title: `Entrega: ${d.description || job.name}`,
              startAt: d.deadline,
              eventType: "delivery_deadline",
              color: EVENT_COLORS.delivery_deadline,
              isAuto: true,
              jobId: job.id,
            });
          }
        });
      }
      // Job payments due
      if (job.payments) {
        job.payments.forEach((p: any) => {
          if (p.dueDate && p.dueDate >= startDate && p.dueDate <= endDate && p.status === "pending") {
            events.push({
              id: `payment_${p.id}`,
              title: `Receber: ${job.name}`,
              startAt: p.dueDate,
              eventType: "payment_due",
              color: EVENT_COLORS.payment_due,
              isAuto: true,
              jobId: job.id,
            });
          }
        });
      }
    });

    // Work days
    workDays.forEach((wd: any) => {
      events.push({
        id: `workday_${wd.id}`,
        title: `Diária: ${wd.clientName || wd.serviceType || "Diária"}`,
        startAt: wd.date,
        eventType: "workday",
        color: EVENT_COLORS.workday,
        isAuto: true,
      });
    });

    return events;
  }, [allJobs, workDays, startDate, endDate]);

  // Combine manual + auto events
  const allEvents = useMemo(() => {
    const manual = calendarEvents.map((e: any) => ({ ...e, isAuto: false }));
    return [...manual, ...autoEvents].sort((a, b) => a.startAt - b.startAt);
  }, [calendarEvents, autoEvents]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map: Record<number, typeof allEvents> = {};
    allEvents.forEach((event) => {
      const d = new Date(event.startAt);
      const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(event);
    });
    return map;
  }, [allEvents]);

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const grid: Array<{ day: number | null; date: number | null }> = [];

    for (let i = 0; i < firstDay; i++) grid.push({ day: null, date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ day: d, date: new Date(selectedYear, selectedMonth, d).getTime() });
    }
    return grid;
  }, [selectedYear, selectedMonth]);

  // Navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };
  const goToToday = () => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); };

  // Mutations
  const createMutation = trpc.calendar.create.useMutation();
  const updateMutation = trpc.calendar.update.useMutation();
  const deleteMutation = trpc.calendar.delete.useMutation();

  const resetForm = () => {
    setEventForm({ title: "", description: "", date: "", startTime: "09:00", endTime: "10:00", allDay: false, color: "#EE770E" });
    setEditingEvent(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) { toast.error("Preencha título e data"); return; }

    const dateObj = new Date(eventForm.date + "T00:00:00");
    let startAt: number;
    let endAt: number | null = null;

    if (eventForm.allDay) {
      startAt = dateObj.getTime();
      endAt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59).getTime();
    } else {
      const [sh, sm] = eventForm.startTime.split(":").map(Number);
      startAt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), sh, sm).getTime();
      if (eventForm.endTime) {
        const [eh, em] = eventForm.endTime.split(":").map(Number);
        endAt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), eh, em).getTime();
      }
    }

    try {
      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, title: eventForm.title, description: eventForm.description || null, startAt, endAt, allDay: eventForm.allDay, color: eventForm.color });
        toast.success("Evento atualizado!");
      } else {
        await createMutation.mutateAsync({ title: eventForm.title, description: eventForm.description || null, startAt, endAt, allDay: eventForm.allDay, eventType: "manual", color: eventForm.color });
        toast.success("Evento criado!");
      }
      resetForm();
      setIsCreateOpen(false);
      refetch();
    } catch { toast.error("Erro ao salvar evento"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Evento excluído!");
      refetch();
    } catch { toast.error("Erro ao excluir evento"); }
  };

  const handleEdit = (event: any) => {
    const d = new Date(event.startAt);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setEventForm({
      title: event.title,
      description: event.description || "",
      date: dateStr,
      startTime: event.allDay ? "09:00" : formatTime(event.startAt),
      endTime: event.endAt && !event.allDay ? formatTime(event.endAt) : "10:00",
      allDay: event.allDay || false,
      color: event.color || "#EE770E",
    });
    setEditingEvent(event);
    setIsCreateOpen(true);
  };

  // iCal feed URL
  const icalUrl = user ? `${window.location.origin}/api/calendar/feed/${user.id}` : "";

  const handleCopyIcal = () => {
    navigator.clipboard.writeText(icalUrl);
    toast.success("Link copiado! Cole no Google Agenda em 'Outros calendários > Por URL'");
  };

  // Google Calendar integration
  const { data: googleStatus, refetch: refetchGoogleStatus } = trpc.googleCalendar.status.useQuery();
  const getAuthUrlMutation = trpc.googleCalendar.getAuthUrl.useMutation();
  const disconnectMutation = trpc.googleCalendar.disconnect.useMutation();
  const syncFromGoogleMutation = trpc.googleCalendar.syncFromGoogle.useMutation();
  const pushAllMutation = trpc.googleCalendar.pushAll.useMutation();
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle Google OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      toast.success("Google Calendar conectado com sucesso!");
      refetchGoogleStatus();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-sync after connecting
      handleSyncFromGoogle();
    }
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const result = await getAuthUrlMutation.mutateAsync({ origin: window.location.origin });
      window.location.href = result.url;
    } catch {
      toast.error("Erro ao iniciar conexão com Google Calendar");
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast.success("Google Calendar desconectado");
      refetchGoogleStatus();
      refetch();
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const handleSyncFromGoogle = async () => {
    setIsSyncing(true);
    try {
      const result = await syncFromGoogleMutation.mutateAsync();
      toast.success(`Sincronizado! ${result.imported} novos, ${result.updated} atualizados, ${result.deleted} removidos`);
      refetch();
      refetchGoogleStatus();
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushAllToGoogle = async () => {
    setIsSyncing(true);
    try {
      const result = await pushAllMutation.mutateAsync();
      toast.success(`Enviados ${result.pushed} eventos para o Google Calendar`);
      if (result.errors > 0) toast.warning(`${result.errors} eventos falharam`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar eventos");
    } finally {
      setIsSyncing(false);
    }
  };

  // Selected day events
  const selectedDayEvents = selectedDate ? (eventsByDay[selectedDate] || []) : [];
  const selectedDayLabel = selectedDate ? new Date(selectedDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : "";

  const isToday = (date: number | null) => {
    if (!date) return false;
    const d = new Date(date);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
          <h1 className="text-base sm:text-2xl font-bold">{MONTH_NAMES[selectedMonth]} {selectedYear}</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
          {(selectedMonth !== now.getMonth() || selectedYear !== now.getFullYear()) && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={goToToday}>Hoje</Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Google Calendar buttons */}
          {googleStatus?.connected ? (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSyncFromGoogle} disabled={isSyncing}>
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} /> Sincronizar
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePushAllToGoogle} disabled={isSyncing}>
                <CloudUpload className="w-3.5 h-3.5" /> Enviar p/ Google
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleDisconnectGoogle}>
                <Unlink className="w-3.5 h-3.5" /> Desconectar
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleConnectGoogle} disabled={getAuthUrlMutation.isPending}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Conectar Google Calendar
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyIcal}>
            <Copy className="w-3.5 h-3.5" /> Exportar iCal
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" /> Novo Evento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Editar" : "Novo"} Evento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Ex: Reunião com cliente" />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={eventForm.allDay} onChange={(e) => setEventForm({ ...eventForm, allDay: e.target.checked })} className="rounded" />
                    Dia inteiro
                  </label>
                </div>
                {!eventForm.allDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Início</Label>
                      <Input type="time" value={eventForm.startTime} onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} />
                    </div>
                    <div>
                      <Label>Fim</Label>
                      <Input type="time" value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} />
                    </div>
                  </div>
                )}
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Notas opcionais..." rows={2} />
                </div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex gap-2 mt-1">
                    {["#EE770E", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308", "#ec4899"].map((c) => (
                      <button key={c} type="button" className={`w-7 h-7 rounded-full border-2 transition-all ${eventForm.color === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"}`} style={{ backgroundColor: c }} onClick={() => setEventForm({ ...eventForm, color: c })} />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEvent ? "Salvar" : "Criar Evento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(EVENT_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[key] }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardContent className="p-2 sm:p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-1">{wd}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, idx) => {
                if (!cell.day) return <div key={idx} className="aspect-square" />;
                const dayEvents = cell.date ? (eventsByDay[cell.date] || []) : [];
                const isSelected = selectedDate === cell.date;
                const today = isToday(cell.date);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start gap-0.5 transition-all text-sm relative
                      ${isSelected ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted/50"}
                      ${today ? "ring-1 ring-[#EE770E]" : ""}
                    `}
                  >
                    <span className={`text-xs font-medium ${today ? "text-[#EE770E]" : ""}`}>{cell.day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center max-w-full overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color || EVENT_COLORS[ev.eventType] || "#EE770E" }} />
                        ))}
                        {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate ? selectedDayLabel : "Selecione um dia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedDate && (
              <p className="text-sm text-muted-foreground">Clique em um dia no calendário para ver os eventos.</p>
            )}
            {selectedDate && selectedDayEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
            )}
            {selectedDayEvents.map((event: any) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="w-1 h-full min-h-[40px] rounded-full" style={{ backgroundColor: event.color || EVENT_COLORS[event.eventType] || "#EE770E" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{event.title}</span>
                    {event.isAuto && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">auto</Badge>
                    )}
                    {event.source === "google" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-400">Google</Badge>
                    )}
                  </div>
                  {!event.allDay && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTime(event.startAt)}
                      {event.endAt && ` - ${formatTime(event.endAt)}`}
                    </p>
                  )}
                  {event.allDay && (
                    <p className="text-xs text-muted-foreground mt-0.5">Dia inteiro</p>
                  )}
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>
                {!event.isAuto && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(event)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {selectedDate && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  const d = new Date(selectedDate);
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  setEventForm({ ...eventForm, date: dateStr });
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar evento
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos Eventos do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {allEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste mês.</p>
          ) : (
            <div className="space-y-2">
              {allEvents.slice(0, 15).map((event: any) => {
                const d = new Date(event.startAt);
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || EVENT_COLORS[event.eventType] || "#EE770E" }} />
                    <span className="text-xs text-muted-foreground w-12 flex-shrink-0">
                      {d.getDate()}/{String(d.getMonth() + 1).padStart(2, "0")}
                    </span>
                    {!event.allDay && (
                      <span className="text-xs text-muted-foreground w-12 flex-shrink-0">{formatTime(event.startAt)}</span>
                    )}
                    {event.allDay && (
                      <span className="text-xs text-muted-foreground w-12 flex-shrink-0">--:--</span>
                    )}
                    <span className="text-sm truncate flex-1">{event.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      {EVENT_LABELS[event.eventType] || "Evento"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
