import React, { useState, useMemo, ReactNode } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Rocket, MessageSquare, Bot, Send, Code, BarChart3,
  Search, ArrowLeft, ArrowRight, Sparkles, ChevronRight,
  ThumbsUp, ThumbsDown, BookOpen, Smartphone, ShieldCheck,
  CheckCircle2, Mail, Phone, Clock, ArrowUpRight
} from "lucide-react";

// Mock data of articles for Project ES
interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: ReactNode;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
  glowColor: string;
  articles: Article[];
}

export default function HelpCenterPage() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });
  
  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  // Selected category and article for reading view
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  // Feedback states
  const [articleFeedback, setArticleFeedback] = useState<Record<string, "yes" | "no" | null>>({});
  // Mobile sidebar open
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // List of all categories & articles
  const categories: Category[] = useMemo(() => [
    {
      id: "primeiros-passos",
      name: "Primeiros Passos",
      description: "Tudo o que você precisa saber para começar a usar o Project ES rapidamente.",
      icon: Rocket,
      iconColor: "text-purple-400",
      glowColor: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] group-hover:border-purple-500/30",
      articles: [
        {
          id: "criar-conta",
          title: "Como criar sua conta e fazer o primeiro acesso",
          excerpt: "Passo a passo para se registrar na plataforma e realizar o login inicial.",
          content: (
            <div className="space-y-4">
              <p>Bem-vindo ao <strong>Project ES</strong>! Criar sua conta é simples e leva menos de 2 minutos. Siga o passo a passo abaixo:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Acesse a página de login clicando em <strong>Entrar</strong> ou vá diretamente para <code className="bg-white/5 px-1.5 py-0.5 rounded text-cyan-300">/auth</code>.</li>
                <li>Selecione a aba <strong>Registrar</strong> no formulário.</li>
                <li>Preencha seu Nome, E-mail profissional e crie uma senha segura.</li>
                <li>Caso tenha escolhido um plano, você pode inserir seus dados de faturamento. Caso contrário, sua conta iniciará em modo de demonstração.</li>
                <li>Clique em <strong>Criar Conta</strong>. Você será redirecionado imediatamente ao painel principal do Dashboard.</li>
              </ol>
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 my-4 text-xs">
                <span className="font-bold text-purple-300 block mb-1">💡 DICA:</span>
                Recomendamos preencher o seu número de WhatsApp no perfil logo após o primeiro acesso para receber alertas importantes do sistema diretamente no celular.
              </div>
            </div>
          )
        },
        {
          id: "conectar-canal",
          title: "Conectando seu primeiro canal de atendimento",
          excerpt: "Como integrar seu WhatsApp, Messenger ou Instagram Direct à plataforma.",
          content: (
            <div className="space-y-4">
              <p>O Project ES centraliza múltiplos canais em um único painel. Para conectar seu primeiro canal:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>No menu lateral esquerdo do painel, clique em <strong>WhatsApp / Canais</strong>.</li>
                <li>Clique no botão <strong>+ Adicionar Canal</strong> no canto superior direito.</li>
                <li>Escolha o tipo de canal (WhatsApp QR Code, Instagram Direct ou Facebook Messenger).</li>
                <li>Para o WhatsApp, o sistema gerará um QR Code na tela.</li>
                <li>Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados &gt; Conectar um aparelho</strong> e aponte a câmera para o QR Code.</li>
              </ol>
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 my-4 text-xs">
                <span className="font-bold text-cyan-300 block mb-1">⚠️ IMPORTANTE:</span>
                Mantenha a internet do seu celular ativa e certifique-se de que o WhatsApp Web não esteja aberto em muitas abas no seu computador, para evitar desconexões aleatórias.
              </div>
            </div>
          )
        },
        {
          id: "convidar-equipe",
          title: "Convidando sua equipe e definindo permissões",
          excerpt: "Saiba como trazer atendentes e configurar o controle de acesso de cada um.",
          content: (
            <div className="space-y-4">
              <p>O trabalho em equipe no Project ES é otimizado através de regras claras de distribuição de leads. Veja como convidar sua equipe:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Acesse a área de <strong>Configurações &gt; Equipe</strong> no menu lateral.</li>
                <li>Clique em <strong>Convidar Usuário</strong>.</li>
                <li>Insira o nome, e-mail e selecione o cargo do membro:
                  <ul className="list-disc pl-6 mt-1 space-y-1">
                    <li><strong>Administrador:</strong> Acesso total às configurações fiscais, integrações e dados globais.</li>
                    <li><strong>Gerente/Supervisor:</strong> Acesso a relatórios de desempenho e histórico de todos os chats, mas sem alterar conexões centrais de API.</li>
                    <li><strong>Atendente/Operador:</strong> Acesso exclusivo ao chat Kanban e visualização dos contatos atribuídos a ele.</li>
                  </ul>
                </li>
                <li>O convidado receberá um e-mail com o link de ativação da conta.</li>
              </ol>
            </div>
          )
        },
        {
          id: "perfil-empresa",
          title: "Configurando o perfil da sua empresa",
          excerpt: "Ajuste o nome, logotipo, horário comercial e mensagens de ausência.",
          content: (
            <div className="space-y-4">
              <p>Personalize as configurações globais da sua empresa para que a IA e os robôs respondam de acordo com as regras do seu negócio:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Vá para <strong>Configurações &gt; Perfil da Empresa</strong>.</li>
                <li>Faça upload do logotipo da sua marca (usado no envio de arquivos ou cabeçalhos de e-mail).</li>
                <li>Defina o **Horário de Funcionamento** (ex: Segunda a Sexta das 9h às 18h).</li>
                <li>Escreva a **Mensagem de Ausência**: Esta mensagem será disparada automaticamente caso um cliente chame fora do horário definido e a IA esteja desligada.</li>
              </ol>
            </div>
          )
        }
      ]
    },
    {
      id: "whatsapp-canais",
      name: "WhatsApp & Canais",
      description: "Gestão avançada de instâncias de WhatsApp, Instagram Direct e estratégias de conexão.",
      icon: MessageSquare,
      iconColor: "text-emerald-400",
      glowColor: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] group-hover:border-emerald-500/30",
      articles: [
        {
          id: "escanear-qrcode",
          title: "Como escanear o QR Code do WhatsApp",
          excerpt: "Boas práticas para sincronizar seu dispositivo celular com estabilidade completa.",
          content: (
            <div className="space-y-4">
              <p>A sincronização por QR Code usa a tecnologia multiaparelho oficial do WhatsApp. Siga estas etapas para garantir que o seu celular permaneça conectado de forma ininterrupta:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>No painel do Project ES, vá na aba **WhatsApp** e selecione o canal que deseja conectar.</li>
                <li>Se houver uma conexão antiga com falha, clique em **Desconectar / Limpar Sessão** primeiro.</li>
                <li>Aguarde 5 segundos para que o sistema gere um novo QR Code atualizado.</li>
                <li>No seu celular, abra o WhatsApp &gt; Configurações (ou três pontinhos) &gt; Aparelhos Conectados &gt; Conectar um Aparelho.</li>
                <li>Aponte a câmera para a tela do computador.</li>
              </ol>
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 my-4 text-xs">
                <span className="font-bold text-emerald-300 block mb-1">💡 DICA DE ESTABILIDADE:</span>
                Desative a otimização de bateria do celular para o aplicativo do WhatsApp nas configurações do seu Android/iOS. Isso impede que o sistema operacional encerre o processo do app em segundo plano, garantindo uma conexão 100% ativa.
              </div>
            </div>
          )
        },
        {
          id: "evitar-banimentos",
          title: "Dicas para evitar banimentos no WhatsApp",
          excerpt: "Conselhos essenciais para proteger seu número de celular ao fazer disparos automáticos.",
          content: (
            <div className="space-y-4">
              <p>O WhatsApp possui políticas estritas contra SPAM. Para garantir que seu número corporativo não seja bloqueado temporária ou permanentemente, aplique as seguintes diretrizes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Opt-In Obrigatório:</strong> Dispare apenas para pessoas que já entraram em contato com você anteriormente ou que explicitamente autorizaram receber suas mensagens.</li>
                <li><strong>Gatilho de Opt-Out Claro:</strong> Sempre dê ao cliente a opção de parar de receber mensagens. Exemplo: <code className="bg-white/5 px-1 py-0.5 rounded text-emerald-300">"Digite SAIR para interromper este contato."</code>.</li>
                <li><strong>Aquecimento de Número:</strong> Se o chip é novo, comece enviando poucas mensagens diárias (10 a 20) e aumente o volume progressivamente ao longo de 2 a 3 semanas.</li>
                <li><strong>Intervalos Randômicos:</strong> No Project ES, ao programar uma campanha, configure o atraso dinâmico entre mensagens para 15 a 45 segundos. Nunca use disparos sem atraso!</li>
              </ul>
            </div>
          )
        },
        {
          id: "instagram-messenger",
          title: "Integrando Instagram Direct e Messenger",
          excerpt: "Centralize mensagens recebidas nas suas redes sociais Meta.",
          content: (
            <div className="space-y-4">
              <p>Com o Project ES, você pode responder comentários e mensagens diretas do Instagram de forma profissional. Veja o procedimento:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Certifique-se de que sua conta do Instagram seja **Comercial (Business)** e esteja vinculada a uma Página do Facebook.</li>
                <li>No painel do Project ES, vá em **Adicionar Canal &gt; Instagram Direct**.</li>
                <li>Faça login com a conta do Facebook que gerencia a página vinculada.</li>
                <li>Dê permissão para o Project ES acessar as conversas do Instagram.</li>
                <li>Selecione o perfil desejado e conclua.</li>
              </ol>
            </div>
          )
        },
        {
          id: "respostas-rapidas",
          title: "Criando respostas rápidas (atalhos)",
          excerpt: "Padronize o atendimento e envie textos longos com comandos simples.",
          content: (
            <div className="space-y-4">
              <p>As respostas rápidas poupam tempo valioso de digitação dos atendentes. Para configurá-las:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Acesse <strong>Configurações &gt; Respostas Rápidas</strong>.</li>
                <li>Clique em <strong>+ Novo Atalho</strong>.</li>
                <li>Defina a palavra-chave (ex: <code className="bg-white/5 px-1 py-0.5 rounded text-cyan-300">pix</code> ou <code className="bg-white/5 px-1 py-0.5 rounded text-cyan-300">bemvindo</code>).</li>
                <li>Insira o texto completo, que pode conter variáveis do cliente como <code className="bg-white/5 px-1 py-0.5 rounded text-cyan-300">{"{nome}"}</code>.</li>
                <li>No chat de atendimento, o atendente só precisa digitar <code className="bg-white/5 px-1 py-0.5 rounded text-white font-bold">/pix</code> para que o texto completo apareça automaticamente pronto para envio.</li>
              </ol>
            </div>
          )
        }
      ]
    },
    {
      id: "ia-chatbots",
      name: "IA & Chatbots",
      description: "Configuração do Agente Inteligente, treinamento com arquivos e automação de atendimento.",
      icon: Bot,
      iconColor: "text-blue-400",
      glowColor: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.25)] group-hover:border-blue-500/30",
      articles: [
        {
          id: "treinar-ia",
          title: "Como treinar o agente de IA com seus dados",
          excerpt: "Escreva prompts eficientes e anexe documentos de texto para a IA responder seus clientes.",
          content: (
            <div className="space-y-4">
              <p>O Project ES conta com um agente de inteligência artificial de ponta conectado aos modelos GPT-4 e Claude. Para que ele atenda seus leads corretamente, você precisa instruí-lo:</p>
              <h4 className="text-sm font-bold text-white mt-4">1. Prompt de Comportamento (Instruções)</h4>
              <p>Defina o papel da IA em formato de texto. Exemplo:</p>
              <pre className="bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
{`Você é a Alice, atendente virtual do Project ES. Seu objetivo é qualificar o lead, tirar dúvidas sobre o nosso sistema de envio de WhatsApp e agendar uma demonstração gratuita de 15 minutos com nosso comercial. Seja simpática, prestativa e escreva mensagens de no máximo 3 linhas.`}
              </pre>
              <h4 className="text-sm font-bold text-white mt-4">2. Base de Conhecimento (Arquivos)</h4>
              <p>Envie arquivos em formato TXT, PDF ou digite informações diretas no sistema com dados de preços, links de agendamento e perguntas frequentes. A IA consultará estes dados antes de formular qualquer resposta.</p>
            </div>
          )
        },
        {
          id: "criar-chatbot",
          title: "Criando um fluxo de automação (chatbot)",
          excerpt: "Desenhe regras de transição automáticas baseadas em botões ou palavras-chave.",
          content: (
            <div className="space-y-4">
              <p>Além da IA flexível, você pode configurar fluxos estruturados (chatbots de árvore de decisão):</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Vá no painel de <strong>Automações &gt; Fluxos</strong>.</li>
                <li>Crie um gatilho de entrada (ex: quando o cliente enviar a primeira mensagem ou escolher uma opção no menu inicial).</li>
                <li>Adicione blocos de "Enviar Mensagem", "Esperar Resposta", ou "Verificar Condição".</li>
                <li>Você pode programar botões de resposta rápida para o WhatsApp. Quando o usuário clica em uma opção, o sistema direciona para o setor correspondente de forma automatizada.</li>
              </ol>
            </div>
          )
        },
        {
          id: "regras-transferencia",
          title: "Definindo o tom de voz e regras de transferência",
          excerpt: "Configure gatilhos automáticos para passar a conversa para um atendente humano.",
          content: (
            <div className="space-y-4">
              <p>Nenhum bot deve prender o cliente caso ele precise de ajuda especializada. Veja como estruturar a transferência humana:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Gatilho de frustração:</strong> Caso o cliente envie frases como "quero falar com humano", "falar com pessoa" ou "suporte", o robô desativa o atendimento de IA imediatamente e envia o lead para a fila de espera.</li>
                <li><strong>Botoes de Opção:</strong> Inclua um botão no menu inicial para "Falar com Atendente".</li>
                <li><strong>Fila por Setor:</strong> Encaminhe a conversa para grupos específicos (ex: Comercial, Financeiro ou Suporte) baseando-se nas respostas dadas ao chatbot.</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: "campanhas-disparos",
      name: "Campanhas & Disparos",
      description: "Agendamento de mensagens, gerenciamento de listas de contatos e templates HSM oficiais.",
      icon: Send,
      iconColor: "text-cyan-400",
      glowColor: "group-hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] group-hover:border-cyan-500/30",
      articles: [
        {
          id: "importar-listas",
          title: "Como criar e importar listas de contatos",
          excerpt: "Estruture sua planilha do Excel ou arquivo CSV para importar leads perfeitamente.",
          content: (
            <div className="space-y-4">
              <p>Para enviar mensagens em massa para seus clientes de forma organizada:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Prepare sua planilha no Excel contendo pelo menos as colunas: <strong>Nome</strong> e <strong>WhatsApp</strong> (com código do país e DDD, ex: <code className="bg-white/5 px-1 py-0.5 rounded text-cyan-300">5511999998888</code>).</li>
                <li>Exporte a planilha como formato **CSV (delimitado por vírgula)**.</li>
                <li>No painel do Project ES, vá em **Campanhas &gt; Contatos &gt; Importar Planilha**.</li>
                <li>Selecione o arquivo CSV e faça o mapeamento das colunas (indique qual coluna representa o nome e qual representa o telefone).</li>
                <li>Clique em salvar. Seus contatos estarão prontos para disparos.</li>
              </ol>
            </div>
          )
        },
        {
          id: "campanha-disparo-massa",
          title: "Configurando campanhas de disparos em massa",
          excerpt: "Crie agendamentos inteligentes de mensagens com atraso seguro entre envios.",
          content: (
            <div className="space-y-4">
              <p>Envie novidades ou cobranças para toda a sua carteira em instantes de forma segura:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Acesse <strong>Campanhas &gt; Disparos</strong> e clique em <strong>+ Nova Campanha</strong>.</li>
                <li>Selecione o canal do WhatsApp que enviará as mensagens.</li>
                <li>Selecione a lista de contatos importada previamente.</li>
                <li>Escreva a mensagem. Você pode incluir variáveis personalizadas como:
                  <code className="bg-white/5 px-1.5 py-0.5 rounded text-cyan-300 block my-1 font-mono text-[11px]">"Olá {"{nome}"}, tudo bem? Identificamos que..."</code>
                </li>
                <li>**Configuração Crítica:** Defina um delay mínimo de 25 segundos entre as mensagens para simular o comportamento humano e evitar banimentos pelo WhatsApp.</li>
                <li>Escolha se deseja enviar **Agora** ou **Agendar** para uma data e horário específicos.</li>
              </ol>
            </div>
          )
        },
        {
          id: "templates-hsm",
          title: "Gerenciando modelos de mensagens (HSM)",
          excerpt: "Use a API oficial do WhatsApp Business com templates de mensagens pré-aprovados pela Meta.",
          content: (
            <div className="space-y-4">
              <p>Se você utiliza o canal oficial do WhatsApp Business Cloud API, precisa registrar seus modelos de mensagens ativos (conhecidos como HSM - Highly Structured Messages) antes de iniciar qualquer envio:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Templates HSM passam por aprovação automática da Meta (geralmente leva menos de 5 minutos).</li>
                <li>Eles permitem enviar notificações mesmo após a janela de 24 horas da última mensagem do cliente.</li>
                <li>Permitem botões de chamadas de ação interativas (CTA) como links e números de telefone direto.</li>
                <li>Você pode gerenciar e solicitar aprovações diretamente pela tela de **Modelos HSM** no Project ES.</li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: "integracoes-api",
      name: "Integrações & API",
      description: "Geração de tokens, escuta de eventos via Webhook e conexão com sistemas terceiros.",
      icon: Code,
      iconColor: "text-indigo-400",
      glowColor: "group-hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] group-hover:border-indigo-500/30",
      articles: [
        {
          id: "chaves-api-webhooks",
          title: "Gerando chaves de API e Webhooks",
          excerpt: "Como autenticar requisições de terceiros e configurar alertas de novos chats.",
          content: (
            <div className="space-y-4">
              <p>Para conectar o Project ES com sistemas externos (como Hotmart, Kiwify, Bling ou seu próprio site):</p>
              <h4 className="text-sm font-bold text-white mt-4">1. Token de API</h4>
              <p>Acesse **Configurações &gt; API** e clique em **Gerar Novo Token**. Guarde este token de forma segura; ele concede acesso completo para envio e leitura de dados no seu sistema.</p>
              <h4 className="text-sm font-bold text-white mt-4">2. Configuração de Webhooks</h4>
              <p>Insira uma URL de destino no campo Webhook para receber requisições POST sempre que houver eventos como: **Mensagem recebida**, **Status de entrega alterado** ou **Chat atribuído a um atendente**.</p>
            </div>
          )
        },
        {
          id: "crm-parceiros",
          title: "Integrando com CRMs parceiros (Pipedrive, Hubspot)",
          excerpt: "Sincronize notas de atendimentos e crie negócios automaticamente no seu funil de vendas.",
          content: (
            <div className="space-y-4">
              <p>Integre seu funil de WhatsApp com os CRMs mais conhecidos do mercado:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Pipedrive:</strong> Insira seu Token de Desenvolvedor do Pipedrive no Project ES. Sempre que um lead alcançar a etapa de qualificação no chat, ele será enviado como "Negócio Iniciado" para a sua etapa correspondente do funil no Pipedrive.</li>
                <li><strong>HubSpot:</strong> Sincronize contatos em tempo real. As notas do chat (resumos e histórico de áudio) serão anexadas diretamente no card do contato dentro da HubSpot.</li>
              </ul>
            </div>
          )
        },
        {
          id: "envio-http",
          title: "Enviando mensagens via requisição HTTP",
          excerpt: "Exemplo de chamada CURL para enviar texto e arquivos via código.",
          content: (
            <div className="space-y-4">
              <p>Você pode disparar mensagens automaticamente usando chamadas de API padrão. Veja o exemplo de formato:</p>
              <pre className="bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
{`curl --location 'https://api.gm-crm.com/v1/messages/send' \\
--header 'Authorization: Bearer SEU_TOKEN_AQUI' \\
--header 'Content-Type: application/json' \\
--data '{
    "phone": "5511999998888",
    "message": "Olá! Este é um envio automático via API do Project ES.",
    "channelId": "1a2b3c4d"
}'`}
              </pre>
            </div>
          )
        }
      ]
    },
    {
      id: "relatorios-gestao",
      name: "Relatórios & Gestão",
      description: "Análise de tempo médio de resposta (TMR), satisfação de clientes (CSAT) e métricas de equipes.",
      icon: BarChart3,
      iconColor: "text-blue-500",
      glowColor: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.25)] group-hover:border-blue-600/30",
      articles: [
        {
          id: "analise-desempenho",
          title: "Como analisar o desempenho dos atendentes",
          excerpt: "Acompanhe o painel de relatórios para ver gráficos de produtividade em tempo real.",
          content: (
            <div className="space-y-4">
              <p>Mantenha um controle de qualidade do suporte de sua empresa com os relatórios analíticos:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Vá em **Relatórios &gt; Atendentes**.</li>
                <li>Veja métricas individuais contendo: quantidade de novos chats iniciados, chats resolvidos com sucesso e nota de avaliação média do atendente.</li>
                <li>Use filtros temporários para comparar a produtividade semanal ou mensal de cada funcionário.</li>
              </ul>
            </div>
          )
        },
        {
          id: "tempo-medio-resposta",
          title: "Entendendo o tempo médio de resposta (TMR)",
          excerpt: "Saiba como o tempo que seu lead aguarda na fila de espera impacta suas taxas de conversão.",
          content: (
            <div className="space-y-4">
              <p>O Tempo Médio de Resposta (TMR) indica a eficiência média de atendimento da sua equipe:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>O cronômetro inicia no momento em que o cliente envia uma mensagem e entra na fila de espera.</li>
                <li>Ele para quando o atendente digita e envia a primeira mensagem de resposta manual.</li>
                <li>Idealmente, o TMR da sua empresa deve ser mantido **abaixo de 2 minutos** em dias úteis para reter a atenção do lead e evitar perda de vendas para concorrentes.</li>
              </ol>
            </div>
          )
        },
        {
          id: "metricas-csat",
          title: "Métricas de satisfação do cliente (CSAT)",
          excerpt: "Configure e analise pesquisas de satisfação de estrelas após o encerramento de cada chat.",
          content: (
            <div className="space-y-4">
              <p>Após encerrar uma conversa, o Project ES pode enviar uma pesquisa de satisfação automática:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Ative a opção em **Configurações &gt; CSAT**.</li>
                <li>Escreva a pergunta de encerramento, ex: <code className="bg-white/5 px-1 py-0.5 rounded text-cyan-300">"Como você avalia o atendimento recebido hoje? Digite de 1 a 5."</code>.</li>
                <li>O sistema compilará as respostas e gerará relatórios em gráficos com a média ponderada de satisfação dos seus clientes.</li>
              </ol>
            </div>
          )
        }
      ]
    }
  ], []);

  // Map to speed up lookup
  const articlesMap = useMemo(() => {
    const map: Record<string, { category: Category; article: Article }> = {};
    categories.forEach(cat => {
      cat.articles.forEach(art => {
        map[art.id] = { category: cat, article: art };
      });
    });
    return map;
  }, [categories]);

  // Search logic
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: { category: Category; article: Article }[] = [];
    
    categories.forEach(cat => {
      cat.articles.forEach(art => {
        if (
          art.title.toLowerCase().includes(query) ||
          art.excerpt.toLowerCase().includes(query) ||
          cat.name.toLowerCase().includes(query)
        ) {
          results.push({ category: cat, article: art });
        }
      });
    });
    return results;
  }, [searchQuery, categories]);

  // Get current active article
  const currentArticle = useMemo(() => {
    if (selectedArticleId && articlesMap[selectedArticleId]) {
      return articlesMap[selectedArticleId].article;
    }
    return null;
  }, [selectedArticleId, articlesMap]);

  // Get current active category
  const currentCategory = useMemo(() => {
    if (selectedCategoryId) {
      return categories.find(c => c.id === selectedCategoryId) || null;
    }
    if (selectedArticleId && articlesMap[selectedArticleId]) {
      return articlesMap[selectedArticleId].category;
    }
    return null;
  }, [selectedCategoryId, selectedArticleId, categories, articlesMap]);

  // Handle category selection
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const cat = categories.find(c => c.id === categoryId);
    if (cat && cat.articles.length > 0) {
      setSelectedArticleId(cat.articles[0].id);
    }
    setSearchQuery("");
  };

  // Select article
  const handleSelectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setSelectedCategoryId(null); // Keep contextual currentCategory based on lookup
    setMobileMenuOpen(false);
  };

  // Close reading panel and return to home help
  const handleBackToHome = () => {
    setSelectedCategoryId(null);
    setSelectedArticleId(null);
    setSearchQuery("");
  };

  // Handle article feedback
  const handleFeedback = (artId: string, value: "yes" | "no") => {
    setArticleFeedback(prev => ({ ...prev, [artId]: value }));
  };

  return (
    <div className="min-h-screen bg-[#070913] text-[#f8fafc] overflow-x-hidden relative flex flex-col justify-between">
      {/* Estilos CSS embutidos */}
      <style>{`
        @keyframes float-help {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes orbit-p {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -45px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orbit-c {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-30px, 30px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-orbit-p {
          animation: orbit-p 22s ease-in-out infinite;
        }
        .animate-orbit-c {
          animation: orbit-c 26s ease-in-out infinite;
        }
        .glass-card-help {
          background: rgba(11, 13, 26, 0.4);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glass-input-help {
          background: rgba(8, 10, 20, 0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-sidebar-help {
          background: rgba(9, 11, 22, 0.5);
          backdrop-filter: blur(16px);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }
      `}</style>

      {/* Wrapper de Brilho para evitar esticar a página */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full bg-purple-600/10 blur-[150px] animate-orbit-p" />
        <div className="absolute top-[25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/8 blur-[140px] animate-orbit-c" />
        <div className="absolute bottom-[10%] left-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-600/5 blur-[160px] animate-orbit-p" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070913]/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 md:flex-1 justify-start cursor-pointer" onClick={() => setLocation("/")}>
            <div className="relative h-9 w-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#ec4899] opacity-35 blur-[1px]" />
              <div className="absolute inset-0 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center shadow-lg">
                <span className="font-black text-sm tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">ES</span>
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm tracking-tight text-white leading-none">Project ES</span>
              <span className="text-[7px] font-bold text-cyan-400 tracking-wider uppercase mt-0.5">Central de Ajuda</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300 justify-center">
            <a href="/#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="/planos" className="hover:text-white transition-colors">Preços</a>
            <a href="/#integracoes" className="hover:text-white transition-colors">Integrações</a>
            <a href="/contato" className="hover:text-white transition-colors">Contato</a>
          </div>

          {/* Right Action Button */}
          <div className="flex items-center gap-4 md:flex-1 justify-end">
            {user ? (
              <Button onClick={() => setLocation("/dashboard")} variant="default" className="text-xs h-9 rounded-full px-5">
                Ir para o Painel <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button onClick={() => setLocation("/auth")} variant="ghost" className="text-xs text-slate-300 hover:text-white h-9">
                  Entrar
                </Button>
                <button
                  onClick={() => setLocation("/auth?plan=pro")}
                  className="relative group overflow-hidden rounded-full p-[1.5px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] focus:outline-none"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500 rounded-full" />
                  <span className="relative block px-5 py-1.5 bg-[#090b16] rounded-full text-xs font-bold text-white transition-colors group-hover:bg-transparent">
                    Teste Grátis
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 w-full relative z-10">
        
        {/* VIEW 1: Document reader view (Two-column documentation screen) */}
        {selectedArticleId ? (
          <div className="w-full border-b border-white/5 min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
            
            {/* Left Sidebar Menu (Articles Navigation) */}
            <aside className={`w-full lg:w-80 shrink-0 glass-sidebar-help flex flex-col ${mobileMenuOpen ? 'block' : 'hidden lg:flex'}`}>
              
              {/* Sidebar Search Bar */}
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar artigo..."
                    className="pl-9 bg-black/30 border-white/10 rounded-xl text-xs h-9 text-white placeholder-slate-500 focus:border-purple-500/50 focus:ring-0"
                  />
                </div>
              </div>

              {/* Sidebar Navigation Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Search Results in Sidebar */}
                {searchQuery.trim() ? (
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Resultados da pesquisa</span>
                    {filteredArticles.length > 0 ? (
                      <div className="space-y-1.5">
                        {filteredArticles.map(res => (
                          <button
                            key={res.article.id}
                            onClick={() => handleSelectArticle(res.article.id)}
                            className={`w-full text-left p-2 rounded-xl text-xs transition-colors block ${selectedArticleId === res.article.id ? 'bg-purple-600/15 border border-purple-500/20 text-white font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                          >
                            <span className="block truncate font-semibold text-[11.5px]">{res.article.title}</span>
                            <span className="block text-[10px] text-slate-500 truncate mt-0.5">{res.category.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Nenhum resultado encontrado.</p>
                    )}
                  </div>
                ) : (
                  // Categories and their articles list
                  categories.map(cat => (
                    <div key={cat.id} className="space-y-2 text-left">
                      <div className="flex items-center gap-1.5 py-1">
                        <cat.icon className={`h-4 w-4 ${cat.iconColor}`} />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">{cat.name}</span>
                      </div>
                      
                      <div className="pl-5 border-l border-white/5 space-y-1.5">
                        {cat.articles.map(art => (
                          <button
                            key={art.id}
                            onClick={() => handleSelectArticle(art.id)}
                            className={`w-full text-left py-1.5 px-2 rounded-lg text-xs transition-all block ${selectedArticleId === art.id ? 'bg-purple-600/10 border-l-2 border-purple-500 text-white font-medium' : 'text-slate-400 hover:text-slate-200 hover:translate-x-0.5'}`}
                          >
                            {art.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Back to index in Sidebar */}
              <div className="p-4 border-t border-white/5">
                <Button
                  onClick={handleBackToHome}
                  variant="outline"
                  className="w-full text-xs h-9 border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar para o Início
                </Button>
              </div>
            </aside>

            {/* Right Article Viewer Content Area */}
            <article className="flex-1 bg-[#090b16]/30 px-6 py-8 md:px-12 md:py-10 max-w-4xl flex flex-col justify-between text-left">
              
              {/* Top Navigation Row */}
              <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <button onClick={handleBackToHome} className="hover:text-white transition-colors">Início</button>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-500 font-semibold">{currentCategory?.name}</span>
                  <ChevronRight className="h-3 w-3 hidden sm:block" />
                  <span className="text-slate-300 font-semibold hidden sm:inline truncate max-w-[180px] md:max-w-[300px]">
                    {currentArticle?.title}
                  </span>
                </div>

                {/* Mobile Menu Toggle button */}
                <Button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  variant="ghost"
                  className="text-xs h-8 px-3 rounded-lg border border-white/5 bg-white/5 text-slate-300 lg:hidden"
                >
                  {mobileMenuOpen ? "Fechar Menu" : "Ver Artigos"}
                </Button>
              </div>

              {/* Article Content Core */}
              <div className="flex-1 space-y-6">
                
                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  {currentArticle?.title}
                </h1>
                
                {/* Excerpt */}
                <p className="text-sm text-slate-300 border-l-2 border-indigo-500/40 pl-4 italic">
                  {currentArticle?.excerpt}
                </p>

                {/* HTML/JSX Content */}
                <div className="text-xs sm:text-sm text-slate-400 leading-relaxed space-y-4">
                  {currentArticle?.content}
                </div>
              </div>

              {/* Feedback Block */}
              <div className="border-t border-white/5 pt-8 mt-12">
                <div className="glass-card-help rounded-3xl p-5 border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="text-xs font-bold text-white">Este artigo foi útil?</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Sua opinião nos ajuda a melhorar a nossa documentação comercial.</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {articleFeedback[selectedArticleId] ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                        <CheckCircle2 className="h-4 w-4" /> Obrigado pelo feedback!
                      </span>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleFeedback(selectedArticleId, "yes")}
                          variant="ghost"
                          className="text-xs h-9 px-4 rounded-xl border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-300 text-slate-300"
                        >
                          <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Sim
                        </Button>
                        <Button
                          onClick={() => handleFeedback(selectedArticleId, "no")}
                          variant="ghost"
                          className="text-xs h-9 px-4 rounded-xl border border-white/5 hover:bg-rose-500/10 hover:text-rose-300 text-slate-300"
                        >
                          <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> Não
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </article>
          </div>
        ) : (
          
          /* VIEW 2: Help Center Home (Search and Category Cards Showcase) */
          <div className="flex flex-col items-center">
            
            {/* Hero Search Section */}
            <section className="container pt-16 pb-12 flex flex-col items-center text-center relative z-10 px-4">
              <div className="max-w-2xl mx-auto space-y-5">
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-bold mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Central de Ajuda</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                  Como podemos <br/>
                  <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">ajudar hoje?</span>
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Pesquise tutoriais passo a passo sobre WhatsApp, Inteligência Artificial, APIs e configure seu atendimento em minutos.
                </p>

                {/* Big Search Input */}
                <div className="relative max-w-xl mx-auto pt-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Busque por termos como 'WhatsApp', 'QR Code', 'API'..."
                    className="pl-11 pr-5 py-6 bg-[#0c0d1b]/60 border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-purple-500/50 focus:ring-0 shadow-2xl focus:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Interactive Grid: Categories or Search Results */}
            <section className="container pb-24 relative z-10 px-4">
              <div className="max-w-5xl mx-auto">
                
                {searchQuery.trim() ? (
                  /* Search Results Panel */
                  <div className="space-y-6 text-left">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Resultados para "{searchQuery}"
                      </h3>
                      <button onClick={() => setSearchQuery("")} className="text-xs text-purple-400 hover:text-purple-300">
                        Limpar busca
                      </button>
                    </div>

                    {filteredArticles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredArticles.map(res => (
                          <div
                            key={res.article.id}
                            onClick={() => handleSelectArticle(res.article.id)}
                            className="glass-card-help rounded-3xl p-5 border-white/5 hover:border-purple-500/20 hover:bg-white/[0.02] transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <res.category.icon className={`h-4 w-4 ${res.category.iconColor}`} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{res.category.name}</span>
                              </div>
                              <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                                {res.article.title}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-2">
                                {res.article.excerpt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-purple-400 mt-4 group-hover:translate-x-1 transition-transform">
                              <span>Ler artigo completo</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 glass-card-help rounded-[32px] p-8 border-white/5">
                        <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Nenhum tutorial encontrado</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                          Tente usar termos genéricos ou fale com nossa equipe de suporte comercial.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Categories Card Grid */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                      {categories.map(cat => (
                        <div
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat.id)}
                          className={`glass-card-help rounded-3xl p-6 border-white/5 hover:bg-white/[0.02] cursor-pointer group transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${cat.glowColor}`}
                        >
                          <div className="space-y-4 relative z-10">
                            {/* Icon Box */}
                            <div className="h-10 w-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                              <cat.icon className={`h-5 w-5 ${cat.iconColor}`} />
                            </div>
                            <div className="space-y-1.5">
                              <h3 className="text-[15px] font-bold text-white group-hover:text-purple-400 transition-colors">
                                {cat.name}
                              </h3>
                              <p className="text-[11.5px] text-slate-400 leading-relaxed line-clamp-2">
                                {cat.description}
                              </p>
                            </div>
                          </div>

                          {/* List of first 2 articles */}
                          <div className="border-t border-white/5 pt-4 mt-6 space-y-2.5 relative z-10">
                            {cat.articles.slice(0, 2).map(art => (
                              <div
                                key={art.id}
                                onClick={(e) => {
                                  e.stopPropagation(); // Avoid triggering card selection
                                  handleSelectArticle(art.id);
                                }}
                                className="flex items-center justify-between text-[11px] text-slate-300 hover:text-white transition-colors py-0.5 group/link"
                              >
                                <span className="truncate pr-4">{art.title}</span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover/link:text-white transition-colors" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Direct Support Contact CTA Section */}
            <section className="container pb-24 relative z-10 px-4">
              <div className="max-w-4xl mx-auto rounded-3xl bg-[#092e56] border border-blue-500/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_35px_-5px_rgba(9,46,86,0.3)]">
                <div className="text-left flex-1 space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Não encontrou o que precisava?</h3>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    Nossa equipe de suporte está disponível em tempo integral pelo WhatsApp para ajudar você com qualquer integração ou dúvida.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
                  <Button
                    onClick={() => window.open("https://wa.me/5511999990000?text=Olá! Gostaria de suporte técnico comercial sobre o Project ES.", "_blank")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5"
                  >
                    Suporte no WhatsApp <ArrowUpRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setLocation("/contato")}
                    className="bg-black hover:bg-black/90 text-white px-6 py-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/10"
                  >
                    Enviar Mensagem
                  </Button>
                </div>
              </div>
            </section>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-16 pb-12 bg-[#070913] text-xs text-slate-400 z-10 relative mt-auto">
        <div className="container px-4">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10 lg:gap-6 mb-12">
            {/* Left side: Logo + Brand description */}
            <div className="flex flex-col items-start text-left max-w-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0 text-white" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="#0c0d1b" stroke="currentColor" strokeWidth="6" />
                  <path d="M35 38 H65 M35 50 H65 M35 62 H55" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <path d="M30 70 L22 80 L35 76 Z" fill="currentColor" />
                </svg>
                <span className="font-extrabold text-white text-3xl tracking-tight leading-none">
                  gm<span className="text-blue-400 font-bold">+</span>
                </span>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Somos uma empresa líder em soluções de atendimento e Vendas, oferecendo suporte completo e integração para empresas com mais de 06 anos no mercado, mais de 10 mil clientes e 08 países atendidos
              </p>
            </div>

            {/* Right side: Solid Blue CTA Box */}
            <div className="w-full lg:max-w-xl rounded-3xl bg-[#092e56] border border-blue-500/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_35px_-5px_rgba(9,46,86,0.3)]">
              <div className="text-left flex-1">
                <h4 className="text-sm md:text-base font-semibold text-white leading-normal">
                  Quer saber como funciona por dentro do Project ES e ainda ganhar 14 dias grátis?
                </h4>
              </div>
              <button
                onClick={() => setLocation("/auth?plan=pro")}
                className="bg-black hover:bg-black/90 text-white pl-6 pr-3.5 py-3 rounded-full text-xs font-bold flex items-center gap-3 transition-colors shrink-0 shadow-lg shadow-black/30 border border-white/5"
              >
                <span>Clique aqui</span>
                <span className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-black shrink-0 shadow-sm">
                  <ArrowUpRight className="h-4 w-4 stroke-[3]" />
                </span>
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-white/10 my-10" />

          {/* Row 2: Grid of Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-left mb-10">
            {/* Column 1: Fale conosco */}
            <div className="space-y-4">
              <h5 className="text-[14px] font-bold text-blue-400">Fale conosco</h5>
              <ul className="space-y-3.5 text-[12px] text-slate-300">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Av. Paulista, 1000 - São Paulo, SP</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>+55 (11) 99999-0000</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>contato@suaempresa.com</span>
                </li>
              </ul>
            </div>

            {/* Column 2: Links de navegação */}
            <div className="space-y-4">
              <h5 className="text-[14px] font-bold text-blue-400">Links de navegação</h5>
              <ul className="space-y-2.5 text-[12px] text-slate-300">
                <li><a href="#" onClick={() => setLocation("/")} className="hover:text-white transition-colors">Início</a></li>
                <li><a href="/#recursos" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="/contato" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="/planos" className="hover:text-white transition-colors">Planos</a></li>
              </ul>
            </div>

            {/* Column 3: Suporte */}
            <div className="space-y-4">
              <h5 className="text-[14px] font-bold text-blue-400">Suporte</h5>
              <ul className="space-y-2.5 text-[12px] text-slate-300">
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleBackToHome(); }} className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="/planos#faq" className="hover:text-white transition-colors">Perguntas Frequentes</a></li>
                <li><a href="/contato" className="hover:text-white transition-colors">Fale com a gente</a></li>
                <li><a href="/politica-de-privacidade" className="hover:text-white transition-colors">Política de Privacidade</a></li>
                <li><a href="/termos-de-uso" className="hover:text-white transition-colors">Termos e Serviços</a></li>
              </ul>
            </div>

            {/* Column 4: Siga a gente */}
            <div className="space-y-4">
              <h5 className="text-[14px] font-bold text-blue-400">Siga a gente</h5>
              <div className="flex items-center gap-3.5 text-slate-300 mb-4">
                <a href="#" className="hover:text-white transition-colors"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="hover:text-white transition-colors"><Linkedin className="h-5 w-5" /></a>
                <a href="#" className="hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
              </div>
              
              {/* Meta Business Partner Badge */}
              <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-lg w-fit border border-slate-200 shadow-sm">
                <svg viewBox="0 0 16 16" className="w-5 h-5 fill-[#0668E1] shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.217 5.243C9.145 3.988 10.171 3 11.483 3 13.96 3 16 6.153 16.001 9.907c0 2.29-.986 3.725-2.757 3.725-1.543 0-2.395-.866-3.924-3.424l-.667-1.123-.118-.197a55 55 0 0 0-.53-.877l-1.178 2.08c-1.673 2.925-2.615 3.541-3.923 3.541C1.086 13.632 0 12.217 0 9.973 0 6.388 1.995 3 4.598 3q.477-.001.924.122c.31.086.611.22.913.407.577.359 1.154.915 1.782 1.714m1.516 2.224q-.378-.615-.727-1.133L9 6.326c.845-1.305 1.543-1.954 2.372-1.954 1.723 0 3.102 2.537 3.102 5.653 0 1.188-.39 1.877-1.195 1.877-.773 0-1.142-.51-2.61-2.87zM4.846 4.756c.725.1 1.385.634 2.34 2.001A212 212 0 0 0 5.551 9.3c-1.357 2.126-1.826 2.603-2.581 2.603-.777 0-1.24-.682-1.24-1.9 0-2.602 1.298-5.264 2.846-5.264q.137 0 .27.018" />
                </svg>
                <div className="text-left font-sans text-black select-none">
                  <div className="text-[12px] font-black leading-none">Meta</div>
                  <div className="text-[9px] font-bold text-slate-500 mt-0.5">Business Partner</div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-white/5 my-6" />

          {/* Row 3: Bottom Meta Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 Project ES. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6 text-slate-400">
              <a href="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="/politica-de-privacidade" className="hover:text-white transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Inline Lucide React definitions for Instagram, Linkedin, Facebook, MapPin to avoid build errors if they are not explicitly imported
function Instagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function Linkedin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function Facebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
