import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Unlink, Copy, Check, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TelegramSettings() {
  const { data: status, isLoading, refetch } = trpc.telegram.getStatus.useQuery();
  const generateCode = trpc.telegram.generateCode.useMutation({
    onSuccess: (data) => {
      setCode(data.code);
      setExpiresAt(Date.now() + data.expiresInMinutes * 60 * 1000);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const unlinkMutation = trpc.telegram.unlink.useMutation({
    onSuccess: () => {
      toast.success("Telegram desvinculado com sucesso.");
      setCode(null);
      setExpiresAt(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (expiresAt) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setCode(null);
          setExpiresAt(null);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresAt]);

  const handleCopyCode = async () => {
    if (!code) return;
    const command = `/vincular ${code}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Comando copiado!");
    } catch {
      // Fallback: show prompt
      window.prompt("Copie o comando abaixo:", command);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Telegram</h1>
        <p className="text-muted-foreground mt-1">
          Vincule sua conta do Telegram para receber notificações, escanear recibos e usar o bot financeiro.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Status da Conexão
            </CardTitle>
            {status?.connected ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary">Desconectado</Badge>
            )}
          </div>
          <CardDescription>
            {status?.connected
              ? `Vinculado ao chat ${status.username ? `@${status.username}` : `#${status.chatId}`}`
              : "Nenhuma conta do Telegram vinculada."}
          </CardDescription>
        </CardHeader>
        {status?.connected && (
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Desvincular Telegram
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Connect Card */}
      {!status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Vincular Conta
            </CardTitle>
            <CardDescription>
              Gere um código temporário e envie para o bot no Telegram para vincular sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!code ? (
              <Button
                onClick={() => generateCode.mutate()}
                disabled={generateCode.isPending}
              >
                {generateCode.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Gerar Código de Vinculação
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Code Display */}
                <div className="bg-muted rounded-lg p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Seu código:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-3xl font-mono font-bold tracking-widest">
                      {code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyCode}
                      className="h-8 w-8"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expira em <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Como vincular:
                  </p>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>
                      Abra o Telegram e busque por{" "}
                      <strong>@EugeFinanceiroBot</strong>
                    </li>
                    <li>
                      Envie o comando:{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">
                        /vincular {code}
                      </code>
                    </li>
                    <li>Pronto! O bot confirmará a vinculação.</li>
                  </ol>
                </div>

                {/* Copy full command button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copiar comando completo
                </Button>

                {/* Generate new code */}
                <div className="flex justify-center">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => generateCode.mutate()}
                    disabled={generateCode.isPending}
                  >
                    Gerar novo código
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que o bot faz?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Escaneia recibos e notas fiscais enviados como foto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Processa faturas de cartão (PJ e PF) em lote</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Registra transações rápidas via mensagem</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Envia resumos e alertas financeiros</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
