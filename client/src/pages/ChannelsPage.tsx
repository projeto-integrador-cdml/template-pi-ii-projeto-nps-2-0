import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radio, Plus, Trash2, Globe, MessageSquare, Instagram, Edit3, Copy, Info, Link, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface Channel {
  id: number;
  name: string;
  type: "whatsapp" | "instagram" | "facebook";
  identifier: string;
  status: string;
  phoneNumberId?: string | null;
  instagramAccountId?: string | null;
  pageId?: string | null;
  accessToken?: string | null;
  pageAccessToken?: string | null;
  contacts: number;
  departments: number;
  attendants: number;
}

export default function ChannelsPage() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Form Fields
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"whatsapp" | "instagram" | "facebook">("whatsapp");
  const [newChannelIdentifier, setNewChannelIdentifier] = useState("");
  
  // Platform Credentials
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [pageId, setPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");

  const { data: channels, isLoading, refetch } = trpc.whatsapp.listChannels.useQuery();

  const { data: distributionData, refetch: refetchRule } = trpc.whatsapp.getDistributionRule.useQuery();
  const setRuleMutation = trpc.whatsapp.setDistributionRule.useMutation({
    onSuccess: () => {
      refetchRule();
      toast.success("Regra de distribuição atualizada com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar regra: ${err.message}`);
    }
  });

  const rule = distributionData?.rule || "least_busy";
  const handleSetDistributionRule = (newRule: "least_busy" | "round_robin") => {
    setRuleMutation.mutate({ rule: newRule });
  };

  const saveChannelsMutation = trpc.whatsapp.saveChannels.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(editingChannel ? "Canal atualizado com sucesso!" : "Canal cadastrado com sucesso!");
      handleCloseModal();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar canal: ${err.message}`);
    }
  });

  const activeCount = (channels as Channel[] | undefined)?.filter((c: Channel) => c.status === "connected").length || 0;

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setEditingChannel(null);
    setNewChannelName("");
    setNewChannelType("whatsapp");
    setNewChannelIdentifier("");
    setPhoneNumberId("");
    setAccessToken("");
    setInstagramAccountId("");
    setPageId("");
    setPageAccessToken("");
  };

  const handleOpenEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setNewChannelName(channel.name);
    setNewChannelType(channel.type);
    setNewChannelIdentifier(channel.identifier);
    setPhoneNumberId(channel.phoneNumberId || "");
    setAccessToken(channel.accessToken || "");
    setInstagramAccountId(channel.instagramAccountId || "");
    setPageId(channel.pageId || "");
    setPageAccessToken(channel.pageAccessToken || "");
    setIsCreateOpen(true);
  };

  const handleSaveChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName || !newChannelIdentifier) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (user?.role === "attendant") {
      toast.error("Apenas administradores podem gerenciar canais.");
      return;
    }

    const currentChannels = (channels as Channel[]) || [];

    if (editingChannel) {
      const updated = currentChannels.map((c: Channel) => {
        if (c.id === editingChannel.id) {
          return {
            ...c,
            name: newChannelName,
            type: newChannelType,
            identifier: newChannelIdentifier,
            phoneNumberId: newChannelType === "whatsapp" ? phoneNumberId : null,
            accessToken: newChannelType === "whatsapp" ? accessToken : null,
            instagramAccountId: newChannelType === "instagram" ? instagramAccountId : null,
            pageId: newChannelType === "facebook" ? pageId : null,
            pageAccessToken: (newChannelType === "instagram" || newChannelType === "facebook") ? pageAccessToken : null,
          };
        }
        return c;
      });
      saveChannelsMutation.mutate(updated);
    } else {
      const nextId = currentChannels.length > 0 ? Math.max(...currentChannels.map((c: Channel) => c.id)) + 1 : 1;
      const newChannel: Channel = {
        id: nextId,
        name: newChannelName,
        type: newChannelType,
        identifier: newChannelIdentifier,
        status: "connected",
        phoneNumberId: newChannelType === "whatsapp" ? phoneNumberId : null,
        accessToken: newChannelType === "whatsapp" ? accessToken : null,
        instagramAccountId: newChannelType === "instagram" ? instagramAccountId : null,
        pageId: newChannelType === "facebook" ? pageId : null,
        pageAccessToken: (newChannelType === "instagram" || newChannelType === "facebook") ? pageAccessToken : null,
        contacts: 0,
        departments: 1,
        attendants: newChannelType === "whatsapp" ? 5 : 3
      };
      saveChannelsMutation.mutate([...currentChannels, newChannel]);
    }
  };

  const handleDeleteChannel = (id: number) => {
    if (user?.role === "attendant") {
      toast.error("Apenas administradores podem gerenciar canais.");
      return;
    }

    const currentChannels = (channels as Channel[]) || [];
    const updated = currentChannels.filter((c: Channel) => c.id !== id);
    saveChannelsMutation.mutate(updated);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "instagram": return Instagram;
      case "facebook": return Globe;
      default: return MessageSquare;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "instagram": return "bg-pink-500/10 text-pink-500 border border-pink-500/20";
      case "facebook": return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      default: return "bg-green-500/10 text-green-500 border border-green-500/20";
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
  const verifyToken = user ? `verify_${user.openId}` : "crm_whatsapp_verify_token";

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Canais</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                ● {activeCount} Ativos
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie os canais de atendimento e conexões API da sua empresa</p>
          </div>
        </div>
      </div>

      {/* Seletor de Distribuição de Leads */}
      <Card className="border border-border/40 bg-card/30 backdrop-blur-md">
        <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary animate-pulse" />
              Distribuição Automática de Leads
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Configure a regra de direcionamento para novos contatos do WhatsApp, Instagram e Facebook.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleSetDistributionRule("least_busy")}
              disabled={user?.role === "attendant"}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                rule === "least_busy"
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground"
              }`}
            >
              ⚖️ Menor Carga (Least-Busy)
            </button>
            <button
              onClick={() => handleSetDistributionRule("round_robin")}
              disabled={user?.role === "attendant"}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${
                rule === "round_robin"
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground"
              }`}
            >
              🎯 Roleta de Vendas (Round Robin)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Grid of channels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="h-[200px] animate-pulse bg-muted/20 border-border"></Card>
          <Card className="h-[200px] animate-pulse bg-muted/20 border-border"></Card>
          <Card className="h-[200px] animate-pulse bg-muted/20 border-border"></Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(channels as Channel[])?.map((channel: Channel) => {
            const Icon = getIcon(channel.type);
            return (
              <Card 
                key={channel.id} 
                className="relative overflow-hidden bg-card border-border hover:shadow-md transition-all duration-300"
              >
                {/* Visual Connection status bar on the left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  channel.status === "connected" ? "bg-emerald-500" : "bg-muted"
                }`}></div>

                <CardHeader className="pb-3 pl-6 pr-6 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${getBadgeColor(channel.type)}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{channel.name}</h3>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5 block">
                          {channel.type} ID: #{channel.id}
                        </span>
                      </div>
                    </div>

                    {user?.role !== "attendant" && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(channel)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                          title="Configurar Canal"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteChannel(channel.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          title="Remover Canal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pl-6 pr-6 pb-5 space-y-4">
                  <div className="flex items-center gap-2 p-2.5 bg-accent/5 rounded-xl border border-border/40">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{channel.identifier}</span>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-border/60">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider text-[9px]">Contatos</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{channel.contacts.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-l border-border/60">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider text-[9px]">Depto</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{channel.departments}</p>
                    </div>
                    <div className="text-center border-l border-border/60">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider text-[9px]">Operadores</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{channel.attendants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add Channel dashed card */}
          {user?.role !== "attendant" && (
            <Card 
              onClick={() => setIsCreateOpen(true)}
              className="border-2 border-dashed border-border hover:border-primary/40 bg-card/20 hover:bg-card/50 cursor-pointer flex flex-col items-center justify-center p-6 text-center h-[218px] group transition-all duration-300"
            >
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-3.5 group-hover:scale-105 transition-transform duration-300">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Cadastrar canal</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">Cadastre e gerencie seus canais de comunicação</p>
              <span className="text-xs font-semibold text-primary mt-3 group-hover:underline">Cadastrar canal &rarr;</span>
            </Card>
          )}
        </div>
      )}

      {/* Register/Edit Channel Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent 
          className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto glass-card border border-border"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {editingChannel ? <Edit3 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editingChannel ? "Configurar Canal" : "Cadastrar Novo Canal"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira os dados do canal de atendimento e as credenciais de API da Meta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChannel} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="channel-name" className="text-xs font-semibold">Nome do Canal</Label>
              <Input 
                id="channel-name" 
                placeholder="Ex: WhatsApp Vendas SP, Instagram Suporte" 
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="h-9 text-xs bg-card border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="channel-type" className="text-xs font-semibold">Tipo do Canal</Label>
              <Select 
                value={newChannelType} 
                onValueChange={(v: any) => setNewChannelType(v)}
                disabled={!!editingChannel}
              >
                <SelectTrigger id="channel-type" className="h-9 text-xs bg-card border-border">
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">💬 WhatsApp Cloud API</SelectItem>
                  <SelectItem value="instagram">📸 Instagram Direct</SelectItem>
                  <SelectItem value="facebook">👥 Facebook Messenger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identificador Principal */}
            <div className="space-y-1.5">
              <Label htmlFor="channel-identifier" className="text-xs font-semibold">
                {newChannelType === "whatsapp" ? "Número do WhatsApp (com DDI)" : 
                 newChannelType === "instagram" ? "Handle do Instagram" : "Nome ou URL da Página"}
              </Label>
              <Input 
                id="channel-identifier" 
                placeholder={newChannelType === "whatsapp" ? "Ex: +5511999999999" : 
                             newChannelType === "instagram" ? "Ex: @empresa_digital" : "Ex: Minha Página Oficial"} 
                value={newChannelIdentifier}
                onChange={(e) => setNewChannelIdentifier(e.target.value)}
                className="h-9 text-xs bg-card border-border"
                required
              />
            </div>

            {/* Credenciais para WhatsApp */}
            {newChannelType === "whatsapp" && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">Credenciais WhatsApp API</h4>
                
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumberId" className="text-xs font-semibold">ID do Número (Phone Number ID)</Label>
                  <Input 
                    id="phoneNumberId" 
                    placeholder="Ex: 105432987654321" 
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="h-9 text-xs bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accessToken" className="text-xs font-semibold">Token de Acesso Permanente (Meta)</Label>
                  <Input 
                    id="accessToken" 
                    type="password"
                    placeholder="Token Bearer da Meta (EAA...)" 
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="h-9 text-xs bg-card border-border font-mono"
                  />
                </div>

                {/* Instruções de Webhook da Meta */}
                <div className="p-3.5 rounded-xl border border-primary/10 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Info className="h-4.5 w-4.5 shrink-0" />
                    <h5 className="text-[10px] font-bold uppercase tracking-wider">Webhook da Meta</h5>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Acesse <b>developers.facebook.com</b>, adicione o produto <b>WhatsApp</b> e configure:
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50 border gap-2">
                      <div className="space-y-0.5 truncate">
                        <span className="text-[8px] text-muted-foreground font-bold uppercase">Callback URL</span>
                        <p className="text-[10px] font-mono text-foreground truncate select-all">{webhookUrl}</p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(webhookUrl, "Callback URL")}
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-background/50 border gap-2">
                      <div className="space-y-0.5 truncate">
                        <span className="text-[8px] text-muted-foreground font-bold uppercase">Verify Token</span>
                        <p className="text-[10px] font-mono text-foreground truncate select-all">{verifyToken}</p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(verifyToken, "Verify Token")}
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Credenciais para Instagram */}
            {newChannelType === "instagram" && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold text-primary">Credenciais Instagram Direct</h4>
                
                <div className="space-y-1.5">
                  <Label htmlFor="instagramAccountId" className="text-xs font-semibold">ID da Conta Profissional (Instagram Account ID)</Label>
                  <Input 
                    id="instagramAccountId" 
                    placeholder="Ex: 17841400000000000" 
                    value={instagramAccountId}
                    onChange={(e) => setInstagramAccountId(e.target.value)}
                    className="h-9 text-xs bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pageAccessTokenInsta" className="text-xs font-semibold">Token de Acesso da Página (Page Access Token)</Label>
                  <Input 
                    id="pageAccessTokenInsta" 
                    type="password"
                    placeholder="Token Bearer da Página conectada (EAA...)" 
                    value={pageAccessToken}
                    onChange={(e) => setPageAccessToken(e.target.value)}
                    className="h-9 text-xs bg-card border-border font-mono"
                  />
                </div>
              </div>
            )}

            {/* Credenciais para Facebook */}
            {newChannelType === "facebook" && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold text-primary">Credenciais Facebook Messenger</h4>
                
                <div className="space-y-1.5">
                  <Label htmlFor="pageId" className="text-xs font-semibold">ID da Página do Facebook (Facebook Page ID)</Label>
                  <Input 
                    id="pageId" 
                    placeholder="Ex: 104329876543210" 
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="h-9 text-xs bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pageAccessTokenFB" className="text-xs font-semibold">Token de Acesso da Página (Page Access Token)</Label>
                  <Input 
                    id="pageAccessTokenFB" 
                    type="password"
                    placeholder="Token Bearer da Página (EAA...)" 
                    value={pageAccessToken}
                    onChange={(e) => setPageAccessToken(e.target.value)}
                    className="h-9 text-xs bg-card border-border font-mono"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseModal}
                className="h-9 text-xs border-border"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="h-9 text-xs"
                disabled={saveChannelsMutation.isPending}
              >
                {saveChannelsMutation.isPending ? "Salvando..." : editingChannel ? "Salvar Configurações" : "Conectar Canal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
