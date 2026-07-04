import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Briefcase,
  BarChart3,
  Repeat,
  Target,
  Bot,
  Check,
  Crown,
  Zap,
  Shield,
} from "lucide-react";
import { useEffect } from "react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard Inteligente",
    description: "Visão completa da saúde financeira do seu negócio em tempo real.",
  },
  {
    icon: ArrowLeftRight,
    title: "Transações",
    description: "Registre receitas e despesas com categorização automática.",
  },
  {
    icon: CreditCard,
    title: "Cartões & Faturas",
    description: "Gerencie múltiplos cartões e importe faturas em PDF.",
  },
  {
    icon: Briefcase,
    title: "Gestão de Jobs",
    description: "Controle projetos, custos, entregas e recebimentos.",
  },
  {
    icon: BarChart3,
    title: "DRE & Relatórios",
    description: "Demonstrativo de resultados e projeções financeiras.",
  },
  {
    icon: Repeat,
    title: "Recorrências",
    description: "Automatize lançamentos mensais e acompanhe projeções.",
  },
  {
    icon: Target,
    title: "Metas",
    description: "Defina objetivos de faturamento e acompanhe o progresso.",
  },
  {
    icon: Bot,
    title: "Bot Telegram",
    description: "Registre transações por mensagem, direto do celular.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$0",
    period: "/mês",
    description: "Para começar a organizar suas finanças",
    features: [
      "3 jobs ativos",
      "50 transações/mês",
      "2 cartões",
      "10 categorias",
      "Dashboard completo",
      "Visão anual",
    ],
    cta: "Começar grátis",
    popular: false,
  },
  {
    name: "Pro",
    price: "R$29",
    period: "/mês",
    description: "Para freelancers e MEIs que querem crescer",
    features: [
      "15 jobs ativos",
      "Transações ilimitadas",
      "5 cartões",
      "30 categorias",
      "DRE & Projeções",
      "Metas & Orçamentos",
      "Relatórios PDF",
      "Recorrências ilimitadas",
    ],
    cta: "Assinar Pro",
    popular: true,
  },
  {
    name: "Business",
    price: "R$59",
    period: "/mês",
    description: "Para estúdios e agências que precisam de tudo",
    features: [
      "Tudo ilimitado",
      "Bot Telegram",
      "Suporte prioritário",
      "Múltiplos cartões",
      "Importação de faturas",
      "Projeção de fluxo de caixa",
      "Painel contábil",
      "Relatórios avançados",
    ],
    cta: "Assinar Business",
    popular: false,
  },
];

