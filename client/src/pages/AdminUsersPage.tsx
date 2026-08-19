import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, Loader2, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        <Button variant="outline" onClick={() => setLocation("/")}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form states for Create User
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newMaxAttendants, setNewMaxAttendants] = useState(5);

  // Form states for Edit User
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editMaxAttendants, setEditMaxAttendants] = useState(5);

  const toggleActive = trpc.admin.toggleUserActive.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Status atualizado!"); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Papel atualizado!"); },
    onError: () => toast.error("Erro ao atualizar papel"),
  });

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      utils.clients.list.invalidate();
      setCreateOpen(false);
      resetCreateForm();
      toast.success("Empresa e Administrador cadastrados com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar empresa");
    },
  });

  const updateCotaMutation = trpc.admin.updateUserCota.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      utils.clients.list.invalidate();
      setEditOpen(false);
      setEditingUser(null);
      toast.success("Limites e empresa atualizados!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar limites");
    },
  });

  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewCompanyName("");
    setNewMaxAttendants(5);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newCompanyName.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    createUserMutation.mutate({
      name: newName,
      email: newEmail,
      password: newPassword,
      companyName: newCompanyName,
      maxAttendants: newMaxAttendants,
    });
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditCompanyName(user.companyName || "");
    setEditMaxAttendants(user.maxAttendants || 5);
    setEditOpen(true);
  };

  const handleUpdateCota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompanyName.trim()) {
      toast.error("O nome da empresa é obrigatório.");
      return;
    }
    updateCotaMutation.mutate({
      userId: editingUser.id,
      companyName: editCompanyName,
      maxAttendants: editMaxAttendants,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários e Empresas</h1>
            <p className="text-muted-foreground mt-1">Crie empresas, defina administradores e limite a quantidade de atendentes.</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Criar Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários Cadastrados ({users?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">{u.name?.charAt(0).toUpperCase() ?? "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{u.name || "Sem nome"}</p>
                      {u.id === currentUser?.id && <Badge variant="outline" className="text-xs">Super Admin</Badge>}
                      {u.role === "admin" && u.id !== currentUser?.id && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                      {u.role === "user" && <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">Empresa</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email || "Sem email"}</p>
                    {u.role === "user" && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">🏢 Empresa: {u.companyName || "Não definida"}</span>
                        <span>👥 Vagas de Atendentes: <b className="text-primary">{u.maxAttendants}</b></span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Último acesso: {new Date(u.lastSignedIn).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3.5 shrink-0">
                    {u.role === "user" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(u)}
                        className="h-8 px-2.5 text-xs gap-1"
                        title="Editar limites da empresa"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Limites
                      </Button>
                    )}
                    <Select
                      value={u.role}
                      onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as "user" | "admin" })}
                      disabled={u.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-[115px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Super Admin</SelectItem>
                        <SelectItem value="user">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{u.isActive ? "Ativo" : "Inativo"}</span>
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={(checked) => toggleActive.mutate({ userId: u.id, isActive: checked })}
                        disabled={u.id === currentUser?.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: CREATE COMPANY / USER */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px] glass-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Cadastrar Nova Empresa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um Administrador e configure as cotas de atendimento para a nova empresa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="comp-name" className="text-xs">Nome da Empresa *</Label>
              <Input
                id="comp-name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-name" className="text-xs">Nome do Administrador *</Label>
              <Input
                id="admin-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João Silva"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs">Email do Administrador *</Label>
              <Input
                id="admin-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@empresa.com"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-pass" className="text-xs">Senha de Acesso *</Label>
              <Input
                id="admin-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-cota" className="text-xs">Cota de Atendentes (Vagas) *</Label>
              <Input
                id="admin-cota"
                type="number"
                value={newMaxAttendants}
                onChange={(e) => setNewMaxAttendants(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-9 text-xs"
                min={1}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending} className="h-9 text-xs">
                {createUserMutation.isPending ? "Cadastrando..." : "Cadastrar Empresa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDIT COMPANY CORES / LIMITS */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px] glass-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editar Limites da Empresa
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Edite as credenciais corporativas e o limite máximo de atendentes ativos.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateCota} className="space-y-4 py-2">
              <div className="p-3 bg-muted/20 border border-border/10 rounded-lg space-y-1">
                <p className="text-[11px] text-muted-foreground">Administrador: <span className="font-semibold text-foreground">{editingUser.name}</span></p>
                <p className="text-[11px] text-muted-foreground">Email: <span className="font-semibold text-foreground">{editingUser.email}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-comp-name" className="text-xs">Nome da Empresa</Label>
                <Input
                  id="edit-comp-name"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Nome Fantasia"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cota" className="text-xs">Cota Máxima de Atendentes</Label>
                <Input
                  id="edit-cota"
                  type="number"
                  value={editMaxAttendants}
                  onChange={(e) => setEditMaxAttendants(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-9 text-xs"
                  min={1}
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="h-9 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateCotaMutation.isPending} className="h-9 text-xs">
                  {updateCotaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
