import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { CheckCircle2, XCircle, FileText, Clock, Building2 } from "lucide-react";
import { useState } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function PublicProposal() {
  const [, params] = useRoute("/proposta/:token");
  const token = params?.token || "";
  const [decided, setDecided] = useState(false);

  const { data, isLoading, error } = trpc.quotations.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const acceptMutation = trpc.quotations.acceptByToken.useMutation({
    onSuccess: () => setDecided(true),
  });
  const rejectMutation = trpc.quotations.rejectByToken.useMutation({
    onSuccess: () => setDecided(true),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-lg">Carregando proposta...</div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Proposta não encontrada</h2>
          <p className="text-slate-500">Este link pode ter expirado ou ser inválido.</p>
        </div>
      </div>
    );
  }

  const isExpired = data.validityDays && data.issueDate
    ? new Date().getTime() > new Date(data.issueDate).getTime() + data.validityDays * 86400000
    : false;

  const alreadyDecided = data.status === "approved" || data.status === "rejected";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4" data-theme="light">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Company Header */}
        {data.company && (
          <div className="text-center space-y-2 py-4">
            {(data.company as any).logoUrl ? (
              <img src={(data.company as any).logoUrl} alt={(data.company as any).nomeFantasia || ""} className="h-16 mx-auto object-contain" />
            ) : (
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="h-8 w-8 text-indigo-600" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-800">{data.company.nomeFantasia || data.company.razaoSocial || "Estúdio Criativo Eugê"}</h1>
            {(data.company as any).telefone && <p className="text-sm text-slate-500">{(data.company as any).telefone}</p>}
          </div>
        )}

        {!data.company && (
          <div className="text-center space-y-2 py-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Estúdio Criativo Eugê</h1>
          </div>
        )}

        {/* Status Banner */}
        {alreadyDecided && (
          <div className={`rounded-xl border-2 p-4 text-center ${data.status === "approved" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
            {data.status === "approved" ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Proposta aprovada</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">Proposta recusada</span>
              </div>
            )}
          </div>
        )}

        {decided && !alreadyDecided && (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Sua resposta foi registrada! Obrigado.</span>
            </div>
          </div>
        )}

        {/* Proposal Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          {/* Card Header */}
          <div className="border-b border-slate-200 px-6 py-5 bg-slate-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Proposta #{data.number}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Para: <span className="font-medium text-slate-700">{data.clientName || "Cliente"}</span>
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Emitida: {data.issueDate ? new Date(data.issueDate).toLocaleDateString("pt-BR") : "-"}</p>
                <p className="flex items-center gap-1 justify-end mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  Validade: {data.validityDays} dias
                  {isExpired && <span className="text-red-500 font-medium ml-1">(expirada)</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6">
            {/* Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-indigo-100">
                    <th className="text-left py-3 px-3 font-semibold text-slate-700 bg-indigo-50/50">Descrição</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-700 bg-indigo-50/50 w-16">Qtd</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-700 bg-indigo-50/50 w-28">Valor Unit.</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-700 bg-indigo-50/50 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items?.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-800">{item.description}</td>
                      <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(parseFloat(item.unitPrice))}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800">{formatCurrency(parseFloat(item.totalPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-700">{formatCurrency(parseFloat(data.subtotal || "0"))}</span>
              </div>
              {data.discountValue && parseFloat(data.discountValue) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Desconto {data.discountType === "percent" ? `(${data.discountValue}%)` : ""}
                  </span>
                  <span className="text-red-500 font-medium">
                    -{data.discountType === "percent"
                      ? formatCurrency(parseFloat(data.subtotal || "0") * parseFloat(data.discountValue) / 100)
                      : formatCurrency(parseFloat(data.discountValue))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-200">
                <span className="text-slate-800">Total</span>
                <span className="text-indigo-600">{formatCurrency(parseFloat(data.total || "0"))}</span>
              </div>
            </div>

            {/* Payment Conditions */}
            {data.paymentConditions && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Condições de Pagamento</h3>
                <p className="text-sm text-slate-600">{data.paymentConditions}</p>
              </div>
            )}

            {data.paymentMethod && (
              <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Forma de Pagamento</h3>
                <p className="text-sm text-slate-600">{data.paymentMethod}</p>
              </div>
            )}

            {data.notes && (
              <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Observações</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}

            {data.bankDetails && (
              <div className="mt-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-800 mb-1">Dados Bancários</h3>
                <p className="text-sm text-indigo-700 whitespace-pre-wrap">{data.bankDetails}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!alreadyDecided && !decided && !isExpired && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <p className="text-center text-slate-600 mb-4">O que deseja fazer com esta proposta?</p>
            <div className="flex gap-4 justify-center">
              <button
                className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                onClick={() => acceptMutation.mutate({ token })}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {acceptMutation.isPending ? "Aprovando..." : "Aprovar Proposta"}
              </button>
              <button
                className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                onClick={() => rejectMutation.mutate({ token })}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                <XCircle className="h-5 w-5 mr-2" />
                {rejectMutation.isPending ? "Recusando..." : "Recusar"}
              </button>
            </div>
          </div>
        )}

        {isExpired && !alreadyDecided && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-center text-amber-700">
            <Clock className="h-5 w-5 inline mr-2" />
            Esta proposta expirou. Entre em contato para solicitar uma nova.
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Proposta gerada por financeiro by Eugê
        </p>
      </div>
    </div>
  );
}
