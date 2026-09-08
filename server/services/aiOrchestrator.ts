import * as db from "../db";
import { consultarRegras, loadRules } from "./rulesEngine";
import { processarCarteirinha } from "./visionPipeline";
import { logAIOperation } from "./aiLogger";

export interface OrchestratorInput {
  companyId: number;
  clientPhone: string;
  clientName: string;
  userMessage: string;
  mediaUrl?: string | null;
}

export interface OrchestratorOutput {
  replyText: string;
  handoffTriggered: boolean;
  handoffReason?: string | null;
  assignedAttendantId?: number | null;
  assignedAttendantName?: string | null;
}

const HUMAN_REQUEST_KEYWORDS = [
  "falar com atendente",
  "atendente humano",
  "pessoa real",
  "atendente",
  "falar com humano",
  "atendimento humano",
  "humano por favor",
  "passa para alguém",
  "transferir",
  "reclamação",
  "não entendi",
  "quero falar com alguém",
];

async function alocarAtendenteHumano(companyId: number, clientId: number): Promise<{ id: number; name: string } | null> {
  try {
    const companyAttendants = await db.listAttendantsByCompany(companyId);
    const availableAttendants = companyAttendants.filter(a => a.isActive && a.status === "available");

    if (availableAttendants.length === 0) {
      return null;
    }

    let bestAttendant = availableAttendants[0];
    const ruleSetting = await db.getSetting(companyId, "lead_distribution_rule");
    const rule = ruleSetting?.settingValue || "least_busy";

    if (rule === "round_robin") {
      const sortedAttendants = [...availableAttendants].sort((a, b) => a.id - b.id);
      const lastAssignedSetting = await db.getSetting(companyId, "last_assigned_attendant_id");
      const lastId = lastAssignedSetting ? parseInt(lastAssignedSetting.settingValue || "0", 10) : 0;
      let nextIndex = sortedAttendants.findIndex(a => a.id > lastId);
      if (nextIndex === -1) nextIndex = 0;
      bestAttendant = sortedAttendants[nextIndex] || availableAttendants[0];
      await db.upsertSetting(companyId, "last_assigned_attendant_id", bestAttendant.id.toString());
    } else {
      let minCount = Infinity;
      for (const att of availableAttendants) {
        const count = await db.countAssignedClients(att.id);
        if (count < minCount) {
          minCount = count;
          bestAttendant = att;
        }
      }
    }

    if (bestAttendant) {
      await db.updateClientAttendant(clientId, bestAttendant.id);
      return { id: bestAttendant.id, name: bestAttendant.name };
    }
  } catch (err: any) {
    console.error("[Orchestrator] Erro ao alocar atendente:", err.message);
  }
  return null;
}

