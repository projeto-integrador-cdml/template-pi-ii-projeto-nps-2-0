import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, DollarSign, Calendar, Building2, MoreHorizontal, Trash2, Edit, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const stages = [
  { key: "lead", label: "Lead", color: "border-t-blue-500" },
  { key: "contact", label: "Contato", color: "border-t-cyan-500" },
  { key: "proposal", label: "Proposta", color: "border-t-amber-500" },
  { key: "negotiation", label: "Negociação", color: "border-t-purple-500" },
  { key: "closed_won", label: "Ganho", color: "border-t-emerald-500" },
  { key: "closed_lost", label: "Perdido", color: "border-t-red-500" },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

export default function PipelinePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lossReasonOpen, setLossReasonOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: number; targetStage: string } | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [customLossReason, setCustomLossReason] = useState("");
  const [draggedOppId, setDraggedOppId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [form, setForm] = useState({ clientId: 0, title: "", description: "", value: "", stage: "lead" as string, priority: "medium" as string, expectedCloseDate: "" });

  const utils = trpc.useUtils();
  const { data: opportunities, isLoading } = trpc.opportunities.list.useQuery();
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = clientsData?.data ?? [];

  const createMutation = trpc.opportunities.create.useMutation({
    onSuccess: () => { utils.opportunities.list.invalidate(); utils.opportunities.byStage.invalidate(); utils.dashboard.stats.invalidate(); setDialogOpen(false); toast.success("Oportunidade criada!"); },
  });
  const updateMutation = trpc.opportunities.update.useMutation({
    onSuccess: () => { utils.opportunities.list.invalidate(); utils.opportunities.byStage.invalidate(); utils.dashboard.stats.invalidate(); setDialogOpen(false); toast.success("Oportunidade atualizada!"); },
  });
  const deleteMutation = trpc.opportunities.delete.useMutation({
    onSuccess: () => { utils.opportunities.list.invalidate(); utils.opportunities.byStage.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Oportunidade removida!"); },
  });

  const moveToStage = (id: number, targetStage: string) => {
    if (targetStage === "closed_lost") {
      setPendingMove({ id, targetStage });
      setLossReason("Preço alto");
      setCustomLossReason("");
      setLossReasonOpen(true);
    } else {
      updateMutation.mutate({ id, stage: targetStage as any });
      toast.info(`Movido para ${stages.find(s => s.key === targetStage)?.label}`);
    }
  };

  const handleConfirmLossReason = () => {
    if (!pendingMove) return;
    const finalReason = lossReason === "Outro" ? (customLossReason || "Outro motivo") : lossReason;
    const opp = opportunities?.find(o => o.id === pendingMove.id);
    const existingDesc = opp?.description || "";
    const updatedDesc = existingDesc 
      ? `${existingDesc}\n\n❌ [Motivo da Perda]: ${finalReason}` 
      : `❌ [Motivo da Perda]: ${finalReason}`;

    updateMutation.mutate({
      id: pendingMove.id,
      stage: "closed_lost" as any,
      description: updatedDesc,
    });
    setLossReasonOpen(false);
    setPendingMove(null);
    toast.error(`Oportunidade marcada como Perdida (${finalReason})`);
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedOppId(id);
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageKey: string) => {
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const idStr = e.dataTransfer.getData("text/plain");
    const id = idStr ? parseInt(idStr, 10) : draggedOppId;
    if (id) {
      const opp = opportunities?.find(o => o.id === id);
      if (opp && opp.stage !== targetStageKey) {
        moveToStage(id, targetStageKey);
      }
    }
    setDraggedOppId(null);
  };

  const openCreate = () => {
    setEditingOpp(null);
    setForm({ clientId: 0, title: "", description: "", value: "", stage: "lead", priority: "medium", expectedCloseDate: "" });
    setDialogOpen(true);
  };

  const openEdit = (opp: any) => {
    setEditingOpp(opp);
    setForm({
      clientId: opp.clientId,
      title: opp.title,
      description: opp.description || "",
      value: opp.value ? String(opp.value / 100) : "",
      stage: opp.stage,
      priority: opp.priority,
      expectedCloseDate: opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toISOString().split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    if (!form.clientId) { toast.error("Selecione um cliente"); return; }
    const data = {
      ...form,
      value: form.value ? Math.round(parseFloat(form.value) * 100) : undefined,
      expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate) : undefined,
      stage: form.stage as any,
      priority: form.priority as any,
    };
    if (editingOpp) {
      updateMutation.mutate({ id: editingOpp.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const groupedByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    stages.forEach((s) => (map[s.key] = []));
    (opportunities ?? []).forEach((opp) => {
      if (map[opp.stage]) map[opp.stage].push(opp);
    });
    return map;
  }, [opportunities]);

  const getClientName = (clientId: number) => clients.find((c) => c.id === clientId)?.name ?? "Cliente";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funil de Vendas</h1>
          <p className="text-muted-foreground mt-1">{opportunities?.length ?? 0} oportunidades ativas (Arraste os cards entre colunas)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Oportunidade</Button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${stages.length * 280}px` }}>
          {stages.map((stage) => {
            const items = groupedByStage[stage.key] ?? [];
            const totalValue = items.reduce((sum: number, o: any) => sum + (o.value ?? 0), 0);
            const isOver = dragOverStage === stage.key;

            return (
              <div 
                key={stage.key} 
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={(e) => handleDragLeave(e, stage.key)}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`kanban-column flex-1 min-w-[260px] flex flex-col transition-all duration-200 rounded-xl ${
                  isOver ? "bg-primary/10 ring-2 ring-primary/40" : "bg-card/20"
                }`}
              >
                <div className={`p-3 border-t-4 ${stage.color} rounded-t-xl bg-card/60 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs font-bold">{items.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/10">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total acumulado:</span>
                    <span className="text-xs font-bold text-emerald-500">{formatCurrency(totalValue)}</span>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
                  <div className="space-y-2 min-h-[120px]">
                    {items.map((opp: any) => (
                      <Card 
                        key={opp.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        className="cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all group border-border/60 bg-card"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{opp.title}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(opp)}><Edit className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger><ArrowRight className="mr-2 h-3.5 w-3.5" /> Mover para</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {stages.filter((s) => s.key !== opp.stage).map((s) => (
                                      <DropdownMenuItem key={s.key} onClick={() => moveToStage(opp.id, s.key)}>{s.label}</DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir oportunidade?")) deleteMutation.mutate({ id: opp.id }); }}>
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <Building2 className="h-3 w-3" /> {getClientName(opp.clientId)}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {opp.value ? <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5"><DollarSign className="h-3.5 w-3.5" />{formatCurrency(opp.value)}</span> : <span />}
                            {opp.expectedCloseDate && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR")}</span>}
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-semibold">{opp.priority === "high" ? "Alta" : opp.priority === "medium" ? "Média" : "Baixa"}</Badge>
                            <span className="text-[9px] text-muted-foreground/60">🖐️ Arraste para mover</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && (
                      <div className="border border-dashed border-border/40 rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-foreground/60 italic">Solte um card aqui</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog: Criar/Editar Oportunidade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingOpp ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome da oportunidade" /></div>
            <div>
              <Label>Cliente *</Label>
              <Select value={form.clientId ? String(form.clientId) : "0"} onValueChange={(v) => setForm({ ...form, clientId: parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" /></div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Data prevista de fechamento</Label><Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes da oportunidade..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editingOpp ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Motivo da Perda */}
      <Dialog open={lossReasonOpen} onOpenChange={setLossReasonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              ❌ Registrar Motivo da Perda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para qualificar os relatórios do funil de vendas, selecione por qual motivo esta oportunidade foi encerrada como perdida:
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Motivo Principal</Label>
              <select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="w-full h-9 text-xs bg-muted border border-border rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Preço alto">💰 Preço elevado / Fora do orçamento</option>
                <option value="Fechou com concorrente">⚔️ Fechou com concorrente</option>
                <option value="Sem orçamento">📉 Sem orçamento no momento</option>
                <option value="Desistiu do projeto">🛑 Desistiu da compra / projeto</option>
                <option value="Falta de retorno">📵 Cliente não respondeu ao contato</option>
                <option value="Outro">✏️ Outro motivo</option>
              </select>
            </div>

            {lossReason === "Outro" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Especifique o motivo</Label>
                <Input
                  placeholder="Ex: Produto indisponível em estoque"
                  value={customLossReason}
                  onChange={(e) => setCustomLossReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLossReasonOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmLossReason} className="text-xs font-bold">
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
