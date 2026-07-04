import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Cash() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    type: "deposit" as "deposit" | "withdrawal" | "adjustment",
    amount: "",
    description: "",
  });

  const balanceQuery = trpc.cash.getBalance.useQuery();
  const movementsQuery = trpc.cash.getMovements.useQuery();
  const addMovementMutation = trpc.cash.addMovement.useMutation({
    onSuccess: () => {
      balanceQuery.refetch();
      movementsQuery.refetch();
      setDialogOpen(false);
      setForm({ type: "deposit", amount: "", description: "" });
      toast.success("Movimentação registrada!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const balance = parseFloat(balanceQuery.data?.balance || "0");

  const handleSubmit = () => {
    if (!form.amount || !form.description) {
      toast.error("Preencha todos os campos");
      return;
    }
    addMovementMutation.mutate(form);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "deposit": return "Entrada";
      case "withdrawal": return "Saída";
      case "adjustment": return "Ajuste";
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit": return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "withdrawal": return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case "adjustment": return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caixa</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Entrada (Depósito)</SelectItem>
                    <SelectItem value="withdrawal">Saída (Retirada)</SelectItem>
                    <SelectItem value="adjustment">Ajuste (Definir saldo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.type === "adjustment" ? "Novo Saldo (R$)" : "Valor (R$)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder={form.type === "adjustment" ? "Ex: 15000.00" : "Ex: 500.00"}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Depósito cliente X, Retirada pró-labore, Ajuste conferência..."
                />
              </div>
              <Button onClick={handleSubmit} disabled={addMovementMutation.isPending} className="w-full">
                {addMovementMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo em Caixa</p>
              <p className={`text-3xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsQuery.isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !movementsQuery.data?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada. Clique em "Nova Movimentação" para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {movementsQuery.data.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(mov.type)}
                    <div>
                      <p className="font-medium text-sm">{mov.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(mov.date)} • {getTypeLabel(mov.type)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      mov.type === "deposit" ? "text-green-600" :
                      mov.type === "withdrawal" ? "text-red-600" : "text-blue-600"
                    }`}>
                      {mov.type === "deposit" ? "+" : mov.type === "withdrawal" ? "-" : ""}
                      {formatCurrency(mov.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saldo: {formatCurrency(mov.newBalance)}
                    </p>
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
