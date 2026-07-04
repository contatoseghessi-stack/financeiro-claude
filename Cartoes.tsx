import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const MONTH_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Cartoes() {
  const { data: cardsData, isLoading } = trpc.cards.list.useQuery();

  // Month navigation state
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).getTime();
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).getTime();
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  const monthName = `${MONTH_FULL[selectedMonth]} de ${selectedYear}`;

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const { data: dashboard } = trpc.dashboard.summary.useQuery({ startDate, endDate });

  // Total spending across all cards
  const totalSpending = useMemo(() => {
    if (!dashboard?.byCard) return 0;
    return dashboard.byCard.reduce((sum: number, c: any) => sum + parseFloat(String(c.total || 0)), 0);
  }, [dashboard]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Cartões</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={prevMonth}>
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <h1 className="text-base sm:text-2xl font-bold tracking-tight capitalize min-w-0 sm:min-w-[220px] text-center">{monthName}</h1>
          <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={nextMonth}>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm text-muted-foreground">Total do mês</p>
          <p className="text-lg sm:text-xl font-bold text-red-400">{formatCurrency(totalSpending)}</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cardsData?.map(card => {
          const found = dashboard?.byCard.find((c: any) => c.cardId === card.id);
          const total = found ? parseFloat(String(found.total)) : 0;
          return (
            <Card key={card.id} className="border-border/50 bg-card/80 backdrop-blur overflow-hidden relative group">
              <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${card.color}, transparent)` }} />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + "20" }}>
                    <CreditCard className="h-6 w-6" style={{ color: card.color }} />
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${card.type === "pj" ? "bg-violet-500/10 text-violet-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {card.type === "pj" ? "Empresa" : "Pessoal"}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{card.name}</h3>
                <p className="text-3xl font-bold mt-2" style={{ color: card.color }}>{formatCurrency(total)}</p>
                <p className="text-xs text-muted-foreground mt-1">gasto neste mês</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Card spending comparison */}
      {cardsData && cardsData.length > 0 && (
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comparativo de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cardsData.map(card => {
                const found = dashboard?.byCard.find((c: any) => c.cardId === card.id);
                const total = found ? parseFloat(String(found.total)) : 0;
                const maxTotal = Math.max(...(cardsData.map(c => {
                  const f = dashboard?.byCard.find((bc: any) => bc.cardId === c.id);
                  return f ? parseFloat(String(f.total)) : 0;
                })), 1);
                const pct = (total / maxTotal) * 100;
                return (
                  <div key={card.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{card.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(total)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: card.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
