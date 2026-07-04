import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Building2, CreditCard, Tags, Rocket, ArrowRight, ArrowLeft, Check, SkipForward, Briefcase } from "lucide-react";

const DEFAULT_CATEGORIES = [
  { name: "Alimentação", icon: "🍔", color: "#f59e0b", checked: true },
  { name: "Transporte", icon: "🚗", color: "#3b82f6", checked: true },
  { name: "Moradia", icon: "🏠", color: "#8b5cf6", checked: true },
  { name: "Saúde", icon: "💊", color: "#ef4444", checked: true },
  { name: "Educação", icon: "📚", color: "#06b6d4", checked: true },
  { name: "Lazer", icon: "🎬", color: "#ec4899", checked: true },
  { name: "Equipamentos", icon: "📷", color: "#6366f1", checked: true },
  { name: "Software", icon: "💻", color: "#14b8a6", checked: true },
  { name: "Serviços", icon: "🔧", color: "#f97316", checked: false },
  { name: "Vestuário", icon: "👕", color: "#a855f7", checked: false },
  { name: "Assinaturas", icon: "📋", color: "#0ea5e9", checked: true },
  { name: "Outros", icon: "📦", color: "#6b7280", checked: true },
];

const DEFAULT_CARDS = [
  { name: "Cartão Empresa", type: "pj" as const, color: "#EE770E", checked: true },
  { name: "Cartão Pessoal", type: "pf" as const, color: "#6366f1", checked: true },
  { name: "Cartão Familiar", type: "pf" as const, color: "#ec4899", checked: false },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<"mei" | "simples" | "autonomo">("mei");
  const [company, setCompany] = useState({
    nomeFantasia: "",
    cnpj: "",
    cnae: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    email: "",
    telefone: "",
  });
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const setupCompany = trpc.onboarding.setupCompany.useMutation();
  const setupCards = trpc.onboarding.setupCards.useMutation();
  const setupCategories = trpc.onboarding.setupCategories.useMutation();
  const setBusinessTypeMutation = trpc.onboarding.setBusinessType.useMutation();
  const completeOnboarding = trpc.onboarding.complete.useMutation();

  const totalSteps = 6;

  const handleFinish = async () => {
    try {
      // Save business type
      await setBusinessTypeMutation.mutateAsync({ businessType });

      // Save company data if any field is filled
      const hasCompanyData = Object.values(company).some(v => v.trim() !== "");
      if (hasCompanyData) {
        await setupCompany.mutateAsync(company);
      }

      // Save selected cards
      const selectedCards = cards.filter(c => c.checked);
      if (selectedCards.length > 0) {
        await setupCards.mutateAsync({
          cards: selectedCards.map(c => ({ name: c.name, type: c.type, color: c.color })),
        });
      }

      // Save selected categories
      const selectedCategories = categories.filter(c => c.checked);
      if (selectedCategories.length > 0) {
        await setupCategories.mutateAsync({
          categories: selectedCategories.map(c => ({ name: c.name, icon: c.icon, color: c.color })),
        });
      }

      // Mark onboarding as complete
      await completeOnboarding.mutateAsync();
      toast.success("Configuração concluída! Bem-vindo ao sistema.");
      onComplete();
    } catch (e: any) {
      toast.error("Erro ao salvar configurações: " + (e.message || "tente novamente"));
    }
  };

  const handleSkipAll = async () => {
    try {
      // Just mark onboarding complete without saving anything
      await completeOnboarding.mutateAsync();
      toast.info("Você pode configurar tudo depois nas Configurações.");
      onComplete();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "tente novamente"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Passo {step + 1} de {totalSteps}</span>
            <Button variant="ghost" size="sm" onClick={handleSkipAll} className="text-muted-foreground hover:text-foreground">
              <SkipForward className="w-4 h-4 mr-1" />
              Pular tudo
            </Button>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                Bem-vindo ao <span className="text-primary">Financeiro</span>
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Vamos configurar seu sistema financeiro em poucos passos.
                Tudo é opcional — você pode ajustar depois.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <Briefcase className="w-6 h-6 text-primary" />
                  <span className="text-sm text-center">Tipo de Empresa</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <Building2 className="w-6 h-6 text-primary" />
                  <span className="text-sm text-center">Dados da Empresa</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <span className="text-sm text-center">Cartões</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <Tags className="w-6 h-6 text-primary" />
                  <span className="text-sm text-center">Categorias</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep(1)}>
                Começar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Business Type */}
        {step === 1 && (
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Tipo de Empresa</CardTitle>
                  <CardDescription>Isso define como calculamos seus impostos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { value: "mei" as const, label: "MEI", desc: "Microempreendedor Individual — DAS fixo mensal (~R$75), limite R$81k/ano" },
                { value: "simples" as const, label: "ME / Simples Nacional", desc: "Microempresa — alíquotas progressivas por faixa de faturamento" },
                { value: "autonomo" as const, label: "Pessoa Física / Autônomo", desc: "Carnê-leão, INSS individual, tabela progressiva IR" },
              ].map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    businessType === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setBusinessType(option.value)}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    businessType === option.value ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {businessType === option.value && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{option.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-4">
                Você pode alterar isso depois nas Configurações.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Company Name */}
        {step === 2 && (
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Sua Empresa</CardTitle>
                  <CardDescription>Informações básicas (tudo opcional)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input
                    placeholder="Ex: Estúdio Criativo"
                    value={company.nomeFantasia}
                    onChange={e => setCompany({ ...company, nomeFantasia: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={company.cnpj}
                    onChange={e => setCompany({ ...company, cnpj: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNAE</Label>
                  <Input
                    placeholder="Ex: 7420001"
                    value={company.cnae}
                    onChange={e => setCompany({ ...company, cnae: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    placeholder="contato@empresa.com"
                    value={company.email}
                    onChange={e => setCompany({ ...company, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(51) 99999-9999"
                    value={company.telefone}
                    onChange={e => setCompany({ ...company, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade / Estado</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Porto Alegre"
                      value={company.cidade}
                      onChange={e => setCompany({ ...company, cidade: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="RS"
                      value={company.estado}
                      onChange={e => setCompany({ ...company, estado: e.target.value })}
                      className="w-16"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={company.endereco}
                  onChange={e => setCompany({ ...company, endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  placeholder="00000-000"
                  value={company.cep}
                  onChange={e => setCompany({ ...company, cep: e.target.value })}
                  className="w-40"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Cards */}
        {step === 3 && (
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Cartões</CardTitle>
                  <CardDescription>Selecione os cartões que você usa para organizar seus gastos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cards.map((card, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                    card.checked ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => {
                    const updated = [...cards];
                    updated[i] = { ...updated[i], checked: !updated[i].checked };
                    setCards(updated);
                  }}
                >
                  <Checkbox checked={card.checked} />
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="flex-1">
                    <Input
                      value={card.name}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        const updated = [...cards];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setCards(updated);
                      }}
                      className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0"
                    />
                    <span className="text-xs text-muted-foreground uppercase">{card.type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}</span>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCards([...cards, { name: "Novo Cartão", type: "pf", color: "#6b7280", checked: true }])}
              >
                + Adicionar cartão
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Categories */}
        {step === 4 && (
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Tags className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Categorias de Despesa</CardTitle>
                  <CardDescription>Escolha as categorias para classificar seus gastos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      cat.checked ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    }`}
                    onClick={() => {
                      const updated = [...categories];
                      updated[i] = { ...updated[i], checked: !updated[i].checked };
                      setCategories(updated);
                    }}
                  >
                    <Checkbox checked={cat.checked} />
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Finish */}
        {step === 5 && (
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold">Tudo pronto!</CardTitle>
              <CardDescription className="text-base mt-2">
                Seu sistema financeiro está configurado. Você pode ajustar tudo depois nas Configurações.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Regime: <strong>{businessType === "mei" ? "MEI" : businessType === "simples" ? "Simples Nacional" : "Autônomo/PF"}</strong></span>
                </div>
                {Object.values(company).some(v => v.trim() !== "") && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Dados da empresa: <strong>{company.nomeFantasia || "configurado"}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{cards.filter(c => c.checked).length} cartão(ões) selecionado(s)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{categories.filter(c => c.checked).length} categoria(s) selecionada(s)</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Próximos passos: adicione transações, configure recorrências e acompanhe tudo pelo dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        {step > 0 && (
          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            {step < 5 ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(step + 1)} className="text-muted-foreground">
                  Pular
                </Button>
                <Button onClick={() => setStep(step + 1)}>
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={completeOnboarding.isPending || setupCards.isPending || setupCategories.isPending || setBusinessTypeMutation.isPending}
                size="lg"
              >
                {completeOnboarding.isPending ? "Salvando..." : "Finalizar e Entrar"}
                <Rocket className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
