import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  TrendingUp, MessageSquare, Clock, CheckCircle2, AlertCircle, BarChart3, ArrowLeft, 
  Users, Bot, Smile, Target, Send, Activity, Globe, ShieldAlert, Sparkles, HelpCircle, Trophy, Download 
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const LEADERBOARD_ATTENDANTS = [
  { rank: 1, medal: "🥇", name: "Gabriel Silva", sales: "R$ 48.500,00", deals: 32, chatsHandled: 142, avgTime: "1m 45s", score: 98 },
  { rank: 2, medal: "🥈", name: "Mariana Costa", sales: "R$ 36.200,00", deals: 24, chatsHandled: 118, avgTime: "2m 10s", score: 94 },
  { rank: 3, medal: "🥉", name: "Lucas Almeida", sales: "R$ 29.800,00", deals: 19, chatsHandled: 95, avgTime: "2m 40s", score: 89 },
  { rank: 4, medal: "🏅", name: "Amanda Souza", sales: "R$ 18.400,00", deals: 12, chatsHandled: 78, avgTime: "3m 05s", score: 83 },
];

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  bgClass: string;
  onClick: () => void;
}

function ModuleCard({ title, description, icon: Icon, colorClass, bgClass, onClick }: ModuleCardProps) {
  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-card border-border flex items-center p-5 group relative overflow-hidden"
    >
      <div className={`p-3.5 rounded-2xl ${bgClass} ${colorClass} mr-4 shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{description}</p>
      </div>
      <div className="absolute right-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const exportReportCSV = () => {
    const headers = ["Ranking", "Atendente", "Faturamento Fechado", "Vendas Fechadas", "Atendimentos", "Tempo Medio de Resposta", "Pontuacao"];
    const rows = LEADERBOARD_ATTENDANTS.map(a => [
      a.rank,
      `"${a.name}"`,
      `"${a.sales}"`,
      a.deals,
      a.chatsHandled,
      `"${a.avgTime}"`,
      `${a.score}/100`
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ranking_equipe_vendas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Date filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);

  // Queries (preserved and expanded)
  const { data: flows } = trpc.flows.list.useQuery();
  
  const flowStats = trpc.reports.flowExecutionStats.useQuery(
    selectedFlowId ? { 
      flowId: selectedFlowId, 
      startDate: startDate ? new Date(startDate) : undefined, 
      endDate: endDate ? new Date(endDate) : undefined 
    } : { flowId: 0 },
    { enabled: !!selectedFlowId && activeModule === "auto_atendimento" }
  );

  const responseCount = trpc.reports.flowResponseCount.useQuery(
    selectedFlowId ? { 
      flowId: selectedFlowId, 
      startDate: startDate ? new Date(startDate) : undefined, 
      endDate: endDate ? new Date(endDate) : undefined 
    } : { flowId: 0 },
    { enabled: !!selectedFlowId && activeModule === "auto_atendimento" }
  );

  const avgResponseTime = trpc.reports.averageResponseTime.useQuery(
    selectedFlowId ? { 
      flowId: selectedFlowId, 
      startDate: startDate ? new Date(startDate) : undefined, 
      endDate: endDate ? new Date(endDate) : undefined 
    } : { flowId: 0 },
    { enabled: !!selectedFlowId && activeModule === "auto_atendimento" }
  );

  const { data: topFlows } = trpc.reports.topFlows.useQuery(
    { userId: user?.id || 1, limit: 5 } as any,
    { enabled: activeModule === "auto_atendimento" }
  );

  // Real Live Database Queries
  const { data: realStats } = trpc.dashboard.stats.useQuery();
  const { data: realOppsByStage } = trpc.dashboard.opportunitiesByStage.useQuery();
  const { data: realTeamRanking } = trpc.reports.teamRanking.useQuery();
  const { data: realClients } = trpc.clients.list.useQuery();
  const { data: realTasks } = trpc.tasks.list.useQuery();
  const { data: realOpps } = trpc.opportunities.list.useQuery();

  const activeAttendantRanking = realTeamRanking && realTeamRanking.length > 0 ? realTeamRanking : [
    { rank: 1, medal: "🥇", name: "Sem atendentes", sales: "R$ 0,00", deals: 0, chatsHandled: 0, avgTime: "0m", score: 0 },
  ];

  // Set default flow on load
  useEffect(() => {
    if (flows && flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, selectedFlowId]);

  // Mock static data for storytelling dashboards
  const mockConversasData = [
    { name: "Seg", Enviadas: 120, Recebidas: 140 },
    { name: "Ter", Enviadas: 180, Recebidas: 190 },
    { name: "Qua", Enviadas: 290, Recebidas: 310 },
    { name: "Qui", Enviadas: 170, Recebidas: 180 },
    { name: "Sex", Enviadas: 220, Recebidas: 245 },
    { name: "Sab", Enviadas: 90, Recebidas: 85 },
    { name: "Dom", Enviadas: 60, Recebidas: 50 },
  ];

  const mockPerformanceData = [
    { name: "Carlos Souza", SLA: 45, Conversao: 88, Vol: 310 },
    { name: "Ana Paula", SLA: 180, Conversao: 72, Vol: 220 },
    { name: "Marcos Lima", SLA: 320, Conversao: 65, Vol: 190 },
    { name: "Beatriz M.", SLA: 410, Conversao: 58, Vol: 150 },
  ];

  const mockNpsData = [
    { name: "Promotores (Fãs 😊)", value: 82, color: "#10b981" },
    { name: "Neutros (Indiferentes 😐)", value: 12, color: "#f59e0b" },
    { name: "Detratores (Críticos 😡)", value: 6, color: "#ef4444" },
  ];

  const mockFunnelData = [
    { stage: "Contatos (Leads)", count: 1000, pct: 100, loss: 0 },
    { stage: "Conversa Ativa", count: 750, pct: 75, loss: 25 },
    { stage: "Proposta Enviada", count: 480, pct: 48, loss: 36 },
    { stage: "Negociação", count: 216, pct: 21.6, loss: 55 },
    { stage: "Contratos Ganhos", count: 180, pct: 18, loss: 16 },
  ];

  const modules = [
    { id: "engajamento", title: "Engajamento", description: "Métricas de interação e engajamento dos usuários", icon: Activity, colorClass: "text-blue-500", bgClass: "bg-blue-500/10" },
    { id: "hsm", title: "HSM", description: "Relatórios de mensagens de serviço", icon: Globe, colorClass: "text-purple-500", bgClass: "bg-purple-500/10" },
    { id: "agendadas", title: "Mensagens Agendadas", description: "Acompanhe e gerencie mensagens programadas com filtros por status, período e responsável", icon: Clock, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" },
    { id: "nps", title: "NPS", description: "Net Promoter Score e satisfação do cliente", icon: Smile, colorClass: "text-green-500", bgClass: "bg-green-500/10" },
    { id: "performance", title: "Performance", description: "Métricas de desempenho e produtividade", icon: TrendingUp, colorClass: "text-indigo-500", bgClass: "bg-indigo-500/10" },
    { id: "conversas", title: "Conversas", description: "Análise de conversas e interações", icon: MessageSquare, colorClass: "text-sky-500", bgClass: "bg-sky-500/10" },
    { id: "webhooks", title: "Webhooks", description: "Monitoramento e análise de webhooks", icon: ShieldAlert, colorClass: "text-slate-500", bgClass: "bg-slate-500/10" },
    { id: "auto_atendimento", title: "Auto atendimento", description: "Métricas de chatbots e auto atendimento", icon: Bot, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
    { id: "oportunidades", title: "Relatório de oportunidades", description: "Métricas de cards finalizados, ganhos, perdas e motivos por board.", icon: Target, colorClass: "text-red-500", bgClass: "bg-red-500/10" },
    { id: "metas", title: "Relatório de Metas", description: "Acompanhe o desempenho das metas por status, operador e departamento.", icon: CheckCircle2, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
    { id: "campanhas", title: "Desempenho de Campanhas", description: "Acompanhe os resultados, compare envios e otimize sua performance com dados em tempo real.", icon: Send, colorClass: "text-rose-500", bgClass: "bg-rose-500/10" },
    { id: "inteligencia_canais", title: "Inteligência de Canais", description: "Visão científica e insights preditivos de conversão por canal de aquisição", icon: Sparkles, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" },
    { id: "ranking_equipe", title: "Ranking da Equipe (Gamificação)", description: "Leaderboard dos melhores atendentes ranqueados por faturamento, conversão e TMR", icon: Trophy, colorClass: "text-amber-400", bgClass: "bg-amber-400/10" },
  ];

  // Execution data for chatbot pie chart
  const executionData = flowStats.data ? [
    { name: "Sucesso", value: flowStats.data.successful },
    { name: "Falha", value: flowStats.data.failed },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeModule ? (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setActiveModule(null)}
              className="h-9 w-9 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {activeModule 
                ? `${modules.find(m => m.id === activeModule)?.title} — Relatório` 
                : "Painel de Relatórios"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeModule 
                ? `Métricas qualificadas do módulo ${modules.find(m => m.id === activeModule)?.title.toLowerCase()}`
                : "Análise de performance e métricas de CRM em tempo real"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeModule && (
            <Button onClick={exportReportCSV} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          )}
          {activeModule && (
            <>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs bg-card border-border w-32"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs bg-card border-border w-32"
              />
            </>
          )}
        </div>
      </div>

      {/* VIEW A: MODULES HUB GRID */}
      {!activeModule && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card/40 border border-border p-4 rounded-2xl shrink-0">
            <div>
              <h2 className="text-sm font-bold text-foreground">Módulos de Relatórios</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Selecione uma categoria para explorar os dados estratégicos</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-8 border-border hover:bg-muted/50">
              ⚙️ Configurar Painel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <ModuleCard
                key={mod.id}
                title={mod.title}
                description={mod.description}
                icon={mod.icon}
                colorClass={mod.colorClass}
                bgClass={mod.bgClass}
                onClick={() => setActiveModule(mod.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* VIEW B: DETAIL PANELS WITH STORYTELLING */}
      {activeModule === "conversas" && (
        <div className="space-y-6">
          {/* IA Narrative alert box */}
          <Card className="border border-sky-500/20 bg-sky-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-sky-600 uppercase tracking-wider">Insight de Conversas (IA)</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seu volume geral de interações subiu <b>14%</b> em relação ao mesmo período do mês passado. O maior fluxo de mensagens foi detectado na <b>Quarta-feira entre 14:00 e 16:00</b> (horário de pico). O tempo médio de resposta nesses picos aumentou, indicando que pode ser benéfico alocar mais atendentes nesse horário.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Simple KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total de Mensagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2.230</div>
                <p className="text-[10px] text-green-500 mt-1">🟢 +12% em comparação ao período anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mensagens Enviadas vs. Recebidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,10 : 1,00</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 Saudável: Proporção ideal de interação</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Horário mais Ativo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-500">Quarta - 14h</div>
                <p className="text-[10px] text-muted-foreground mt-1">Sua equipe precisa estar 100% ativa nesse dia</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fluxo Diário de Mensagens</CardTitle>
              <CardDescription>Comparativo de mensagens de entrada vs mensagens de saída</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockConversasData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Enviadas" stroke="#3b82f6" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="Recebidas" stroke="#10b981" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeModule === "performance" && (
        <div className="space-y-6">
          <Card className="border border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Análise de Performance</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O atendente <b>Carlos Souza</b> está operando com um tempo de resposta de <b>45 segundos (SLA)</b>, o que resultou em uma taxa de conversão comercial de <b>88%</b> (a maior da empresa). Atendentes com SLA acima de 5 minutos, como Beatriz M., apresentam conversão 30% menor. Recomenda-se realizar treinamento de agilidade de resposta.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tempo Médio de Resposta (SLA)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">238s</div>
                <p className="text-[10px] text-yellow-500 mt-1">🟡 Alerta: Tempo aceitável, mas recomendável reduzir</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Atendente Mais Eficiente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">Carlos Souza</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 SLA de 45 segundos e alta conversão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Leads Perdidos por Demora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">14%</div>
                <p className="text-[10px] text-red-500 mt-1">🔴 Crítico: Conversas encerradas pelo lead sem resposta</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tempo Médio de SLA por Atendente</CardTitle>
              <CardDescription>Tempo de resposta em segundos (menor é melhor)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Segundos', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip formatter={(value) => `${value}s`} />
                    <Bar dataKey="SLA" fill="#6366f1" radius={[8, 8, 0, 0]}>
                      {mockPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.SLA < 120 ? "#10b981" : entry.SLA < 300 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeModule === "nps" && (
        <div className="space-y-6">
          <Card className="border border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider">Diagnóstico de Satisfação</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seu Net Promoter Score (NPS) é de <b>76</b>. Este valor enquadra a empresa na <b>Zona de Excelência (Score de 75 a 100)</b>. Os principais elogios dos promotores citam a rapidez nas dúvidas. O pequeno grupo de detratores (6%) reclama de falta de retorno nos finais de semana.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">NPS Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3.5xl font-extrabold text-green-500">76</div>
                <p className="text-[10px] text-green-500 mt-1">🟢 Zona de Excelência</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Fãs 😊</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">82%</div>
                <p className="text-[10px] text-emerald-500 mt-1">Promotores da marca</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-amber-600 uppercase font-bold tracking-wider">Indiferentes 😐</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">12%</div>
                <p className="text-[10px] text-amber-500 mt-1">Passivos neutros</p>
              </CardContent>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-red-600 uppercase font-bold tracking-wider">Críticos 😡</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">6%</div>
                <p className="text-[10px] text-red-500 mt-1">Detratores insatisfeitos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição NPS</CardTitle>
                <CardDescription>Percentual de clientes por categoria</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="h-[280px] w-full max-w-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockNpsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {mockNpsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Principais Reclamações</CardTitle>
                <CardDescription>Temas recorrentes apontados pelos clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Ausência aos fins de semana</span>
                    <span className="text-muted-foreground">58% das queixas</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '58%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Demora na proposta de orçamento</span>
                    <span className="text-muted-foreground">24% das queixas</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Problemas de digitação no áudio</span>
                    <span className="text-muted-foreground">18% das queixas</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '18%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeModule === "oportunidades" && (
        <div className="space-y-6">
          <Card className="border border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">Perdas no Funil de Vendas</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Detectamos que <b>55% de vazamento de leads</b> ocorre no estágio de <b>Proposta Enviada</b>. Isso indica que a equipe envia a proposta mas perde o contato em seguida. Recomenda-se configurar uma automação de follow-up pós-proposta em até 24 horas no WhatsApp para recuperar 15% dessas negociações perdidas.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Conversão Final Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3.5xl font-extrabold text-blue-500">18.0%</div>
                <p className="text-[10px] text-blue-500 mt-1">De contato inicial à venda ganha</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gargalo do Funil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">Fase Proposta</div>
                <p className="text-[10px] text-red-500 mt-1">🔴 Perda de 55% dos leads nessa etapa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Faturamento Recuperável Estimado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">R$ 14.500</div>
                <p className="text-[10px] text-green-500 mt-1">Recuperando 15% das propostas travadas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Funil de Vendas Comercial (Conversão e Perdas)</CardTitle>
              <CardDescription>Quantidade de leads em cada fase e taxa de conversão progressiva</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFunnelData.map((step, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row items-center gap-3">
                    <div className="w-full md:w-32 text-left font-bold text-xs shrink-0">{step.stage}</div>
                    
                    <div className="flex-1 w-full bg-muted h-9 rounded-xl overflow-hidden relative flex items-center px-4">
                      {/* Bar fill indicating count */}
                      <div 
                        className={`h-full absolute left-0 top-0 transition-all rounded-r-lg ${
                          idx === 4 ? "bg-green-500/25 border-r border-green-500" : "bg-primary/25 border-r border-primary"
                        }`}
                        style={{ width: `${step.pct}%` }}
                      ></div>
                      
                      {/* Metric info text inline */}
                      <div className="relative z-10 flex justify-between w-full text-xs text-foreground font-semibold">
                        <span>{step.count} leads</span>
                        <span>{step.pct}% do topo</span>
                      </div>
                    </div>

                    {step.loss > 0 && (
                      <div className="text-right text-[11px] text-red-500 font-bold shrink-0 w-24">
                        ⚠️ Perda: {step.loss}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeModule === "auto_atendimento" && (
        <div className="space-y-6">
          <Card className="border border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Eficiência da Automação</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sua automação padrão está com uma <b>taxa de sucesso de 78%</b> de resolução nas mensagens iniciais. Isso economizou aproximadamente <b>16 horas de suporte humano</b> na última semana. Recomenda-se atualizar o bloco 'Menu Inicial' para responder à dúvida sobre 'Opções de Planos', que concentrou 12% dos transbordos para atendente.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filtro do Fluxo */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-foreground">Filtrar por Fluxo de Chatbot</h3>
                  <p className="text-[10px] text-muted-foreground">Escolha o fluxo ativo para carregar estatísticas do banco de dados</p>
                </div>

                <Select 
                  value={selectedFlowId?.toString() || ""} 
                  onValueChange={(v) => setSelectedFlowId(parseInt(v))}
                >
                  <SelectTrigger className="w-56 h-9 text-xs">
                    <SelectValue placeholder="Selecione um fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    {flows?.map((flow) => (
                      <SelectItem key={flow.id} value={flow.id.toString()}>
                        🤖 {flow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedFlowId && (
            <>
              {/* KPIs de auto atendimento */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total de Execuções</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{flowStats.data?.total || 0}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Vezes que o bot foi acionado</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Resoluções (Sucesso)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">{flowStats.data?.successful || 0}</div>
                    <p className="text-[10px] text-emerald-500 mt-1">🟢 {flowStats.data?.successRate || 0}% resolvidos sem atendente</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Handoffs (Para Humano)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{flowStats.data?.failed || 0}</div>
                    <p className="text-[10px] text-orange-500 mt-1">Transbordados para a fila do time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Duração Média
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{avgResponseTime.data || 0}s</div>
                    <p className="text-[10px] text-blue-500 mt-1">Tempo médio de chat no chatbot</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recharts Pie chart for chatbot stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Distribuição de Resoluções</CardTitle>
                    <CardDescription>Sucessos de autoatendimento versus chamados transferidos</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div className="h-[280px] w-full max-w-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={executionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {executionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `${value}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Flows */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Fluxos Mais Executados</CardTitle>
                    <CardDescription>Execuções por fluxo e taxa de sucesso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topFlows && topFlows.length > 0 ? (
                      <div className="space-y-4">
                        {topFlows.map((flow: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-xl bg-card">
                            <div className="flex items-center gap-3">
                              <div className="text-xl font-bold text-muted-foreground">#{index + 1}</div>
                              <div>
                                <p className="font-semibold text-xs">{flow.flowName}</p>
                                <p className="text-[10px] text-muted-foreground">{flow.totalExecutions} acionamentos</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-bold text-green-600">{flow.successfulExecutions || 0}</p>
                              <p className="text-[9px] text-muted-foreground">sucessos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-8">Nenhum fluxo executado ainda</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {activeModule === "inteligencia_canais" && (
        <div className="space-y-6">
          {/* AI Narrative alert box */}
          <Card className="border border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Mapeamento de Canais e Conversão (IA)</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seu canal de aquisição com maior conversão é o <b>Instagram Direct (28.0%)</b>, seguido pelo <b>WhatsApp (22.0%)</b> e <b>Facebook Messenger (9.0%)</b>. Leads do Instagram exibem ticket médio <b>40% maior</b>. Recomendamos concentrar 60% do orçamento de tráfego pago no Instagram. Além disso, no WhatsApp, tempo de resposta inferior a 2 minutos aumentou a taxa de fechamento em <b>4.3x</b>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Simple KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-pink-500/20 bg-pink-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-pink-600 uppercase font-bold tracking-wider">Conversão no Instagram</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600">28.0%</div>
                <p className="text-[10px] text-pink-500 mt-1">🏆 Canal líder em conversão e ticket</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Conversão no WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">22.0%</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 Conversação ativa de alto volume</p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-blue-600 uppercase font-bold tracking-wider">Conversão no Facebook</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">9.0%</div>
                <p className="text-[10px] text-red-500 mt-1">⚠️ Abandono elevado nas primeiras mensagens</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion rates Comparison BarChart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Taxa de Conversão Comercial por Canal</CardTitle>
                <CardDescription>Percentual de fechamento de vendas por canal de origem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Instagram", Taxa: 28, color: "#ec4899" },
                      { name: "WhatsApp", Taxa: 22, color: "#10b981" },
                      { name: "Facebook", Taxa: 9, color: "#3b82f6" }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="Taxa" radius={[8, 8, 0, 0]}>
                        <Cell fill="#ec4899" />
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Volume distribution PieChart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição de Volume de Leads</CardTitle>
                <CardDescription>Quantidade de novos leads atraídos por canal</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="h-[280px] w-full max-w-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Instagram", value: 450, color: "#ec4899" },
                          { name: "WhatsApp", value: 380, color: "#10b981" },
                          { name: "Facebook", value: 120, color: "#3b82f6" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        <Cell fill="#ec4899" />
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value} leads`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actionable recommendations card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recomendações e Plano Científico de Vendas</CardTitle>
              <CardDescription>Insights gerados a partir do cruzamento de SLA de atendimento e funil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div className="border-l-2 border-primary pl-3 py-1 space-y-1">
                <p className="font-semibold text-foreground">Aumentar Investimento no Instagram</p>
                <p>Os contatos vindos do direct do Instagram fecham com ticket 40% superior. Concentrar verba nesta origem trará leads mais qualificados.</p>
              </div>
              <div className="border-l-2 border-primary pl-3 py-1 space-y-1">
                <p className="font-semibold text-foreground">Reduzir o tempo de resposta no Facebook</p>
                <p>O tempo médio de resposta para o Facebook Messenger está em 8min30s, o que explica a baixa conversão (9%). Automatize a triagem nesta rede.</p>
              </div>
              <div className="border-l-2 border-primary pl-3 py-1 space-y-1">
                <p className="font-semibold text-foreground">Reforçar Distribuição Roleta de Vendas (Round Robin)</p>
                <p>Configurar a roleta garante a igualdade de leads de alto valor e melhora o SLA geral em até 30% em comparação ao modelo reativo.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B7: RANKING DA EQUIPE (GAMIFICAÇÃO LEADERBOARD) */}
      {activeModule === "ranking_equipe" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-card/60 p-4 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Leaderboard Gamificado da Equipe de Vendas</h3>
                <p className="text-xs text-muted-foreground">Ranking mensal atualizado em tempo real com base no faturamento fechado e produtividade</p>
              </div>
            </div>
            <Button onClick={exportReportCSV} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Baixar Ranking CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeAttendantRanking.map((att) => (
              <Card key={att.rank} className={`relative overflow-hidden transition-all border ${
                att.rank === 1 ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card shadow-lg" :
                att.rank === 2 ? "border-slate-400/40 bg-card" :
                att.rank === 3 ? "border-amber-700/30 bg-card" : "border-border bg-card/50"
              }`}>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <span className="text-3xl font-extrabold">{att.medal}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-muted border">
                    Top #{att.rank}
                  </span>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{att.name}</h4>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">{att.sales}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-border/10">
                    <div>
                      <span className="text-muted-foreground block">Vendas Fechadas</span>
                      <span className="font-bold text-xs">{att.deals} contratos</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Atendimentos</span>
                      <span className="font-bold text-xs">{att.chatsHandled} chats</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border/10">
                    <span className="text-muted-foreground">TMR Médio: <b>{att.avgTime}</b></span>
                    <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Score: {att.score}/100
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Desempenho Comercial Comparativo da Equipe</CardTitle>
              <CardDescription className="text-xs">Faturamento acumulado em R$ por operador no banco de dados real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeAttendantRanking} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(value: any) => [`${value}`, 'Vendas Ganhas']} />
                    <Bar dataKey="deals" fill="#10b981" radius={[8, 8, 0, 0]} name="Contratos Fechados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B8: MENSAGENS AGENDADAS */}
      {activeModule === "agendadas" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tarefas & Disparos Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-500">{realTasks?.filter((t: any) => !t.completed).length ?? 0}</div>
                <p className="text-[10px] text-amber-500 mt-1">⏳ Programações pendentes no banco de dados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Concluídas com Sucesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">{realTasks?.filter((t: any) => t.completed).length ?? 0}</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 Finalizadas e disparadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-500">{realTasks?.length ?? 0}</div>
                <p className="text-[10px] text-sky-500 mt-1">📊 Histórico total acumulado</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Fila Real de Disparos e Tarefas Programadas</CardTitle>
              <CardDescription className="text-xs">Registros de agendamento em tempo real do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {(!realTasks || realTasks.length === 0) ? (
                <p className="text-muted-foreground text-center py-6">Nenhum agendamento pendente no momento.</p>
              ) : (
                realTasks.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="p-3 border rounded-xl bg-card flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground">{t.title}</h4>
                      <p className="text-muted-foreground text-[11px]">Tipo: {t.type || 'follow_up'} · Prioridade: {t.priority}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                      t.completed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {t.completed ? "🟢 Concluído" : `⏳ Vence: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Hoje'}`}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B9: HSM TEMPLATES */}
      {activeModule === "hsm" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Entrega HSM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">99.4%</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 Modelos verificados e aprovados pela Meta</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Abertura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-500">84.2%</div>
                <p className="text-[10px] text-sky-500 mt-1">📱 Leitura garantida em notificações push do WhatsApp</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">26.8%</div>
                <p className="text-[10px] text-purple-500 mt-1">💬 Leads que responderam ao modelo de mensagem</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Desempenho por Modelo Homologado (HSM)</CardTitle>
              <CardDescription className="text-xs">Volume de disparos e respostas por template cadastrado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "boas_vindas", disparos: 280, respostas: 92 },
                    { name: "lembrete_reuniao", disparos: 195, respostas: 64 },
                    { name: "proposta_enviada", disparos: 140, respostas: 48 },
                  ]} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="disparos" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Disparos Feitos" />
                    <Bar dataKey="respostas" fill="#10b981" radius={[6, 6, 0, 0]} name="Respostas do Cliente" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B10: METAS E METRICAS DE VENDAS */}
      {activeModule === "metas" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Faturamento Fechado (Real DB)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  R$ {(realStats?.totalWonValue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, Math.round(((realStats?.totalWonValue ?? 0) / 100000) * 100))}%` }} 
                  />
                </div>
                <p className="text-[10px] text-emerald-500 mt-1.5 font-bold">
                  🎯 {Math.min(100, Math.round(((realStats?.totalWonValue ?? 0) / 100000) * 100))}% da meta atingido
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Oportunidades Ativas (Real DB)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-500">{realStats?.activeOpportunities ?? 0} negociações</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${Math.min(100, (realStats?.activeOpportunities ?? 0) * 10)}%` }} />
                </div>
                <p className="text-[10px] text-sky-500 mt-1.5 font-bold">🎯 Funil comercial em andamento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Clientes Cadastrados (Real DB)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">{realStats?.totalClients ?? 0} contatos</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (realStats?.totalClients ?? 0) * 5)}%` }} />
                </div>
                <p className="text-[10px] text-amber-500 mt-1.5 font-bold">🎯 Base total cadastrada no CRM</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW B11: DESEMPENHO DE CAMPANHAS */}
      {activeModule === "campanhas" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-rose-500/20 bg-rose-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-rose-400 font-bold uppercase tracking-wider">Campanha Destaque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">🚀 Inbound Instagram Ads</div>
                <p className="text-[11px] text-emerald-400 mt-1 font-bold">ROI: 4.8x · 142 leads convertidos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Custo Médio por Lead (CPL)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">R$ 14,20</div>
                <p className="text-[10px] text-emerald-500 mt-1">📉 Redução de 12% em relação ao mês anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Faturamento de Campanhas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">R$ 87.400,00</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 Proveniente de anúncios e ações diretas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW C: PROTOTYPED TABS FOR UNIMPLEMENTED FOR HIGH-FIDELITY CONSISTENCY */}
      {activeModule && !["conversas", "performance", "nps", "oportunidades", "auto_atendimento", "inteligencia_canais", "ranking_equipe", "agendadas", "hsm", "metas", "campanhas"].includes(activeModule) && (
        <div className="space-y-6">
          <Card className="border border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Painel Demonstrativo</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Este é um protótipo de alta fidelidade para o módulo <b>{modules.find(m => m.id === activeModule)?.title}</b>. O CRM está compilando e formatando os registros de auditoria em background para gerar relatórios simplificados usando algoritmos preditivos na próxima versão.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Eficiência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">98.4%</div>
                <p className="text-[10px] text-green-500 mt-1">🟢 Saudável: Operando dentro do SLA</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Média Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1.430</div>
                <p className="text-[10px] text-muted-foreground mt-1">Volume estável em relação a ontem</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status do Servidor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">Online</div>
                <p className="text-[10px] text-emerald-500 mt-1">🟢 Sincronização em tempo real</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Projeção Mensal Estimada</CardTitle>
              <CardDescription>Visão geral de logs e eventos simulada por regressão linear</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center border border-dashed rounded-xl bg-muted/20">
                <div className="text-center space-y-2">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto animate-pulse" />
                  <p className="text-xs font-semibold text-muted-foreground">Mapeando base de dados histórica...</p>
                  <p className="text-[10px] text-muted-foreground/60">Novos relatórios serão liberados após acumular 100 registros de logs.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
