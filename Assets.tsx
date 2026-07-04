import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, Camera, Monitor, Car, Pencil, Trash2, Plus, TrendingDown } from "lucide-react";

const categoryLabels: Record<string, string> = {
  camera: "Câmera", lens: "Lente", lighting: "Iluminação", audio: "Áudio",
  computer: "Computador", software: "Software", vehicle: "Veículo",
  furniture: "Mobiliário", other: "Outro",
};

const categoryIcons: Record<string, any> = {
  camera: Camera, lens: Camera, lighting: Camera, audio: Camera,
  computer: Monitor, software: Monitor, vehicle: Car,
  furniture: Package, other: Package,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function calculateCurrentValue(purchaseValue: number, purchaseDate: number, depreciationRate: number) {
  const ageYears = (Date.now() - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);
  const depreciation = Math.min(ageYears * depreciationRate / 100, 1);
  return purchaseValue * (1 - depreciation);
}

export default function Assets() {
  const { data: assets, isLoading } = trpc.assets.list.useQuery();
  const createMutation = trpc.assets.create.useMutation();
  const updateMutation = trpc.assets.update.useMutation();
  const deleteMutation = trpc.assets.delete.useMutation();
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", category: "other" as string,
    purchaseValue: "", purchaseDate: new Date().toISOString().split("T")[0],
    usefulLifeYears: "5", depreciationRate: "20.00",
    serialNumber: "", notes: "", scope: "pj" as string,
  });

  const resetForm = () => {
    setForm({
      name: "", description: "", category: "other",
      purchaseValue: "", purchaseDate: new Date().toISOString().split("T")[0],
      usefulLifeYears: "5", depreciationRate: "20.00",
      serialNumber: "", notes: "", scope: "pj",
    });
    setEditingAsset(null);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.purchaseValue) {
      toast.error("Preencha nome e valor de compra");
      return;
    }
    try {
      if (editingAsset) {
        await updateMutation.mutateAsync({
          id: editingAsset.id,
          name: form.name,
          description: form.description || undefined,
          category: form.category as any,
          purchaseValue: form.purchaseValue,
          purchaseDate: new Date(form.purchaseDate).getTime(),
          usefulLifeYears: parseInt(form.usefulLifeYears),
          depreciationRate: form.depreciationRate,
          serialNumber: form.serialNumber || undefined,
          notes: form.notes || undefined,
          scope: form.scope as any,
        });
        toast.success("Bem atualizado!");
      } else {
        await createMutation.mutateAsync({
          name: form.name,
          description: form.description || undefined,
          category: form.category as any,
          purchaseValue: form.purchaseValue,
          purchaseDate: new Date(form.purchaseDate).getTime(),
          usefulLifeYears: parseInt(form.usefulLifeYears),
          depreciationRate: form.depreciationRate,
          serialNumber: form.serialNumber || undefined,
          notes: form.notes || undefined,
          scope: form.scope as any,
        });
        toast.success("Bem cadastrado!");
      }
      utils.assets.list.invalidate();
      resetForm();
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar bem");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este bem?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      utils.assets.list.invalidate();
      toast.success("Bem excluído!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      description: asset.description || "",
      category: asset.category,
      purchaseValue: String(asset.purchaseValue),
      purchaseDate: new Date(Number(asset.purchaseDate)).toISOString().split("T")[0],
      usefulLifeYears: String(asset.usefulLifeYears),
      depreciationRate: String(asset.depreciationRate),
      serialNumber: asset.serialNumber || "",
      notes: asset.notes || "",
      scope: asset.scope,
    });
    setShowForm(true);
  };

  const totalPurchase = assets?.reduce((s, a) => s + Number(a.purchaseValue), 0) || 0;
  const totalCurrent = assets?.reduce((s, a) => s + calculateCurrentValue(Number(a.purchaseValue), Number(a.purchaseDate), Number(a.depreciationRate)), 0) || 0;
  const totalDepreciation = totalPurchase - totalCurrent;

  const pjAssets = assets?.filter(a => a.scope === 'pj') || [];
  const pfAssets = assets?.filter(a => a.scope === 'pf') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bens e Patrimônio</h1>
          <p className="text-muted-foreground">Controle de equipamentos, veículos e bens</p>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Bem</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAsset ? "Editar Bem" : "Cadastrar Novo Bem"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Canon R6 Mark II" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PJ ou PF</Label>
                  <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pj">PJ (Empresa)</SelectItem>
                      <SelectItem value="pf">PF (Pessoal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor de Compra *</Label>
                  <Input type="number" step="0.01" value={form.purchaseValue} onChange={e => setForm({ ...form, purchaseValue: e.target.value })} placeholder="15000.00" />
                </div>
                <div>
                  <Label>Data de Compra</Label>
                  <Input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vida Útil (anos)</Label>
                  <Input type="number" value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: e.target.value })} />
                </div>
                <div>
                  <Label>Depreciação (% ao ano)</Label>
                  <Input type="number" step="0.01" value={form.depreciationRate} onChange={e => setForm({ ...form, depreciationRate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Nº de Série (opcional)</Label>
                <Input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} placeholder="ABC123456" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Corpo de câmera mirrorless full frame" />
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Comprada na loja X, garantia até..." />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAsset ? "Salvar Alterações" : "Cadastrar Bem"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total de Bens</div>
            <div className="text-2xl font-bold">{assets?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Valor de Compra</div>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(totalPurchase)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Valor Atual</div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalCurrent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="w-3 h-3" /> Depreciação Total
            </div>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalDepreciation)}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !assets?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum bem cadastrado</p>
            <p className="text-sm">Cadastre câmeras, lentes, computadores e outros equipamentos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pjAssets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-blue-400">🏢 Bens PJ (Empresa)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pjAssets.map(asset => {
                  const Icon = categoryIcons[asset.category] || Package;
                  const currentVal = calculateCurrentValue(Number(asset.purchaseValue), Number(asset.purchaseDate), Number(asset.depreciationRate));
                  const depPercent = ((Number(asset.purchaseValue) - currentVal) / Number(asset.purchaseValue) * 100).toFixed(0);
                  return (
                    <Card key={asset.id} className="relative group">
                      <CardContent className="pt-6">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(asset)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(asset.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Icon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{categoryLabels[asset.category]}</div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Compra:</span>
                            <span>{formatCurrency(Number(asset.purchaseValue))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Atual:</span>
                            <span className="text-green-400">{formatCurrency(currentVal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Depreciação:</span>
                            <span className="text-red-400">{depPercent}%</span>
                          </div>
                        </div>
                        {asset.serialNumber && (
                          <div className="mt-2 text-xs text-muted-foreground">S/N: {asset.serialNumber}</div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Comprado em {new Date(Number(asset.purchaseDate)).toLocaleDateString("pt-BR")}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {pfAssets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-purple-400">👤 Bens PF (Pessoal)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pfAssets.map(asset => {
                  const Icon = categoryIcons[asset.category] || Package;
                  const currentVal = calculateCurrentValue(Number(asset.purchaseValue), Number(asset.purchaseDate), Number(asset.depreciationRate));
                  const depPercent = ((Number(asset.purchaseValue) - currentVal) / Number(asset.purchaseValue) * 100).toFixed(0);
                  return (
                    <Card key={asset.id} className="relative group">
                      <CardContent className="pt-6">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(asset)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(asset.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Icon className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{categoryLabels[asset.category]}</div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Compra:</span>
                            <span>{formatCurrency(Number(asset.purchaseValue))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Atual:</span>
                            <span className="text-green-400">{formatCurrency(currentVal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Depreciação:</span>
                            <span className="text-red-400">{depPercent}%</span>
                          </div>
                        </div>
                        {asset.serialNumber && (
                          <div className="mt-2 text-xs text-muted-foreground">S/N: {asset.serialNumber}</div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Comprado em {new Date(Number(asset.purchaseDate)).toLocaleDateString("pt-BR")}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
