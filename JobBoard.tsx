import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, GripVertical, Calendar, DollarSign, User, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const STAGES = [
  { id: "briefing", label: "Briefing", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "producao", label: "Produção", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "edicao", label: "Edição", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "entrega", label: "Entrega", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "pagamento", label: "Pagamento", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
] as const;

type Stage = typeof STAGES[number]["id"];

export default function JobBoard() {
  const { data: allJobs, isLoading, refetch } = trpc.jobs.list.useQuery({});
  const updateStage = trpc.jobs.updateStage.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [draggedJob, setDraggedJob] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Only show active jobs (not cancelled/completed unless in pagamento)
  const activeJobs = (allJobs || []).filter(
    (j: any) => j.status !== "cancelled"
  );

  const getJobsByStage = (stage: string) => {
    return activeJobs.filter((j: any) => (j.stage || "briefing") === stage);
  };

  const handleDragStart = (e: React.DragEvent, jobId: number) => {
    setDraggedJob(jobId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(jobId));
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    setDragOverStage(null);
    const jobId = parseInt(e.dataTransfer.getData("text/plain"));
    if (jobId && !isNaN(jobId)) {
      updateStage.mutate({ id: jobId, stage });
      toast.success(`Job movido para ${STAGES.find(s => s.id === stage)?.label}`);
    }
    setDraggedJob(null);
  };

  const getDaysUntilDeadline = (endDate: number | null) => {
    if (!endDate) return null;
    const now = Date.now();
    const diff = endDate - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (val: string | null) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Board de Jobs</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Arraste entre colunas para atualizar
          </p>
        </div>
        <Link href="/jobs">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Lista
          </Button>
        </Link>
      </div>

      <div className="flex md:grid md:grid-cols-5 gap-3 min-h-[70vh] overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory md:snap-none md:overflow-visible md:mx-0 md:px-0">
        {STAGES.map((stage) => {
          const stageJobs = getJobsByStage(stage.id);
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              style={{ animationDelay: `${STAGES.indexOf(stage) * 60}ms` }}
              className={`flex flex-col rounded-xl border transition-all duration-200 min-w-[200px] md:min-w-0 snap-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${
                isOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/50 bg-card/50"
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${stage.color} text-xs font-medium`}>
                    {stage.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {stageJobs.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(70vh-60px)]">
                {stageJobs.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border border-dashed border-border/30 rounded-lg">
                    Arraste jobs aqui
                  </div>
                )}
                {stageJobs.map((job: any) => {
                  const daysLeft = getDaysUntilDeadline(job.endDate);
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
                  const isDragging = draggedJob === job.id;

                  return (
                    <Card
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      onDragEnd={() => setDraggedJob(null)}
                      className={`cursor-grab active:cursor-grabbing transition-all duration-150 border-border/40 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 ${
                        isDragging ? "opacity-40 scale-95" : ""
                      } ${isOverdue ? "border-red-500/50" : ""}`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-medium leading-tight line-clamp-2">
                            {job.name}
                          </p>
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        </div>

                        {job.clientName && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{job.clientName}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {formatCurrency(job.totalCharged) && (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-medium">{formatCurrency(job.totalCharged)}</span>
                            </div>
                          )}

                          {daysLeft !== null && (
                            <div
                              className={`flex items-center gap-1 text-xs ${
                                isOverdue
                                  ? "text-red-400"
                                  : isUrgent
                                  ? "text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isOverdue && <AlertTriangle className="h-3 w-3" />}
                              <Calendar className="h-3 w-3" />
                              <span>
                                {isOverdue
                                  ? `${Math.abs(daysLeft)}d atraso`
                                  : `${daysLeft}d`}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
