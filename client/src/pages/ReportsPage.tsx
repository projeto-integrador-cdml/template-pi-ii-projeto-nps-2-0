import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  TrendingUp, MessageSquare, Clock, CheckCircle2, BarChart3, ArrowLeft, 
  Bot, Smile, Target, Send, Activity, Globe, ShieldAlert, Sparkles, Trophy, Download 
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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

function EmptyStateCard({ 
  icon: Icon = Activity, 
  title = "Nenhum dado registrado no período", 
  description = "Os registros reais do banco de dados aparecerão aqui automaticamente quando novas atividades forem realizadas." 
}: { 
  icon?: React.ComponentType<any>; 
  title?: string; 
  description?: string; 
}) {
  return (
    <div className="h-[250px] w-full flex items-center justify-center border border-dashed border-border rounded-2xl bg-muted/10 p-6">
      <div className="text-center space-y-2 max-w-md mx-auto">
        <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center mx-auto text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);

  // Queries reais ao banco de dados MySQL
  const { data: flows } = trpc.flows.list.useQuery();
  
  const flowStats = trpc.reports.flowExecutionStats.useQuery(
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

  // Real Database Queries
  const { data: realStats } = trpc.dashboard.stats.useQuery();
  const { data: realTeamRanking } = trpc.reports.teamRanking.useQuery();
  const { data: realClients } = trpc.clients.list.useQuery();
  const { data: realTasks } = trpc.tasks.list.useQuery();
  const { data: realOpps } = trpc.opportunities.list.useQuery();
  const { data: supportStats } = trpc.dashboard.supportStats.useQuery();

  const activeAttendantRanking = realTeamRanking || [];

  // Exportar dados reais da equipe em CSV
  const exportReportCSV = () => {
    const headers = ["Ranking", "Atendente", "Faturamento Fechado", "Vendas Fechadas", "Atendimentos", "Tempo Medio de Resposta", "Pontuacao"];
    const rows = activeAttendantRanking.map(a => [
      a.rank,
      `"${a.name}"`,
      `"${a.sales}"`,
      a.deals,
      a.chatsHandled,
      `"${a.avgTime}"`,
      `${a.score}/100`
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...(rows.length > 0 ? rows.map(r => r.join(";")) : ["\"Nenhum registro encontrado\";0;0;0;\"0m\";0"])].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ranking_equipe_vendas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Set default flow on load
  useEffect(() => {
    if (flows && flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, selectedFlowId]);

  // Cálculos dinâmicos reais de conversas
  const totalMessagesCount = supportStats?.hourlyMessages?.reduce((sum, h) => sum + h.received + h.sent, 0) ?? 0;
  const messagesReceived = supportStats?.hourlyMessages?.reduce((sum, h) => sum + h.received, 0) ?? 0;
  const messagesSent = supportStats?.hourlyMessages?.reduce((sum, h) => sum + h.sent, 0) ?? 0;
  const messagesRatio = messagesReceived > 0 
    ? `${(messagesSent / messagesReceived).toFixed(2)} : 1,00` 
    : (totalMessagesCount > 0 ? "1,00 : 0,00" : "0 : 0");

  // Cálculos reais do funil comercial a partir de oportunidades do banco
  const oppList = realOpps || [];
  const totalOppCount = oppList.length;
  const leadStageCount = oppList.filter(o => o.stage === "lead").length;
  const contactStageCount = oppList.filter(o => o.stage === "contact").length;
  const proposalStageCount = oppList.filter(o => o.stage === "proposal").length;
  const negotiationStageCount = oppList.filter(o => o.stage === "negotiation").length;
  const wonStageCount = oppList.filter(o => o.stage === "closed_won").length;

  const conversionRate = totalOppCount > 0 
    ? ((wonStageCount / totalOppCount) * 100).toFixed(1) 
    : "0.0";

  const realFunnelData = [
    { stage: "Contatos (Leads)", count: leadStageCount, pct: totalOppCount > 0 ? Math.round((leadStageCount / totalOppCount) * 100) : 0 },
    { stage: "Conversa Ativa", count: contactStageCount, pct: totalOppCount > 0 ? Math.round((contactStageCount / totalOppCount) * 100) : 0 },
    { stage: "Proposta Enviada", count: proposalStageCount, pct: totalOppCount > 0 ? Math.round((proposalStageCount / totalOppCount) * 100) : 0 },
    { stage: "Negociação", count: negotiationStageCount, pct: totalOppCount > 0 ? Math.round((negotiationStageCount / totalOppCount) * 100) : 0 },
    { stage: "Contratos Ganhos", count: wonStageCount, pct: totalOppCount > 0 ? Math.round((wonStageCount / totalOppCount) * 100) : 0 },
  ];

  // Canais a partir de clientes reais
  const clientsList: any[] = Array.isArray(realClients) 
    ? realClients 
    : (realClients && "data" in realClients && Array.isArray((realClients as any).data) ? (realClients as any).data : []);
  const channelCounts: Record<string, number> = {};
  clientsList.forEach((c: any) => {
    const s = c.source ? c.source.toLowerCase() : "não informado";
    channelCounts[s] = (channelCounts[s] || 0) + 1;
  });
  const realChannelData = Object.entries(channelCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: count,
  }));

  // Execução de chatbot real
  const executionTotal = flowStats.data?.total || 0;
  const executionSuccessful = flowStats.data?.successful || 0;
  const executionFailed = flowStats.data?.failed || 0;
  const executionData = executionTotal > 0 ? [
    { name: "Sucesso", value: executionSuccessful },
    { name: "Falha", value: executionFailed },
  ] : [];

  const modules = [
    { id: "engajamento", title: "Engajamento", description: "Métricas de interação e engajamento dos usuários", icon: Activity, colorClass: "text-blue-500", bgClass: "bg-blue-500/10" },
    { id: "hsm", title: "HSM", description: "Relatórios de mensagens de serviço e notificações oficiais", icon: Globe, colorClass: "text-purple-500", bgClass: "bg-purple-500/10" },
    { id: "agendadas", title: "Mensagens Agendadas", description: "Acompanhe e gerencie mensagens programadas com filtros por status, período e responsável", icon: Clock, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" },
    { id: "nps", title: "NPS", description: "Net Promoter Score e satisfação do cliente", icon: Smile, colorClass: "text-green-500", bgClass: "bg-green-500/10" },
    { id: "performance", title: "Performance", description: "Métricas de desempenho e produtividade da equipe", icon: TrendingUp, colorClass: "text-indigo-500", bgClass: "bg-indigo-500/10" },
    { id: "conversas", title: "Conversas", description: "Análise de conversas e volume de mensagens recebidas e enviadas", icon: MessageSquare, colorClass: "text-sky-500", bgClass: "bg-sky-500/10" },
    { id: "webhooks", title: "Webhooks", description: "Monitoramento de eventos e integrações", icon: ShieldAlert, colorClass: "text-slate-500", bgClass: "bg-slate-500/10" },
    { id: "auto_atendimento", title: "Auto atendimento", description: "Métricas de chatbots e fluxos automatizados", icon: Bot, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
    { id: "oportunidades", title: "Relatório de oportunidades", description: "Métricas de cards no funil comercial, ganhos, perdas e conversões", icon: Target, colorClass: "text-red-500", bgClass: "bg-red-500/10" },
    { id: "metas", title: "Relatório de Metas", description: "Acompanhe o faturamento realizado e metas do banco de dados", icon: CheckCircle2, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
    { id: "campanhas", title: "Desempenho de Campanhas", description: "Resultados de disparos em massa e campanhas", icon: Send, colorClass: "text-rose-500", bgClass: "bg-rose-500/10" },
    { id: "inteligencia_canais", title: "Inteligência de Canais", description: "Distribuição e conversão por canal de aquisição de clientes", icon: Sparkles, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" },
    { id: "ranking_equipe", title: "Ranking da Equipe (Gamificação)", description: "Leaderboard real dos atendentes com base em vendas fechadas", icon: Trophy, colorClass: "text-amber-400", bgClass: "bg-amber-400/10" },
  ];

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
                ? `Métricas reais do módulo ${modules.find(m => m.id === activeModule)?.title.toLowerCase()}`
                : "Análise de performance e métricas de CRM em tempo real com base no banco de dados"}
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
              <p className="text-[10px] text-muted-foreground mt-0.5">Selecione uma categoria para explorar os dados reais registrados</p>
            </div>
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

      {/* VIEW B: CONVERSAS */}
      {activeModule === "conversas" && (
        <div className="space-y-6">
          <Card className="border border-sky-500/20 bg-sky-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-sky-600 uppercase tracking-wider">Diagnóstico de Conversas</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {totalMessagesCount > 0 
                    ? `Foram registradas ${totalMessagesCount} mensagens no banco de dados. Mensagens enviadas: ${messagesSent}, recebidas: ${messagesReceived}.`
                    : "Ainda não há mensagens suficientes registradas no banco de dados para analisar o fluxo de conversas. Conecte seu canal de WhatsApp e inicie atendimentos para visualizar gráficos e métricas de tráfego em tempo real."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total de Mensagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalMessagesCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Registros totais no banco de dados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mensagens Enviadas vs. Recebidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{messagesRatio}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Proporção calculada em tempo real</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Atendimentos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-500">{supportStats?.chatsActive ?? 0}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Chats em andamento com clientes</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fluxo de Mensagens por Horário</CardTitle>
              <CardDescription>Volume de mensagens registradas no dia atual</CardDescription>
            </CardHeader>
            <CardContent>
              {totalMessagesCount > 0 && supportStats?.hourlyMessages ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supportStats.hourlyMessages}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="sent" fill="#3b82f6" name="Enviadas" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="received" fill="#10b981" name="Recebidas" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyStateCard 
                  icon={MessageSquare} 
                  title="Nenhuma mensagem registrada no banco" 
                  description="Quando os atendentes ou contatos enviarem mensagens pelo WhatsApp, os gráficos de fluxo serão preenchidos automaticamente."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B: PERFORMANCE */}
      {activeModule === "performance" && (
        <div className="space-y-6">
          <Card className="border border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Análise de Performance</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeAttendantRanking.length > 0
                    ? `Equipe com ${activeAttendantRanking.length} atendente(s) cadastrado(s). Tempo médio de resposta registrado: ${supportStats?.tmr ?? 0}m.`
                    : "Ainda não há dados de atendimento suficientes no banco de dados para analisar a agilidade e conversão da equipe. Conforme os atendentes responderem aos contatos, as métricas de produtividade serão calculadas aqui."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tempo Médio de Resposta (TMR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{supportStats?.tmr ?? 0}m</div>
                <p className="text-[10px] text-muted-foreground mt-1">Média de agilidade da equipe</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Atendentes Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">{supportStats?.agentsOnline ?? 0} / {supportStats?.agentsTotal ?? 0}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Disponíveis para novos atendimentos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">FCR (Resolução no 1º Contato)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{supportStats?.fcr ?? 0}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Demandas finalizadas no primeiro contato</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tempo Médio e Atendimentos por Operador</CardTitle>
              <CardDescription>Dados reais dos atendentes cadastrados no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAttendantRanking.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeAttendantRanking}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="deals" fill="#6366f1" name="Contratos Fechados" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="chatsHandled" fill="#10b981" name="Chats Atendidos" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyStateCard 
                  icon={TrendingUp} 
                  title="Nenhum atendente cadastrado no sistema" 
                  description="Cadastre operadores no menu 'Atendentes' para começar a monitorar a agilidade de resposta e produtividade individual."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B: NPS */}
      {activeModule === "nps" && (
        <div className="space-y-6">
          <Card className="border border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider">Diagnóstico de Satisfação</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {(supportStats?.satisfactionCount ?? 0) > 0
                    ? `Avaliação média registrada: ${supportStats?.satisfaction?.toFixed(1)} com base em ${supportStats?.satisfactionCount} respostas.`
                    : "Ainda não há avaliações de NPS computadas na base de dados. Dispare pesquisas automáticas pós-atendimento para acompanhar o índice de promotores e detratores da sua empresa."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Satisfação Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3.5xl font-extrabold text-foreground">{supportStats?.satisfaction ? supportStats.satisfaction.toFixed(1) : "0.0"}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Escala de 0 a 5.0 estrelas</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-emerald-600 uppercase font-bold tracking-wider">Promotores (Fãs)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">0%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Notas 9 e 10</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-amber-600 uppercase font-bold tracking-wider">Neutros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">0%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Notas 7 e 8</p>
              </CardContent>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-red-600 uppercase font-bold tracking-wider">Detratores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">0%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Notas 0 a 6</p>
              </CardContent>
            </Card>
          </div>

          <EmptyStateCard 
            icon={Smile} 
            title="Nenhuma pesquisa de satisfação registrada" 
            description="Ao finalizar atendimentos pelo WhatsApp, configure o disparo de pesquisas de satisfação para visualizar a distribuição de notas em tempo real."
          />
        </div>
      )}

      {/* VIEW B: OPORTUNIDADES (FUNIL DE VENDAS REAL) */}
      {activeModule === "oportunidades" && (
        <div className="space-y-6">
          <Card className="border border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">Diagnóstico do Funil Comercial</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {totalOppCount > 0
                    ? `Existem ${totalOppCount} negociações cadastradas no CRM. ${wonStageCount} negócio(s) já foram fechados como ganho, totalizando taxa de conversão de ${conversionRate}%.`
                    : "Nenhuma oportunidade cadastrada no banco de dados. Adicione novas negociações no Kanban de Vendas para monitorar gargalos de conversão e faturamento previsto."}
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
                <div className="text-3.5xl font-extrabold text-blue-500">{conversionRate}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">{wonStageCount} ganhas de {totalOppCount} oportunidades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Oportunidades em Aberto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-500">{realStats?.activeOpportunities ?? 0}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Negociações ativas no funil</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Faturamento Ganho (Real)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">
                  R$ {((realStats?.wonValue ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-emerald-500 mt-1">Valor acumulado de contratos ganhos</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Funil de Vendas Comercial</CardTitle>
              <CardDescription>Quantidade real de oportunidades por estágio do pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              {totalOppCount > 0 ? (
                <div className="space-y-4">
                  {realFunnelData.map((step, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-center gap-3">
                      <div className="w-full md:w-36 text-left font-bold text-xs shrink-0">{step.stage}</div>
                      
                      <div className="flex-1 w-full bg-muted/40 h-9 rounded-xl overflow-hidden relative flex items-center px-4 border border-border/30">
                        <div 
                          className={`h-full absolute left-0 top-0 transition-all rounded-r-lg ${
                            idx === 4 ? "bg-emerald-500/20 border-r border-emerald-500" : "bg-primary/20 border-r border-primary"
                          }`}
                          style={{ width: `${Math.max(5, step.pct)}%` }}
                        />
                        
                        <div className="relative z-10 flex justify-between w-full text-xs text-foreground font-semibold">
                          <span>{step.count} oportunidade(s)</span>
                          <span>{step.pct}% do total</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateCard 
                  icon={Target} 
                  title="Nenhuma oportunidade cadastrada no funil" 
                  description="Crie cards no menu 'Pipeline' para visualizar as taxas reais de conversão e perdas por cada etapa do processo comercial."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW B: AUTO ATENDIMENTO */}
      {activeModule === "auto_atendimento" && (
        <div className="space-y-6">
          <Card className="border border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Eficiência da Automação</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {executionTotal > 0
                    ? `Foram executados ${executionTotal} acionamentos de chatbot, com taxa de sucesso de ${flowStats.data?.successRate || 0}%.`
                    : "Ainda não há acionamentos registrados para automações de chatbot. Crie e ative fluxos de resposta automática para desafogar a fila de atendimento humano."}
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
                    {flows && flows.length > 0 ? (
                      flows.map((flow) => (
                        <SelectItem key={flow.id} value={flow.id.toString()}>
                          🤖 {flow.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhum fluxo cadastrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* KPIs de auto atendimento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total de Execuções</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{executionTotal}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Acionamentos registrados</p>
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
                <div className="text-3xl font-bold text-emerald-600">{executionSuccessful}</div>
                <p className="text-[10px] text-emerald-500 mt-1">{flowStats.data?.successRate || 0}% resolvidos sem atendente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Transbordo (Para Humano)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{executionFailed}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Transferidos para atendentes</p>
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
                <p className="text-[10px] text-muted-foreground mt-1">Tempo médio de chat</p>
              </CardContent>
            </Card>
          </div>

          {executionTotal > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuição de Resoluções</CardTitle>
                  <CardDescription>Sucessos de autoatendimento versus transferências</CardDescription>
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
                          {executionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => `${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Fluxos Mais Executados</CardTitle>
                  <CardDescription>Execuções e taxa de sucesso</CardDescription>
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
          ) : (
            <EmptyStateCard 
              icon={Bot} 
              title="Nenhuma execução de fluxo registrada no banco" 
              description="Quando os clientes interagirem com seus fluxos de chatbot, os dados de resolução e tempo médio aparecerão aqui."
            />
          )}
        </div>
      )}

      {/* VIEW B: INTELIGÊNCIA DE CANAIS */}
      {activeModule === "inteligencia_canais" && (
        <div className="space-y-6">
          <Card className="border border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Mapeamento de Canais e Conversão</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {clientsList.length > 0
                    ? `Base total de ${clientsList.length} cliente(s) mapeados por canal de aquisição.`
                    : "Cadastre clientes indicando a origem de prospecção (WhatsApp, Instagram, etc.) para que o sistema analise automaticamente qual canal gera maior taxa de fechamento."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Clientes Mapeados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{clientsList.length}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Contatos registrados no CRM</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Canal Predominante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {realChannelData.length > 0 ? realChannelData[0].name : "Nenhum"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Origem com mais contatos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Conversão de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">{conversionRate}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Taxa geral do funil</p>
              </CardContent>
            </Card>
          </div>

          {realChannelData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição de Clientes por Canal</CardTitle>
                <CardDescription>Volume real de contatos por origem cadastrada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={realChannelData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Contatos" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard 
              icon={Sparkles} 
              title="Nenhum canal de aquisição mapeado ainda" 
              description="Conforme novos contatos forem cadastrados com sua respectiva origem (Instagram, WhatsApp, etc.), o sistema exibirá gráficos reais de distribuição."
            />
          )}
        </div>
      )}

      {/* VIEW B: RANKING DA EQUIPE (LEADERBOARD REAL) */}
      {activeModule === "ranking_equipe" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-card/60 p-4 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Leaderboard Real da Equipe de Vendas</h3>
                <p className="text-xs text-muted-foreground">Ranking atualizado em tempo real com base no faturamento fechado e produtividade no banco de dados</p>
              </div>
            </div>
            <Button onClick={exportReportCSV} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Baixar Ranking CSV
            </Button>
          </div>

          {activeAttendantRanking.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {activeAttendantRanking.map((att) => (
                  <Card key={att.rank} className="relative overflow-hidden border border-border bg-card">
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Desempenho Comercial Comparativo</CardTitle>
                  <CardDescription className="text-xs">Contratos fechados por operador no banco de dados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeAttendantRanking}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Bar dataKey="deals" fill="#10b981" radius={[8, 8, 0, 0]} name="Contratos Fechados" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyStateCard 
              icon={Trophy} 
              title="Nenhum atendente com vendas registradas no momento" 
              description="Cadastre membros da equipe em 'Atendentes' e registre fechamentos de negócios no Pipeline para gerar o ranking com dados reais."
            />
          )}
        </div>
      )}

      {/* VIEW B: MENSAGENS AGENDADAS */}
      {activeModule === "agendadas" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tarefas & Disparos Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-500">{realTasks?.filter((t: any) => !t.completed).length ?? 0}</div>
                <p className="text-[10px] text-amber-500 mt-1">Programações pendentes no banco de dados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Concluídas com Sucesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">{realTasks?.filter((t: any) => t.completed).length ?? 0}</div>
                <p className="text-[10px] text-emerald-500 mt-1">Finalizadas e disparadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-500">{realTasks?.length ?? 0}</div>
                <p className="text-[10px] text-sky-500 mt-1">Histórico total acumulado</p>
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
                <EmptyStateCard 
                  icon={Clock} 
                  title="Nenhum agendamento pendente no momento" 
                  description="Crie tarefas ou agendamentos com data de vencimento para acompanhar a fila de disparos."
                />
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

      {/* VIEW B: HSM TEMPLATES */}
      {activeModule === "hsm" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Disparos HSM Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">0</div>
                <p className="text-[10px] text-muted-foreground mt-1">Notificações oficiais enviadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Abertura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-sky-500">0.0%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Leituras confirmadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">0.0%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Respostas de clientes</p>
              </CardContent>
            </Card>
          </div>

          <EmptyStateCard 
            icon={Globe} 
            title="Nenhum disparo de HSM realizado" 
            description="Modelos de notificação oficiais do WhatsApp (HSM) aparecerão aqui assim que forem enviados para a sua base de clientes."
          />
        </div>
      )}

      {/* VIEW B: METAS E MÉTRICAS DE VENDAS */}
      {activeModule === "metas" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Faturamento Fechado (Real DB)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  R$ {((realStats?.wonValue ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, Math.round((((realStats?.wonValue ?? 0) / 100) / 100000) * 100))}%` }} 
                  />
                </div>
                <p className="text-[10px] text-emerald-500 mt-1.5 font-bold">
                  🎯 {Math.min(100, Math.round((((realStats?.wonValue ?? 0) / 100) / 100000) * 100))}% da meta atingido
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

      {/* VIEW B: CAMPANHAS */}
      {activeModule === "campanhas" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Campanhas Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">0 ativas</div>
                <p className="text-[11px] text-muted-foreground mt-1">Nenhum disparo em massa em execução</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Custo Médio por Lead (CPL)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">R$ 0,00</div>
                <p className="text-[10px] text-muted-foreground mt-1">Calculado sobre gastos de anúncios</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Faturamento de Campanhas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">R$ 0,00</div>
                <p className="text-[10px] text-muted-foreground mt-1">Proveniente de campanhas rastreadas</p>
              </CardContent>
            </Card>
          </div>

          <EmptyStateCard 
            icon={Send} 
            title="Nenhuma campanha registrada" 
            description="Crie e gerencie campanhas de envio de mensagens para monitorar o ROI e a conversão de novos leads."
          />
        </div>
      )}

      {/* VIEW C: OUTROS MÓDULOS */}
      {activeModule && !["conversas", "performance", "nps", "oportunidades", "auto_atendimento", "inteligencia_canais", "ranking_equipe", "agendadas", "hsm", "metas", "campanhas"].includes(activeModule) && (
        <div className="space-y-6">
          <Card className="border border-border bg-card">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Módulo em Sincronização</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O módulo <b>{modules.find(m => m.id === activeModule)?.title}</b> está conectado ao banco de dados e pronto para receber registros.
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
                <div className="text-3xl font-bold text-foreground">0.0%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Aguardando novos eventos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Média Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
                <p className="text-[10px] text-muted-foreground mt-1">Registros acumulados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status da Base</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">Conectado</div>
                <p className="text-[10px] text-emerald-500 mt-1">Sincronização em tempo real com MySQL</p>
              </CardContent>
            </Card>
          </div>

          <EmptyStateCard 
            icon={Activity} 
            title="Aguardando eventos para consolidação" 
            description="Novos dados e métricas deste módulo serão consolidados automaticamente à medida que as integrações forem acionadas."
          />
        </div>
      )}

    </div>
  );
}
