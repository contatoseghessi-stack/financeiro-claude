import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, ArrowLeftRight, CreditCard, Tag, Receipt, Bot, Upload, Users, Repeat, Calendar, Briefcase, Settings, TrendingUp, BarChart3, DollarSign, ClipboardList, ShoppingBag, Package, Calculator, Wallet, Building2, Handshake, Target, Crown, UserPlus, MessageSquarePlus, ChevronRight, Bell, Sun, Moon, Sparkles, ScanLine, Columns3, FileText, Lightbulb } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  // Visão Geral
  { icon: LayoutDashboard, label: "Dashboard", path: "/", section: "geral" },
  { icon: TrendingUp, label: "Fluxo de Caixa", path: "/fluxo-caixa", section: "geral" },
  { icon: BarChart3, label: "DRE", path: "/dre", section: "geral" },
  { icon: Lightbulb, label: "Insights", path: "/insights", section: "geral" },
  { icon: FileText, label: "Relatório IA", path: "/relatorio-mensal", section: "geral" },
  // Movimentações
  { icon: Wallet, label: "Caixa", path: "/caixa", section: "movimentacoes" },
  { icon: ArrowLeftRight, label: "Transações", path: "/transacoes", section: "movimentacoes" },
  { icon: CreditCard, label: "Cartões", path: "/cartoes", section: "movimentacoes" },
  { icon: Repeat, label: "Recorrências", path: "/recorrencias", section: "movimentacoes" },
  { icon: ShoppingBag, label: "Parcelados", path: "/parcelados", section: "movimentacoes" },
  { icon: Upload, label: "Faturas", path: "/faturas", section: "movimentacoes" },
  // Jobs & Comercial
  { icon: Briefcase, label: "Jobs", path: "/jobs", section: "jobs" },
  { icon: Columns3, label: "Board", path: "/jobs/board", section: "jobs" },
  { icon: Calculator, label: "Quanto Cobrar?", path: "/calculadora", section: "jobs" },
  { icon: ClipboardList, label: "Orçamentos", path: "/orcamentos-pro", section: "jobs" },
  { icon: DollarSign, label: "Rentabilidade", path: "/rentabilidade", section: "jobs" },
  { icon: Calendar, label: "Diárias", path: "/diarias", section: "jobs" },
  { icon: Target, label: "Metas", path: "/metas", section: "jobs" },
  { icon: Calendar, label: "Agenda", path: "/agenda", section: "jobs" },
  // Cadastros
  { icon: Users, label: "Fornecedores", path: "/fornecedores", section: "cadastros" },
  { icon: Users, label: "Contratantes", path: "/contratantes", section: "cadastros" },
  { icon: Tag, label: "Categorias", path: "/categorias", section: "cadastros" },
  { icon: Package, label: "Bens e Patrimônio", path: "/bens", section: "cadastros" },
  { icon: Handshake, label: "Parceiros", path: "/parceiros", section: "cadastros" },
  // Fiscal & Contábil
  { icon: Receipt, label: "Impostos", path: "/impostos", section: "fiscal" },
  { icon: Calculator, label: "Resumo IR", path: "/ir", section: "fiscal" },
  { icon: Wallet, label: "Pró-labore", path: "/pro-labore", section: "fiscal" },
  { icon: Building2, label: "Painel Contábil", path: "/contabil", section: "fiscal" },
  // Sistema
  { icon: Building2, label: "Dados da Empresa", path: "/dados-empresa", section: "sistema" },
  { icon: Crown, label: "Planos", path: "/billing", section: "sistema" },
  { icon: UserPlus, label: "Convites", path: "/convites", section: "sistema" },
  { icon: Bot, label: "Telegram", path: "/telegram", section: "sistema" },
  { icon: MessageSquarePlus, label: "Feedback", path: "/feedback", section: "sistema" },
  { icon: ScanLine, label: "Escanear NF", path: "/escanear", section: "sistema" },
  { icon: Sparkles, label: "Assistente IA", path: "/assistente", section: "sistema" },
  { icon: Bell, label: "Notificações", path: "/notificacoes", section: "sistema" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", section: "sistema" },
];

const sectionLabels: Record<string, string> = {
  geral: "Visão Geral",
  movimentacoes: "Movimentações",
  jobs: "Jobs & Comercial",
  cadastros: "Cadastros",
  fiscal: "Fiscal & Contábil",
  sistema: "Sistema",
};

const sectionIcons: Record<string, any> = {
  geral: LayoutDashboard,
  movimentacoes: ArrowLeftRight,
  jobs: Briefcase,
  cadastros: Users,
  fiscal: Receipt,
  sistema: Settings,
};

const sectionOrder = ["geral", "movimentacoes", "jobs", "cadastros", "fiscal", "sistema"];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_SECTIONS_KEY = "sidebar-sections-open";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

