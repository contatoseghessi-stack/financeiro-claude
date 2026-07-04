import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, CalendarDays, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const REGIME_INFO = {
  mei: {
    title: "MEI — Microempreendedor Individual",
    description: "DAS fixo mensal (~R$75,90 em 2025). Limite de faturamento: R$81.000/ano.",
    taxes: [
      { name: "DAS Mensal", desc: "Valor fixo que inclui INSS + ISS ou ICMS", value: "~R$75,90/mês" },
      { name: "Limite Anual", desc: "Faturamento máximo permitido", value: "R$81.000" },
      { name: "DASN-SIMEI", desc: "Declaração anual obrigatória (até 31/mai)", value: "Anual" },
    ],
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  simples: {
    title: "ME / Simples Nacional",
    description: "Alíquotas progressivas por faixa de faturamento (Anexos I a V). DAS mensal calculado sobre receita bruta.",
    taxes: [
      { name: "DAS Mensal", desc: "Alíquota efetiva sobre faturamento bruto (6% a 33%)", value: "Variável" },
      { name: "Fator R", desc: "Se folha > 28% do faturamento, pode usar Anexo III (menor alíquota)", value: "Verificar" },
      { name: "DEFIS", desc: "Declaração de Informações Socioeconômicas (até 31/mar)", value: "Anual" },
      { name: "Pró-labore", desc: "INSS sobre pró-labore (11%)", value: "11%" },
    ],
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  autonomo: {
    title: "Pessoa Física / Autônomo",
    description: "Carnê-leão mensal com tabela progressiva do IR. INSS como contribuinte individual.",
    taxes: [
      { name: "Carnê-leão", desc: "IR mensal sobre rendimentos (tabela progressiva 7,5% a 27,5%)", value: "Mensal" },
      { name: "INSS Individual", desc: "20% sobre rendimento (limitado ao teto)", value: "20%" },
      { name: "IRPF Anual", desc: "Declaração de ajuste anual (até 30/mai)", value: "Anual" },
      { name: "ISS", desc: "Imposto sobre serviço (varia por município, 2% a 5%)", value: "2-5%" },
    ],
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
};

export default function Impostos() {
  const { user } = useAuth();
  const { data: reminders, isLoading } = trpc.tax.list.useQuery();

  const regime = (user?.businessType as keyof typeof REGIME_INFO) || "mei";
  const info = REGIME_INFO[regime];

  const now = new Date();

  const getNextDue = (reminder: { type: string; dueDay: number; dueMonth: number | null; isRecurring: boolean }) => {
    const today = new Date();
    if (reminder.type === "irpf" && reminder.dueMonth) {
      let year = today.getFullYear();
      let due = new Date(year, reminder.dueMonth - 1, reminder.dueDay);
      if (due < today) due = new Date(year + 1, reminder.dueMonth - 1, reminder.dueDay);
      return due;
    }
    let month = today.getMonth();
    let year = today.getFullYear();
    let due = new Date(year, month, reminder.dueDay);
    if (due < today) {
      month++;
      if (month > 11) { month = 0; year++; }
      due = new Date(year, month, reminder.dueDay);
    }
    return due;
  };

  const getStatus = (dueDate: Date) => {
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Vencido", color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle };
    if (diffDays <= 7) return { label: `${diffDays}d`, color: "text-amber-400", bg: "bg-amber-500/10", icon: AlertTriangle };
    if (diffDays <= 30) return { label: `${diffDays}d`, color: "text-blue-400", bg: "bg-blue-500/10", icon: CalendarDays };
    return { label: `${diffDays}d`, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impostos</h1>
        <p className="text-muted-foreground text-sm">Calendário de obrigações fiscais</p>
      </div>

      {/* Regime Info Card */}
      <Card className={`border-primary/20 ${info.bg}`}>
        <CardContent className="p-5">
          <div className="flex gap-3 items-start mb-4">
            <Receipt className={`h-5 w-5 ${info.color} shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm font-semibold ${info.color}`}>{info.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {info.taxes.map((tax) => (
              <div key={tax.name} className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <div>
                  <p className="text-sm font-medium">{tax.name}</p>
                  <p className="text-xs text-muted-foreground">{tax.desc}</p>
                </div>
                <span className={`text-sm font-semibold ${info.color}`}>{tax.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 p-2 rounded bg-background/30">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Você pode alterar seu regime tributário nas Configurações.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Lembretes de Vencimento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            [1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)
          ) : reminders?.length === 0 ? (
            <Card className="col-span-full border-border/50 bg-card/80">
              <CardContent className="p-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum lembrete configurado</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione lembretes de DAS, IRPF ou outros impostos.</p>
              </CardContent>
            </Card>
          ) : (
            reminders?.map(reminder => {
              const nextDue = getNextDue(reminder);
              const status = getStatus(nextDue);
              const StatusIcon = status.icon;
              const frequency = reminder.type === "irpf" ? "Anual" : "Mensal";
              return (
                <Card key={reminder.id} className="border-border/50 bg-card/80 backdrop-blur">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${status.bg}`}>
                          <StatusIcon className={`h-5 w-5 ${status.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{reminder.name}</h3>
                          <p className="text-xs text-muted-foreground">{frequency}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Próximo vencimento</span>
                        <span className="font-medium">{nextDue.toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dia de vencimento</span>
                        <span className="font-medium">Dia {reminder.dueDay}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-medium ${reminder.isActive ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {reminder.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                    {reminder.description && (
                      <p className="text-xs text-muted-foreground mt-3 p-2 bg-secondary/50 rounded">{reminder.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
