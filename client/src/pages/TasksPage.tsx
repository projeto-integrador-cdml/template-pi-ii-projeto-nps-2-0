import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = { call: "Ligação", email: "Email", meeting: "Reunião", follow_up: "Follow-up", other: "Outro" };
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
const priorityColors: Record<string, string> = { low: "bg-blue-500/10 text-blue-400", medium: "bg-amber-500/10 text-amber-400", high: "bg-red-500/10 text-red-400" };

export default function TasksPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("pending");
  const [form, setForm] = useState({ title: "", description: "", clientId: undefined as number | undefined, dueDate: "", priority: "medium", type: "other" });

  const utils = trpc.useUtils();
  const { data: pendingTasks } = trpc.tasks.list.useQuery({ completed: false });
  const { data: completedTasks } = trpc.tasks.list.useQuery({ completed: true });
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 100 });
  const clients = clientsData?.data ?? [];

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); utils.dashboard.stats.invalidate(); setDialogOpen(false); toast.success("Tarefa criada!"); },
  });
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); utils.dashboard.stats.invalidate(); },
  });
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Tarefa removida!"); },
  });

  const toggleComplete = (id: number, completed: boolean) => {
    updateMutation.mutate({ id, completed });
    toast.success(completed ? "Tarefa concluída!" : "Tarefa reaberta");
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    createMutation.mutate({
      ...form,
      clientId: form.clientId || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      priority: form.priority as any,
      type: form.type as any,
    });
  };

  const isOverdue = (dueDate: Date | null) => dueDate && new Date(dueDate) < new Date();

  const renderTask = (task: any) => (
    <Card key={task.id} className={`group transition-all ${isOverdue(task.dueDate) && !task.completed ? "border-warning/30" : "hover:border-primary/20"}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <Checkbox checked={task.completed} onCheckedChange={(checked) => toggleComplete(task.id, !!checked)} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => { if (confirm("Excluir tarefa?")) deleteMutation.mutate({ id: task.id }); }}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">{typeLabels[task.type]}</Badge>
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) && !task.completed ? "text-warning" : ""}`}>
                {isOverdue(task.dueDate) && !task.completed && <AlertTriangle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground mt-1">{pendingTasks?.length ?? 0} pendentes</p>
        </div>
        <Button onClick={() => { setForm({ title: "", description: "", clientId: undefined, dueDate: "", priority: "medium", type: "other" }); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Tarefa
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pendingTasks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({completedTasks?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-2">
          {pendingTasks && pendingTasks.length > 0 ? pendingTasks.map(renderTask) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma tarefa pendente.</CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4 space-y-2">
          {completedTasks && completedTasks.length > 0 ? completedTasks.map(renderTask) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma tarefa concluída.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="O que precisa ser feito?" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={form.clientId ? String(form.clientId) : "none"} onValueChange={(v) => setForm({ ...form, clientId: v === "none" ? undefined : parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data de vencimento</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes da tarefa..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
