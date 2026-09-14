import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Radio,
  Plus,
  MessageSquare,
  Instagram,
  Facebook,
  RefreshCw,
  Pencil,
  Unplug,
  Loader2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { PublicChannel } from "@shared/channels";

const labels = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook Messenger",
};
const statusLabels = {
  verified: "Credenciais validadas · aguardando mensagem",
  connected: "Conectado · mensagens recebidas",
  error: "Autorização precisa de atenção",
  disconnected: "Desconectado",
};

export default function ChannelsPage() {
  const { user } = useAuth();
  const isOwner = !!user && user.role !== "attendant";
  const utils = trpc.useUtils();
  const list = trpc.channels.list.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const config = trpc.channels.configuration.useQuery(undefined, {
    enabled: isOwner,
    retry: false,
  });
  const distribution = trpc.whatsapp.getDistributionRule.useQuery();
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [editing, setEditing] = useState<PublicChannel | null>(null);
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [token, setToken] = useState("");
  const [renameChannel, setRenameChannel] = useState<PublicChannel | null>(
    null
  );
  const [removeChannel, setRemoveChannel] = useState<PublicChannel | null>(
    null
  );
  const [flow, setFlow] = useState(
    () => new URLSearchParams(window.location.search).get("meta_flow") || ""
  );
  const [choice, setChoice] = useState("");
  const choices = trpc.channels.socialChoices.useQuery(
    { flow },
    { enabled: isOwner && /^[a-f0-9]{64}$/.test(flow), retry: false }
  );
  const refresh = () => {
    void utils.channels.list.invalidate();
    void utils.whatsapp.listChats.invalidate();
  };
  const onError = (err: { message: string }) => toast.error(err.message);
  const closeWhatsapp = () => {
    setWhatsappOpen(false);
    setToken("");
    setBusinessAccountId("");
    setPhoneNumberId("");
    setName("");
    setEditing(null);
  };
  const clearFlow = () => {
    setFlow("");
    setChoice("");
    window.history.replaceState({}, "", "/channels");
  };
  const connect = trpc.channels.connectWhatsapp.useMutation({
    onError,
    onSuccess: () => {
      closeWhatsapp();
      refresh();
      toast.success(
        "Número validado pela Meta. Envie uma mensagem para confirmar o recebimento."
      );
    },
  });
  const startLogin = trpc.channels.startSocialLogin.useMutation({
    onError,
    onSuccess: data => window.location.assign(data.url),
  });
  const completeLogin = trpc.channels.completeSocialLogin.useMutation({
    onError,
    onSuccess: () => {
      clearFlow();
      refresh();
      toast.success("Conta autorizada e vinculada à sua empresa.");
    },
  });
  const verify = trpc.channels.verify.useMutation({
    onError,
    onSuccess: () => {
      refresh();
      toast.success("Autorização verificada com a Meta.");
    },
  });
  const rename = trpc.channels.rename.useMutation({
    onError,
    onSuccess: () => {
      setRenameChannel(null);
      refresh();
      toast.success("Nome atualizado.");
    },
  });
  const disconnect = trpc.channels.disconnect.useMutation({
    onError,
    onSuccess: () => {
      setRemoveChannel(null);
      refresh();
      toast.success("Canal desconectado desta empresa.");
    },
  });
  const setRule = trpc.whatsapp.setDistributionRule.useMutation({
    onError,
    onSuccess: () => {
      void distribution.refetch();
      toast.success("Distribuição atualizada.");
    },
  });
  const busy =
    connect.isPending ||
    startLogin.isPending ||
    completeLogin.isPending ||
    verify.isPending ||
    disconnect.isPending;

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("meta_error");
    if (!error) return;
    toast.error(
      error === "cancelled"
        ? "Login cancelado. Nenhuma conta foi conectada."
        : error === "no_accounts"
          ? "Nenhuma conta elegível encontrada. Para Instagram, use uma conta profissional vinculada a uma Página que você gerencia."
          : "Não foi possível concluir a autorização. Entre novamente e confira as permissões do aplicativo da Meta."
    );
    window.history.replaceState({}, "", "/channels");
  }, []);

  const openWhatsapp = (channel?: PublicChannel) => {
    setEditing(channel || null);
    setName(channel?.name || "");
    setPhoneNumberId(channel?.externalId || "");
    setToken("");
    setBusinessAccountId("");
    setWhatsappOpen(true);
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Endereço copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o endereço manualmente.");
    }
  };
  const channels = list.data || [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Radio className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Canais da empresa</h1>
          <p className="text-sm text-muted-foreground">
            Vários números de WhatsApp, um Instagram e um Facebook. Cada conta
            pertence somente à sua empresa.
          </p>
        </div>
      </div>
      {isOwner && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Conecte cada número da sua conta WhatsApp Business pela API
                oficial.
              </p>
              <Button
                disabled={busy || !config.data?.ready}
                onClick={() => openWhatsapp()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar número
              </Button>
            </CardContent>
          </Card>
          {(["instagram", "facebook"] as const).map(type => {
            const linked = channels.find(c => c.type === type);
            const Icon = type === "instagram" ? Instagram : Facebook;
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-primary" />
                    {labels[type]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {type === "instagram"
                      ? "Autorize seu Instagram profissional vinculado a uma Página do Facebook."
                      : "Entre com o Facebook e escolha a Página da sua empresa."}
                  </p>
                  <Button
                    variant="outline"
                    disabled={busy || !config.data?.ready}
                    onClick={() => startLogin.mutate({ type })}
                  >
                    {linked
                      ? "Renovar autorização"
                      : `Conectar ${type === "instagram" ? "Instagram" : "Facebook"}`}
                  </Button>
                  {linked && (
                    <p className="text-xs text-muted-foreground">
                      Conta atual: {linked.identifier}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {isOwner && (config.error || (config.data && !config.data.ready)) && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
        >
          {config.error?.message ||
            "A integração com a Meta ainda precisa ser configurada pelo administrador do sistema. Os botões de conexão serão liberados quando essa configuração estiver pronta."}
        </div>
      )}
      {list.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando canais…
        </p>
      ) : list.error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 p-4"
        >
          <p>{list.error.message}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => list.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="font-semibold">Nenhum canal conectado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isOwner
              ? "Adicione um número ou autorize uma conta para começar a receber mensagens."
              : "O responsável pela empresa precisa conectar um canal."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map(channel => (
            <Card key={channel.id}>
              <CardHeader>
                <p className="text-xs uppercase text-muted-foreground">
                  {labels[channel.type]}
                </p>
                <CardTitle className="text-base">{channel.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="break-all text-sm">{channel.identifier}</p>
                <p
                  className={`text-xs font-medium ${channel.status === "error" ? "text-destructive" : channel.status === "connected" ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  {statusLabels[channel.status]}
                </p>
                {channel.lastVerifiedAt && (
                  <p className="text-xs text-muted-foreground">
                    Última validação:{" "}
                    {new Date(channel.lastVerifiedAt).toLocaleString("pt-BR")}
                  </p>
                )}
                {channel.lastWebhookAt && (
                  <p className="text-xs text-muted-foreground">
                    Último evento:{" "}
                    {new Date(channel.lastWebhookAt).toLocaleString("pt-BR")}
                  </p>
                )}
                {isOwner && (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => verify.mutate({ id: channel.id })}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Verificar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Renomear ${channel.name}`}
                      onClick={() => {
                        setRenameChannel(channel);
                        setName(channel.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {channel.type === "whatsapp" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => openWhatsapp(channel)}
                      >
                        Credenciais
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setRemoveChannel(channel)}
                    >
                      <Unplug className="mr-1 h-3 w-3" />
                      Desconectar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Distribuição de novos contatos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant={
              distribution.data?.rule === "least_busy" ? "default" : "outline"
            }
            disabled={!isOwner || setRule.isPending}
            onClick={() => setRule.mutate({ rule: "least_busy" })}
          >
            Atendente com menor carga
          </Button>
          <Button
            variant={
              distribution.data?.rule === "round_robin" ? "default" : "outline"
            }
            disabled={!isOwner || setRule.isPending}
            onClick={() => setRule.mutate({ rule: "round_robin" })}
          >
            Alternar entre atendentes
          </Button>
          {distribution.error && (
            <p role="alert" className="text-sm text-destructive">
              {distribution.error.message}
            </p>
          )}
        </CardContent>
      </Card>
      {isOwner && config.data && (
        <details className="rounded-xl border p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Endereços da integração Meta
          </summary>
          <div className="mt-3 space-y-3 text-muted-foreground">
            {[
              { label: "Retorno do login", url: config.data.callbackUrl },
              {
                label: "Recebimento de mensagens",
                url: config.data.webhookUrl,
              },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs">{item.label}</p>
                <div className="flex items-center gap-2">
                  <code className="break-all text-xs">{item.url}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Copiar ${item.label}`}
                    onClick={() => copy(item.url)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
      <Dialog
        open={whatsappOpen}
        onOpenChange={open => {
          if (!open && !connect.isPending) closeWhatsapp();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Atualizar credenciais do WhatsApp"
                : "Adicionar número de WhatsApp"}
            </DialogTitle>
            <DialogDescription>
              Informe os dados do WhatsApp Business. O número será consultado e
              validado diretamente com a Meta.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              connect.mutate({
                id: editing?.id,
                name,
                phoneNumberId,
                businessAccountId,
                accessToken: token,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="channel-name">Nome do canal</Label>
              <Input
                id="channel-name"
                value={name}
                maxLength={150}
                required
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-id">ID do número (Phone Number ID)</Label>
              <Input
                id="phone-id"
                value={phoneNumberId}
                inputMode="numeric"
                pattern="[0-9]{5,32}"
                required
                disabled={!!editing}
                onChange={e => setPhoneNumberId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waba-id">
                ID da conta WhatsApp Business (WABA ID)
              </Label>
              <Input
                id="waba-id"
                value={businessAccountId}
                inputMode="numeric"
                pattern="[0-9]{5,32}"
                required
                onChange={e => setBusinessAccountId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-token">Token de acesso da Meta</Label>
              <Input
                id="channel-token"
                type="password"
                autoComplete="new-password"
                value={token}
                minLength={20}
                maxLength={4096}
                required
                onChange={e => setToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use uma autorização do aplicativo integrado a este CRM, com
                acesso ao número e ao envio de mensagens.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={connect.isPending}
                onClick={closeWhatsapp}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={connect.isPending}>
                {connect.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {connect.isPending
                  ? "Validando com a Meta…"
                  : "Validar e conectar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!flow}
        onOpenChange={open => {
          if (!open && !completeLogin.isPending) clearFlow();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha a conta da empresa</DialogTitle>
            <DialogDescription>
              Selecione uma das contas que você autorizou na Meta. Ela será
              vinculada exclusivamente à sua empresa.
            </DialogDescription>
          </DialogHeader>
          {choices.isLoading && (
            <p role="status">Carregando contas autorizadas…</p>
          )}
          {choices.error && (
            <p role="alert" className="text-sm text-destructive">
              {choices.error.message}
            </p>
          )}
          <div className="max-h-72 space-y-2 overflow-auto">
            {choices.data?.map(c => (
              <label
                key={c.externalId}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
              >
                <input
                  type="radio"
                  name="meta-account"
                  value={c.externalId}
                  checked={choice === c.externalId}
                  onChange={() => setChoice(c.externalId)}
                />
                <span>
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.identifier}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={completeLogin.isPending}
              onClick={clearFlow}
            >
              Cancelar
            </Button>
            <Button
              disabled={!choice || completeLogin.isPending}
              onClick={() => completeLogin.mutate({ flow, externalId: choice })}
            >
              {completeLogin.isPending
                ? "Conectando…"
                : "Conectar conta selecionada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!renameChannel}
        onOpenChange={open => {
          if (!open) setRenameChannel(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear canal</DialogTitle>
            <DialogDescription>
              Escolha um nome para identificar este canal na sua equipe.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              if (renameChannel) rename.mutate({ id: renameChannel.id, name });
            }}
          >
            <Label htmlFor="rename-channel">Nome</Label>
            <Input
              id="rename-channel"
              value={name}
              maxLength={150}
              required
              onChange={e => setName(e.target.value)}
            />
            <DialogFooter>
              <Button disabled={rename.isPending} type="submit">
                Salvar nome
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removeChannel}
        onOpenChange={open => {
          if (!open && !disconnect.isPending) setRemoveChannel(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar {removeChannel?.name}?</DialogTitle>
            <DialogDescription>
              O CRM deixará de receber e enviar mensagens por este canal. O
              histórico existente será preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={disconnect.isPending}
              onClick={() => setRemoveChannel(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() =>
                removeChannel && disconnect.mutate({ id: removeChannel.id })
              }
            >
              {disconnect.isPending ? "Desconectando…" : "Desconectar canal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
