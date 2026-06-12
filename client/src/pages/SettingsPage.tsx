import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, MessageCircle, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações do CRM</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base">Integração WhatsApp</CardTitle>
          </div>
          <CardDescription>Conecte sua conta do WhatsApp Business para enviar e receber mensagens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/30">
            <div>
              <p className="font-medium text-sm">Status da Conexão</p>
              <p className="text-xs text-muted-foreground mt-1">Configure a API do WhatsApp Business para ativar</p>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              Não configurado
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Para conectar, você precisará de uma API key do WhatsApp Business (Meta) ou de um serviço como Evolution API / Z-API.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Notificações</CardTitle>
          </div>
          <CardDescription>Configurações de notificações automáticas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Mudança de estágio no funil</p>
                <p className="text-xs text-muted-foreground">Notificar quando uma oportunidade mudar de estágio</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Tarefas vencidas</p>
                <p className="text-xs text-muted-foreground">Alertar sobre tarefas que passaram do prazo</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Ativo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Dados</CardTitle>
          </div>
          <CardDescription>Informações sobre o armazenamento de dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Os dados do CRM são armazenados de forma segura em banco de dados na nuvem.</p>
            <p>Gravações de áudio são armazenadas em S3 com URLs de acesso direto.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
