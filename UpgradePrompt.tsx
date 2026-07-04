import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  feature: string;
  requiredPlan: "pro" | "business";
  description?: string;
}

export function UpgradePrompt({ feature, requiredPlan, description }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const planName = requiredPlan === "pro" ? "Pro" : "Business";

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="rounded-full bg-amber-500/10 p-4">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {feature} é um recurso do plano {planName}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {description || `Faça upgrade para o plano ${planName} para desbloquear ${feature.toLowerCase()} e outros recursos avançados.`}
          </p>
        </div>
        <Button
          onClick={() => setLocation("/billing")}
          className="mt-2 gap-2"
        >
          <Crown className="h-4 w-4" />
          Ver planos
        </Button>
      </CardContent>
    </Card>
  );
}

export function LimitReachedPrompt({ resource, current, max }: { resource: string; current: number; max: number }) {
  const [, setLocation] = useLocation();

  return (
    <Card className="border-dashed border-red-500/50 bg-red-500/5">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="rounded-full bg-red-500/10 p-3">
          <Lock className="h-6 w-6 text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            Limite atingido: {current}/{max} {resource}
          </h3>
          <p className="text-sm text-muted-foreground">
            Faça upgrade do seu plano para adicionar mais {resource.toLowerCase()}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/billing")}
          className="mt-1 gap-2"
        >
          <Crown className="h-4 w-4" />
          Fazer upgrade
        </Button>
      </CardContent>
    </Card>
  );
}
