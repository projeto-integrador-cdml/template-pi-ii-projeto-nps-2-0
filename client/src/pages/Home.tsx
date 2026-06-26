import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, Target, CheckSquare, DollarSign, AlertTriangle, TrendingUp, 
  Activity, Clock, Star, Moon, MessageCircle, CheckCircle, ArrowUpRight 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";

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
  const [activeTab, setActiveTab] = useState<"sales" | "support">("sales");
  const [, setLocation] = useLocation();

  // Queries para Vendas
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: activeTab === "sales",
  });
  const { data: stageData, isLoading: stageLoading } = trpc.dashboard.opportunitiesByStage.useQuery(undefined, {
    enabled: activeTab === "sales",
  });
  const { data: activities, isLoading: activitiesLoading } = trpc.dashboard.recentActivities.useQuery(
    { limit: 8 },
    { enabled: activeTab === "sales" }
  );
  const { data: overdueTasks } = trpc.tasks.overdue.useQuery(undefined, {
    enabled: activeTab === "sales",
  });

  // Queries para Atendimento
  const { data: supportStats, isLoading: supportLoading } = trpc.dashboard.supportStats.useQuery(undefined, {
    enabled: activeTab === "support",
  });

  const interactionTypeLabels: Record<string, string> = {
    call: "Ligação",
    email: "Email",
    meeting: "Reunião",
    note: "Nota",
    whatsapp: "WhatsApp",
    audio: "Áudio",
  };

  // Soma de mensagens exibida no cabeçalho do BarChart
  const totalMessagesToday = supportStats?.hourlyMessages?.reduce((sum, h) => sum + h.received + h.sent, 0) ?? 2954;

  const totalChats = (supportStats?.chatsActive ?? 0) + (supportStats?.chatsWaiting ?? 0) + (supportStats?.chatsCompleted ?? 0) + (supportStats?.chatsOffHours ?? 0);
  const fcrResolved = Math.round((supportStats?.chatsCompleted ?? 0) * ((supportStats?.fcr ?? 75.37) / 100));
  const activePct = totalChats > 0 ? ((supportStats?.chatsActive ?? 0) / totalChats * 100).toFixed(2) : "0.00";
  const completedPct = totalChats > 0 ? ((supportStats?.chatsCompleted ?? 0) / totalChats * 100).toFixed(2) : "0.00";
  const offHoursPct = totalChats > 0 ? ((supportStats?.chatsOffHours ?? 0) / totalChats * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* HEADER TABS SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-xs mt-1">Acompanhe o desempenho do seu CRM e atendimento de WhatsApp</p>
        </div>

        <div className="flex p-1 bg-muted/60 backdrop-blur-md border border-border/10 rounded-xl self-start sm:self-center shrink-0">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "sales"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Funil & Vendas
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "support"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Atendimento & WhatsApp
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* ABA 1: FUNIL & VENDAS                                    */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeTab === "sales" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Métricas principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Clientes"
              value={statsLoading ? undefined : String(stats?.totalClients ?? 0)}
              subtitle={`${stats?.activeClients ?? 0} ativos`}
              icon={<Users className="h-5 w-5 text-blue-500" />}
              onClick={() => setLocation("/clients")}
            />
            <MetricCard
              title="Oportunidades"
              value={statsLoading ? undefined : String(stats?.totalOpportunities ?? 0)}
              subtitle={formatCurrency(stats?.totalValue ?? 0)}
              icon={<Target className="h-5 w-5 text-indigo-500" />}
              onClick={() => setLocation("/pipeline")}
            />
            <MetricCard
              title="Negócios Ganhos"
              value={statsLoading ? undefined : String(stats?.wonDeals ?? 0)}
              subtitle={formatCurrency(stats?.wonValue ?? 0)}
              icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
              accent="success"
            />
            <MetricCard
              title="Tarefas Pendentes"
              value={statsLoading ? undefined : String(stats?.pendingTasks ?? 0)}
              subtitle={`${stats?.overdueTasks ?? 0} atrasadas`}
              icon={<CheckSquare className="h-5 w-5 text-amber-500" />}
              accent={(stats?.overdueTasks ?? 0) > 0 ? "warning" : undefined}
              onClick={() => setLocation("/tasks")}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funil de vendas */}
            <Card className="glass-card">
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
                            <span className="text-muted-foreground text-xs">
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
            <Card className="glass-card">
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
                          <p className="text-xs font-semibold truncate">{act.subject || interactionTypeLabels[act.type] || "Atividade"}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {act.content?.substring(0, 80) || "Sem descrição"}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 self-center">
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
            <Card className="border-warning/30 glass-card">
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
                      className="flex items-center justify-between p-2.5 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors cursor-pointer border border-warning/10"
                      onClick={() => setLocation("/tasks")}
                    >
                      <span className="text-xs font-semibold">{task.title}</span>
                      <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md border border-warning/20">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem data"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* ABA 2: ATENDIMENTO & WHATSAPP                            */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeTab === "support" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* ROW 1: 5 TOP METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              title="TME"
              value={supportLoading ? undefined : `${supportStats?.tme ?? 0}m`}
              subtitle="Tempo Médio de Espera"
              icon={<Clock className="h-5 w-5 text-blue-500" />}
            />
            <MetricCard
              title="TMA"
              value={supportLoading ? undefined : `${supportStats?.tma ?? 0}m`}
              subtitle="Tempo Médio de Atendimento"
              icon={<Clock className="h-5 w-5 text-indigo-500" />}
            />
            <MetricCard
              title="TMR"
              value={supportLoading ? undefined : `${supportStats?.tmr ?? 0}m`}
              subtitle="Tempo Médio de Resposta"
              icon={<Clock className="h-5 w-5 text-violet-500" />}
            />
            <MetricCard
              title="Agentes Online"
              value={supportLoading ? undefined : String(supportStats?.agentsOnline ?? 0)}
              subtitle={`de ${supportStats?.agentsTotal ?? 0} disponíveis`}
              icon={<Users className="h-5 w-5 text-emerald-500" />}
              extraBadge={
                supportStats?.agentsTotal ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                    {Math.round((supportStats.agentsOnline / supportStats.agentsTotal) * 100)}% disp.
                  </span>
                ) : null
              }
            />
            <MetricCard
              title="Satisfação"
              value={supportLoading ? undefined : `${supportStats?.satisfaction?.toFixed(1) ?? "5.0"}`}
              subtitle="Avaliação média (0-5)"
              icon={<Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
              extraBadge={
                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500">
                  ★★★★★ <span className="text-muted-foreground text-[8px]">({supportStats?.satisfactionCount ?? 0})</span>
                </span>
              }
            />
          </div>

          {/* ROW 2: 5 INDICATOR OUTLINE CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <OutlineIndicatorCard
              title="FCR"
              value={supportLoading ? undefined : `${supportStats?.fcr ?? 75.37}%`}
              subtitle="Resolvidos no 1º contato"
              subtitleDetail={supportLoading ? undefined : `${fcrResolved} de ${supportStats?.chatsCompleted ?? 0} resolvidos`}
              colorClass="border-t-blue-500 bg-blue-500/5"
            />
            <OutlineIndicatorCard
              title="Ativas"
              value={supportLoading ? undefined : String(supportStats?.chatsActive ?? 0)}
              subtitle="Conversas em atendimento"
              subtitleDetail={supportLoading ? undefined : `${activePct}% das conversas`}
              colorClass="border-t-indigo-500 bg-indigo-500/5"
            />
            <OutlineIndicatorCard
              title="Em Espera"
              value={supportLoading ? undefined : String(supportStats?.chatsWaiting ?? 0)}
              subtitle="Conversas na fila"
              subtitleDetail="Aguardando atendente humano"
              colorClass="border-t-amber-500 bg-amber-500/5"
              pulse={ (supportStats?.chatsWaiting ?? 0) > 0 }
            />
            <OutlineIndicatorCard
              title="Concluídas"
              value={supportLoading ? undefined : (supportStats?.chatsCompleted && supportStats.chatsCompleted > 1000 ? `${(supportStats.chatsCompleted/1000).toFixed(2)}K` : String(supportStats?.chatsCompleted ?? 0))}
              subtitle="Conversas finalizadas"
              subtitleDetail={supportLoading ? undefined : `${completedPct}% das conversas`}
              colorClass="border-t-emerald-500 bg-emerald-500/5"
            />
            <OutlineIndicatorCard
              title="Fora de Horário"
              value={supportLoading ? undefined : String(supportStats?.chatsOffHours ?? 0)}
              subtitle="Recebidas após expediente"
              subtitleDetail={supportLoading ? undefined : `${offHoursPct}% das conversas`}
              colorClass="border-t-rose-500 bg-rose-500/5"
            />
          </div>

          {/* ROW 3: COMPLETED CONVERSATIONS CHART (Full Width) */}
          <Card className="glass-card border border-border">
            <CardHeader className="pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  Conversas Concluídas por Hora
                </CardTitle>
                <CardDescription className="text-[10px]">Volume de conversas finalizadas ao longo do dia</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {supportLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart 
                    data={supportStats?.completedConversationsPerHour} 
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(10, 10, 15, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                      labelStyle={{ color: "#fff", fontWeight: "bold" }}
                    />
                    <Area 
                      name="Conversas Concluídas" 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorCompleted)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ROW 4: RECENT CONVERSATIONS TABLE (Full Width) */}
          <Card className="glass-card border border-border">
            <CardHeader className="pb-3 border-b border-border/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  Últimas conversas
                </CardTitle>
                <button
                  onClick={() => setLocation("/reports")}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Relatórios
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {supportLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border/5 text-[10px] uppercase font-bold text-muted-foreground bg-muted/20">
                      <th className="p-4 font-semibold">Nome</th>
                      <th className="p-4 font-semibold">Contato</th>
                      <th className="p-4 font-semibold">Protocolo</th>
                      <th className="p-4 font-semibold">Expira</th>
                      <th className="p-4 font-semibold">Canal</th>
                      <th className="p-4 font-semibold">Equipe</th>
                      <th className="p-4 font-semibold">Agente</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Tempo</th>
                      <th className="p-4 font-semibold">Iniciado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5 text-xs">
                    {supportStats?.recentConversations?.map((chat: any) => {
                      const initials = chat.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                        
                      const colors = [
                        "bg-blue-500/10 text-blue-500",
                        "bg-purple-500/10 text-purple-500",
                        "bg-emerald-500/10 text-emerald-500",
                        "bg-amber-500/10 text-amber-500",
                        "bg-rose-500/10 text-rose-500",
                        "bg-indigo-500/10 text-indigo-500",
                      ];
                      const colorIndex = (chat.name.charCodeAt(0) || 0) % colors.length;
                      const avatarBg = colors[colorIndex];

                      return (
                        <tr key={chat.id} className="hover:bg-accent/30 transition-colors">
                          <td className="p-4 font-semibold text-foreground flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarBg}`}>
                              {initials || "C"}
                            </div>
                            <span className="truncate max-w-[150px]">{chat.name}</span>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="opacity-60">📞</span> {chat.phone}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[10px]">
                            <span className="px-2 py-1 bg-muted/40 border border-border/10 rounded font-semibold text-muted-foreground">
                              {chat.protocol}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            <span className="flex items-center gap-1 text-[11px]">
                              <span className="text-orange-500">⏳</span> {chat.expiresAt}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded">
                              {chat.channel}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">{chat.team}</td>
                          <td className="p-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[9px]">
                                {chat.agentName ? chat.agentName[0].toUpperCase() : "U"}
                              </div>
                              <span className="truncate max-w-[100px]">{chat.agentName}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {chat.status === "Em Atendimento" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Em Atendimento
                              </span>
                            ) : chat.status === "Pausado" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                Pausado
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/20">
                                Finalizado
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span>⏱️</span> {chat.timeString}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">{chat.startedAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// COMPONENTE CARD DE MÉTRICA PRINCIPAL
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  onClick,
  extraBadge,
}: {
  title: string;
  value?: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: "success" | "warning";
  onClick?: () => void;
  extraBadge?: React.ReactNode;
}) {
  const accentClass = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-primary";

  return (
    <Card
      className={`transition-all hover:shadow-md glass-card ${onClick ? "cursor-pointer hover:border-primary/30" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            {value !== undefined ? (
              <p className="text-xl font-bold tracking-tight text-foreground leading-tight mt-1">{value}</p>
            ) : (
              <Skeleton className="h-6 w-16 mt-1" />
            )}
          </div>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            accent === "success" ? "bg-success/10 text-success" : accent === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
          }`}>
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 mt-1">
          {subtitle && <p className={`text-[10px] font-medium leading-none ${accentClass}`}>{subtitle}</p>}
          {extraBadge && <div className="mt-1">{extraBadge}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// COMPONENTE CARD DE INDICADOR COM CONTORNO
function OutlineIndicatorCard({
  title,
  value,
  subtitle,
  subtitleDetail,
  colorClass,
  pulse = false,
}: {
  title: string;
  value?: string;
  subtitle: string;
  subtitleDetail?: string;
  colorClass: string;
  pulse?: boolean;
}) {
  return (
    <Card className={`border-t-3 shadow-sm glass-card transition-all hover:-translate-y-0.5 ${colorClass}`}>
      <CardContent className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{title}</span>
          {pulse && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </div>
        <div>
          {value !== undefined ? (
            <p className="text-2xl font-black tracking-tight leading-none text-foreground">{value}</p>
          ) : (
            <Skeleton className="h-8 w-12" />
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-foreground truncate">{subtitle}</p>
          {subtitleDetail && <p className="text-[9px] text-muted-foreground truncate">{subtitleDetail}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
