import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Database, FileText, Briefcase, Repeat, Brain, Download, Upload, FlaskConical, Loader2, Shield } from "lucide-react";
import { Link } from "wouter";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Configuracoes() {
  const { user } = useAuth();
  const authUtils = trpc.useUtils();
  const setBusinessType = trpc.onboarding.setBusinessType.useMutation({
    onSuccess: () => {
      toast.success("Regime tributário atualizado!");
      authUtils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    confirmText: string;
  }>({ open: false, title: "", description: "", action: () => {}, confirmText: "" });

  const [txScope, setTxScope] = useState<"all" | "pj" | "pf">("all");
  const [txMonth, setTxMonth] = useState<string>("all");
  const [txYear, setTxYear] = useState<string>(new Date().getFullYear().toString());
  const [showTestPreview, setShowTestPreview] = useState(false);

  const utils = trpc.useUtils();

  // Test data preview and cleanup
  const testDataPreview = trpc.settings.previewTestData.useQuery(undefined, {
    enabled: showTestPreview,
  });

  const clearTestData = trpc.settings.clearTestData.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowTestPreview(false);
      utils.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clearAll = trpc.settings.clearAllData.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clearTransactions = trpc.settings.clearTransactions.useMutation({
    onSuccess: () => {
      toast.success("Transações apagadas com sucesso!");
      utils.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clearJobs = trpc.settings.clearJobs.useMutation({
    onSuccess: () => {
      toast.success("Jobs e dados relacionados apagados!");
      utils.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clearRecurrences = trpc.settings.clearRecurrences.useMutation({
    onSuccess: () => {
      toast.success("Recorrências apagadas!");
      utils.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clearLearning = trpc.settings.clearCategoryLearning.useMutation({
    onSuccess: () => {
      toast.success("Aprendizado de categorias resetado!");
      utils.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [backupLoading, setBackupLoading] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const importBackup = trpc.settings.importBackup.useMutation({
    onSuccess: (data) => {
      const total = Object.values(data.imported).reduce((a, b) => a + b, 0);
      toast.success(`Backup importado! ${total} registros processados (modo: ${data.mode === "replace" ? "substituir" : "adicionar"})`);
      utils.invalidate();
      setImportFile(null);
    },
    onError: (err) => toast.error(`Erro ao importar: ${err.message}`),
  });

  const handleImportBackup = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo JSON de backup");
      return;
    }
    setImportLoading(true);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const data = parsed.data || parsed;
      await importBackup.mutateAsync({ mode: importMode, data });
    } catch (err: any) {
      if (err.message?.includes("JSON")) {
        toast.error("Arquivo inválido. Certifique-se de que é um JSON de backup válido.");
      } else {
        toast.error(`Erro: ${err.message}`);
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const data = await utils.settings.exportBackup.fetch();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-euge-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const isLoading = clearAll.isPending || clearTransactions.isPending || clearJobs.isPending || clearRecurrences.isPending || clearLearning.isPending || clearTestData.isPending;

  const openConfirm = (title: string, description: string, action: () => void, confirmText: string = "Apagar") => {
    setConfirmDialog({ open: true, title, description, action, confirmText });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie seus dados e preferências do sistema.</p>
      </div>

      {/* Regime Tributário */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Regime Tributário
        </h2>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo de Empresa</CardTitle>
            <CardDescription>
              Define como os impostos são calculados na aba Fiscal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { value: "mei" as const, label: "MEI", desc: "DAS fixo mensal, limite R$81k/ano" },
                { value: "simples" as const, label: "ME / Simples Nacional", desc: "Alíquotas progressivas por faixa" },
                { value: "autonomo" as const, label: "PF / Autônomo", desc: "Carnê-leão + INSS individual" },
              ].map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    (user?.businessType || "mei") === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => {
                    if ((user?.businessType || "mei") !== option.value) {
                      setBusinessType.mutate({ businessType: option.value });
                    }
                  }}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    (user?.businessType || "mei") === option.value ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {(user?.businessType || "mei") === option.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gestão de Dados */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Gestão de Dados
        </h2>

        {/* Limpar Dados de Teste */}
        <Card className="border-amber-600/30 bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-amber-400" />
              Limpar Dados de Teste
            </CardTitle>
            <CardDescription>
              Remove registros criados automaticamente por testes (vitest), como fornecedores, clientes, jobs e transações fictícias.
              Seus dados reais serão preservados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showTestPreview ? (
              <Button
                variant="outline"
                className="gap-2 border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
                onClick={() => setShowTestPreview(true)}
              >
                <FlaskConical className="h-4 w-4" />
                Verificar Dados de Teste
              </Button>
            ) : testDataPreview.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando banco de dados...
              </div>
            ) : testDataPreview.data ? (
              <div className="space-y-4">
                {testDataPreview.data.totalCount === 0 ? (
                  <div className="rounded-lg border border-emerald-600/30 bg-emerald-950/10 p-4">
                    <p className="text-sm text-emerald-400 font-medium">Nenhum dado de teste encontrado! Seu banco está limpo.</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-amber-600/20 bg-amber-950/5 p-4 space-y-3">
                      <p className="text-sm font-medium text-amber-300">
                        Encontrados {testDataPreview.data.totalCount} registros de teste:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {testDataPreview.data.suppliers.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Fornecedores ({testDataPreview.data.suppliers.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.suppliers.map((s) => (
                                <li key={s.id}>{s.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.clients.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Clientes ({testDataPreview.data.clients.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.clients.map((c) => (
                                <li key={c.id}>{c.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.jobs.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Jobs ({testDataPreview.data.jobs.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.jobs.map((j) => (
                                <li key={j.id}>{j.name}{j.client ? ` (${j.client})` : ""}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.recurringIncome.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Receitas Recorrentes ({testDataPreview.data.recurringIncome.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.recurringIncome.map((r) => (
                                <li key={r.id}>{r.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.recurringExpenses.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Despesas Recorrentes ({testDataPreview.data.recurringExpenses.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.recurringExpenses.map((r) => (
                                <li key={r.id}>{r.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.cardStatements.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Faturas ({testDataPreview.data.cardStatements.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.cardStatements.map((cs) => (
                                <li key={cs.id}>{cs.fileName}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.serviceInvoices.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">NFs Serviço ({testDataPreview.data.serviceInvoices.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.serviceInvoices.map((si) => (
                                <li key={si.id}>{si.fileName}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.productInvoices.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">NFs Produto ({testDataPreview.data.productInvoices.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.productInvoices.map((pi) => (
                                <li key={pi.id}>{pi.fileName}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.partners.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Parceiros ({testDataPreview.data.partners.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.partners.map((p) => (
                                <li key={p.id}>{p.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testDataPreview.data.transactions.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-medium text-muted-foreground">Transações ({testDataPreview.data.transactions.length}):</span>
                            <ul className="list-disc list-inside text-muted-foreground/80">
                              {testDataPreview.data.transactions.slice(0, 5).map((t) => (
                                <li key={t.id}>{t.description}</li>
                              ))}
                              {testDataPreview.data.transactions.length > 5 && (
                                <li>... e mais {testDataPreview.data.transactions.length - 5}</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => openConfirm(
                          "Limpar Dados de Teste",
                          `Tem certeza que deseja remover ${testDataPreview.data!.totalCount} registros de teste? Apenas dados identificados como teste serão removidos. Seus dados reais serão preservados.`,
                          () => clearTestData.mutate(),
                          "Sim, Limpar Testes"
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remover {testDataPreview.data.totalCount} Registros de Teste
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTestPreview(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Exportar Backup */}
        <Card className="border-emerald-600/30 bg-emerald-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-400" />
              Exportar Backup
            </CardTitle>
            <CardDescription>
              Baixe todos os seus dados (jobs, transações, recorrências, fornecedores, clientes, etc.) em um arquivo JSON.
              Use quando quiser ter uma cópia de segurança dos seus dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/20"
              onClick={handleExportBackup}
              disabled={backupLoading}
            >
              <Download className="h-4 w-4" />
              {backupLoading ? "Exportando..." : "Baixar Backup (JSON)"}
            </Button>
          </CardContent>
        </Card>

        {/* Importar Backup */}
        <Card className="border-blue-600/30 bg-blue-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-400" />
              Importar Backup
            </CardTitle>
            <CardDescription>
              Restaure seus dados a partir de um arquivo JSON de backup exportado anteriormente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Modo de importação</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                    className="accent-blue-500"
                  />
                  <span className="text-sm">Adicionar aos existentes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-red-400">Substituir tudo</span>
                </label>
              </div>
              {importMode === "replace" && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Atenção: todos os dados atuais serão apagados antes da importação.
                </p>
              )}
              {importMode === "merge" && (
                <p className="text-xs text-muted-foreground">
                  Registros com IDs já existentes serão ignorados. Apenas novos registros serão adicionados.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Arquivo JSON</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                />
              </div>
              <Button
                variant="outline"
                className="gap-2 border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                onClick={() => {
                  if (importMode === "replace") {
                    openConfirm(
                      "Substituir todos os dados?",
                      "Isso vai APAGAR todos os dados atuais e importar os dados do arquivo. Essa ação não pode ser desfeita. Tem certeza?",
                      handleImportBackup,
                      "Substituir e Importar"
                    );
                  } else {
                    handleImportBackup();
                  }
                }}
                disabled={importLoading || !importFile}
              >
                <Upload className="h-4 w-4" />
                {importLoading ? "Importando..." : "Importar Backup"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Limpar Transações */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transações
            </CardTitle>
            <CardDescription>
              Apague transações por escopo (PJ/PF) e/ou período. Útil para remover dados de teste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Escopo</label>
                <Select value={txScope} onValueChange={(v) => setTxScope(v as "all" | "pj" | "pf")}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="pf">PF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Mês</label>
                <Select value={txMonth} onValueChange={setTxMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Ano</label>
                <Select value={txYear} onValueChange={setTxYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={isLoading}
                onClick={() => {
                  const scopeLabel = txScope === "all" ? "todas" : txScope.toUpperCase();
                  const monthLabel = txMonth === "all" ? "todos os meses" : MONTHS[parseInt(txMonth)];
                  openConfirm(
                    "Apagar Transações",
                    `Tem certeza que deseja apagar ${scopeLabel} as transações de ${monthLabel} ${txYear}? Esta ação não pode ser desfeita.`,
                    () => {
                      const input: { scope?: "all" | "pj" | "pf"; month?: number; year?: number } = {};
                      if (txScope !== "all") input.scope = txScope;
                      if (txMonth !== "all") {
                        input.month = parseInt(txMonth);
                        input.year = parseInt(txYear);
                      }
                      clearTransactions.mutate(Object.keys(input).length > 0 ? input : undefined);
                    },
                    "Apagar Transações"
                  );
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Apagar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Limpar Jobs */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs / Projetos
            </CardTitle>
            <CardDescription>
              Apague todos os jobs, entregas, custos e recebimentos associados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={() => openConfirm(
                "Apagar Jobs",
                "Tem certeza que deseja apagar todos os jobs e dados relacionados (entregas, custos, recebimentos)? Esta ação não pode ser desfeita.",
                () => clearJobs.mutate(),
                "Apagar Jobs"
              )}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Apagar Todos os Jobs
            </Button>
          </CardContent>
        </Card>

        {/* Limpar Recorrências */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Recorrências
            </CardTitle>
            <CardDescription>
              Apague todas as receitas e despesas recorrentes cadastradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={() => openConfirm(
                "Apagar Recorrências",
                "Tem certeza que deseja apagar todas as receitas e despesas recorrentes? Esta ação não pode ser desfeita.",
                () => clearRecurrences.mutate(),
                "Apagar Recorrências"
              )}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Apagar Recorrências
            </Button>
          </CardContent>
        </Card>

        {/* Limpar Aprendizado */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Aprendizado de Categorias
            </CardTitle>
            <CardDescription>
              Resete o aprendizado automático de categorização. O bot vai "esquecer" os padrões aprendidos das faturas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={() => openConfirm(
                "Resetar Aprendizado",
                "Tem certeza que deseja resetar todo o aprendizado de categorias? O bot vai precisar aprender tudo de novo.",
                () => clearLearning.mutate(),
                "Resetar"
              )}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Resetar Aprendizado
            </Button>
          </CardContent>
        </Card>

        {/* Termos e Privacidade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Termos e Privacidade
            </CardTitle>
            <CardDescription>
              Política de Privacidade (LGPD) e Termos de Uso do Eugê Financeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/legal">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-3.5 w-3.5" />
                Ver Política de Privacidade e Termos
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Zona de Perigo */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Apague TODOS os dados financeiros do sistema. Mantém apenas cartões, categorias, impostos e conta de usuário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => openConfirm(
                "Apagar TODOS os Dados",
                "ATENÇÃO: Esta ação vai apagar TODAS as transações, jobs, recorrências, fornecedores, contratantes, faturas e aprendizado. Apenas cartões, categorias, impostos e sua conta serão mantidos. Esta ação NÃO pode ser desfeita!",
                () => clearAll.mutate(),
                "Sim, Apagar Tudo"
              )}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar Todos os Dados
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog(prev => ({ ...prev, open: false }));
              }}
            >
              {confirmDialog.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
