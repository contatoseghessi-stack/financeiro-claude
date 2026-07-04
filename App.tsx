import { Toaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { FloatingAIChat } from "./components/FloatingAIChat";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

// Lazy-loaded page components for code-splitting
const Home = lazy(() => import("./pages/Home"));
const Transacoes = lazy(() => import("./pages/Transacoes"));
const Cartoes = lazy(() => import("./pages/Cartoes"));
const Categorias = lazy(() => import("./pages/Categorias"));
const Impostos = lazy(() => import("./pages/Impostos"));
const TelegramPage = lazy(() => import("./pages/TelegramPage"));
const InvoiceUpload = lazy(() => import("./pages/InvoiceUpload"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Clients = lazy(() => import("./pages/Clients"));
const Recurrences = lazy(() => import("./pages/Recurrences"));
const WorkDays = lazy(() => import("./pages/WorkDays"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const CashFlow = lazy(() => import("./pages/CashFlow"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Profitability = lazy(() => import("./pages/Profitability"));
const DRE = lazy(() => import("./pages/DRE"));
const Installments = lazy(() => import("./pages/Installments"));
const Assets = lazy(() => import("./pages/Assets"));
const IRSummary = lazy(() => import("./pages/IRSummary"));
const ProLabore = lazy(() => import("./pages/ProLabore"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const Partners = lazy(() => import("./pages/Partners"));
const Cash = lazy(() => import("./pages/Cash"));
const CompanyData = lazy(() => import("./pages/CompanyData"));
const Goals = lazy(() => import("./pages/Goals"));
const Billing = lazy(() => import("./pages/Billing"));
const Invite = lazy(() => import("./pages/Invite"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Quotations = lazy(() => import("./pages/Quotations"));
const PublicProposal = lazy(() => import("./pages/PublicProposal"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const ScanDocument = lazy(() => import("./pages/ScanDocument"));
const TelegramSettings = lazy(() => import("./pages/TelegramSettings"));
const JobBoard = lazy(() => import("./pages/JobBoard"));
const PriceCalculator = lazy(() => import("./pages/PriceCalculator"));
const Insights = lazy(() => import("./pages/Insights"));
const MonthlyReport = lazy(() => import("./pages/MonthlyReport"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Minimal loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function LoginRedirect() {
  window.location.href = "/";
  return null;
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/login" component={LoginRedirect} />
          <Route path="/" component={Home} />
          <Route path="/transacoes" component={Transacoes} />
          <Route path="/cartoes" component={Cartoes} />
          <Route path="/categorias" component={Categorias} />
          <Route path="/impostos" component={Impostos} />
          <Route path="/faturas" component={InvoiceUpload} />
          <Route path="/fornecedores" component={Suppliers} />
          <Route path="/contratantes" component={Clients} />
          <Route path="/parceiros" component={Partners} />
          <Route path="/recorrencias" component={Recurrences} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/fluxo-caixa" component={CashFlow} />
          <Route path="/orcamentos" component={Quotes} />
          <Route path="/orcamentos-pro" component={Quotations} />
          <Route path="/rentabilidade" component={Profitability} />
          <Route path="/dre" component={DRE} />
          <Route path="/parcelados" component={Installments} />
          <Route path="/bens" component={Assets} />
          <Route path="/ir" component={IRSummary} />
          <Route path="/pro-labore" component={ProLabore} />
          <Route path="/contabil" component={AccountantDashboard} />
          <Route path="/diarias" component={WorkDays} />
          <Route path="/telegram" component={TelegramPage} />
          <Route path="/telegram/vincular" component={TelegramSettings} />
          <Route path="/jobs/board" component={JobBoard} />
          <Route path="/calculadora" component={PriceCalculator} />
          <Route path="/insights" component={Insights} />
          <Route path="/relatorio-mensal" component={MonthlyReport} />
          <Route path="/caixa" component={Cash} />
          <Route path="/dados-empresa" component={CompanyData} />
          <Route path="/metas" component={Goals} />
          <Route path="/agenda" component={Agenda} />
          <Route path="/billing" component={Billing} />
          <Route path="/convites" component={Invite} />
          <Route path="/feedback" component={Feedback} />
          <Route path="/notificacoes" component={NotificationSettings} />
          <Route path="/assistente" component={AIAssistant} />
          <Route path="/escanear" component={ScanDocument} />
          <Route path="/configuracoes" component={Configuracoes} />
          <Route path="/legal" component={Legal} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const utils = trpc.useUtils();
  const applyReferral = trpc.invite.applyCode.useMutation();

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true);
    utils.auth.me.invalidate();
  }, [utils]);

  // Apply referral code from localStorage after login
  useEffect(() => {
    if (user) {
      const ref = localStorage.getItem("referralCode");
      if (ref) {
        localStorage.removeItem("referralCode");
        applyReferral.mutate({ code: ref });
      }
    }
  }, [user]);

  // Show loading skeleton while checking auth
  if (loading) {
    return null;
  }

  // If not logged in, show landing or login page
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/legal" component={Legal} />
          <Route component={Landing} />
        </Switch>
      </Suspense>
    );
  }

  // If user is logged in and hasn't completed onboarding, show wizard
  if (!(user as any).onboardingCompleted && !onboardingDone) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  return (
    <>
      <Router />
      <FloatingAIChat />
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/proposta/:token" component={PublicProposal} />
              <Route><AppContent /></Route>
            </Switch>
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
