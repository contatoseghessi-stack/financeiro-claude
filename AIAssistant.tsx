import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Sparkles } from "lucide-react";

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Olá! Sou sua **assistente financeira** do Eugê Financeiro. 🧠💰

Posso te ajudar com:
- **Resumo do mês** — quanto entrou, saiu e sobrou
- **Análise de jobs** — rentabilidade, pendências
- **Metas** — como está o progresso
- **Sugestões** — onde cortar gastos, quanto cobrar
- **Projeções** — fluxo de caixa futuro

Pergunta o que quiser sobre tuas finanças!`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.aiAssistant.chat.useMutation();

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const history = updatedMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const result = await chatMutation.mutateAsync({
        message: content,
        history: history.slice(0, -1), // exclude the current message (it's sent separately)
      });

      const assistantMsg: Message = { role: "assistant", content: result.reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: Message = { role: "assistant", content: "Desculpe, tive um problema ao processar sua pergunta. Tenta de novo!" };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Assistente Financeira IA</h1>
          <p className="text-sm text-muted-foreground">
            Pergunte qualquer coisa sobre suas finanças
          </p>
        </div>
      </div>

      <AIChatBox
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Ex: Quanto faturei esse mês? Qual meu cliente mais rentável?"
        height="calc(100vh - 180px)"
        suggestedPrompts={[
          "Como estão minhas finanças esse mês?",
          "Qual meu saldo atual e projeção?",
          "Quais jobs estão pendentes de pagamento?",
          "Me dá dicas pra melhorar meu lucro",
          "Quanto tenho de despesa fixa por mês?",
          "Estou batendo minhas metas?",
        ]}
      />
    </div>
  );
}
