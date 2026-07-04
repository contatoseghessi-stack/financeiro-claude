import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, RefreshCw, TrendingUp, Users, Calendar, DollarSign, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Insight = {
  type: "client_reactivation" | "ticket_trend" | "profitability" | "seasonality" | "general";
  title: string;
  description: string;
  action?: string;
  priority: "high" | "medium" | "low";
};

const INSIGHT_ICONS: Record<string, any> = {
  client_reactivation: Users,
  ticket_trend: TrendingUp,
  profitability: DollarSign,
  seasonality: Calendar,
  general: Lightbulb,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const generateInsights = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      setInsights(data.insights);
      setLastGenerated(new Date());
      setLoading(false);
      toast.success("Insights gerados com sucesso!");
    },
    onError: (err) => {
      setLoading(false);
      toast.error(err.message || "Erro ao gerar insights");
    },
  });

  const handleGenerate = () => {
    setLoading(true);
    generateInsights.mutate();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
            Radar de Oportunidades
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            A IA analisa seus dados e identifica oportunidades.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={loading} size="sm" className="gap-2 self-start">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {loading ? "Analisando..." : "Gerar Insights"}
        </Button>
      </div>

      {lastGenerated && (
        <p className="text-xs text-muted-foreground">
          Última análise: {lastGenerated.toLocaleString("pt-BR")}
        </p>
      )}

      {/* Empty State */}
      {insights.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="font-medium text-lg">Nenhum insight gerado ainda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Gerar Insights" para a IA analisar seus dados financeiros e de jobs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <div>
              <p className="font-medium">Analisando seus dados...</p>
              <p className="text-sm text-muted-foreground">
                Verificando clientes, ticket médio, rentabilidade e sazonalidade
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Grid */}
      {insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((insight, idx) => {
            const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;
            return (
              <Card key={idx} className="border-border/50 hover:border-primary/30 transition-all animate-in fade-in-0 slide-in-from-left-3 duration-300" style={{ animationDelay: `${idx * 80}ms` }}>
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start gap-2.5 sm:gap-4">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                      <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="font-semibold text-xs sm:text-sm">{insight.title}</h3>
                        <Badge variant="outline" className={`text-[9px] sm:text-[10px] ${PRIORITY_COLORS[insight.priority]}`}>
                          {insight.priority === "high" ? "Urgente" : insight.priority === "medium" ? "Importante" : "Sugestão"}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{insight.description}</p>
                      {insight.action && (
                        <p className="text-[11px] sm:text-xs text-primary font-medium mt-1">
                          💡 {insight.action}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
