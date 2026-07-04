import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, Users, Gift, Trophy, Star, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TIERS = [
  { required: 3, discount: 10, icon: Star, label: "Bronze" },
  { required: 5, discount: 20, icon: Trophy, label: "Prata" },
  { required: 10, discount: 50, icon: Crown, label: "Ouro" },
];

export default function Invite() {
  const { data: codeData, isLoading: loadingCode } = trpc.invite.getMyCode.useQuery();
  const { data: statsData, isLoading: loadingStats } = trpc.invite.getStats.useQuery();
  const claimDiscount = trpc.invite.claimDiscount.useMutation({
    onSuccess: (data) => {
      toast.success(`Desconto de ${data.discountPercent}% aplicado na sua assinatura!`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const [copied, setCopied] = useState(false);

  const inviteUrl = codeData?.code
    ? `${window.location.origin}?ref=${codeData.code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Eugê Financeiro",
        text: "Controle suas finanças de forma simples e inteligente. Crie sua conta grátis!",
        url: inviteUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const paidCount = statsData?.paidInviteCount || 0;
  const currentDiscount = statsData?.currentDiscount || 0;
  const nextTier = statsData?.nextTier;

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Convidar Pessoas</h1>
        <p className="text-muted-foreground mt-1">
          Indique amigos e ganhe desconto na sua assinatura quando eles assinarem.
        </p>
      </div>

      {/* Referral Bonus Progress */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Programa de Indicações
          </CardTitle>
          <CardDescription>
            Indique amigos que assinem Pro ou Business e ganhe desconto permanente na sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{paidCount}</div>
              <p className="text-xs text-muted-foreground">indicações pagas</p>
            </div>
            {currentDiscount > 0 && (
              <Badge variant="default" className="text-lg px-3 py-1 bg-emerald-600">
                {currentDiscount}% OFF
              </Badge>
            )}
          </div>

          {/* Progress Tiers */}
          <div className="space-y-3">
            {TIERS.map((tier) => {
              const TierIcon = tier.icon;
              const isAchieved = paidCount >= tier.required;
              const progress = Math.min((paidCount / tier.required) * 100, 100);

              return (
                <div
                  key={tier.required}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isAchieved
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <TierIcon className={`h-5 w-5 shrink-0 ${isAchieved ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isAchieved ? "text-emerald-500" : ""}`}>
                        {tier.label} — {tier.discount}% de desconto
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.min(paidCount, tier.required)}/{tier.required}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAchieved ? "bg-emerald-500" : "bg-primary/60"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {isAchieved && (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Next goal message */}
          {nextTier && (
            <p className="text-sm text-muted-foreground text-center">
              Faltam <span className="font-bold text-primary">{nextTier.required - paidCount}</span> indicações pagas para desbloquear{" "}
              <span className="font-bold">{nextTier.discount}% de desconto</span>
            </p>
          )}

          {/* Claim button */}
          {currentDiscount > 0 && (
            <Button
              onClick={() => claimDiscount.mutate()}
              disabled={claimDiscount.isPending}
              className="w-full"
              variant="default"
            >
              <Gift className="h-4 w-4 mr-2" />
              {claimDiscount.isPending ? "Aplicando..." : `Aplicar ${currentDiscount}% de desconto na minha assinatura`}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invite Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Seu Link de Convite
            </CardTitle>
            <CardDescription>
              Compartilhe este link para convidar pessoas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCode ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border border-border truncate"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCopy} variant="outline" className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button onClick={handleShare} className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seus Convidados
            </CardTitle>
            <CardDescription>
              Pessoas que se cadastraram pelo seu link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-20 bg-muted animate-pulse rounded" />
            ) : (
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="text-center">
                  <div className="text-3xl font-bold">{statsData?.inviteCount || 0}</div>
                  <p className="text-muted-foreground text-xs mt-1">cadastrados</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{paidCount}</div>
                  <p className="text-muted-foreground text-xs mt-1">assinantes</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invitees List */}
      {statsData && statsData.invitees.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quem se cadastrou</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statsData.invitees.map((invitee) => (
                <div key={invitee.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{invitee.name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{invitee.email || "Sem email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(invitee.plan === "pro" || invitee.plan === "business") ? (
                      <Badge variant="default" className="bg-emerald-600 text-xs">
                        {invitee.plan === "pro" ? "Pro" : "Business"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Grátis</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(invitee.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium text-sm mb-1">1. Compartilhe</h4>
              <p className="text-xs text-muted-foreground">Envie seu link para amigos freelancers</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium text-sm mb-1">2. Eles assinam</h4>
              <p className="text-xs text-muted-foreground">Quando assinarem Pro ou Business, conta pra você</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium text-sm mb-1">3. Ganhe desconto</h4>
              <p className="text-xs text-muted-foreground">3 = 10%, 5 = 20%, 10 = 50% off permanente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
