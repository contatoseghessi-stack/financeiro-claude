import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function InvoiceUpload() {
  const [activeTab, setActiveTab] = useState("card-statements");
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingService, setUploadingService] = useState(false);
  const [uploadingProduct, setUploadingProduct] = useState(false);

  const { data: cards = [] } = trpc.cards.list.useQuery();
  const { data: cardStatements = [], refetch: refetchCardStatements } = trpc.cardStatements.list.useQuery();
  const { data: serviceInvoices = [], refetch: refetchServiceInvoices } = trpc.serviceInvoices.list.useQuery();
  const { data: productInvoices = [], refetch: refetchProductInvoices } = trpc.productInvoices.list.useQuery();

  const uploadCardStatementMutation = trpc.cardStatements.create.useMutation();
  const uploadServiceInvoiceMutation = trpc.serviceInvoices.create.useMutation();
  const uploadProductInvoiceMutation = trpc.productInvoices.create.useMutation();

  const handleCardStatementUpload = async (e: React.ChangeEvent<HTMLInputElement>, cardId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCard(true);
    try {
      // Simular upload para S3 (em produção, usar manus-upload-file)
      const formData = new FormData();
      formData.append("file", file);

      // Por enquanto, apenas registrar o upload
      const now = new Date();
      await uploadCardStatementMutation.mutateAsync({
        cardId,
        fileName: file.name,
        fileKey: `card-statements/${cardId}/${file.name}`,
        fileUrl: `https://example.com/${file.name}`,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      } as any);

      toast.success("Extrato carregado! Processando...");
      refetchCardStatements();
    } catch (error) {
      toast.error("Erro ao fazer upload do extrato");
    } finally {
      setUploadingCard(false);
    }
  };

  const handleServiceInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingService(true);
    try {
      await uploadServiceInvoiceMutation.mutateAsync({
        fileName: file.name,
        fileKey: `service-invoices/${file.name}`,
        fileUrl: `https://example.com/${file.name}`,
        supplierName: "Fornecedor Desconhecido",
        amount: "0.00",
        issueDate: Date.now(),
      } as any);

      toast.success("NF de serviço carregada! Processando...");
      refetchServiceInvoices();
    } catch (error) {
      toast.error("Erro ao fazer upload da NF");
    } finally {
      setUploadingService(false);
    }
  };

  const handleProductInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProduct(true);
    try {
      await uploadProductInvoiceMutation.mutateAsync({
        fileName: file.name,
        fileKey: `product-invoices/${file.name}`,
        fileUrl: `https://example.com/${file.name}`,
        supplierName: "Fornecedor Desconhecido",
        amount: "0.00",
        issueDate: Date.now(),
      } as any);

      toast.success("NF de produto carregada! Processando...");
      refetchProductInvoices();
    } catch (error) {
      toast.error("Erro ao fazer upload da NF");
    } finally {
      setUploadingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Upload de Faturas</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="card-statements">Extratos de Cartão</TabsTrigger>
          <TabsTrigger value="service-invoices">NF de Serviço</TabsTrigger>
          <TabsTrigger value="product-invoices">NF de Produto</TabsTrigger>
        </TabsList>

        <TabsContent value="card-statements" className="space-y-4">
          <div className="grid gap-4">
            {cards.map((card) => (
              <Card key={card.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{card.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <span className="text-sm font-medium">Clique para fazer upload do extrato</span>
                      <span className="text-xs text-muted-foreground">PDF ou CSV</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.csv"
                      onChange={(e) => handleCardStatementUpload(e, card.id)}
                      disabled={uploadingCard}
                      className="hidden"
                    />
                  </label>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Extratos Recentes</h3>
            {cardStatements.map((stmt: any) => (
              <Card key={stmt.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{stmt.fileName}</p>
                      <p className="text-sm text-muted-foreground">{stmt.month}/{stmt.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stmt.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {stmt.status === "processing" && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                    {stmt.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                    <span className="text-xs text-muted-foreground">{stmt.status}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="service-invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload de NF de Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Clique para fazer upload da NF</span>
                  <span className="text-xs text-muted-foreground">PDF</span>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleServiceInvoiceUpload}
                  disabled={uploadingService}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold">NF de Serviço Recentes</h3>
            {serviceInvoices.map((invoice: any) => (
              <Card key={invoice.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{invoice.supplierName}</p>
                    <p className="text-sm text-muted-foreground">R$ {parseFloat(invoice.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{invoice.status}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="product-invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload de NF de Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Clique para fazer upload da NF</span>
                  <span className="text-xs text-muted-foreground">PDF</span>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleProductInvoiceUpload}
                  disabled={uploadingProduct}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold">NF de Produto Recentes</h3>
            {productInvoices.map((invoice: any) => (
              <Card key={invoice.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{invoice.supplierName}</p>
                    <p className="text-sm text-muted-foreground">R$ {parseFloat(invoice.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{invoice.status}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
