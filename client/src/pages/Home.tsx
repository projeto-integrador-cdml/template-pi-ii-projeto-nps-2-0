import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, CheckSquare, DollarSign, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const stageLabels: Record<string, string> = {
  lead: "Lead",
  contact: "Contato",
  proposal: "Proposta",
  negotiation: "Negociação",
  closed_won: "Ganho",
  closed_lost: "Perdido",
};

const stageColors: Record<string, string> = {
  lead: "bg-blue-500",
  contact: "bg-cyan-500",
  proposal: "bg-amber-500",
  negotiation: "bg-purple-500",
  closed_won: "bg-emerald-500",
  closed_lost: "bg-red-500",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: stageData, isLoading: stageLoading } = trpc.dashboard.opportunitiesByStage.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.dashboard.recentActivities.useQuery({ limit: 8 });
  const { data: overdueTasks } = trpc.tasks.overdue.useQuery();
  const [, setLocation] = useLocation();

  const interactionTypeLabels: Record<string, string> = {
    call: "Ligação",
    email: "Email",
    meeting: "Reunião",
    note: "Nota",
    whatsapp: "WhatsApp",
    audio: "Áudio",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu CRM</p>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Clientes"
          value={statsLoading ? undefined : String(stats?.totalClients ?? 0)}
          subtitle={`${stats?.activeClients ?? 0} ativos`}
          icon={<Users className="h-5 w-5" />}
          onClick={() => setLocation("/clients")}
        />
        <MetricCard
          title="Oportunidades"
          value={statsLoading ? undefined : String(stats?.totalOpportunities ?? 0)}
          subtitle={formatCurrency(stats?.totalValue ?? 0)}
          icon={<Target className="h-5 w-5" />}
          onClick={() => setLocation("/pipeline")}
        />
        <MetricCard
          title="Negócios Ganhos"
          value={statsLoading ? undefined : String(stats?.wonDeals ?? 0)}
          subtitle={formatCurrency(stats?.wonValue ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="success"
        />
        <MetricCard
          title="Tarefas Pendentes"
          value={statsLoading ? undefined : String(stats?.pendingTasks ?? 0)}
          subtitle={`${stats?.overdueTasks ?? 0} atrasadas`}
          icon={<CheckSquare className="h-5 w-5" />}
          accent={(stats?.overdueTasks ?? 0) > 0 ? "warning" : undefined}
          onClick={() => setLocation("/tasks")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil de vendas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Funil de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stageData && stageData.length > 0 ? (
              <div className="space-y-3">
                {stageData.map((item) => {
                  const maxCount = Math.max(...stageData.map((s) => s.count));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.stage} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stageLabels[item.stage] ?? item.stage}</span>
                        <span className="text-muted-foreground">
                          {item.count} · {formatCurrency(item.totalValue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stageColors[item.stage] ?? "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma oportunidade cadastrada ainda.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Atividades recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{act.subject || interactionTypeLabels[act.type] || "Atividade"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {act.content?.substring(0, 80) || "Sem descrição"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(act.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade registrada ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tarefas atrasadas */}
      {overdueTasks && overdueTasks.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Tarefas Atrasadas ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors cursor-pointer"
                  onClick={() => setLocation("/tasks")}
                >
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="text-xs text-warning">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem data"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  onClick,
}: {
  title: string;
  value?: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: "success" | "warning";
  onClick?: () => void;
}) {
  const accentClass = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-primary";

  return (
    <Card
      className={`transition-all hover:shadow-lg ${onClick ? "cursor-pointer hover:border-primary/30" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            {value !== undefined ? (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
            {subtitle && <p className={`text-xs ${accentClass}`}>{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent === "success" ? "bg-success/10 text-success" : accent === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
