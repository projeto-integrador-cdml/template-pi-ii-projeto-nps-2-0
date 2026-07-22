import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  MessageCircle, Send, Search, Phone, Sparkles, CheckSquare, Target,
  CheckCheck, Sliders, Play, ArrowLeftRight, Paperclip, Loader2,
  Mic, Square, Zap, Clock, Pin, Image as ImageIcon, Calendar as CalendarIcon, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const QUICK_REPLIES = [
  { shortcut: "/boasvindas", label: "👋 Boas-vindas", text: "Olá! Seja bem-vindo(a) à nossa empresa. Como podemos te ajudar hoje?" },
  { shortcut: "/precos", label: "💰 Tabela de Preços", text: "Temos o Plano Basic por R$ 99/mês e o Plano Pro por R$ 249/mês. Qual atende melhor a sua empresa no momento?" },
  { shortcut: "/suporte", label: "🛠️ Atendimento Técnico", text: "Nossa equipe técnica já está analisando sua solicitação. Retornaremos com atualizações em instantes!" },
  { shortcut: "/pix", label: "💳 Dados para Pagamento (PIX)", text: "Nossa chave PIX CNPJ é: 12.345.678/0001-90 (CRM Web Tecnologia Ltda)." },
  { shortcut: "/agendar", label: "📅 Agendar Demonstração", text: "Podemos agendar uma demonstração rápida de 15 minutos amanhã para apresentar a plataforma?" },
];

