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

  const moveToStage = (id: number, stage: string) => {
    updateMutation.mutate({ id, stage: stage as any });
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
          <p className="text-muted-foreground mt-1">{opportunities?.length ?? 0} oportunidades</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Oportunidade</Button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${stages.length * 280}px` }}>
          {stages.map((stage) => {
            const items = groupedByStage[stage.key] ?? [];
            const totalValue = items.reduce((sum: number, o: any) => sum + (o.value ?? 0), 0);
            return (
              <div key={stage.key} className="kanban-column flex-1 min-w-[260px] flex flex-col">
                <div className={`p-3 border-t-2 ${stage.color} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  {totalValue > 0 && <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalValue)}</p>}
                </div>
                <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
                  <div className="space-y-2">
                    {items.map((opp: any) => (
                      <Card key={opp.id} className="hover:border-primary/30 transition-all group">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm leading-tight">{opp.title}</h4>
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
                          <div className="flex items-center justify-between">
                            {opp.value ? <span className="text-xs font-medium flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(opp.value)}</span> : <span />}
                            {opp.expectedCloseDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR")}</span>}
                          </div>
                          <Badge variant="outline" className="text-xs mt-2">{opp.priority === "high" ? "Alta" : opp.priority === "medium" ? "Média" : "Baixa"}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma oportunidade</p>}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog */}
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
    </div>
  );
}
