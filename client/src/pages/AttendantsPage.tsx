import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, Shield, ShieldOff, Trash2, Edit, Monitor, Globe, Clock, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function AttendantsPage() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttendant, setEditingAttendant] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: allAttendants = [], isLoading } = trpc.attendants.listAll.useQuery();
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = clientsData?.data ?? [];

  const createMutation = trpc.attendants.create.useMutation({
    onSuccess: () => { utils.attendants.listAll.invalidate(); setDialogOpen(false); setEditingAttendant(null); toast.success("Atendente criado com sucesso!"); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.attendants.update.useMutation({
    onSuccess: () => { utils.attendants.listAll.invalidate(); setDialogOpen(false); setEditingAttendant(null); toast.success("Atendente atualizado!"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.attendants.delete.useMutation({
    onSuccess: () => { utils.attendants.listAll.invalidate(); toast.success("Atendente removido!"); },
    onError: (err) => toast.error(err.message),
  });
  const toggleActiveMutation = trpc.attendants.toggleActive.useMutation({
    onSuccess: () => { utils.attendants.listAll.invalidate(); toast.success("Status atualizado!"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ clientId: 0, name: "", email: "", password: "", phone: "", position: "" });

  const openCreate = () => {
    setEditingAttendant(null);
    setForm({ clientId: clients[0]?.id ?? 0, name: "", email: "", password: "", phone: "", position: "" });
    setDialogOpen(true);
  };

  const openEdit = (att: any) => {
    setEditingAttendant(att);
    setForm({ clientId: att.clientId, name: att.name, email: att.email, password: "", phone: att.phone || "", position: att.position || "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.email.trim()) { toast.error("Email é obrigatório"); return; }
    if (!form.clientId) { toast.error("Selecione uma empresa"); return; }

    if (editingAttendant) {
      const data: any = { id: editingAttendant.id, clientId: form.clientId, name: form.name, email: form.email, phone: form.phone, position: form.position };
      if (form.password) data.password = form.password;
      updateMutation.mutate(data);
    } else {
      if (!form.password || form.password.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres"); return; }
      createMutation.mutate(form);
    }
  };

  const filteredAttendants = useMemo(() => {
    let list = allAttendants;
    if (selectedClientId !== "all") {
      list = list.filter((a: any) => a.clientId === parseInt(selectedClientId));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((a: any) => a.name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s));
    }
    return list;
  }, [allAttendants, selectedClientId, search]);

  const getClientName = (clientId: number) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || client?.company || `Empresa #${clientId}`;
  };

  // Agrupar por empresa
  const groupedByClient = useMemo(() => {
    const groups: Record<number, any[]> = {};
    filteredAttendants.forEach((att: any) => {
      if (!groups[att.clientId]) groups[att.clientId] = [];
      groups[att.clientId].push(att);
    });
    return groups;
  }, [filteredAttendants]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Atendentes
          </h1>
          <p className="text-muted-foreground mt-1">{allAttendants.length} atendentes cadastrados</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={clients.length === 0}>
          <Plus className="h-4 w-4" /> Novo Atendente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name || c.company || `#${c.id}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Informação sobre sessão única */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Proteção contra compartilhamento de senha</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cada atendente pode ter apenas uma sessão ativa por vez. Se alguém logar com a mesma conta em outro dispositivo, a sessão anterior é desconectada automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de atendentes agrupados por empresa */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32" /></Card>
          ))}
        </div>
      ) : filteredAttendants.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum atendente encontrado.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2" disabled={clients.length === 0}>
              <Plus className="h-4 w-4" /> Adicionar primeiro atendente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByClient).map(([clientIdStr, atts]) => {
            const clientId = parseInt(clientIdStr);
            const client = clients.find((c) => c.id === clientId);
            const maxAtt = (client as any)?.maxAttendants ?? 1;
            return (
              <Card key={clientId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getClientName(clientId)}
                      <Badge variant="outline" className="text-xs font-normal">
                        {atts.length}/{maxAtt} atendentes
                      </Badge>
                    </CardTitle>
                    {atts.length >= maxAtt && (
                      <Badge variant="destructive" className="text-xs">Limite atingido</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-border">
                    {atts.map((att: any) => (
                      <div key={att.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{att.name}</p>
                            <Badge variant={att.isActive ? "default" : "secondary"} className="text-xs">
                              {att.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{att.email}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {att.phone && <span>{att.phone}</span>}
                            {att.position && <span>{att.position}</span>}
                            {att.lastLoginAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Último acesso: {new Date(att.lastLoginAt).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                            {att.lastIp && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" /> {att.lastIp}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={att.isActive}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: att.id, isActive: checked })}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(att)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("Tem certeza que deseja excluir este atendente?")) deleteMutation.mutate({ id: att.id, clientId }); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar atendente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAttendant ? "Editar Atendente" : "Novo Atendente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Empresa *</Label>
              <Select value={String(form.clientId)} onValueChange={(v) => setForm({ ...form, clientId: parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name || c.company || `#${c.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do atendente" />
              </div>
              <div className="col-span-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
              </div>
              <div className="col-span-2">
                <Label>{editingAttendant ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingAttendant ? "••••••" : "Mínimo 6 caracteres"} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Atendente" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingAttendant ? "Salvar" : "Criar Atendente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
