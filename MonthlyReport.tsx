import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function MonthlyReport() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = trpc.monthlyReport.generate.useMutation({
    onSuccess: (data: any) => {
      setReport(data.report);
      setLoading(false);
      toast.success("Relatório gerado!");
    },
    onError: (err: any) => {
      setLoading(false);
      toast.error(err.message || "Erro ao gerar relatório");
    },
  });

  const handleGenerate = () => {
    setLoading(true);
    setReport(null);
    generateReport.mutate({ month, year });
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setReport(null);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setReport(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
          Relatório Mensal IA
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Relatório narrativo com insights do mês.
        </p>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <Select value={String(month)} onValueChange={(v) => { setMonth(Number(v)); setReport(null); }}>
                <SelectTrigger className="w-[110px] sm:w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setReport(null); }}>
                <SelectTrigger className="w-[80px] sm:w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2" size="default">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? "Gerando..." : `Gerar Relatório`}
      </Button>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <div>
              <p className="font-medium">Analisando dados de {MONTH_NAMES[month - 1]}...</p>
              <p className="text-sm text-muted-foreground">
                Comparando receitas, despesas, jobs e tendências
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Relatório de {MONTH_NAMES[month - 1]} {year}
            </CardTitle>
            <CardDescription>Gerado por IA com base nos seus dados reais</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{report}</Streamdown>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="font-medium text-lg">Nenhum relatório gerado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione o mês e clique em "Gerar Relatório" para a IA criar uma análise completa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
