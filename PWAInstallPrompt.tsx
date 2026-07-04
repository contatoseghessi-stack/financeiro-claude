import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently
    const lastDismissed = localStorage.getItem("pwa-install-dismissed");
    if (lastDismissed) {
      const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed (standalone mode)
  if (window.matchMedia("(display-mode: standalone)").matches) return null;
  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EE770E]/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-[#EE770E]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground">Instalar App</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione o Eugê Financeiro à sua tela inicial para acesso rápido
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="bg-[#EE770E] hover:bg-[#d96a0c] text-white text-xs h-7 px-3"
                onClick={handleInstall}
              >
                Instalar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 px-3 text-muted-foreground"
                onClick={handleDismiss}
              >
                Agora não
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