export async function processIncomingMessage(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const { companyId, clientPhone, clientName, userMessage, mediaUrl } = input;

  // Carrega regras específicas desta empresa
  const companyRules = loadRules(companyId);
  const isClinic = !!companyRules.isClinic;

  // 1. Busca cliente no CRM
  const allClients = await db.listAllClients();
  let client = allClients.find(c => c.userId === companyId && c.phone === clientPhone);
  if (!client) {
    const newClient = await db.createClient({
      userId: companyId,
      name: clientName,
      phone: clientPhone,
      status: "prospect",
    } as any);
    client = await db.getClientById(newClient.id, companyId);
  }
  const clientId = client?.id || 0;

  // 2. Verifica se IA está ativa para essa empresa
  const aiEnabledSetting = await db.getSetting(companyId, "ai_enabled");
  const isAiEnabled = aiEnabledSetting ? aiEnabledSetting.settingValue === "true" : true;

  const apiKeySetting = await db.getSetting(companyId, "gemini_api_key");
  const apiKey = apiKeySetting?.settingValue || process.env.GEMINI_API_KEY || "";

  const modelSetting = await db.getSetting(companyId, "gemini_model");
  const model = modelSetting?.settingValue || "gemini-2.5-flash";

  // 3. Checagem prévia de solicitação de atendente humano pelo usuário
  const cleanMsg = (userMessage || "").toLowerCase();
  const wantsHuman = HUMAN_REQUEST_KEYWORDS.some(keyword => cleanMsg.includes(keyword));

  if (wantsHuman) {
    const attendant = await alocarAtendenteHumano(companyId, clientId);
    const replyText = attendant 
      ? `Compreendido! Estou transferindo seu atendimento agora para ${attendant.name}, que continuará sua conversa em instantes.`
      : "Compreendido! Já coloquei sua conversa na fila da nossa equipe de recepção. Um atendente irá falar com você em instantes!";

    logAIOperation({
      companyId,
      sessionId: clientPhone,
      clientPhone,
      rawPrompt: userMessage,
      aiResponse: replyText,
      tokens: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
      toolsTriggered: [],
      handoffTriggered: true,
      handoffReason: "user_requested_human",
      assignedAttendantId: attendant?.id || null,
      assignedAttendantName: attendant?.name || null,
    });

    return {
      replyText,
      handoffTriggered: true,
      handoffReason: "user_requested_human",
      assignedAttendantId: attendant?.id || null,
      assignedAttendantName: attendant?.name || null,
    };
  }

  // Se a IA não estiver configurada ou ativa, faz transbordo suave para atendente
  if (!isAiEnabled || !apiKey) {
    const attendant = await alocarAtendenteHumano(companyId, clientId);
    const replyText = "Olá! Recebemos sua mensagem. Um de nossos atendentes entrará em contato em instantes para lhe atender.";
    return {
      replyText,
      handoffTriggered: true,
      handoffReason: "ai_disabled_or_no_api_key",
      assignedAttendantId: attendant?.id || null,
      assignedAttendantName: attendant?.name || null,
    };
  }

  // 4. Se houver mídia de imagem (Carteirinha de convênio ou documento), processa com visão e filtro de negativos
  if (mediaUrl && (mediaUrl.match(/\.(jpg|jpeg|png|webp)/i) || userMessage.toLowerCase().includes("[imagem]"))) {
    try {
      const cardResult = await processarCarteirinha({
        apiKey,
        model,
        imageUrl: mediaUrl,
      });

      if (!cardResult.valido) {
        const replyText = cardResult.motivoBloqueio || "Não foi possível validar sua carteirinha. Por favor, verifique com sua operadora.";
        logAIOperation({
          companyId,
          sessionId: clientPhone,
          clientPhone,
          rawPrompt: `[Mídia Imagem] ${mediaUrl} - Mensagem: ${userMessage}`,
          aiResponse: replyText,
          tokens: { promptTokens: 350, candidateTokens: 60, totalTokens: 410 },
          toolsTriggered: ["processar_carteirinha_negativo"],
          handoffTriggered: false,
        });
        return {
          replyText,
          handoffTriggered: false,
        };
      }

      // Carteirinha / Documento válido
      const dados = cardResult.dadosExtraidos;
      const replyText = isClinic
        ? `Carteirinha recebida e validada com sucesso!
Beneficiário: ${dados.nome_paciente || clientName}
Convênio: ${dados.operadora || "Identificado"}
Plano/Categoria: ${dados.categoria || dados.plano || "Padrão"}
Número: ${dados.numero_carteirinha || "OK"}

Para qual procedimento e em qual unidade (Asa Norte, Asa Sul, Noroeste ou Lago Sul) você gostaria de agendar?`
        : `Documento recebido e validado com sucesso!
Beneficiário/Titular: ${dados.nome_paciente || clientName}
Identificação: ${dados.operadora || "Identificado"}
Como podemos te auxiliar hoje?`;

      logAIOperation({
        companyId,
        sessionId: clientPhone,
        clientPhone,
        rawPrompt: `[Carteirinha Válida] ${mediaUrl}`,
        aiResponse: replyText,
        tokens: { promptTokens: 350, candidateTokens: 100, totalTokens: 450 },
        toolsTriggered: ["processar_carteirinha_sucesso"],
        handoffTriggered: false,
      });

      return {
        replyText,
        handoffTriggered: false,
      };
    } catch (err: any) {
      console.warn("[Orchestrator] Falha no OCR da carteirinha, acionando fail-safe humano:", err.message);
      const attendant = await alocarAtendenteHumano(companyId, clientId);
      const replyText = "Recebi sua imagem, mas não consegui ler os dados com nitidez. Já transferi sua conversa para nossa recepção humana verificar.";
      
      logAIOperation({
        companyId,
        sessionId: clientPhone,
        clientPhone,
        rawPrompt: userMessage,
        aiResponse: replyText,
        tokens: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
        toolsTriggered: ["processar_carteirinha_falha"],
        handoffTriggered: true,
        handoffReason: `ocr_error: ${err.message}`,
        assignedAttendantId: attendant?.id || null,
        assignedAttendantName: attendant?.name || null,
      });

      return {
        replyText,
        handoffTriggered: true,
        handoffReason: "ocr_error",
        assignedAttendantId: attendant?.id || null,
        assignedAttendantName: attendant?.name || null,
      };
    }
  }

  // 5. Loop Agentic com Function Calling e Fail-Safe Automático (Try / Catch)
  try {
    // Declaração das Ferramentas
    const tools = [
      {
        function_declarations: [
          {
            name: "consultar_regras",
            description: isClinic
              ? "Consulta a cobertura, autorização, restrições e regras de convênios médicos e unidades de atendimento da clínica Espaço Physio."
              : "Consulta regras comerciais, políticas de atendimento e parcerias cadastradas para a empresa.",
            parameters: {
              type: "OBJECT",
              properties: {
                convenioNome: {
                  type: "STRING",
                  description: isClinic
                    ? "Nome do convênio médico (ex: Bradesco, CASSI, CBM, Unimed, TotalPass, etc.)"
                    : "Nome do parceiro, plano ou regra a consultar",
                },
                procedimento: {
                  type: "STRING",
                  description: "Nome do procedimento ou serviço solicitado",
                },
                unidade: {
                  type: "STRING",
                  description: isClinic
                    ? "Unidade desejada (Asa Norte, Asa Sul, Noroeste, Lago Sul)"
                    : "Unidade ou filial da empresa",
                },
              },
              required: ["convenioNome"],
            },
          },
          {
            name: "buscar_cadastro",
            description: "Consulta se o cliente já tem cadastro ativo e dados básicos no CRM.",
            parameters: {
              type: "OBJECT",
              properties: {
                telefone: {
                  type: "STRING",
                  description: "Telefone do cliente",
                },
              },
              required: ["telefone"],
            },
          },
        ],
      },
    ];

    const clinicSystemPrompt = `Você é a assistente virtual oficial da clínica de fisioterapia e reabilitação integrada (Espaço Physio).
Regras fundamentais e inegociáveis:
1. LGPD: Você é regida estritamente pelas leis de proteção de dados. Nunca exponha dados de outros pacientes e não peça senhas.
2. CONVÊNIOS E REGRAS: Sempre que o cliente citar um convênio, plano de saúde, procedimento ou unidade, você DEVE chamar a ferramenta 'consultar_regras' para obter as regras oficiais antes de confirmar qualquer informação.
3. Se a ferramenta 'consultar_regras' retornar que o convênio tem 'transferirHumano: true' (ex: TotalPass, Wellhub/Gympass, ClassPass), informe educadamente que você está transferindo para um atendente da recepção.
4. CBM e FUSEX: Se o convênio for CBM ou FUSEX, lembre-se de que não possuem carteirinha física. O CBM exige apenas documento oficial com foto e o FUSEX exige a guia autorizada.
5. UNIMED: Nós só atendemos Unimed Nacional (SAW). Não atendemos Seguros Unimed.
6. CASSI / MEDSÊNIOR: A categoria 'Essencial' NÃO é atendida.
7. Seja empática, clara, acolhedora e prestativa. Sempre pergunte para qual unidade (Asa Norte, Asa Sul, Noroeste ou Lago Sul) o paciente prefere agendar.`;

    const genericSystemPrompt = `Você é o assistente virtual de atendimento e vendas integrado ao CRM da empresa.
Regras fundamentais:
1. LGPD: Você é regido estritamente pelas leis de proteção de dados. Nunca exponha dados de outros clientes e não solicite senhas ou dados sigilosos.
2. ATENDIMENTO E VENDAS: Seja educado, acolhedor, rápido e objetivo. Esclareça dúvidas sobre os serviços, produtos e agendamentos.
3. REGRAS DA EMPRESA: Se o cliente perguntar sobre regras específicas, consulte a ferramenta 'consultar_regras'.
4. SOLICITAÇÃO HUMANA: Se o cliente solicitar falar com um atendente humano ou se houver dúvida complexa, informe educadamente que você está repassando o atendimento para a equipe humana.
5. Sempre responda em português brasileiro com excelência no atendimento.`;

    const systemInstruction = {
      role: "system",
      parts: [
        {
          text: isClinic ? clinicSystemPrompt : genericSystemPrompt,
        },
      ],
    };

    // Histórico de mensagens recente do cliente no CRM
    const messagesHistory = await db.listWhatsappMessages(companyId, clientId);
    const recentHistory = messagesHistory.slice(-8).map(m => ({
      role: m.direction === "inbound" ? "user" : "model",
      parts: [{ text: m.message || "[Mídia]" }],
    }));

    // Mensagem atual
    const contents = [
      ...recentHistory,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    // Chamada à API Gemini com Timeout de 15 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents,
        tools,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const resData = await response.json();
    const candidate = resData.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let toolsTriggered: string[] = [];
    let finalReply = "";

    // Verifica se houve Function Call
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart) {
      const call = functionCallPart.functionCall;
      toolsTriggered.push(call.name);

      let toolResultData: any = {};

      if (call.name === "consultar_regras") {
        toolResultData = consultarRegras({
          convenioNome: call.args?.convenioNome,
          procedimento: call.args?.procedimento,
          unidade: call.args?.unidade,
          companyId,
        });

        // Gatilho de Handoff Imediato
        if (toolResultData.transferirHumano) {
          const attendant = await alocarAtendenteHumano(companyId, clientId);
          const handoffText = `Identifiquei que seu plano (${toolResultData.convenioNome || "parceiro"}) possui atendimento e agendamento exclusivos pela nossa recepção humana. Já transferi sua conversa para um de nossos atendentes que irá lhe atender em instantes!`;
          
          logAIOperation({
            companyId,
            sessionId: clientPhone,
            clientPhone,
            rawPrompt: userMessage,
            aiResponse: handoffText,
            tokens: { promptTokens: 400, candidateTokens: 50, totalTokens: 450 },
            toolsTriggered: ["consultar_regras_handoff"],
            handoffTriggered: true,
            handoffReason: toolResultData.motivoTransferencia || "convenio_transferencia_obrigatoria",
            assignedAttendantId: attendant?.id || null,
            assignedAttendantName: attendant?.name || null,
          });

          return {
            replyText: handoffText,
            handoffTriggered: true,
            handoffReason: toolResultData.motivoTransferencia,
            assignedAttendantId: attendant?.id || null,
            assignedAttendantName: attendant?.name || null,
          };
        }
      } else if (call.name === "buscar_cadastro") {
        toolResultData = {
          cadastrado: !!client,
          nome: client?.name || clientName,
          status: client?.status || "prospect",
        };
      }

      // Segunda chamada com o resultado da Tool
      const followUpContents = [
        ...contents,
        { role: "model", parts: [{ functionCall: call }] },
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: toolResultData,
              },
            },
          ],
        },
      ];

      const followUpResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: followUpContents,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        finalReply = followUpData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } else {
      finalReply = parts[0]?.text || "";
    }

    if (!finalReply.trim()) {
      throw new Error("Resposta da IA vazia ou incompreensível.");
    }

    // Grava log de auditoria append-only em data/ai_audit_logs.json
    logAIOperation({
      companyId,
      sessionId: clientPhone,
      clientPhone,
      rawPrompt: userMessage,
      aiResponse: finalReply,
      tokens: {
        promptTokens: resData.usageMetadata?.promptTokenCount || 250,
        candidateTokens: resData.usageMetadata?.candidatesTokenCount || 80,
        totalTokens: resData.usageMetadata?.totalTokenCount || 330,
      },
      toolsTriggered,
      handoffTriggered: false,
    });

    return {
      replyText: finalReply,
      handoffTriggered: false,
    };
  } catch (err: any) {
    // FAIL-SAFE AUTOMÁTICO: Caso ocorra QUALQUER problema, transfere imediatamente para atendente humano do CRM
    console.error("[Orchestrator Fail-Safe] Erro detectado no atendimento automático, repassando para humano:", err.message);

    const attendant = await alocarAtendenteHumano(companyId, clientId);
    const fallbackText = attendant
      ? `Notei que você precisa de um atendimento mais detalhado. Já transferi sua conversa para ${attendant.name}, que irá continuar seu atendimento em instantes!`
      : "Notei que você precisa de um atendimento mais detalhado. Já transferi sua conversa para a nossa equipe de recepção. Um atendente humano irá lhe responder em instantes!";

    logAIOperation({
      companyId,
      sessionId: clientPhone,
      clientPhone,
      rawPrompt: userMessage,
      aiResponse: fallbackText,
      tokens: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
      toolsTriggered: ["fail_safe_trigger"],
      handoffTriggered: true,
      handoffReason: `automatic_fail_safe: ${err.message}`,
      assignedAttendantId: attendant?.id || null,
      assignedAttendantName: attendant?.name || null,
    });

    return {
      replyText: fallbackText,
      handoffTriggered: true,
      handoffReason: `fail_safe_${err.message}`,
      assignedAttendantId: attendant?.id || null,
      assignedAttendantName: attendant?.name || null,
    };
  }
}