function getItemsBySection() {
  const grouped: Record<string, typeof menuItems> = {};
  for (const item of menuItems) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  }
  return grouped;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    // Redirect to dedicated login page
    window.location.href = "/login";
    return null;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const companyQuery = trpc.company.get.useQuery(undefined, { enabled: !!user });
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile, openMobile, isMobile: sidebarIsMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
    if (sidebarIsMobile) {
      setOpenMobile(false);
    }
  }, [setLocation, sidebarIsMobile, setOpenMobile]);

  // Swipe gesture to open/close sidebar on mobile with progressive overlay
  const [swipeProgress, setSwipeProgress] = useState(0);
  const swipeOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarIsMobile) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let isSwiping = false;
    let isOpenGesture = false;
    const sidebarWidthPx = 288; // --sidebar-width-mobile

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchEndX = touchStartX;
      isSwiping = true;
      // Detect if this is an open gesture (from left edge) or close gesture
      isOpenGesture = touchStartX < 40 && !openMobile;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return;
      touchEndX = e.touches[0].clientX;
      // Cancel if vertical scroll is dominant
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      const deltaX = Math.abs(touchEndX - touchStartX);
      if (deltaY > deltaX && deltaY > 10) {
        isSwiping = false;
        setSwipeProgress(0);
        return;
      }

      // Progressive overlay during swipe-to-open
      if (isOpenGesture && deltaX > 10) {
        const progress = Math.min(deltaX / sidebarWidthPx, 1);
        setSwipeProgress(progress);
      }
      // Progressive overlay fade-out during swipe-to-close
      if (openMobile && touchEndX < touchStartX) {
        const progress = Math.max(1 - (Math.abs(deltaX) / sidebarWidthPx), 0);
        setSwipeProgress(progress);
      }
    };

    const handleTouchEnd = () => {
      if (!isSwiping) {
        setSwipeProgress(0);
        return;
      }
      const deltaX = touchEndX - touchStartX;
      const threshold = 60;

      if (deltaX > threshold && touchStartX < 40) {
        setOpenMobile(true);
      } else if (deltaX < -threshold && openMobile) {
        setOpenMobile(false);
      }
      isSwiping = false;
      setSwipeProgress(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [sidebarIsMobile, openMobile, setOpenMobile]);

  // Collapsible sections state - persist in localStorage
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default: open the section that contains the current page
    const currentSection = menuItems.find(item => item.path === location)?.section || "geral";
    return { [currentSection]: true };
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(openSections));
  }, [openSections]);

  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const groupedItems = getItemsBySection();

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  {companyQuery.data?.logoUrl ? (
                    <img
                      src={companyQuery.data.logoUrl}
                      alt="Logo"
                      className="h-8 max-w-[140px] object-contain"
                    />
                  ) : (
                    <>
                      <span className="font-bold tracking-tight truncate text-lg">
                        EUGÊ<span className="text-primary">.</span>
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">financeiro <span className="text-primary/70">by Eugê</span></span>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            <SidebarMenu className="px-2 py-1">
              {isCollapsed ? (
                // Collapsed: show flat list with section dividers
                <>
                  {(() => {
                    let lastSection = '';
                    return menuItems.map(item => {
                      const isActive = location === item.path;
                      const showDivider = item.section !== lastSection && lastSection !== '';
                      lastSection = item.section;
                      return (
                        <div key={item.path}>
                          {showDivider && (
                            <div className="my-1 mx-2 border-t border-border/30" />
                          )}
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => handleNavigate(item.path)}
                              tooltip={item.label}
                              className="h-9 transition-all font-normal text-sm"
                            >
                              <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </div>
                      );
                    });
                  })()}
                </>
              ) : (
                // Expanded: show collapsible groups
                <>
                  {sectionOrder.map(section => {
                    const items = groupedItems[section] || [];
                    const SectionIcon = sectionIcons[section];
                    const isOpen = openSections[section] ?? false;
                    const hasActiveItem = items.some(item => item.path === location);

                    return (
                      <Collapsible
                        key={section}
                        open={isOpen}
                        onOpenChange={() => toggleSection(section)}
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            className={`flex items-center gap-2 w-full px-3 py-2 mt-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-accent/50 ${
                              hasActiveItem ? "text-primary" : "text-muted-foreground/70"
                            }`}
                          >
                            <SectionIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 text-left">{sectionLabels[section]}</span>
                            <ChevronRight
                              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                                isOpen ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
                          <div className="ml-2 pl-2 border-l border-border/30 mt-0.5 mb-1">
                            {items.map(item => {
                              const isActive = location === item.path;
                              return (
                                <SidebarMenuItem key={item.path}>
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    onClick={() => handleNavigate(item.path)}
                                    tooltip={item.label}
                                    className="h-8 transition-all duration-150 font-normal text-sm hover:translate-x-0.5"
                                  >
                                    <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                                    <span>{item.label}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </>
              )}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => toggleTheme?.()}
                  className="cursor-pointer"
                >
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{theme === "dark" ? "Tema Claro" : "Tema Escuro"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      {/* Progressive overlay during swipe gesture */}
      {sidebarIsMobile && swipeProgress > 0 && (
        <div
          ref={swipeOverlayRef}
          className="fixed inset-0 z-40 pointer-events-none transition-none"
          style={{ backgroundColor: `rgba(0, 0, 0, ${swipeProgress * 0.5})` }}
        />
      )}

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
