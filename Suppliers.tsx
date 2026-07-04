import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Truck } from "lucide-react";
import { toast } from "sonner";

export default function Suppliers() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    cnpj: "",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { data: suppliers = [], refetch } = trpc.suppliers.list.useQuery();
  const createMutation = trpc.suppliers.create.useMutation();
  const updateMutation = trpc.suppliers.update.useMutation();

  const resetForm = () => {
    setFormData({
      cnpj: "",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      toast.error("Nome / Razão Social é obrigatório");
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast.success("Fornecedor atualizado!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Fornecedor criado!");
      }
      resetForm();
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar fornecedor");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg sm:text-3xl font-bold">Fornecedores</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Fornecedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome / Razão Social *</Label>
                <Input
                  id="companyName"
                  placeholder="Ex: Adobe, Aluguel Studio, Gráfica X"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome do Contato (opcional)</Label>
                <Input
                  id="contactName"
                  placeholder="Pessoa de contato"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    placeholder="email@fornecedor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    placeholder="(51) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço (opcional)</Label>
                <Input
                  id="address"
                  placeholder="Rua, número, bairro"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Anotações sobre o fornecedor"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {suppliers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fornecedor cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre seus fornecedores aqui. Só o nome é obrigatório!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EE770E]/20 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-[#EE770E]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{supplier.companyName}</CardTitle>
                    {supplier.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {supplier.cnpj}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingId(supplier.id);
                  setFormData({
                    cnpj: supplier.cnpj || "",
                    companyName: supplier.companyName,
                    contactName: supplier.contactName || "",
                    email: supplier.email || "",
                    phone: supplier.phone || "",
                    address: supplier.address || "",
                    notes: supplier.notes || "",
                  });
                  setIsOpen(true);
                }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {supplier.contactName && <p><strong>Contato:</strong> {supplier.contactName}</p>}
              {supplier.email && <p><strong>E-mail:</strong> {supplier.email}</p>}
              {supplier.phone && <p><strong>Telefone:</strong> {supplier.phone}</p>}
              {supplier.address && <p><strong>Endereço:</strong> {supplier.address}</p>}
              {supplier.notes && <p className="text-muted-foreground italic">{supplier.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
