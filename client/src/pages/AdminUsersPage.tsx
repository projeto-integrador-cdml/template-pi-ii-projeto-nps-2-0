import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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

  const toggleActive = trpc.admin.toggleUserActive.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Status atualizado!"); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Papel atualizado!"); },
    onError: () => toast.error("Erro ao atualizar papel"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">Controle quem pode acessar o CRM</p>
        </div>
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
                      <p className="font-medium truncate">{u.name || "Sem nome"}</p>
                      {u.id === currentUser?.id && <Badge variant="outline" className="text-xs">Você</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email || "Sem email"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Último acesso: {new Date(u.lastSignedIn).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <Select
                      value={u.role}
                      onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as "user" | "admin" })}
                      disabled={u.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{u.isActive ? "Ativo" : "Inativo"}</span>
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
    </div>
  );
}
