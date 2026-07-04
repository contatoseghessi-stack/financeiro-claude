import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, User, Building2, Users } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
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
    referredBy: "",
  });

  const { data: clients = [], refetch } = trpc.clients.list.useQuery();
  const { data: ranking = [] } = trpc.clients.referralRanking.useQuery();
  const createMutation = trpc.clients.create.useMutation();
  const updateMutation = trpc.clients.update.useMutation();

  const resetForm = () => {
    setFormData({
      cnpj: "",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      referredBy: "",
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
        toast.success("Contratante atualizado!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Contratante criado!");
      }
      resetForm();
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar contratante");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg sm:text-3xl font-bold">Contratantes</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Contratante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Contratante</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome / Razão Social *</Label>
                <Input
                  id="companyName"
                  placeholder="Ex: Iguatemi, João Silva, Studio X"
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
                    placeholder="email@empresa.com"
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
                <Label htmlFor="referredBy">Indicado por (opcional)</Label>
                <Input
                  id="referredBy"
                  placeholder="Quem indicou este cliente?"
                  value={formData.referredBy}
                  onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Anotações sobre o contratante"
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

      {/* Ranking de Indicações */}
      {ranking.length > 0 && (
        <Card className="border-[#EE770E]/30 bg-[#EE770E]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-[#EE770E]" />
              Ranking de Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranking.map((item, idx) => (
                <div key={item.referrer} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#EE770E] w-6">{idx + 1}.</span>
                    <div>
                      <p className="font-medium">{item.referrer}</p>
                      <p className="text-xs text-muted-foreground">{item.clients.join(", ")}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold bg-[#EE770E]/20 text-[#EE770E] px-2 py-1 rounded">
                    {item.clientCount} {item.clientCount === 1 ? "indicação" : "indicações"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {clients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum contratante cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre seus clientes e contratantes aqui. Só o nome é obrigatório!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#EE770E]/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#EE770E]" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm sm:text-lg truncate">{client.companyName}</CardTitle>
                    {client.cnpj && <p className="text-xs sm:text-sm text-muted-foreground">CNPJ: {client.cnpj}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingId(client.id);
                  setFormData({
                    cnpj: client.cnpj || "",
                    companyName: client.companyName,
                    contactName: client.contactName || "",
                    email: client.email || "",
                    phone: client.phone || "",
                    address: client.address || "",
                    notes: client.notes || "",
                    referredBy: client.referredBy || "",
                  });
                  setIsOpen(true);
                }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {client.contactName && <p><strong>Contato:</strong> {client.contactName}</p>}
              {client.email && <p><strong>E-mail:</strong> {client.email}</p>}
              {client.phone && <p><strong>Telefone:</strong> {client.phone}</p>}
              {client.address && <p><strong>Endereço:</strong> {client.address}</p>}
              {client.referredBy && (
                <p className="text-[#EE770E]">
                  <strong>Indicado por:</strong> {client.referredBy}
                </p>
              )}
              {client.notes && <p className="text-muted-foreground italic">{client.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
