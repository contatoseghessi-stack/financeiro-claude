import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Shield } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#EE770E]/20 via-[#0D0D0D] to-[#0D0D0D]" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#EE770E]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-60 h-60 bg-[#EBEDAE]/10 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              EUGÊ<span className="text-[#EE770E]">.</span>
            </h1>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">financeiro</span>
          </div>
          
          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Controle financeiro<br />
              <span className="text-[#EE770E]">feito para criativos</span>
            </h2>
            <p className="text-white/50 text-lg max-w-md leading-relaxed">
              Gerencie jobs, transações, faturas e impostos em um só lugar. 
              Simples, rápido e feito pra quem fatura.
            </p>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#EE770E]/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-[#EE770E]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Controle total</p>
                  <p className="text-xs text-white/40">Receitas, despesas e cartões em um painel</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#EBEDAE]/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#EBEDAE]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Insights com IA</p>
                  <p className="text-xs text-white/40">Análises inteligentes do seu financeiro</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#EE770E]/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-[#EE770E]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Seguro e privado</p>
                  <p className="text-xs text-white/40">Seus dados isolados e protegidos</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} Eugê Financeiro
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              EUGÊ<span className="text-[#EE770E]">.</span>
            </h1>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">financeiro</span>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="text-sm text-white/50">
              Entre na sua conta para acessar seu painel
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="w-full h-12 bg-white hover:bg-white/90 text-[#0D0D0D] font-medium text-sm shadow-lg shadow-white/5 transition-all hover:shadow-xl hover:shadow-white/10 gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0D0D0D] px-3 text-white/30">login seguro via Google</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center gap-6 text-[11px] text-white/30">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Criptografia SSL
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Dados isolados
              </span>
            </div>
            
            <p className="text-center text-[11px] text-white/20 leading-relaxed">
              Ao entrar, você concorda com nossos{" "}
              <a href="/legal" className="text-[#EE770E]/60 hover:text-[#EE770E] transition-colors">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="/legal" className="text-[#EE770E]/60 hover:text-[#EE770E] transition-colors">
                Política de Privacidade
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
