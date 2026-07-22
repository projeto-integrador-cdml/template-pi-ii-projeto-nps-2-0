import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Bell, Database, CheckCircle, Loader2, Save, Link, Plus, Trash2, Sparkles, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SettingsPage() {
  const [quickReplies, setQuickReplies] = useState(() => {
    const saved = localStorage.getItem("custom_quick_replies");
    return saved ? JSON.parse(saved) : [
      { shortcut: "/boasvindas", label: "Boas-vindas", text: "Olá! Seja muito bem-vindo ao CRM Gabriel. Como posso te ajudar hoje?" },
      { shortcut: "/precos", label: "Tabela de Preços", text: "Nossos planos começam em R$ 97,00/mês. Acesse a aba de planos para conferir todos os detalhes!" },
      { shortcut: "/suporte", label: "Suporte Técnico", text: "Estou transferindo seu atendimento para a nossa equipe de suporte avançado. Um momento por favor!" },
      { shortcut: "/pix", label: "Chave Pix", text: "Nossa chave Pix CNPJ é: 00.000.000/0001-00 (CRM Gabriel Tecnologia)." },
      { shortcut: "/agendar", label: "Agendamento", text: "Podemos agendar uma demonstração rápida hoje às 15:00 ou 17:00. Qual horário prefere?" },
    ];
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
                        localStorage.setItem("custom_quick_replies", JSON.stringify(updated));
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
                        localStorage.setItem("custom_quick_replies", JSON.stringify(updated));
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
                    localStorage.setItem("custom_quick_replies", JSON.stringify(updated));
                    toast.info("Atalho removido!");
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
                    localStorage.setItem("custom_quick_replies", JSON.stringify(updated));
                  }}
                  rows={2}
                  className="w-full p-2 text-xs bg-muted/30 border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
