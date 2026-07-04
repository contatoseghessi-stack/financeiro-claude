import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, Upload, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function CompanyData() {
  const companyQuery = trpc.company.get.useQuery();
  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      companyQuery.refetch();
      toast.success("Dados da empresa salvos!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const uploadLogoMutation = trpc.company.uploadLogo.useMutation({
    onSuccess: (data) => {
      companyQuery.refetch();
      setLogoPreview(data.url);
      toast.success("Logo atualizado!");
    },
    onError: (err) => {
      toast.error("Erro ao enviar logo: " + err.message);
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    cnae: "",
    capitalSocial: "",
    dataAbertura: "",
    situacao: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    email: "",
    telefone: "",
  });

  useEffect(() => {
    if (companyQuery.data) {
      setForm({
        cnpj: companyQuery.data.cnpj || "",
        razaoSocial: companyQuery.data.razaoSocial || "",
        nomeFantasia: companyQuery.data.nomeFantasia || "",
        cnae: companyQuery.data.cnae || "",
        capitalSocial: companyQuery.data.capitalSocial || "",
        dataAbertura: companyQuery.data.dataAbertura || "",
        situacao: companyQuery.data.situacao || "",
        endereco: companyQuery.data.endereco || "",
        cidade: companyQuery.data.cidade || "",
        estado: companyQuery.data.estado || "",
        cep: companyQuery.data.cep || "",
        email: companyQuery.data.email || "",
        telefone: companyQuery.data.telefone || "",
      });
      if (companyQuery.data.logoUrl) {
        setLogoPreview(companyQuery.data.logoUrl);
      }
    }
  }, [companyQuery.data]);

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem (PNG, JPG, SVG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogoMutation.mutate({
        logoBase64: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateMutation.mutate({ ...form, logoUrl: null } as any);
    setLogoPreview(null);
    toast.success("Logo removido!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Dados da Empresa</h1>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {companyQuery.isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {/* Logo da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo da Empresa</CardTitle>
              <CardDescription>
                Seu logo aparecerá no sidebar do sistema, substituindo o logo padrão. Recomendado: imagem quadrada ou horizontal, fundo transparente (PNG/SVG).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Preview */}
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo da empresa"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogoMutation.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadLogoMutation.isPending ? "Enviando..." : "Enviar Logo"}
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, SVG ou WebP. Máx 2MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados Cadastrais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
                <CardDescription>Informações legais da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>CNPJ</Label>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => updateField("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label>Razão Social</Label>
                  <Input
                    value={form.razaoSocial}
                    onChange={(e) => updateField("razaoSocial", e.target.value)}
                    placeholder="Nome registrado na Receita"
                  />
                </div>
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={form.nomeFantasia}
                    onChange={(e) => updateField("nomeFantasia", e.target.value)}
                    placeholder="Nome comercial"
                  />
                </div>
                <div>
                  <Label>CNAE</Label>
                  <Input
                    value={form.cnae}
                    onChange={(e) => updateField("cnae", e.target.value)}
                    placeholder="7420001 - Atividades de produção..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Capital Social</Label>
                    <Input
                      value={form.capitalSocial}
                      onChange={(e) => updateField("capitalSocial", e.target.value)}
                      placeholder="R$ 2.000,00"
                    />
                  </div>
                  <div>
                    <Label>Data de Abertura</Label>
                    <Input
                      value={form.dataAbertura}
                      onChange={(e) => updateField("dataAbertura", e.target.value)}
                      placeholder="19/08/2018"
                    />
                  </div>
                </div>
                <div>
                  <Label>Situação Cadastral</Label>
                  <Input
                    value={form.situacao}
                    onChange={(e) => updateField("situacao", e.target.value)}
                    placeholder="Ativa"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Endereço e Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Endereço e Contato</CardTitle>
                <CardDescription>Localização e formas de contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Endereço</Label>
                  <Textarea
                    value={form.endereco}
                    onChange={(e) => updateField("endereco", e.target.value)}
                    placeholder="Rua, número, complemento, bairro"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Cidade</Label>
                    <Input
                      value={form.cidade}
                      onChange={(e) => updateField("cidade", e.target.value)}
                      placeholder="Porto Alegre"
                    />
                  </div>
                  <div>
                    <Label>UF</Label>
                    <Input
                      value={form.estado}
                      onChange={(e) => updateField("estado", e.target.value)}
                      placeholder="RS"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => updateField("cep", e.target.value)}
                    placeholder="91360-210"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contato@empresa.com"
                    type="email"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => updateField("telefone", e.target.value)}
                    placeholder="(51) 9569-2294"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
