import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: flows } = trpc.flows.list.useQuery();
  
  const flowStats = trpc.reports.flowExecutionStats.useQuery(
    selectedFlowId ? { 
      flowId: selectedFlowId, 
      startDate: startDate ? new Date(startDate) : undefined, 
      endDate: endDate ? new Date(endDate) : undefined 
    } : { flowId: 0 },
    { enabled: !!selectedFlowId }
  );

  const responseCount = trpc.reports.flowResponseCount.useQuery(
    selectedFlowId ? { 
      flowId: selectedFlowId, 
      startDate: startDate ? new Date(startDate) : undefined, 
      endDate: endDate ? new Date(endDate) : undefined 
    } : { flowId: 0 },
    { enabled: !!selectedFlowId }
  );

  const avgResponseTime = trpc.reports.averageResponseTime.useQuery(
    selectedFlowId ? { 
      flowId: selectedFlowId, 
      startDate: startDate ? new Date(startDate) : undefined, 
      endDate: endDate ? new Date(endDate) : undefined 
    } : { flowId: 0 },
    { enabled: !!selectedFlowId }
  );

  const { data: topFlows } = trpc.reports.topFlows.useQuery({ userId: user?.id || 1, limit: 5 } as any);

  const executionData = flowStats.data ? [
    { name: "Executadas", value: flowStats.data.total },
    { name: "Sucesso", value: flowStats.data.successful },
    { name: "Falha", value: flowStats.data.failed },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Fluxos</h1>
          <p className="text-muted-foreground mt-1">Acompanhe as métricas de execução e taxa de resposta dos seus fluxos</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Fluxo</Label>
              <Select value={selectedFlowId?.toString() || ""} onValueChange={(v) => setSelectedFlowId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fluxo" />
                </SelectTrigger>
                <SelectContent>
                  {flows?.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id.toString()}>
                      {flow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Inicial</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Data Final</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  flowStats.refetch();
                  responseCount.refetch();
                  avgResponseTime.refetch();
                }}
                className="w-full"
              >
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFlowId && (
        <>
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Execuções</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{flowStats.data?.total || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Período selecionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Execuções com Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{flowStats.data?.successful || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{flowStats.data?.successRate || 0}% de taxa de sucesso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Respostas Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{responseCount.data || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Clientes que responderam</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Tempo Médio de Resposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{avgResponseTime.data || 0}s</div>
                <p className="text-xs text-muted-foreground mt-1">Em segundos</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza - Distribuição de Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Status</CardTitle>
                <CardDescription>Execuções por status</CardDescription>
              </CardHeader>
              <CardContent>
                {executionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={executionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {executionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras - Taxa de Sucesso */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso</CardTitle>
                <CardDescription>Percentual de execuções bem-sucedidas</CardDescription>
              </CardHeader>
              <CardContent>
                {flowStats.data && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: "Taxa de Sucesso", value: flowStats.data.successRate }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Top Fluxos */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxos Mais Executados</CardTitle>
          <CardDescription>Top 5 fluxos por número de execuções</CardDescription>
        </CardHeader>
        <CardContent>
          {topFlows && topFlows.length > 0 ? (
            <div className="space-y-4">
              {topFlows.map((flow, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                    <div>
                      <p className="font-medium">{flow.flowName}</p>
                      <p className="text-sm text-muted-foreground">{flow.totalExecutions} execuções</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{flow.successfulExecutions || 0}</p>
                    <p className="text-xs text-muted-foreground">com sucesso</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum fluxo executado ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
