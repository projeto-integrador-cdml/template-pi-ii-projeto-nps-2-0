import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Building2, MapPin, Calendar, Plus, MessageSquare, Sparkles, Users, Shield, ShieldOff } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const interactionTypeLabels: Record<string, string> = { call: "Ligação", email: "Email", meeting: "Reunião", note: "Nota", whatsapp: "WhatsApp", audio: "Áudio" };
const interactionTypeColors: Record<string, string> = { call: "bg-blue-500/10 text-blue-400", email: "bg-cyan-500/10 text-cyan-400", meeting: "bg-purple-500/10 text-purple-400", note: "bg-amber-500/10 text-amber-400", whatsapp: "bg-emerald-500/10 text-emerald-400", audio: "bg-pink-500/10 text-pink-400" };

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [interactionDialog, setInteractionDialog] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ type: "note" as string, subject: "", content: "" });

  const utils = trpc.useUtils();
  const { data: client, isLoading } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: interactions } = trpc.interactions.list.useQuery({ clientId });
  const { data: opportunitiesData } = trpc.opportunities.list.useQuery({ clientId });
  const { data: attendantsList } = trpc.attendants.listByClient.useQuery({ clientId });

  const createInteraction = trpc.interactions.create.useMutation({
    onSuccess: () => { utils.interactions.list.invalidate(); setInteractionDialog(false); setInteractionForm({ type: "note", subject: "", content: "" }); toast.success("Interação registrada!"); },
  });

  const suggestMutation = trpc.ai.suggest.useMutation();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!client) return <div className="text-center py-12"><p className="text-muted-foreground">Cliente não encontrado</p><Button variant="outline" onClick={() => setLocation("/clients")} className="mt-4">Voltar</Button></div>;

  const handleSuggest = () => {
    const lastInt = interactions?.[0];
    suggestMutation.mutate({
      clientName: client.name,
      clientInfo: `Empresa: ${client.company || "N/A"}, Status: ${client.status}`,
      lastInteraction: lastInt ? `${interactionTypeLabels[lastInt.type]}: ${lastInt.content?.substring(0, 100)}` : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          {client.company && <p className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {client.company}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info do cliente */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{client.email}</span></div>}
            {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{client.phone}</span></div>}
            {client.position && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{client.position}</span></div>}
            {client.address && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{client.address}</span></div>}
            <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Desde {new Date(client.createdAt).toLocaleDateString("pt-BR")}</span></div>
            {client.tags && <div className="flex flex-wrap gap-1 pt-2">{client.tags.split(",").map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t.trim()}</Badge>)}</div>}
            {client.notes && <div className="pt-2 border-t"><p className="text-sm text-muted-foreground">{client.notes}</p></div>}

            {/* Sugestões da IA */}
            <div className="pt-3 border-t">
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleSuggest} disabled={suggestMutation.isPending}>
                <Sparkles className="h-3.5 w-3.5" /> {suggestMutation.isPending ? "Analisando..." : "Sugestões da IA"}
              </Button>
              {suggestMutation.data && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm whitespace-pre-wrap">
                  {suggestMutation.data.suggestions}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs de conteúdo */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="interactions">
            <TabsList>
              <TabsTrigger value="interactions">Interações ({interactions?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="opportunities">Oportunidades ({opportunitiesData?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="attendants">Atendentes ({attendantsList?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="interactions" className="mt-4 space-y-4">
              <Button size="sm" className="gap-2" onClick={() => setInteractionDialog(true)}>
                <Plus className="h-3.5 w-3.5" /> Nova Interação
              </Button>
              {interactions && interactions.length > 0 ? (
                <div className="space-y-3">
                  {interactions.map((int) => (
                    <Card key={int.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={interactionTypeColors[int.type]}>{interactionTypeLabels[int.type]}</Badge>
                            {int.subject && <span className="font-medium text-sm">{int.subject}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(int.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {int.content && <p className="text-sm text-muted-foreground">{int.content}</p>}
                        {int.transcription && <div className="mt-2 p-2 rounded bg-accent/50 text-sm"><p className="text-xs font-medium text-muted-foreground mb-1">Transcrição:</p>{int.transcription}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma interação registrada.</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="opportunities" className="mt-4 space-y-3">
              {opportunitiesData && opportunitiesData.length > 0 ? (
                opportunitiesData.map((opp) => (
                  <Card key={opp.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{opp.title}</p>
                        <p className="text-sm text-muted-foreground">{opp.description?.substring(0, 80)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{opp.stage}</Badge>
                        {opp.value ? <p className="text-sm font-medium mt-1">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((opp.value ?? 0) / 100)}</p> : null}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma oportunidade vinculada.</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="attendants" className="mt-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  <Users className="h-4 w-4 inline mr-1" />
                  {attendantsList?.length ?? 0} / {(client as any)?.maxAttendants ?? 1} atendentes
                </p>
              </div>
              {attendantsList && attendantsList.length > 0 ? (
                attendantsList.map((att: any) => (
                  <Card key={att.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{att.name}</p>
                          <Badge variant={att.isActive ? "default" : "secondary"} className="text-xs">
                            {att.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{att.email}</p>
                        {att.phone && <p className="text-xs text-muted-foreground mt-1">{att.phone}</p>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {att.position && <p>{att.position}</p>}
                        {att.lastLoginAt && <p>Acesso: {new Date(att.lastLoginAt).toLocaleDateString("pt-BR")}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum atendente cadastrado para esta empresa.</CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog nova interação */}
      <Dialog open={interactionDialog} onOpenChange={setInteractionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Interação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={interactionForm.type} onValueChange={(v) => setInteractionForm({ ...interactionForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Nota</SelectItem>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Assunto</Label><Input value={interactionForm.subject} onChange={(e) => setInteractionForm({ ...interactionForm, subject: e.target.value })} placeholder="Assunto da interação" /></div>
            <div><Label>Conteúdo</Label><Textarea value={interactionForm.content} onChange={(e) => setInteractionForm({ ...interactionForm, content: e.target.value })} placeholder="Descreva a interação..." rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInteractionDialog(false)}>Cancelar</Button>
            <Button onClick={() => createInteraction.mutate({ clientId, ...interactionForm } as any)} disabled={createInteraction.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
