import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Loader2, AlertTriangle, Check, X, Link2 } from "lucide-react";
import { toast } from "sonner";

type ScanStep = "upload" | "analyzing" | "preview" | "done";

interface ExtractedData {
  description: string;
  amount: number;
  type: "income" | "expense";
  scope: "pj" | "pf";
  date: number;
  category?: string;
  fiscalCategory?: string;
  supplier?: string;
  nfNumber?: string;
  confidence: number;
}

interface DuplicateCandidate {
  id: number;
  description: string;
  amount: string;
  date: number;
  type: string;
  scope: string;
  similarity: number;
}

export default function ScanDocument() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ScanStep>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);

  const categories = trpc.categories.list.useQuery();
  const analyzeMutation = trpc.documentScan.analyze.useMutation();
  const createTransaction = trpc.transactions.create.useMutation();
  const utils = trpc.useUtils();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande — máximo 10MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setStep("analyzing");

      // Extract base64 without prefix
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";

      try {
        const result = await analyzeMutation.mutateAsync({
          imageBase64: base64,
          mimeType,
          windowDays: 45,
        });

        setExtracted(result.extracted);
        setEditedData({ ...result.extracted });
        setDuplicates(result.duplicates);
        setStep("preview");
      } catch (err: any) {
        toast.error(err.message || "Não foi possível extrair dados da imagem");
        setStep("upload");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTransaction = async () => {
    if (!editedData) return;

    try {
      await createTransaction.mutateAsync({
        description: editedData.description,
        amount: editedData.amount.toFixed(2),
        type: editedData.type,
        scope: editedData.scope,
        date: editedData.date,
        source: "scan" as const,
        fiscalCategory: (editedData.fiscalCategory || null) as any,
      });

      toast.success(`Transação criada! ${editedData.description} - R$ ${editedData.amount.toFixed(2)}`);
      utils.transactions.invalidate();
      setStep("done");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar transação");
    }
  };

  const handleLinkToExisting = async (duplicateId: number) => {
    toast.success("Vinculado! Comprovante vinculado à transação existente. Nenhuma duplicata criada.");
    setStep("done");
  };

  const handleReset = () => {
    setStep("upload");
    setImagePreview(null);
    setExtracted(null);
    setEditedData(null);
    setDuplicates([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("pt-BR");

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Escanear Documento</h1>
        <p className="text-muted-foreground">Tire foto de um recibo, cupom ou nota fiscal e a IA extrai os dados automaticamente.</p>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col items-center gap-4 py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => cameraInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Câmera
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-5 w-5" />
                  Galeria
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">JPG, PNG ou PDF — máx. 10MB</p>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Step: Analyzing */}
      {step === "analyzing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
              )}
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Analisando documento com IA...</span>
              </div>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && editedData && (
        <>
          {/* Duplicate Warning */}
          {duplicates.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  Possível duplicata encontrada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Encontramos transações similares nos últimos 45 dias. Pode ser que tu já tenha registrado esse gasto.
                </p>
                {duplicates.map((dup) => (
                  <div key={dup.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                    <div>
                      <p className="font-medium text-sm">{dup.description}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {parseFloat(dup.amount).toFixed(2)} — {formatDate(dup.date)} — {Math.round(dup.similarity * 100)}% similar
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLinkToExisting(dup.id)}
                      className="gap-1"
                    >
                      <Link2 className="h-3 w-3" />
                      Vincular
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Extracted Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados Extraídos</CardTitle>
              {extracted && (
                <p className="text-xs text-muted-foreground">
                  Confiança: {Math.round(extracted.confidence * 100)}%
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {imagePreview && (
                <img src={imagePreview} alt="Documento" className="max-h-32 rounded-lg object-contain mx-auto" />
              )}

              <div className="grid gap-3">
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={editedData.description}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.amount}
                      onChange={(e) => setEditedData({ ...editedData, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={new Date(editedData.date).toISOString().split("T")[0]}
                      onChange={(e) => setEditedData({ ...editedData, date: new Date(e.target.value).getTime() })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={editedData.type}
                      onValueChange={(v) => setEditedData({ ...editedData, type: v as "income" | "expense" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Escopo</Label>
                    <Select
                      value={editedData.scope}
                      onValueChange={(v) => setEditedData({ ...editedData, scope: v as "pj" | "pf" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pf">Pessoal (PF)</SelectItem>
                        <SelectItem value="pj">Empresa (PJ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Categoria Fiscal</Label>
                  <Select
                    value={editedData.fiscalCategory || "outros"}
                    onValueChange={(v) => setEditedData({ ...editedData, fiscalCategory: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alimentacao">Alimentação</SelectItem>
                      <SelectItem value="transporte">Transporte</SelectItem>
                      <SelectItem value="moradia">Moradia</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="educacao">Educação</SelectItem>
                      <SelectItem value="lazer">Lazer</SelectItem>
                      <SelectItem value="vestuario">Vestuário</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="equipamentos">Equipamentos</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editedData.supplier && (
                  <div>
                    <Label>Fornecedor</Label>
                    <Input value={editedData.supplier} disabled className="opacity-70" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreateTransaction}
                  className="flex-1 gap-2"
                  disabled={createTransaction.isPending}
                >
                  {createTransaction.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Criar Transação
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="font-medium">Transação registrada com sucesso!</p>
              <Button onClick={handleReset} variant="outline">
                Escanear outro documento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
