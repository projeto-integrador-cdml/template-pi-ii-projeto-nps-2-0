import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings, Bell, Database, CheckCircle, Loader2, Save, Link, Plus, Trash2, 
  Sparkles, Zap, ShieldCheck, ShieldAlert, KeyRound, QrCode, Lock,
  Bot, Eye, EyeOff, Cpu, FileText, CheckCircle2, AlertCircle, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const { data: currentUser, refetch: refetchUser } = trpc.auth.me.useQuery();

  // AI Configuration states
  const { data: aiSettings, refetch: refetchAiSettings, isLoading: isLoadingAi } = trpc.ai.getSettings.useQuery();
  const { data: clinicRules } = trpc.ai.getRules.useQuery();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const { data: auditLogs, refetch: refetchAuditLogs, isLoading: isLoadingLogs } = trpc.ai.getAuditLogs.useQuery(
    { limit: 30 },
    { enabled: showLogsModal }
  );

  const [aiApiKey, setAiApiKey] = useState("");
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (aiSettings) {
      setAiApiKey(aiSettings.apiKey || "");
      setAiModel(aiSettings.model || "gemini-2.5-flash");
      setAiEnabled(aiSettings.enabled ?? true);
    }
  }, [aiSettings]);

  const saveAiMutation = trpc.ai.saveSettings.useMutation({
    onSuccess: () => {
      refetchAiSettings();
      toast.success("Configurações de IA salvas com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar configurações de IA");
    }
  });

  const testAiMutation = trpc.ai.testConnection.useMutation();

  const handleTestAi = async () => {
    setTestResult(null);
    try {
      const res = await testAiMutation.mutateAsync({
        apiKey: aiApiKey.trim() || undefined,
        model: aiModel,
      });
      setTestResult({ success: true, message: res.message });
      toast.success("✅ Conexão com Google Gemini aprovada!");
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Falha na conexão com Gemini" });
      toast.error("❌ Falha na conexão com Google Gemini");
    }
  };

  const handleSaveAi = () => {
    saveAiMutation.mutate({
      apiKey: aiApiKey.trim(),
      model: aiModel,
      enabled: aiEnabled,
    });
  };

  // 2FA states
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [is2FALoading, setIs2FALoading] = useState(false);

  const setup2FAMutation = trpc.auth.setup2FA.useMutation();
  const enable2FAMutation = trpc.auth.enable2FA.useMutation();
  const disable2FAMutation = trpc.auth.disable2FA.useMutation();

  const handleStart2FASetup = async () => {
    setIs2FALoading(true);
    try {
      const res = await setup2FAMutation.mutateAsync();
      setSetupData(res);
      setVerifyCode("");
      setSetupModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar chave de 2FA.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !verifyCode) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setIs2FALoading(true);
    try {
      await enable2FAMutation.mutateAsync({
        secret: setupData.secret,
        code: verifyCode,
      });
      toast.success("Autenticação de 2 Fatores ativada com sucesso!");
      setSetupModalOpen(false);
      refetchUser();
      utils.auth.me.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Código de verificação 2FA inválido.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIs2FALoading(true);
    try {
      await disable2FAMutation.mutateAsync({
        code: disableCode || undefined,
      });
      toast.success("Autenticação de 2 Fatores desativada.");
      setDisableModalOpen(false);
      setDisableCode("");
      refetchUser();
      utils.auth.me.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar 2FA.");
    } finally {
      setIs2FALoading(false);
    }
  };
  const { data: serverQuickReplies, refetch: refetchQuickReplies } = trpc.whatsapp.listQuickReplies.useQuery();
  const [quickReplies, setQuickReplies] = useState<any[]>([]);

  useEffect(() => {
    if (serverQuickReplies) {
      setQuickReplies(serverQuickReplies);
    }
  }, [serverQuickReplies]);

  const saveQuickRepliesMutation = trpc.whatsapp.saveQuickReplies.useMutation({
    onSuccess: () => {
      refetchQuickReplies();
      toast.success("Respostas rápidas da empresa salvas com sucesso no banco de dados!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar respostas rápidas");
    }
  });

  const { data: serverTemplates, refetch: refetchTemplates, isLoading: isLoadingTemplates } = trpc.whatsapp.listTemplates.useQuery();
  const [localTemplates, setLocalTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (serverTemplates) {
      setLocalTemplates(serverTemplates);
    }
  }, [serverTemplates]);

  const saveTemplatesMutation = trpc.whatsapp.saveTemplates.useMutation({
    onSuccess: () => {
      refetchTemplates();
      toast.success("Modelos de mensagem salvos com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar modelos");
    }
  });

  const handleAddTemplate = () => {
    setLocalTemplates([
      ...localTemplates,
      {
        name: `novo_modelo_${localTemplates.length + 1}`,
        language: "pt_BR",
        category: "UTILITY",
        bodyText: "Olá {{1}}, obrigado pelo contato! Como podemos ajudar?"
      }
    ]);
  };

  const handleRemoveTemplate = (index: number) => {
    const updated = [...localTemplates];
    updated.splice(index, 1);
    setLocalTemplates(updated);
  };

  const handleUpdateTemplateField = (index: number, field: string, value: string) => {
    const updated = [...localTemplates];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setLocalTemplates(updated);
  };

  const handleSaveTemplates = () => {
    for (const t of localTemplates) {
      if (!t.name.trim()) {
        toast.error("O nome do modelo não pode ser vazio.");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(t.name)) {
        toast.error(`O nome do modelo "${t.name}" deve conter apenas letras minúsculas, números e sublinhados (_)`);
        return;
      }
      if (!t.bodyText.trim()) {
        toast.error(`O texto do corpo do modelo "${t.name}" não pode ser vazio.`);
        return;
      }
    }
    saveTemplatesMutation.mutate(localTemplates.map(t => ({
      name: t.name.trim(),
      language: t.language.trim(),
      category: t.category,
      bodyText: t.bodyText.trim()
    })));
  };

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

      {/* WHATSAPP MESSAGE TEMPLATES CARD */}
      <Card className="glass-card border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">Modelos de Mensagens (Templates)</CardTitle>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddTemplate}
              className="h-8 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Modelo
            </Button>
          </div>
          <CardDescription>
            Configure os modelos de mensagens oficiais homologados pela Meta para iniciar atendimentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingTemplates ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : localTemplates.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground">Nenhum modelo cadastrado.</p>
              <Button
                type="button"
                size="sm"
                onClick={handleAddTemplate}
                className="mt-3 text-xs"
              >
                Criar Primeiro Modelo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {localTemplates.map((template, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-accent/5 space-y-3 relative group">
                  <button
                    type="button"
                    onClick={() => handleRemoveTemplate(idx)}
                    className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg border border-border/40 transition-colors"
                    title="Excluir Modelo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome do Modelo</Label>
                      <Input
                        value={template.name}
                        onChange={(e) => handleUpdateTemplateField(idx, "name", e.target.value)}
                        placeholder="ex: boas_vindas"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Idioma</Label>
                      <Input
                        value={template.language}
                        onChange={(e) => handleUpdateTemplateField(idx, "language", e.target.value)}
                        placeholder="ex: pt_BR"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                      <select
                        value={template.category}
                        onChange={(e) => handleUpdateTemplateField(idx, "category", e.target.value)}
                        className="w-full h-8 text-xs bg-muted border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="UTILITY">Utilidade (UTILITY)</option>
                        <option value="MARKETING">Marketing (MARKETING)</option>
                        <option value="AUTHENTICATION">Autenticação (AUTHENTICATION)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Texto do Corpo (Body)</Label>
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        Use {'{{1}}'}, {'{{2}}'}, etc. para variáveis
                      </span>
                    </div>
                    <textarea
                      value={template.bodyText}
                      onChange={(e) => handleUpdateTemplateField(idx, "bodyText", e.target.value)}
                      placeholder="Olá {{1}}, obrigado por entrar em contato!"
                      rows={2}
                      className="w-full p-2.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  disabled={saveTemplatesMutation.isPending}
                  onClick={handleSaveTemplates}
                  size="sm"
                  className="h-9 text-xs gap-1.5 px-4 font-medium"
                >
                  {saveTemplatesMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar Todos os Modelos
                </Button>
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
      {/* RESPOSTAS RÁPIDAS PERSONALIZADAS CARD */}
      <Card className="glass-card border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Respostas Rápidas Personalizadas (/atalhos)</CardTitle>
            </div>
            <Button onClick={() => {
              const updated = [
                ...quickReplies,
                { shortcut: `/atalho_${quickReplies.length + 1}`, label: "Novo Atalho", text: "Texto da resposta rápida..." }
              ];
              setQuickReplies(updated);
              localStorage.setItem("custom_quick_replies", JSON.stringify(updated));
              toast.success("Novo atalho criado!");
            }} size="sm" variant="outline" className="gap-1 text-xs">
              <Plus className="h-4 w-4" /> Adicionar Atalho
            </Button>
          </div>
          <CardDescription className="text-xs">
            Cadastre atalhos como <code>/pix</code> ou <code>/suporte</code> para inserção rápida no chat de atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quickReplies.map((qr: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-xl bg-card/60 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div>
                    <Label className="text-[10px] font-bold">Atalho (Ex: /boasvindas)</Label>
                    <Input
                      value={qr.shortcut}
                      onChange={(e) => {
                        const updated = [...quickReplies];
                        updated[idx].shortcut = e.target.value;
                        setQuickReplies(updated);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold">Título / Identificador</Label>
                    <Input
                      value={qr.label}
                      onChange={(e) => {
                        const updated = [...quickReplies];
                        updated[idx].label = e.target.value;
                        setQuickReplies(updated);
                      }}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const updated = quickReplies.filter((_: any, i: number) => i !== idx);
                    setQuickReplies(updated);
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-4"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label className="text-[10px] font-bold">Texto da Mensagem</Label>
                <textarea
                  value={qr.text}
                  onChange={(e) => {
                    const updated = [...quickReplies];
                    updated[idx].text = e.target.value;
                    setQuickReplies(updated);
                  }}
                  rows={2}
                  className="w-full p-2 text-xs bg-muted/30 border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                for (const q of quickReplies) {
                  if (!q.shortcut.trim() || !q.label.trim() || !q.text.trim()) {
                    toast.error("Preencha todos os campos do atalho antes de salvar.");
                    return;
                  }
                }
                saveQuickRepliesMutation.mutate(quickReplies);
              }}
              disabled={saveQuickRepliesMutation.isPending}
              className="gap-2 text-xs h-9 bg-amber-500 hover:bg-amber-600 font-bold text-black"
            >
              {saveQuickRepliesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Respostas Rápidas da Empresa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GOOGLE GEMINI ENTERPRISE AI CARD */}
      <Card className="glass-card border border-border shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Inteligência Artificial (Google Gemini Enterprise)
                </CardTitle>
                <CardDescription className="text-xs">
                  Atendimento inteligente 24/7 com isolamento de dados em 3 camadas, motor de regras clínicas locais e transbordo humano automático.
                </CardDescription>
              </div>
            </div>
            {aiEnabled ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1.5 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> IA Ativa
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> IA Desativada
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle IA Ativa */}
          <div className="flex items-center justify-between p-3.5 bg-muted/20 border border-border/40 rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Atendimento Automático por IA
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Quando ativo, a IA responde dúvidas de convênios, procedimentos, carteirinhas e transfere para humanos quando solicitado.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Chave de API */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Chave de API do Google Gemini (Por Empresa)
              </Label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                Obter Chave no Google AI Studio <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="relative">
              <Input
                type={showAiKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                className="pr-10 h-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sua chave é armazenada de forma isolada no banco de dados e nunca compartilhada com outras empresas.
            </p>
          </div>

          {/* Seleção de Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                Modelo do Gemini
              </Label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full h-10 text-xs bg-muted border border-border rounded-xl px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado - Ultra rápido e preciso)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Econômico e ágil)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Raciocínio complexo e alto contexto)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Última geração multimodal)</option>
              </select>
            </div>

            {/* Painel de Regras Homologadas (Isolado por Empresa) */}
            {clinicRules?.isClinic ? (
              <div className="p-3 bg-primary/5 border border-primary/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] py-0">
                      {clinicRules.profileName || "Espaço Physio (Clínica • 4 Unidades • 38 Convênios)"}
                    </Badge>
                  </span>
                  <span className="text-primary font-mono text-[10px]">regras_clinica.json</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  ✅ <strong>4 Unidades:</strong> Asa Norte, Asa Sul, Noroeste, Lago Sul com matriz de restrições.<br />
                  ✅ <strong>38 Convênios</strong> homologados com regras de elegibilidade.<br />
                  🛑 <strong>Transbordo Imediato:</strong> TotalPass, Wellhub e ClassPass.<br />
                  🛡️ <strong>Fail-Safe:</strong> Falhas ou limites transferem na hora para atendente humano.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-muted/20 border border-border/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] py-0">
                      {clinicRules?.profileName || "CRM Empresarial (Personalizado)"}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">regras isoladas</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  💼 <strong>Perfil Comercial:</strong> Atendimento personalizado sem restrições clínicas.<br />
                  ⚡ <strong>IA Ágil:</strong> Foco em qualificação de leads, catálogo e conversão de vendas.<br />
                  👥 <strong>Roteamento:</strong> Transferência direta para atendentes disponíveis da empresa.<br />
                  🛡️ <strong>Fail-Safe:</strong> Falhas acionam imediatamente a equipe humana.
                </p>
              </div>
            )}
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{testResult.success ? "Conexão Validada" : "Erro no Teste de Conexão"}</p>
                <p className="text-[11px] opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowLogsModal(true);
                refetchAuditLogs();
              }}
              className="text-xs h-9 gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Auditoria de IA (.json)
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestAi}
                disabled={testAiMutation.isPending}
                className="text-xs h-9 gap-1.5"
              >
                {testAiMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                Testar Conexão com Gemini
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAi}
                disabled={saveAiMutation.isPending}
                className="text-xs h-9 gap-1.5 font-bold"
              >
                {saveAiMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Configurações de IA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2FA SECURITY CARD */}
      <Card className="glass-card border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Autenticação de Dois Fatores (2FA)</CardTitle>
            </div>
            {(currentUser as any)?.twoFactorEnabled ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1.5 font-bold">
                <CheckCircle className="h-3.5 w-3.5" /> 2FA Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> 2FA Desativado
              </Badge>
            )}
          </div>
          <CardDescription>
            Proteja sua conta utilizando um aplicativo de autenticação (Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Quando a autenticação de 2 fatores estiver ativada, você precisará fornecer um código numérico de 6 dígitos gerado pelo seu aplicativo autenticador sempre que fizer login.
          </p>

          <div className="flex justify-end pt-2">
            {(currentUser as any)?.twoFactorEnabled ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDisableCode(""); setDisableModalOpen(true); }}
                className="h-9 text-xs gap-1.5 font-bold"
              >
                <ShieldAlert className="h-4 w-4" /> Desativar Autenticação 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStart2FASetup}
                disabled={is2FALoading}
                className="h-9 text-xs gap-1.5 font-bold"
              >
                {is2FALoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Configurar e Ativar 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL CONFIGURAR 2FA */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5 text-primary" /> Configurar Autenticação 2FA
            </DialogTitle>
            <DialogDescription className="text-xs">
              Siga os passos abaixo para conectar qualquer aplicativo de autenticação:
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-4 pt-2">
              <div className="text-xs space-y-2">
                <p className="font-semibold text-foreground">1. Escaneie o QR Code abaixo no seu aplicativo:</p>
                <div className="p-3 bg-white rounded-xl flex items-center justify-center max-w-[180px] mx-auto border shadow-sm">
                  <img src={setupData.qrCode} alt="2FA QR Code" className="w-full h-auto" />
                </div>
              </div>

              <div className="text-xs space-y-1.5">
                <p className="font-semibold text-foreground">Ou insira a chave secreta manualmente:</p>
                <div className="p-2.5 bg-muted/40 border border-border rounded-lg text-center font-mono font-bold text-xs select-all tracking-wider text-primary">
                  {setupData.secret}
                </div>
              </div>

              <form onSubmit={handleConfirmEnable2FA} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="verify-2fa-code" className="text-xs font-bold text-primary">
                    2. Digite o código de 6 dígitos exibido no app:
                  </Label>
                  <Input
                    id="verify-2fa-code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center tracking-[8px] font-mono text-lg h-11"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setSetupModalOpen(false)} className="w-1/3 text-xs h-10">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={is2FALoading} className="w-2/3 text-xs h-10 font-bold">
                    {is2FALoading ? "Ativando..." : "Confirmar e Ativar 2FA"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DESATIVAR 2FA */}
      <Dialog open={disableModalOpen} onOpenChange={setDisableModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
              <ShieldAlert className="h-5 w-5" /> Desativar Autenticação 2FA
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza de que deseja desativar a autenticação de dois fatores da sua conta?
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDisable2FA} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="disable-code" className="text-xs">Digite o código de 6 dígitos do app (Opcional):</Label>
              <Input
                id="disable-code"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[8px] font-mono text-base h-10"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDisableModalOpen(false)} className="w-1/3 text-xs h-10">
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={is2FALoading} className="w-2/3 text-xs h-10 font-bold">
                {is2FALoading ? "Desativando..." : "Desativar 2FA"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL AUDITORIA DE IA (.JSON) */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-card border border-border rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Logs de Auditoria da IA (data/ai_audit_logs.json)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro append-only de prompts, tokens consumidos, regras acionadas e transbordos para atendentes humanos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-xl">
                <p className="text-xs text-muted-foreground">Nenhum log registrado ainda. As mensagens processadas pela IA aparecerão aqui.</p>
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="p-3 bg-muted/20 border border-border/40 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono text-foreground font-semibold">Sessão: {log.clientPhone || log.sessionId}</span>
                    <span>{new Date(log.timestamp).toLocaleString("pt-BR")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase">Prompt do Cliente:</span>
                    <p className="text-xs bg-background/60 p-2 rounded-md mt-0.5 text-foreground">{log.rawPrompt}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Resposta da IA:</span>
                    <p className="text-xs bg-background/60 p-2 rounded-md mt-0.5 text-foreground whitespace-pre-wrap">{log.aiResponse}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Tokens: {log.tokens?.totalTokens || 0} (Prompt: {log.tokens?.promptTokens || 0} / Resp: {log.tokens?.candidateTokens || 0})
                    </span>
                    {log.handoffTriggered && (
                      <span className="bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                        ⚠️ Transbordo Humano: {log.assignedAttendantName ? `Atendente ${log.assignedAttendantName}` : log.handoffReason || "Atendente Humano"}
                      </span>
                    )}
                    {log.toolsTriggered && log.toolsTriggered.length > 0 && (
                      <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                        Tools: {log.toolsTriggered.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button size="sm" variant="outline" onClick={() => setShowLogsModal(false)} className="text-xs h-9">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