export default function Landing() {
  // Capture referral code from URL and save to localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              EUGÊ<span className="text-[#EE770E]">.</span>
            </h1>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">financeiro</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Entrar
            </Button>
            <Button
              className="bg-[#EE770E] hover:bg-[#d96a0c] text-white font-medium"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              Começar grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EE770E]/10 border border-[#EE770E]/20 text-[#EE770E] text-sm mb-8">
            <Zap className="w-3.5 h-3.5" />
            <span>Feito para criativos que faturam</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Suas finanças no
            <br />
            <span className="text-[#EE770E]">controle total</span>
          </h2>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            O sistema financeiro feito para freelancers, MEIs e estúdios criativos.
            Controle jobs, transações, faturas e impostos em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-[#EE770E] hover:bg-[#d96a0c] text-white font-semibold text-lg px-8 py-6 shadow-lg shadow-[#EE770E]/20"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              Começar grátis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 font-medium text-lg px-8 py-6"
              onClick={() => {
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver planos
            </Button>
          </div>
          <p className="text-sm text-white/40 mt-4">
            Sem cartão de crédito. Cancele quando quiser.
          </p>

          {/* Product preview — CSS-only dashboard mockup */}
          <div className="relative mt-16 mx-auto max-w-3xl">
            <div className="absolute -inset-x-8 -top-8 h-40 bg-[#EE770E]/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-2 shadow-2xl shadow-black/50">
              <div className="rounded-xl border border-white/5 bg-[#111111] p-4 sm:p-6 text-left">
                <div className="flex items-center gap-1.5 mb-5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="ml-3 text-[10px] text-white/30 tracking-widest uppercase">Dashboard — visão do mês</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">Receitas</p>
                    <p className="text-sm sm:text-lg font-bold text-emerald-400">R$ 18.450</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">Despesas</p>
                    <p className="text-sm sm:text-lg font-bold text-red-400">R$ 6.120</p>
                  </div>
                  <div className="rounded-lg border border-[#EE770E]/20 bg-[#EE770E]/5 p-3">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">Saldo</p>
                    <p className="text-sm sm:text-lg font-bold text-[#EE770E]">R$ 12.330</p>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 sm:gap-2 h-24" aria-hidden="true">
                  {[35, 55, 40, 70, 52, 80, 64, 90, 74, 100, 68, 84].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-[#EE770E]/50 to-[#EE770E]"
                      style={{ height: `${h}%`, opacity: 0.35 + h / 200 }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[8px] sm:text-[9px] text-white/25 uppercase tracking-wider" aria-hidden="true">
                  {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
          <div>
            <div className="text-2xl font-bold text-[#EE770E]">100%</div>
            <div className="text-sm text-white/50">Dados isolados por usuário</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#EBEDAE]">24/7</div>
            <div className="text-sm text-white/50">Acesso de qualquer lugar</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#EE770E]">PDF</div>
            <div className="text-sm text-white/50">Importação de faturas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#EE770E]">Telegram</div>
            <div className="text-sm text-white/50">Lançamentos por mensagem</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa para
              <br />
              <span className="text-[#EE770E]">organizar seu financeiro</span>
            </h3>
            <p className="text-white/50 max-w-xl mx-auto">
              Ferramentas pensadas para quem trabalha com projetos criativos e precisa de controle financeiro sem complicação.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#EE770E]/20 hover:bg-[#EE770E]/[0.02] transition-all group"
              >
                <feature.icon className="w-8 h-8 text-[#EE770E] mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Planos que cabem no seu bolso
            </h3>
            <p className="text-white/50 max-w-xl mx-auto">
              Comece grátis e faça upgrade quando seu negócio crescer.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border transition-all ${
                  plan.popular
                    ? "border-[#EE770E]/50 bg-[#EE770E]/[0.03] shadow-lg shadow-[#EE770E]/10"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#EE770E] text-white text-xs font-semibold flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Mais popular
                  </div>
                )}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-1">{plan.name}</h4>
                  <p className="text-sm text-white/50">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/50">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 text-[#EE770E] flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-[#EE770E] hover:bg-[#d96a0c] text-white"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                  onClick={() => {
                    window.location.href = getLoginUrl();
                  }}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 text-[#EE770E] mx-auto mb-6" />
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Seus dados estão seguros
          </h3>
          <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
            Cada usuário tem seus dados completamente isolados. Criptografia de ponta a ponta,
            autenticação segura e backups automáticos. Seus dados financeiros nunca são compartilhados.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Comece a organizar suas finanças
            <br />
            <span className="text-[#EE770E]">agora mesmo</span>
          </h3>
          <p className="text-white/50 mb-8 max-w-lg mx-auto">
            Crie sua conta grátis em segundos. Sem cartão de crédito, sem compromisso.
          </p>
          <Button
            size="lg"
            className="bg-[#EE770E] hover:bg-[#d96a0c] text-white font-semibold text-lg px-10 py-6 shadow-lg shadow-[#EE770E]/20"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            Criar conta grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">EUGÊ<span className="text-[#EE770E]">.</span></span>
            <span className="text-[9px] text-white/30 tracking-widest uppercase">financeiro</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/legal" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Termos & Privacidade
            </a>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} Eugê Financeiro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
