import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquarePlus, Bug, Lightbulb, Send, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  reviewed: { label: "Analisado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_progress: { label: "Em andamento", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  done: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  dismissed: { label: "Descartado", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

export default function Feedback() {
  const { user } = useAuth();
  const [type, setType] = useState<"suggestion" | "bug">("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const isAdmin = user?.role === "admin";

  const myFeedback = trpc.feedback.myList.useQuery();
  const allFeedback = trpc.feedback.listAll.useQuery(undefined, { enabled: isAdmin });
  const createMutation = trpc.feedback.create.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado! Obrigado!");
      setTitle("");
      setDescription("");
      myFeedback.refetch();
      if (isAdmin) allFeedback.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      allFeedback.refetch();
      myFeedback.refetch();
      toast.success("Status atualizado");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({ type, title: title.trim(), description: description.trim() || undefined });
  };

  const feedbackList = isAdmin ? (allFeedback.data || []) : (myFeedback.data || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquarePlus className="h-6 w-6 text-orange-500" />
          Feedback
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie sugestões de melhorias ou reporte bugs que encontrar.
        </p>
      </div>

      {/* Form */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Novo Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-[180px]">
                <Select value={type} onValueChange={(v) => setType(v as "suggestion" | "bug")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        Sugestão
                      </span>
                    </SelectItem>
                    <SelectItem value="bug">
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-red-400" />
                        Bug
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Título breve do feedback..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1"
              />
            </div>
            <Textarea
              placeholder="Descreva com mais detalhes (opcional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Button type="submit" disabled={!title.trim() || createMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {isAdmin ? "Todos os Feedbacks" : "Meus Feedbacks"}
        </h2>
        {feedbackList.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquarePlus className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum feedback enviado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((item: any) => (
              <Card key={item.id} className="border-border/50">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === "bug" ? (
                          <Bug className="h-4 w-4 text-red-400 shrink-0" />
                        ) : (
                          <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0" />
                        )}
                        <span className="font-medium truncate">{item.title}</span>
                        {isAdmin && item.userName && (
                          <span className="text-xs text-muted-foreground">— {item.userName}</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground ml-6">{item.description}</p>
                      )}
                      {item.adminNotes && (
                        <p className="text-sm text-blue-400 ml-6 mt-1 italic">Resposta: {item.adminNotes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 ml-6">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin ? (
                        <Select
                          value={item.status}
                          onValueChange={(v) => updateStatusMutation.mutate({ id: item.id, status: v as any })}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="reviewed">Analisado</SelectItem>
                            <SelectItem value="in_progress">Em andamento</SelectItem>
                            <SelectItem value="done">Concluído</SelectItem>
                            <SelectItem value="dismissed">Descartado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={statusLabels[item.status]?.color || ""}>
                          {item.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {item.status === "done" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {item.status === "dismissed" && <XCircle className="h-3 w-3 mr-1" />}
                          {statusLabels[item.status]?.label || item.status}
                        </Badge>
                      )}
                    </div>
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
