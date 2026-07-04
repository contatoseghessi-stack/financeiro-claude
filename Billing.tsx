import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Crown, Rocket, Zap, ExternalLink, Loader2, X, Sparkles, Brain, FileSearch, MessageSquare, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const { user } = useAuth();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data: planData } = trpc.billing.getPlan.useQuery();
  const { data: plans } = trpc.billing.getPlans.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecionando para o checkout - uma nova aba foi aberta.");
      }
      setCheckoutLoading(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setCheckoutLoading(null);
    },
  });

  const createPortal = trpc.billing.createPortal.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleUpgrade = (planId: "pro" | "business") => {
    setCheckoutLoading(planId);
    createCheckout.mutate({ planId });
  };

  const currentPlan = planData?.currentPlan || "free";

  const planIcons: Record<string, React.ReactNode> = {
    free: <Zap className="h-6 w-6" />,
    pro: <Rocket className="h-6 w-6" />,
    business: <Crown className="h-6 w-6" />,
  };

  const planColors: Record<string, string> = {
    free: "border-zinc-700",
    pro: "border-indigo-500 ring-2 ring-indigo-500/20",
    business: "border-amber-500 ring-2 ring-amber-500/20",
  };

  function formatLimit(value: number): string {
    if (value === -1) return "Ilimitado";
    return value.toString();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold">Planos & Assinatura</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano e acompanhe o uso do sistema.
        </p>
      </div>

      {/* Current Plan Banner */}
      {planData && (
        <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {planIcons[currentPlan]}
              <div>
                <p className="font-semibold">Plano atual: {planData.planName}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPlan === "free"
                    ? "Faça upgrade para desbloquear Inteligência Artificial e mais"
                    : "Você tem acesso a recursos avançados com IA"}
                </p>
              </div>
            </div>
            {planData.hasSubscription && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createPortal.mutate()}
                disabled={createPortal.isPending}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Gerenciar assinatura
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Feature Highlight Banner */}
      {currentPlan === "free" && (
        <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/30">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-violet-500/20">
                <Sparkles className="h-8 w-8 text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  Inteligência Artificial
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">PRO</Badge>
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Desbloqueie o poder da IA para automatizar sua gestão financeira. 
                  Categorização automática de faturas, insights inteligentes, assistente pessoal e muito mais.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AIFeatureCard
                    icon={<Brain className="h-5 w-5 text-violet-400" />}
                    title="Categorização Automática"
                    description="IA categoriza suas faturas automaticamente"
                  />
                  <AIFeatureCard
                    icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
                    title="Insights Financeiros"
                    description="Análises e dicas personalizadas com IA"
                  />
                  <AIFeatureCard
                    icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
                    title="Assistente IA"
                    description="Tire dúvidas sobre suas finanças"
                  />
                  <AIFeatureCard
                    icon={<FileSearch className="h-5 w-5 text-amber-400" />}
                    title="Scan de Documentos"
                    description="Extraia dados de NFs e faturas com IA"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Stats */}
      {usage && planData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uso este mês</CardTitle>
            <CardDescription>Acompanhe seus limites de uso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar
              label="Transações"
              current={usage.transactionsThisMonth}
              max={planData.limits.maxTransactionsPerMonth}
            />
            <UsageBar
              label="Jobs ativos"
              current={usage.activeJobs}
              max={planData.limits.maxActiveJobs}
            />
            <UsageBar
              label="Cartões"
              current={usage.totalCards}
              max={planData.limits.maxCards}
            />
            <UsageBar
              label="Categorias"
              current={usage.totalCategories}
              max={planData.limits.maxCategories}
            />
            <UsageBar
              label="Recorrências"
              current={usage.totalRecurrences}
              max={planData.limits.maxRecurrences}
            />
            <UsageBar
              label="Uploads de fatura"
              current={usage.uploadsThisMonth}
              max={planData.limits.maxUploadsPerMonth}
            />
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      {plans && (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${planColors[plan.id]} ${
                plan.id === currentPlan ? "bg-accent/5" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white">
                  Mais popular
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  {planIcons[plan.id]}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    {plan.priceMonthly === 0
                      ? "Grátis"
                      : `R$${(plan.priceMonthly / 100).toFixed(0)}`}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-muted-foreground">/mês</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  <FeatureItem text={`${formatLimit(plan.limits.maxActiveJobs)} jobs ativos`} />
                  <FeatureItem text={`${formatLimit(plan.limits.maxTransactionsPerMonth)} transações/mês`} />
                  <FeatureItem text={`${formatLimit(plan.limits.maxCards)} cartões`} />
                  <FeatureItem text={`${formatLimit(plan.limits.maxCategories)} categorias`} />
                  <FeatureItem text={`${formatLimit(plan.limits.maxRecurrences)} recorrências`} />
                  <FeatureItem text={`${formatLimit(plan.limits.maxUploadsPerMonth)} uploads/mês`} />
                  <FeatureItem
                    text="Relatórios PDF"
                    available={plan.limits.hasReportsPDF}
                  />
                  <FeatureItem
                    text="DRE e Projeções"
                    available={plan.limits.hasDRE}
                  />
                  <FeatureItem
                    text="Metas financeiras"
                    available={plan.limits.hasGoals}
                  />
                  <FeatureItem
                    text="Orçamentos"
                    available={plan.limits.hasQuotes}
                  />
                  <FeatureItem
                    text="Bot Telegram"
                    available={plan.limits.hasTelegram}
                  />

                  {/* AI Features - highlighted */}
                  <li className="pt-2 border-t border-border/50 mt-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Inteligência Artificial
                    </span>
                  </li>
                  <FeatureItem
                    text="Categorização automática com IA"
                    available={plan.limits.hasAI}
                    highlight={plan.limits.hasAI}
                  />
                  <FeatureItem
                    text="Insights financeiros com IA"
                    available={plan.limits.hasAI}
                    highlight={plan.limits.hasAI}
                  />
                  <FeatureItem
                    text="Assistente IA pessoal"
                    available={plan.limits.hasAI}
                    highlight={plan.limits.hasAI}
                  />
                  <FeatureItem
                    text="Scan de documentos com IA"
                    available={plan.limits.hasDocumentScan}
                    highlight={plan.limits.hasDocumentScan}
                  />
                  <FeatureItem
                    text="Relatórios gerados por IA"
                    available={plan.limits.hasAI}
                    highlight={plan.limits.hasAI}
                  />

                  <FeatureItem
                    text="Suporte prioritário"
                    available={plan.limits.hasPrioritySupport}
                  />
                </ul>
              </CardContent>
              <CardFooter>
                {plan.id === currentPlan ? (
                  <Button className="w-full" variant="outline" disabled>
                    Plano atual
                  </Button>
                ) : plan.id === "free" ? (
                  <Button className="w-full" variant="outline" disabled>
                    Incluído
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.id as "pro" | "business")}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {currentPlan === "pro" && plan.id === "business"
                      ? "Trocar plano"
                      : "Fazer upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perguntas frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">O que a IA faz no plano Pro?</p>
            <p className="text-muted-foreground">
              A IA categoriza suas faturas automaticamente, gera insights financeiros personalizados, 
              responde perguntas sobre suas finanças e extrai dados de documentos. Tudo para economizar seu tempo.
            </p>
          </div>
          <div>
            <p className="font-medium">Posso cancelar a qualquer momento?</p>
            <p className="text-muted-foreground">
              Sim! Cancele quando quiser pelo portal de pagamento. Você mantém o acesso até o fim do período pago.
            </p>
          </div>
          <div>
            <p className="font-medium">O que acontece se eu atingir o limite?</p>
            <p className="text-muted-foreground">
              Você receberá um aviso e não poderá criar novos itens até o próximo mês ou fazer upgrade.
            </p>
          </div>
          <div>
            <p className="font-medium">Posso trocar de plano depois?</p>
            <p className="text-muted-foreground">
              Sim! Faça upgrade ou downgrade a qualquer momento. A diferença é calculada proporcionalmente.
            </p>
          </div>
          <div>
            <p className="font-medium">Quais formas de pagamento são aceitas?</p>
            <p className="text-muted-foreground">
              Cartão de crédito (Visa, Mastercard, Amex) via Stripe, a plataforma de pagamentos mais segura do mundo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FeatureItem({ text, available = true, highlight = false }: { text: string; available?: boolean; highlight?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${!available ? "text-muted-foreground" : ""} ${highlight ? "text-violet-300" : ""}`}>
      {available ? (
        <Check className={`h-4 w-4 flex-shrink-0 ${highlight ? "text-violet-400" : "text-green-500"}`} />
      ) : (
        <X className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
      )}
      <span className={!available ? "line-through" : ""}>{text}</span>
    </li>
  );
}

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === -1;
  const percent = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = !isUnlimited && percent >= 80;
  const isAtLimit = !isUnlimited && percent >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isAtLimit ? "text-red-500 font-medium" : isNearLimit ? "text-amber-500" : "text-muted-foreground"}>
          {current} / {isUnlimited ? "∞" : max}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percent}
          className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
        />
      )}
    </div>
  );
}
