import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, Send, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Olá! Sou sua assistente financeira. Pergunte qualquer coisa sobre suas finanças! 💰`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.aiAssistant.chat.useMutation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    setInput("");
    const userMsg: Message = { role: "user", content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsLoading(true);

    try {
      const history = updated.map((m) => ({ role: m.role, content: m.content }));
      const result = await chatMutation.mutateAsync({
        message: content,
        history: history.slice(0, -1),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, tive um problema. Tenta de novo!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        aria-label="Abrir assistente IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  // Minimized state - just the header bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-2xl border border-border overflow-hidden bg-card">
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Assistente IA</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full open chat
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[520px] max-h-[80vh] rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col bg-card animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Assistente Financeira IA</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/20 rounded"
            aria-label="Minimizar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-indigo-500 text-white"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.role === "assistant" ? (
                <Streamdown>{msg.content}</Streamdown>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre suas finanças..."
            className="resize-none text-sm min-h-[38px] max-h-[80px]"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-indigo-500 hover:bg-indigo-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
