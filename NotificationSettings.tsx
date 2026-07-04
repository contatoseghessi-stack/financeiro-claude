import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NotificationPrefs {
  recurrenceDue: boolean;
  jobPaymentPending: boolean;
  quotationExpiring: boolean;
  goalReached: boolean;
  planLimitReaching: boolean;
  cardStatementDue: boolean;
  jobWithoutDelivery: boolean;
  weeklySummary: boolean;
  irAlert: boolean;
  overduePayment: boolean;
  dailyAgenda: boolean;
}

const PREF_LABELS: Record<keyof NotificationPrefs, { label: string; description: string }> = {
  recurrenceDue: {
    label: "Contas Recorrentes",
    description: "1 dia antes do vencimento de despesas recorrentes",
  },
  jobPaymentPending: {
    label: "Pagamentos de Jobs",
    description: "No dia previsto para recebimento de pagamentos",
  },
  quotationExpiring: {
    label: "Orçamentos Expirando",
    description: "2 dias antes da validade de orçamentos enviados",
  },
  goalReached: {
    label: "Meta Atingida",
    description: "Quando uma meta financeira mensal for alcançada",
  },
  planLimitReaching: {
    label: "Limite do Plano",
    description: "Quando atingir 80% do limite do plano",
  },
  cardStatementDue: {
    label: "Fatura do Cartão",
    description: "3 dias antes do fechamento da fatura",
  },
  jobWithoutDelivery: {
    label: "Job sem Entrega",
    description: "Jobs em andamento há 7+ dias sem entregas registradas",
  },
  weeklySummary: {
    label: "Resumo Semanal",
    description: "Resumo financeiro toda segunda-feira",
  },
  irAlert: {
    label: "Alerta de IR/MEI",
    description: "Quando faturamento PJ atingir 80% do limite MEI",
  },
  overduePayment: {
    label: "Inadimplência",
    description: "Pagamentos de jobs atrasados",
  },
  dailyAgenda: {
    label: "Agenda do Dia",
    description: "Compromissos e eventos do dia",
  },
};

export default function NotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribing, setSubscribing] = useState(false);

  const { data: vapidData } = trpc.notifications.getVapidPublicKey.useQuery();
  const { data: prefs, refetch: refetchPrefs } = trpc.notifications.getPreferences.useQuery();
  const subscribeMut = trpc.notifications.subscribe.useMutation();
  const unsubscribeMut = trpc.notifications.unsubscribe.useMutation();
  const updatePrefsMut = trpc.notifications.updatePreferences.useMutation();
  const testMut = trpc.notifications.testNotification.useMutation();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }

  async function handleSubscribe() {
    if (!vapidData?.key) {
      toast.error("Chave VAPID não configurada. Contate o suporte.");
      return;
    }

    setSubscribing(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permissão de notificação negada. Habilite nas configurações do navegador.");
        return;
      }

      // Get push subscription
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.key),
      });

      const subJson = sub.toJSON();
      await subscribeMut.mutateAsync({
        endpoint: sub.endpoint,
        keys: {
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
      });

      setIsSubscribed(true);
      toast.success("Notificações push ativadas!");
    } catch (err: any) {
      console.error("Push subscribe error:", err);
      toast.error("Erro ao ativar notificações: " + (err.message || "Tente novamente"));
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribe() {
    setSubscribing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMut.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("Notificações push desativadas.");
    } catch (err: any) {
      toast.error("Erro ao desativar: " + (err.message || "Tente novamente"));
    } finally {
      setSubscribing(false);
    }
  }

  async function handleTogglePref(key: keyof NotificationPrefs) {
    if (!prefs) return;
    const newValue = !(prefs as any)[key];
    await updatePrefsMut.mutateAsync({ [key]: newValue });
    refetchPrefs();
    toast.success(`${PREF_LABELS[key].label}: ${newValue ? "ativado" : "desativado"}`);
  }

  async function handleTestNotification() {
    try {
      const result = await testMut.mutateAsync();
      if (result.sent > 0) {
        toast.success("Notificação de teste enviada!");
      } else {
        toast.error("Nenhuma subscription ativa. Ative as notificações primeiro.");
      }
    } catch {
      toast.error("Erro ao enviar teste.");
    }
  }

  if (!isSupported) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notificações
        </h1>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-200">
            Seu navegador não suporta notificações push. Para receber notificações, use um navegador
            moderno (Chrome, Firefox, Edge) ou instale o app como PWA no celular.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6" /> Notificações Push
      </h1>

      {/* Subscription status */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">
              {isSubscribed ? "Notificações Ativas" : "Notificações Desativadas"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSubscribed
                ? "Você receberá alertas sobre suas finanças diretamente no dispositivo."
                : "Ative para receber lembretes de contas, pagamentos e mais."}
            </p>
            {permission === "denied" && (
              <p className="text-sm text-red-400 mt-2">
                Permissão bloqueada no navegador. Vá em Configurações do site para habilitar.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSubscribed && (
              <button
                onClick={handleTestNotification}
                disabled={testMut.isPending}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
              >
                {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Testar
              </button>
            )}
            <button
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={subscribing || permission === "denied"}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 ${
                isSubscribed
                  ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {subscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {isSubscribed ? "Desativar" : "Ativar"}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Tipos de Notificação</h2>
          <p className="text-sm text-muted-foreground">
            Escolha quais alertas deseja receber
          </p>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(PREF_LABELS).map(([key, { label, description }]) => {
            const prefKey = key as keyof NotificationPrefs;
            const enabled = prefs ? (prefs as any)[prefKey] !== false : true;
            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <button
                  onClick={() => handleTogglePref(prefKey)}
                  disabled={updatePrefsMut.isPending}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    enabled ? "bg-green-600" : "bg-zinc-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm text-muted-foreground">
        <p>
          As notificações são enviadas automaticamente pelo sistema. Verificações diárias ocorrem
          às 8h (horário de Brasília) e o resumo semanal é enviado às segundas-feiras.
        </p>
        <p className="mt-2">
          Para receber notificações no celular, instale o Finanbot como app (PWA) através do menu
          do navegador.
        </p>
      </div>
    </div>
  );
}

// Helper: convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as unknown as ArrayBuffer;
}