export default function WhatsAppPage() {
  const utils = trpc.useUtils();
  
  // States
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState<"assigned" | "unassigned">("assigned");

  // Audio Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Quick Replies & Filters
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "neutral" | "angry">("all");
  const [pinnedChatIds, setPinnedChatIds] = useState<number[]>([]);

  // Schedule Message States
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleMsgText, setScheduleMsgText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const generateAIDraftMutation = trpc.whatsapp.generateAIDraft.useMutation();

  // Audio Recorder Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      toast.info("🎙️ Gravando áudio... Fale com clareza.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      clearInterval(recordingTimerRef.current);
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioBlob.size < 100) {
        toast.error("Áudio muito curto.");
        return;
      }

      // Converte blob para DataURL e simula envio de mídia de áudio
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        if (!activeChatId) return;

        try {
          await sendMessageMutation.mutateAsync({
            clientId: activeChatId,
            message: "[Áudio]",
            mediaUrl: base64Audio,
          });
          toast.success("🎵 Áudio gravado e enviado com sucesso!");
          refetchMessages();
          refetchChats();
        } catch (err: any) {
          toast.error("Erro ao enviar áudio gravado.");
        }
      };
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    toast.info("Gravação cancelada.");
  };

  // Clipboard Paste Image Handler
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file && activeChatId) {
          e.preventDefault();
          toast.info("🖼️ Imagem detectada na área de transferência! Enviando...");

          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = async () => {
            const base64Image = reader.result as string;
            try {
              await sendMessageMutation.mutateAsync({
                clientId: activeChatId,
                message: "[Imagem]",
                mediaUrl: base64Image,
              });
              toast.success("Imagem colada e enviada!");
              refetchMessages();
              refetchChats();
            } catch (err) {
              toast.error("Erro ao enviar imagem colada.");
            }
          };
          break;
        }
      }
    }
  };

  // Toggle Pin Chat
  const togglePinChat = (clientId: number) => {
    if (pinnedChatIds.includes(clientId)) {
      setPinnedChatIds(pinnedChatIds.filter(id => id !== clientId));
      toast.info("Conversa desfixada do topo.");
    } else {
      setPinnedChatIds([...pinnedChatIds, clientId]);
      toast.success("Conversa fixada no topo!");
    }
  };

  // Schedule Message Submit
  const handleScheduleMessage = async () => {
    if (!activeChatId || !scheduleMsgText.trim() || !scheduleDateTime) {
      toast.error("Preencha a data/hora e a mensagem para agendar.");
      return;
    }
    try {
      await createTaskMutation.mutateAsync({
        clientId: activeChatId,
        title: `📲 Dispatch Agendado: "${scheduleMsgText.slice(0, 30)}..."`,
        dueDate: new Date(scheduleDateTime),
        priority: "high",
        type: "follow_up",
      });
      toast.success(`Mensagem agendada para ${new Date(scheduleDateTime).toLocaleString("pt-BR")}!`);
      setIsScheduleOpen(false);
      setScheduleMsgText("");
      setScheduleDateTime("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar mensagem");
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!activeChatId) return;
    try {
      setIsDrafting(true);
      const res = await generateAIDraftMutation.mutateAsync({ clientId: activeChatId });
      setMessageText(res.reply);
      toast.success("Rascunho inteligente gerado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar rascunho inteligente");
    } finally {
      setIsDrafting(false);
    }
  };

  // Sandbox simulation states
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxPhone, setSandboxPhone] = useState("+5511999991111");
  const [sandboxName, setSandboxName] = useState("Cliente Teste");
  const [sandboxMsg, setSandboxMsg] = useState("Olá, gostaria de saber mais sobre o sistema!");

  // CRM panel states
  const [crmTab, setCrmTab] = useState<"info" | "opp" | "task">("info");
  const [oppTitle, setOppTitle] = useState("");
  const [oppValue, setOppValue] = useState(0);
  const [oppStage, setOppStage] = useState<"lead" | "contact" | "proposal" | "negotiation">("lead");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");

  // Reference to store previous chats state for notification comparison
  const prevChatsRef = useRef<any[]>([]);

  // Queries
  const { data: me } = trpc.auth.me.useQuery(undefined, { retry: false });
  const { data: chats, refetch: refetchChats } = trpc.whatsapp.listChats.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: messages, refetch: refetchMessages } = trpc.whatsapp.listMessages.useQuery(
    { clientId: activeChatId || 0 },
    { 
      enabled: !!activeChatId,
      refetchInterval: 5000,
    }
  );

  // Solicitar permissão de notificação no carregamento da página
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Função para reproduzir um tom harmônico calmo e marcante usando Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Tom 1 (Fá#5 - 739.99 Hz, som cristalino e brilhante)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(739.99, ctx.currentTime);
      
      // Tom 2 (Lá#5 - 932.33 Hz, formando uma terça maior harmônica e relaxante)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(932.33, ctx.currentTime);
      
      // Envelopes de volume exponenciais (ataque rápido de 0.04s, decaimento suave de 0.7s)
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      
      osc1.stop(ctx.currentTime + 0.75);
      osc2.stop(ctx.currentTime + 0.75);
    } catch (err) {
      console.error("Erro ao sintetizar áudio de notificação:", err);
    }
  };

  // Função para exibir a notificação desktop
  const showDesktopNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    }
  };

  // Monitoramento de novas mensagens (inbound) para disparar notificações
  useEffect(() => {
    if (!chats || chats.length === 0) return;

    if (prevChatsRef.current.length === 0) {
      prevChatsRef.current = chats;
      return;
    }

    let hasNewInbound = false;
    let clientName = "";
    let lastText = "";

    for (const chat of chats) {
      const prevChat = prevChatsRef.current.find(c => c.client.id === chat.client.id);
      
      const isNewChat = !prevChat;
      const isNewMessage = prevChat && prevChat.lastMessage.createdAt !== chat.lastMessage.createdAt;
      const isInbound = chat.lastMessage.direction === "inbound";

      if ((isNewChat || isNewMessage) && isInbound) {
        hasNewInbound = true;
        clientName = chat.client.name;
        lastText = chat.lastMessage.message || "Enviou uma mídia";
        break;
      }
    }

    if (hasNewInbound) {
      playNotificationSound();
      showDesktopNotification(`Nova mensagem de ${clientName}`, lastText);
    }

    prevChatsRef.current = chats;
  }, [chats]);
  const { data: attendants } = trpc.attendants.listAll.useQuery(undefined, {
    enabled: me?.role !== "attendant"
  });
  const { data: clientDetails } = trpc.clients.getById.useQuery(
    { id: activeChatId || 0 },
    { enabled: !!activeChatId }
  );
  const { data: interactions, refetch: refetchInteractions } = trpc.interactions.list.useQuery(
    { clientId: activeChatId || 0 },
    { enabled: !!activeChatId }
  );

  // Mutations
  const sendMessageMutation = trpc.whatsapp.sendMessage.useMutation();
  const transferChatMutation = trpc.whatsapp.transferChat.useMutation();
  const simulateIncomingMutation = trpc.whatsapp.simulateIncoming.useMutation();
  const updateStatusMutation = trpc.whatsapp.updateStatus.useMutation();
  const createOppMutation = trpc.opportunities.create.useMutation();
  const createTaskMutation = trpc.tasks.create.useMutation();

  const uploadMediaFileMutation = trpc.mediaFiles.create.useMutation();
  const uploadDocFileMutation = trpc.mediaDocuments.create.useMutation();
  const sendTemplateMutation = trpc.whatsapp.sendTemplate.useMutation();
  const { data: templates } = trpc.whatsapp.listTemplates.useQuery();

  const selectedTemplate = (templates || []).find((t: any) => t.name === selectedTemplateName);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to messages end
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle status toggle for attendants
  const handleStatusChange = async (status: "available" | "busy" | "offline") => {
    try {
      await updateStatusMutation.mutateAsync({ status });
      toast.success(`Status atualizado para ${status === "available" ? "Disponível" : status === "busy" ? "Ocupado" : "Offline"}`);
      utils.auth.me.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !messageText.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        clientId: activeChatId,
        message: messageText,
      });
      setMessageText("");
      refetchMessages();
      refetchChats();
      refetchInteractions();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const mimeType = file.type;
      
      let mediaType: "image" | "document" | "audio" = "document";
      if (mimeType.startsWith("image/")) {
        mediaType = "image";
      } else if (mimeType.startsWith("audio/")) {
        mediaType = "audio";
      }

      try {
        toast.info(`Enviando anexo "${file.name}"...`);
        let url = "";

        if (mediaType === "image") {
          const res = await uploadMediaFileMutation.mutateAsync({
            name: file.name,
            fileBase64: base64,
            fileType: "image",
            mimeType
          });
          url = res.url;
        } else {
          const res = await uploadDocFileMutation.mutateAsync({
            name: file.name,
            fileBase64: base64,
            mimeType
          });
          url = res.url;
        }

        if (url) {
          await sendMessageMutation.mutateAsync({
            clientId: activeChatId,
            message: file.name,
            mediaUrl: url,
            mediaType
          });
          toast.success("Mídia enviada com sucesso!");
          refetchMessages();
          refetchChats();
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao enviar mídia");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendTemplate = async () => {
    if (!activeChatId || !selectedTemplateName) return;
    
    const placeholderCount = (selectedTemplate?.bodyText.match(/\{\{\d+\}\}/g) || []).length;
    for (let i = 0; i < placeholderCount; i++) {
      if (!templateParams[i]?.trim()) {
        toast.error(`Por favor, preencha a variável {{${i + 1}}}`);
        return;
      }
    }

    try {
      await sendTemplateMutation.mutateAsync({
        clientId: activeChatId,
        templateName: selectedTemplateName,
        parameters: templateParams,
      });
      setIsTemplateDialogOpen(false);
      toast.success("Template enviado com sucesso!");
      refetchMessages();
      refetchChats();
      refetchInteractions();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar template");
    }
  };

  // Transfer chat
  const handleTransfer = async (targetId: number | null) => {
    if (!activeChatId) return;
    try {
      await transferChatMutation.mutateAsync({
        clientId: activeChatId,
        targetAttendantId: targetId,
      });
      toast.success("Atendimento atualizado com sucesso!");
      refetchChats();
      setActiveChatId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao transferir chat");
    }
  };

  // Simulate Inbound Message
  const handleSimulateSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await simulateIncomingMutation.mutateAsync({
        phone: sandboxPhone,
        name: sandboxName,
        message: sandboxMsg,
      });
      toast.success("Mensagem simulada enviada com sucesso!");
      refetchChats();
      if (res.assignedAttendantId) {
        toast.info(`Chat distribuído para atendente ID: ${res.assignedAttendantId}`);
      } else {
        toast.info("Nenhum atendente online. Chat aguarda atribuição.");
      }
      setSandboxMsg("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao simular mensagem");
    }
  };

  // Create Opportunity
  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !oppTitle.trim()) return;

    try {
      await createOppMutation.mutateAsync({
        clientId: activeChatId,
        title: oppTitle,
        value: oppValue * 100, // Convert R$ to cents
        stage: oppStage,
        priority: "medium",
      });
      toast.success("Oportunidade adicionada ao funil!");
      setOppTitle("");
      setOppValue(0);
      setCrmTab("info");
      refetchInteractions();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar oportunidade");
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !taskTitle.trim()) return;

    try {
      await createTaskMutation.mutateAsync({
        clientId: activeChatId,
        title: taskTitle,
        dueDate: taskDate ? new Date(taskDate) : undefined,
        priority: taskPriority,
        type: "follow_up",
      });
      toast.success("Tarefa criada com sucesso!");
      setTaskTitle("");
      setTaskDate("");
      setCrmTab("info");
      refetchInteractions();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar tarefa");
    }
  };

  // Filtered and Sorted chats based on tab, search, sentiment, and pin state
  const filteredChats = (chats || []).filter(chat => {
    const matchesSearch = chat.client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (chat.client.phone?.includes(searchQuery) ?? false);
    
    const isUnassigned = chat.client.assignedAttendantId === null;
    const matchesTab = activeTab === "assigned" ? !isUnassigned : isUnassigned;

    const chatSentiment = (chat.lastMessage as any)?.sentiment || "neutral";
    const matchesSentiment = sentimentFilter === "all" || 
      (sentimentFilter === "angry" && chatSentiment === "angry") ||
      (sentimentFilter === "positive" && chatSentiment === "positive") ||
      (sentimentFilter === "neutral" && (chatSentiment === "neutral" || !chatSentiment));

    return matchesSearch && matchesTab && matchesSentiment;
  }).sort((a, b) => {
    const aPinned = pinnedChatIds.includes(a.client.id);
    const bPinned = pinnedChatIds.includes(b.client.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
  });

  const activeChat = chats?.find(c => c.client.id === activeChatId);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden -m-4 md:-m-6 bg-background/50 backdrop-blur-md">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Painel de Multiatendimento</h1>
            <p className="text-[10px] text-muted-foreground">WhatsApp Business API Simulator</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Attendant Online Status Controller */}
          {me?.role === "attendant" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Seu Status:</span>
              <select
                value={(me as any).status || "available"}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="h-8 text-xs bg-muted border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="available">🟢 Disponível / Online</option>
                <option value="busy">🟡 Ocupado</option>
                <option value="offline">⚫ Offline</option>
              </select>
            </div>
          )}

          {/* Sandbox Toggle */}
          <Button 
            onClick={() => setShowSandbox(!showSandbox)} 
            size="sm" 
            variant={showSandbox ? "default" : "outline"}
            className="text-xs h-8 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sandbox Simulador
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        
        {/* PANEL 1: CHAT LIST */}
        <div className="w-[320px] border-r border-border bg-card/20 flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Sentiment Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Filtro:</span>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value as any)}
                className="flex-1 h-7 text-[11px] bg-muted/40 border border-border/20 rounded-md px-2 text-foreground font-medium focus:outline-none"
              >
                <option value="all">Todos os Sentimentos</option>
                <option value="angry">😡 Apenas Crítico / Reclamações</option>
                <option value="positive">😊 Apenas Positivo / Elogios</option>
                <option value="neutral">😐 Neutro / Dúvidas</option>
              </select>
            </div>

            {/* Tabs for Admins/Users to toggle waiting queue vs active chats */}
            {me?.role !== "attendant" && (
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted/30 border border-border/10 rounded-lg">
                <button
                  onClick={() => setActiveTab("assigned")}
                  className={`py-1 text-[11px] font-medium rounded-md transition-all ${
                    activeTab === "assigned"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Em Atendimento
                </button>
                <button
                  onClick={() => setActiveTab("unassigned")}
                  className={`py-1 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                    activeTab === "unassigned"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Fila de Espera
                  {(chats || []).filter(c => c.client.assignedAttendantId === null).length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/10">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-48">
                <Sliders className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">Nenhuma conversa encontrada</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {activeTab === "assigned" 
                    ? "As conversas ativas aparecerão aqui." 
                    : "A fila de espera está vazia."}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isActive = activeChatId === chat.client.id;
                const isPinned = pinnedChatIds.includes(chat.client.id);
                const sentiment = (chat.lastMessage as any)?.sentiment;

                return (
                  <div key={chat.client.id} className="relative group">
                    <button
                      onClick={() => {
                        setActiveChatId(chat.client.id);
                        setCrmTab("info");
                        utils.whatsapp.listMessages.invalidate();
                      }}
                      className={`w-full text-left p-3.5 flex flex-col gap-1.5 transition-colors focus:outline-none ${
                        isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/15"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[180px] flex items-center gap-1">
                          {isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500/20 shrink-0" />}
                          {chat.client.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px] leading-normal">
                          {chat.lastMessage.direction === "outbound" && "Você: "}{chat.lastMessage.message || "Mídia"}
                        </p>
                        {sentiment && (
                          <span className={`text-[8px] font-bold px-1 rounded ${
                            sentiment === "angry" ? "bg-red-500/10 text-red-500" :
                            sentiment === "positive" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                          }`}>
                            {sentiment === "angry" ? "😡" : sentiment === "positive" ? "😊" : "😐"}
                          </span>
                        )}
                      </div>
                      {chat.client.attendantName && (
                        <span className="text-[9px] text-primary/70 font-medium self-start flex items-center gap-1 mt-0.5">
                          👤 Atendente: {chat.client.attendantName}
                        </span>
                      )}
                    </button>
                    {/* Pin button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinChat(chat.client.id);
                      }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-amber-500"
                      title={isPinned ? "Desfixar" : "Fixar no topo"}
                    >
                      <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: CHAT WINDOW */}
        <div className="flex-1 bg-card/10 flex flex-col min-w-0">
          {activeChatId && activeChat ? (
            <>
              {/* CHAT HEADER */}
              <div className="px-6 py-3 border-b border-border bg-card/25 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-xs">
                    {activeChat.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold leading-none">{activeChat.client.name}</h2>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      {activeChat.client.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Transfer / Attendant selector */}
                  {me?.role !== "attendant" && (
                    <div className="flex items-center gap-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <select
                        value={activeChat.client.assignedAttendantId || ""}
                        onChange={(e) => handleTransfer(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="h-8 text-xs bg-muted border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-primary w-40"
                      >
                        <option value="">⚠️ Aguardando Atribuição</option>
                        {(attendants || []).map((att) => (
                          <option key={att.id} value={att.id}>
                            👤 {att.name} ({att.status === "available" ? "Online" : att.status === "busy" ? "Ocupado" : "Offline"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {me?.role === "attendant" && activeChat.client.assignedAttendantId !== me.id && (
                    <Button 
                      size="sm" 
                      onClick={() => handleTransfer(me.id)} 
                      className="h-8 text-[10px] font-semibold bg-primary hover:bg-primary/90"
                    >
                      Assumir Conversa
                    </Button>
                  )}
                </div>
              </div>

              {/* MESSAGES VIEW */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/5">
                {messages?.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed ${
                        isOutbound 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}>
                        {msg.mediaUrl && (
                          <div className="mb-2 max-w-sm rounded-lg overflow-hidden border bg-black/5">
                            {msg.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) || msg.message === "[Imagem]" ? (
                              <img src={msg.mediaUrl} alt="Mídia" className="w-full h-auto object-cover max-h-60" />
                            ) : msg.mediaUrl.match(/\.(ogg|mp3|wav|m4a|webm)$/i) || msg.message === "[Áudio]" ? (
                              <>
                                <audio src={msg.mediaUrl} controls className="w-full max-w-xs" />
                                {(msg as any).transcription && (
                                  <div className="p-2 border-t text-[10px] text-muted-foreground italic leading-normal bg-card/60">
                                    📝 Transcrição: "{(msg as any).transcription}"
                                  </div>
                                )}
                              </>
                            ) : (
                              <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-xs text-primary font-semibold underline bg-background/50">
                                📎 Download Documento
                              </a>
                            )}
                          </div>
                        )}
                        {msg.message && msg.message !== "[Imagem]" && msg.message !== "[Áudio]" && (
                          <p className="text-xs whitespace-pre-wrap">{msg.message}</p>
                        )}
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          {!isOutbound && (msg as any).sentiment && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold shrink-0 uppercase tracking-wider ${
                              (msg as any).sentiment === "angry"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : (msg as any).sentiment === "positive"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            }`}>
                              {(msg as any).sentiment === "angry" ? "😡 Crítico" : (msg as any).sentiment === "positive" ? "😊 Positivo" : "😐 Neutro"}
                            </span>
                          )}
                          <span className={`text-[8px] ${isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOutbound && (
                            <span className="shrink-0 flex">
                              {msg.status === "read" ? (
                                <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                              ) : msg.status === "delivered" ? (
                                <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/60" />
                              ) : msg.status === "sent" ? (
                                <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/30" />
                              ) : (
                                <span className="text-[8px] text-red-400 font-bold">⚠️ Falhou</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* MESSAGE INPUT FORM */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card/25 shrink-0 flex items-center gap-2 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
                />

                {/* Anexar Arquivo */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Respostas Rápidas / Atalhos */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                      showQuickReplies ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    title="Respostas Rápidas (/atalhos)"
                  >
                    <Zap className="h-4 w-4 fill-current" />
                  </Button>

                  {/* Popover de Respostas Rápidas */}
                  {showQuickReplies && (
                    <div className="absolute bottom-12 left-0 w-80 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-border/10 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Respostas Rápidas</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowQuickReplies(false)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {QUICK_REPLIES.map((qr) => (
                          <button
                            key={qr.shortcut}
                            type="button"
                            onClick={() => {
                              setMessageText(qr.text);
                              setShowQuickReplies(false);
                              toast.info(`Inserida resposta rápida: ${qr.label}`);
                            }}
                            className="w-full text-left p-2 hover:bg-muted/50 rounded-lg transition-colors group flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold group-hover:text-primary transition-colors">{qr.label}</span>
                              <span className="text-[9px] font-mono bg-muted border px-1 rounded text-muted-foreground">{qr.shortcut}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{qr.text}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modelos de Mensagem (Templates) */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedTemplateName(templates?.[0]?.name || "");
                    setTemplateParams([]);
                    setIsTemplateDialogOpen(true);
                  }}
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
                  title="Modelos de Mensagem (Meta Official)"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>

                {/* Copiloto IA */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleGenerateAIDraft}
                  disabled={isDrafting}
                  className="h-10 w-10 shrink-0 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl transition-all"
                  title="Copiloto IA - Rascunhar Resposta"
                >
                  {isDrafting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : (
                    <Sparkles className="h-4 w-4 fill-amber-500/15" />
                  )}
                </Button>

                {/* Agendar Mensagem Futura */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setScheduleMsgText(messageText);
                    setIsScheduleOpen(true);
                  }}
                  className="h-10 w-10 shrink-0 text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 rounded-xl transition-all"
                  title="Agendar envio de mensagem"
                >
                  <Clock className="h-4 w-4" />
                </Button>

                {/* GRAVADOR DE ÁUDIO (MediaRecorder API) OU CAMPO DE TEXTO */}
                {isRecording ? (
                  <div className="flex-1 h-10 bg-red-500/10 border border-red-500/30 rounded-xl px-3 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-mono font-bold text-red-500">
                        🎙️ Gravando {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={cancelRecording} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" onClick={stopAndSendRecording} className="h-7 text-xs bg-red-500 hover:bg-red-600 font-bold gap-1 text-white">
                        <Send className="h-3 w-3" /> Enviar Áudio
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Escreva uma mensagem ou cole uma imagem (Ctrl+V)..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onPaste={handlePaste}
                      className="flex-1 h-10 text-xs rounded-xl"
                    />

                    {/* Botão de Microfone / Gravador */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={startRecording}
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Gravar mensagem de áudio"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>

                    <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-primary hover:bg-primary/95">
                      <Send className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-16 w-16 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Central de Atendimento</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Selecione uma conversa ao lado para começar a enviar e receber mensagens em tempo real.
              </p>
            </div>
          )}
        </div>

        {/* PANEL 3: LEAD CRM CONTEXT */}
        {activeChatId && clientDetails && (
          <div className="w-[300px] border-l border-border bg-card/20 flex flex-col shrink-0">
            <div className="flex border-b border-border bg-muted/10">
              <button
                onClick={() => setCrmTab("info")}
                className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${
                  crmTab === "info" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Detalhes Lead
              </button>
              <button
                onClick={() => setCrmTab("opp")}
                className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${
                  crmTab === "opp" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                + Oportunidade
              </button>
              <button
                onClick={() => setCrmTab("task")}
                className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${
                  crmTab === "task" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                + Tarefa
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              
              {/* TAB: INFO */}
              {crmTab === "info" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Nome do Lead</Label>
                    <p className="text-xs font-bold">{clientDetails.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                    <p className="text-xs font-medium">{clientDetails.phone || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Origem de Atendimento</Label>
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      {clientDetails.source || "WhatsApp"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Notas CRM</Label>
                    <p className="text-[11px] text-muted-foreground italic bg-muted/20 border border-border/10 p-2.5 rounded-lg leading-relaxed">
                      {clientDetails.notes || "Sem notas adicionadas no momento."}
                    </p>
                  </div>

                  <div className="border-t border-border/10 pt-4 space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Histórico CRM</h4>
                    <div className="space-y-3">
                      {(interactions || []).slice(0, 5).map((act) => (
                        <div key={act.id} className="text-[11px] leading-relaxed border-l-2 border-primary/30 pl-3.5 py-0.5 space-y-1">
                          <p className="font-semibold text-foreground">{act.subject}</p>
                          {act.content && <p className="text-muted-foreground">{act.content}</p>}
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(act.createdAt).toLocaleDateString("pt-BR")} · {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                      {(interactions || []).length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">Nenhuma nota ou atividade registrada.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ADD OPPORTUNITY */}
              {crmTab === "opp" && (
                <form onSubmit={handleCreateOpp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título da Oportunidade</Label>
                    <Input
                      placeholder="Ex: Assinatura Anual Pro"
                      value={oppTitle}
                      onChange={(e) => setOppTitle(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      placeholder="197"
                      value={oppValue}
                      onChange={(e) => setOppValue(parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estágio Inicial</Label>
                    <select
                      value={oppStage}
                      onChange={(e) => setOppStage(e.target.value as any)}
                      className="w-full h-9 text-xs bg-muted border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="lead">Contato inicial (Lead)</option>
                      <option value="contact">Em conversa (Contato)</option>
                      <option value="proposal">Proposta enviada</option>
                      <option value="negotiation">Negociação ativa</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={createOppMutation.isPending} className="w-full h-9 text-xs gap-1.5">
                    <Target className="h-4 w-4" />
                    Lançar Oportunidade
                  </Button>
                </form>
              )}

              {/* TAB: ADD TASK */}
              {crmTab === "task" && (
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título da Tarefa</Label>
                    <Input
                      placeholder="Ex: Ligar para tirar dúvidas"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prioridade</Label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="w-full h-9 text-xs bg-muted border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={createTaskMutation.isPending} className="w-full h-9 text-xs gap-1.5">
                    <CheckSquare className="h-4 w-4" />
                    Agendar Tarefa
                  </Button>
                </form>
              )}

            </div>
          </div>
        )}
      </div>

      {/* FLOATING SANDBOX SIMULATOR WIDGET */}
      {showSandbox && (
        <Card className="absolute bottom-6 right-6 w-80 glass-card shadow-2xl border border-primary/20 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="p-3 border-b border-border/10 flex flex-row items-center justify-between bg-primary/5 shrink-0">
            <div>
              <CardTitle className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                WhatsApp Sandbox Simulator
              </CardTitle>
            </div>
            <button 
              onClick={() => setShowSandbox(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
            >
              Fechar
            </button>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            <div className="p-2 bg-muted/30 border border-border/10 rounded-md text-[10px] leading-relaxed text-muted-foreground">
              Simule a chegada de uma nova mensagem enviada por um lead de fora para validar o algoritmo de distribuição automática (least-busy).
            </div>
            <form onSubmit={handleSimulateSandbox} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Número de WhatsApp</Label>
                <Input
                  value={sandboxPhone}
                  onChange={(e) => setSandboxPhone(e.target.value)}
                  placeholder="+5511999991111"
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Nome do Lead</Label>
                <Input
                  value={sandboxName}
                  onChange={(e) => setSandboxName(e.target.value)}
                  placeholder="Carlos Souza"
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Texto da Mensagem</Label>
                <textarea
                  value={sandboxMsg}
                  onChange={(e) => setSandboxMsg(e.target.value)}
                  placeholder="Oi, estou interessado!"
                  rows={2}
                  className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <Button type="submit" disabled={simulateIncomingMutation.isPending} className="w-full h-8 text-xs gap-1">
                <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                Simular Recebimento
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DIÁLOGO DE MODELOS DE MENSAGEM (TEMPLATES) */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-md bg-card border border-border rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              Enviar Modelo Homologado (Template)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Selecione o Modelo</Label>
              <select
                value={selectedTemplateName}
                onChange={(e) => {
                  setSelectedTemplateName(e.target.value);
                  setTemplateParams([]);
                }}
                className="w-full h-10 text-xs bg-muted border border-border rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>Selecione um modelo...</option>
                {(templates || []).map((t: any) => (
                  <option key={t.name} value={t.name}>
                    📋 {t.name} ({t.language})
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 border rounded-xl text-xs space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Texto Original:</span>
                  <p className="italic text-foreground">{selectedTemplate.bodyText}</p>
                </div>

                {Array.from({ length: (selectedTemplate.bodyText.match(/\{\{\d+\}\}/g) || []).length }).map((_, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <Label className="text-xs font-semibold">Variável {`{{${idx + 1}}}`}</Label>
                    <Input
                      placeholder={`Ex: Valor para a variável {{${idx + 1}}}`}
                      value={templateParams[idx] || ""}
                      onChange={(e) => {
                        const newParams = [...templateParams];
                        newParams[idx] = e.target.value;
                        setTemplateParams(newParams);
                      }}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTemplateDialogOpen(false)}
              className="text-xs h-9 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendTemplate}
              disabled={!selectedTemplateName || sendTemplateMutation.isPending}
              className="text-xs h-9 rounded-xl bg-primary hover:bg-primary/95"
            >
              {sendTemplateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Enviar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE AGENDAMENTO DE MENSAGENS */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md bg-card border border-border rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-sky-500">
              <Clock className="h-4 w-4" />
              Agendar Envio de Mensagem WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data e Hora do Disparo</Label>
              <Input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Conteúdo da Mensagem</Label>
              <textarea
                placeholder="Escreva o texto a ser disparado no horário programado..."
                value={scheduleMsgText}
                onChange={(e) => setScheduleMsgText(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsScheduleOpen(false)} className="text-xs h-9 rounded-xl">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleScheduleMessage} className="text-xs h-9 rounded-xl bg-sky-500 hover:bg-sky-600 font-bold text-white">
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
