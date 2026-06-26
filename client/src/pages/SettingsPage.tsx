import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, MessageCircle, Bell, Database, LogOut, CheckCircle, Loader2, Save, Info, Link, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const { data: config, refetch, isLoading } = trpc.whatsapp.getConnectionConfig.useQuery();

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");

  useEffect(() => {
    if (config) {
      setWhatsappNumber(config.whatsappNumber || "");
      setWhatsappApiUrl(config.whatsappApiUrl || "");
      setWhatsappApiKey(config.whatsappApiKey || "");
    }
  }, [config]);

  const saveMutation = trpc.whatsapp.updateConnectionConfig.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Configurações do WhatsApp salvas com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar configurações");
    }
  });

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("WhatsApp desconectado e credenciais limpas!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao limpar configurações");
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber.trim() || !whatsappApiUrl.trim() || !whatsappApiKey.trim()) {
      toast.error("Por favor, preencha todos os campos para conectar a API Oficial.");
      return;
    }
    saveMutation.mutate({
      whatsappNumber: whatsappNumber.trim(),
      whatsappApiUrl: whatsappApiUrl.trim(),
      whatsappApiKey: whatsappApiKey.trim(),
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleClear = () => {
    disconnectMutation.mutate();
  };

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
  const verifyToken = "crm_whatsapp_verify_token";

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

      {/* WHATSAPP OFFICIAL CLOUD API CONNECTION CARD */}
      <Card className="glass-card border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Integração WhatsApp API Oficial</CardTitle>
            </div>
            {config?.whatsappStatus === "connected" ? (
              <Badge className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/25 text-[10px] px-2 py-0.5 font-bold">
                CONECTADO
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                INATIVO
              </Badge>
            )}
          </div>
          <CardDescription>
            Conecte o seu número de WhatsApp corporativo usando a Cloud API oficial da Meta Graph API para comunicações rápidas e estáveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* STATUS CARD OR FORM */}
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber" className="text-xs font-semibold">Número do WhatsApp (com DDI)</Label>
                    <Input
                      id="whatsappNumber"
                      placeholder="Ex: +5511999999999"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="h-10 text-sm bg-accent/10 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsappApiUrl" className="text-xs font-semibold">ID do Número (Phone Number ID)</Label>
                    <Input
                      id="whatsappApiUrl"
                      placeholder="Ex: 105432987654321"
                      value={whatsappApiUrl}
                      onChange={(e) => setWhatsappApiUrl(e.target.value)}
                      className="h-10 text-sm bg-accent/10 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsappApiKey" className="text-xs font-semibold">Token de Acesso Permanente (Meta)</Label>
                  <Input
                    id="whatsappApiKey"
                    type="password"
                    placeholder="Token Bearer da Meta (EAA...)"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                    className="h-10 text-sm bg-accent/10 border-border font-mono"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="h-9 text-xs gap-1.5 px-4 font-medium"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar Configurações
                  </Button>

                  {config?.whatsappStatus === "connected" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClear}
                      disabled={disconnectMutation.isPending}
                      size="sm"
                      className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 gap-1.5"
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Limpar Credenciais
                    </Button>
                  )}
                </div>
              </form>

              {/* WEBHOOK DETAILS FOR META */}
              <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="h-4 w-4 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Configuração do Webhook da Meta</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para receber mensagens no CRM, acesse a sua conta de desenvolvedor em <b>developers.facebook.com</b>, adicione o produto <b>WhatsApp Webhooks</b> e preencha os dados abaixo:
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border bg-background/50 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Callback URL</span>
                      <p className="text-xs font-mono select-all text-foreground truncate max-w-[400px]">{webhookUrl}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(webhookUrl, "Webhook Callback URL")}
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border bg-background/50 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Verify Token</span>
                      <p className="text-xs font-mono select-all text-foreground">{verifyToken}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(verifyToken, "Webhook Verify Token")}
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-2">
                  <Link className="h-3.5 w-3.5" />
                  <span>Selecione a inscrição de campo <b>messages</b> no painel da Meta para receber os eventos.</span>
                </div>
              </div>
            </div>
          )}
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
