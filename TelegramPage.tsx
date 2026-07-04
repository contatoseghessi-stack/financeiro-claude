import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Send, Hash, CheckCircle2, Link2, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";

export default function TelegramPage() {
  // ALL hooks must be called before any conditional returns
  const { canUseFeature } = usePlan();
  const [setting, setSetting] = useState(false);
  const setupWebhook = trpc.telegram.setupWebhook.useMutation({
    onSuccess: (data) => {
      if (data?.ok) toast.success("Webhook configurado com sucesso!");
      else toast.error("Erro ao configurar webhook");
      setSetting(false);
    },
    onError: () => {
      toast.error("Erro ao configurar webhook");
      setSetting(false);
    },
  });

  // Conditional returns AFTER all hooks
  if (!canUseFeature("telegram")) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Bot Telegram</h1>
        <UpgradePrompt feature="Bot Telegram" requiredPlan="business" description="Envie faturas de cartão de crédito pelo Telegram e categorize despesas automaticamente com IA." />
      </div>
    );
  }

  const handleSetup = () => {
    setSetting(true);
    const baseUrl = window.location.origin;
    setupWebhook.mutate({ baseUrl });
  };

  const commands = [
    { cmd: "cartão PF 150 mercado", desc: "Registra despesa de R$150 no cartão Pessoal, categoria mercado" },
    { cmd: "cartão PJ 500 software", desc: "Registra despesa de R$500 no cartão Empresa" },
    { cmd: "familiar 200 restaurante", desc: "Registra despesa de R$200 no cartão Familiar" },
    { cmd: "receita PJ 3000 cliente X", desc: "Registra receita de R$3.000 na empresa" },
    { cmd: "receita PF 1500 freelance", desc: "Registra receita pessoal de R$1.500" },
    { cmd: "/resumo", desc: "Resumo financeiro do mês atual" },
    { cmd: "/cartoes", desc: "Gastos por cartão no mês" },
    { cmd: "/ajuda", desc: "Lista de comandos disponíveis" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bot Telegram</h1>
        <p className="text-muted-foreground text-sm">Registre transações e receba lembretes direto no Telegram</p>
      </div>

      {/* Setup Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Configuração do Bot</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para começar a usar, abra o Telegram e procure por <strong>@Financeiroeuge_bot</strong>.
                Envie <code>/start</code> para iniciar. Depois, clique no botão abaixo para ativar o webhook.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleSetup} disabled={setting || setupWebhook.isPending} className="gap-2">
                  <Send className="h-4 w-4" />
                  {setting ? "Configurando..." : "Ativar Webhook"}
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://t.me/Financeiroeuge_bot" target="_blank" rel="noopener noreferrer" className="gap-2">
                    <MessageSquare className="h-4 w-4" /> Abrir Bot
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Linking Card */}
      <AccountLinkingCard />

      {/* Commands Reference */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Comandos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {commands.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <div>
                <code className="text-sm font-mono text-primary">{item.cmd}</code>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Como Funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { step: "1", title: "Envie uma mensagem", desc: "Digite no formato: \"cartão PF 150 mercado\" ou \"receita PJ 3000 cliente\"" },
              { step: "2", title: "Registro automático", desc: "O bot identifica o tipo, valor, cartão e categoria automaticamente" },
              { step: "3", title: "Separação PJ/PF", desc: "Transações são separadas entre empresa e pessoal sem mistura" },
              { step: "4", title: "Lembretes de impostos", desc: "Receba alertas de DAS mensal e IRPF anual antes do vencimento" },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountLinkingCard() {
  const { data: status, isLoading } = trpc.telegram.getStatus.useQuery();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Verificando vinculação...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            {status?.connected ? (
              <UserCheck className="h-6 w-6 text-green-500" />
            ) : (
              <Link2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Vinculação de Conta</h3>
            {status?.connected ? (
              <p className="text-sm text-muted-foreground mb-3">
                Sua conta está vinculada ao Telegram
                {status.username ? ` (@${status.username})` : ""}.
                Todas as mensagens enviadas ao bot serão associadas à sua conta.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">
                Vincule sua conta do Telegram para que o bot reconheça você automaticamente.
                Isso permite que múltiplos usuários usem o mesmo bot.
              </p>
            )}
            <Link href="/telegram/vincular">
              <Button variant={status?.connected ? "outline" : "default"} className="gap-2">
                <Link2 className="h-4 w-4" />
                {status?.connected ? "Gerenciar Vinculação" : "Vincular Telegram"}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
