import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, Shield, Lock, Eye,
  Scale, FileText, Sparkles, ChevronRight, HelpCircle
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });

  // Currently hovered or active section id
  const [activeSection, setActiveSection] = useState("introducao");

  // Sections config for Table of Contents
  const sections = [
    { id: "introducao", label: "1. Introdução" },
    { id: "coleta-dados", label: "2. Coleta de Dados" },
    { id: "uso-dados", label: "3. Uso das Informações" },
    { id: "compartilhamento", label: "4. Compartilhamento" },
    { id: "direitos-titular", label: "5. Seus Direitos (LGPD)" },
    { id: "seguranca", label: "6. Segurança dos Dados" },
    { id: "retencao", label: "7. Retenção de Dados" },
    { id: "contato", label: "8. Canal de Contato (DPO)" }
  ];

  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#070913] text-[#f8fafc] overflow-x-hidden relative flex flex-col justify-between">
      {/* Estilos CSS embutidos */}
      <style>{`
        @keyframes orbit-p-priv {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.08); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orbit-c-priv {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, 40px) scale(0.92); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-orbit-p-priv {
          animation: orbit-p-priv 20s ease-in-out infinite;
        }
        .animate-orbit-c-priv {
          animation: orbit-c-priv 25s ease-in-out infinite;
        }
        .glass-card-priv {
          background: rgba(11, 13, 26, 0.45);
          backdrop-filter: blur(24px);
          border: 1.5px solid rgba(255, 255, 255, 0.05);
        }
        
        /* Otimização para impressão física ou em PDF */
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, aside, button, .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            border: none !important;
          }
          h1, h2, h3, p, li {
            color: black !important;
          }
        }
      `}</style>

      {/* Wrapper de Brilho */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 no-print">
        <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-[150px] animate-orbit-p-priv" />
        <div className="absolute bottom-[10%] right-[-15%] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[140px] animate-orbit-c-priv" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff02_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070913]/85 backdrop-blur-md no-print">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 md:flex-1 justify-start cursor-pointer" onClick={() => setLocation("/")}>
            <div className="relative h-9 w-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#ec4899] opacity-35 blur-[1px]" />
              <div className="absolute inset-0 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center shadow-lg">
                <span className="font-black text-sm tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">GM</span>
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm tracking-tight text-white leading-none">GM CRM</span>
              <span className="text-[7px] font-bold text-cyan-400 tracking-wider uppercase mt-0.5">WhatsApp AI</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300 justify-center">
            <a href="/#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="/planos" className="hover:text-white transition-colors">Preços</a>
            <a href="/#integracoes" className="hover:text-white transition-colors">Integrações</a>
            <a href="/contato" className="hover:text-white transition-colors">Contato</a>
          </div>

          <div className="flex items-center gap-4 md:flex-1 justify-end">
            {user ? (
              <Button onClick={() => setLocation("/dashboard")} variant="default" className="text-xs h-9 rounded-full px-5">
                Acessar Painel <ArrowLeft className="ml-1.5 h-3.5 w-3.5 rotate-180" />
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

      {/* Page Content Hero */}
      <section className="container pt-16 pb-6 flex flex-col items-center text-center relative z-10 no-print px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-xs font-bold mb-2">
            <Shield className="h-3.5 w-3.5 text-indigo-400" />
            <span>Segurança & Privacidade</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Política de <br/>
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">Privacidade</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Última atualização em 01 de junho de 2026. Entenda como o GM CRM trata, protege e respeita a privacidade de seus dados em nossa plataforma.
          </p>
        </div>
      </section>

      {/* Main Document Section (Split Grid Layout) */}
      <section className="container pb-24 relative z-10 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl mx-auto items-start">
          
          {/* Left Column: Sticky Table of Contents */}
          <aside className="lg:col-span-4 sticky top-24 space-y-6 hidden lg:block no-print text-left">
            <div className="glass-card-priv rounded-3xl p-6 border-white/5 space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Seções do documento</h3>
              <div className="space-y-1">
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    className={`w-full text-left py-2 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${activeSection === sec.id ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
                  >
                    <span>{sec.label}</span>
                    <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${activeSection === sec.id ? 'translate-x-0.5' : ''}`} />
                  </button>
                ))}
              </div>

              <div className="h-px bg-white/5 my-4" />
              
              <Button
                onClick={handlePrint}
                className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="h-3.5 w-3.5 text-slate-300" /> Imprimir / PDF
              </Button>
            </div>

            {/* Support Box */}
            <div className="glass-card-priv rounded-3xl p-6 border-white/5 space-y-3">
              <div className="h-9 w-9 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <HelpCircle className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Dúvidas Jurídicas?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Caso possua questionamentos sobre o uso de dados ou queira fazer uma requisição formal baseada na LGPD, fale com nosso Encarregado de Dados (DPO).
              </p>
              <div className="text-[11px] font-bold text-indigo-400 pt-1 select-all">
                dpo@gm-crm.com
              </div>
            </div>
          </aside>

          {/* Right Column: Legal Clauses Content */}
          <div className="lg:col-span-8 print-full text-left">
            <div className="glass-card-priv rounded-[32px] p-6 sm:p-10 border-white/5 shadow-2xl space-y-10 print-full">
              
              {/* Button block for mobile */}
              <div className="flex sm:hidden justify-between items-center no-print border-b border-white/5 pb-4">
                <span className="text-xs text-slate-500 font-bold uppercase">Política de Privacidade</span>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="h-8 text-[10px] border-white/10 hover:bg-white/5 text-white rounded-lg px-3 flex items-center gap-1.5"
                >
                  <Printer className="h-3 w-3" /> PDF
                </Button>
              </div>

              {/* SECTION 1: Introdução */}
              <section id="introducao" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">1. Introdução</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Esta Política de Privacidade descreve de que forma o <strong>GM CRM</strong> ("nós", "nosso", ou "plataforma") realiza a coleta, armazenamento, processamento, compartilhamento e proteção dos dados pessoais de seus clientes, usuários e visitantes ("você" ou "titular").
                  </p>
                  <p>
                    O GM CRM é uma plataforma voltada para a gestão de relacionamentos com clientes, automação de funis de venda e integração omnichannel (como WhatsApp, Messenger e Instagram). Ao acessar ou utilizar os nossos serviços, você declara estar ciente do processamento de suas informações na forma indicada nesta Política de Privacidade.
                  </p>
                  <p>
                    Nós atuamos como <strong>Controlador</strong> de dados pessoais quando processamos dados cadastrais de nossos clientes (titulares da conta). Por outro lado, atuamos como <strong>Operador</strong> de dados pessoais quando processamos mensagens, leads ou dados dos clientes de nossos clientes dentro dos canais que eles conectam em nossa plataforma.
                  </p>
                </div>
              </section>

              {/* SECTION 2: Coleta de Dados */}
              <section id="coleta-dados" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Eye className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">2. Coleta de Dados</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>Coletamos diferentes categorias de informações de acordo com a sua interação em nossa plataforma:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Dados de Cadastro da Conta:</strong> Ao criar sua conta e contratar nossos planos, coletamos seu nome completo, e-mail profissional, número de celular corporativo, Razão Social, CNPJ/CPF, endereço comercial e credenciais de login criptografadas.
                    </li>
                    <li>
                      <strong>Dados de Faturamento e Pagamento:</strong> Caso assine um plano pago, processamos dados de pagamento através de gateways de faturamento seguros e em total conformidade com as regras PCI-DSS. Não armazenamos o número completo do cartão de crédito em nossos servidores locais.
                    </li>
                    <li>
                      <strong>Dados de Conexão e Navegação:</strong> Registramos informações técnicas automáticas quando você navega em nosso site, tais como endereço IP, navegador utilizado, sistema operacional, cookies de sessão, histórico de páginas acessadas e cliques de interação.
                    </li>
                    <li>
                      <strong>Dados de Conversas e Integrações (WhatsApp/Redes Sociais):</strong> Quando você conecta sua conta de WhatsApp ou páginas de Facebook/Instagram ao GM CRM, nós processamos o conteúdo das conversas que chegam ao seu canal (mensagens de texto, mídias enviadas, áudios, status de mensagens e IDs de contatos) de forma a centralizá-los e disponibilizá-los no seu painel operacional.
                    </li>
                  </ul>
                </div>
              </section>

              {/* SECTION 3: Uso das Informações */}
              <section id="uso-dados" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">3. Uso das Informações</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>Tratamos seus dados pessoais somente sob bases legais autorizadas pela LGPD, com as seguintes finalidades:</p>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li><strong>Prestação dos Serviços Contratados:</strong> Fornecer o dashboard, processar e exibir seus atendimentos, alimentar seus pipelines Kanban, processar comandos de disparo automático e manter a estabilidade do chat online.</li>
                    <li><strong>Treinamento e Melhorias de Inteligência Artificial:</strong> Quando você ativa o módulo de IA para interagir com seus clientes, a IA consome as instruções e a base de dados enviadas por você. O conteúdo dessas conversas é processado estritamente em tempo real para responder o cliente e não é compartilhado externamente para fins publicitários.</li>
                    <li><strong>Suporte Comercial e Técnico:</strong> Responder a solicitações de suporte, resolver problemas de sincronização de QR Code do WhatsApp e realizar manutenções nas instâncias contratadas.</li>
                    <li><strong>Segurança Física e Lógica:</strong> Monitorar abusos de spam nas instâncias de disparos, tentativas de acessos maliciosos às contas dos clientes, prevenção contra fraudes financeiras e proteção geral do ecossistema.</li>
                  </ol>
                </div>
              </section>

              {/* SECTION 4: Compartilhamento */}
              <section id="compartilhamento" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Scale className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">4. Compartilhamento de Dados</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    O GM CRM não vende, comercializa ou aluga dados pessoais de clientes a terceiros sob nenhuma hipótese. Compartilhamos dados apenas com parceiros essenciais nas seguintes circunstâncias:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Provedores de Infraestrutura de TI:</strong> Nossos servidores em nuvem são hospedados em datacenters líderes globais (como AWS e Google Cloud) que fornecem altíssimos padrões de proteção física e lógica.
                    </li>
                    <li>
                      <strong>APIs de Integração Oficiais:</strong> Ao usar o WhatsApp Cloud API ou conectar o Instagram Direct, os metadados e conteúdos das mensagens passam obrigatoriamente pelos servidores oficiais da Meta (Facebook Ireland Ltd. / Meta Platforms, Inc.), em consonância com os termos de uso próprios deles.
                    </li>
                    <li>
                      <strong>Prestadores de Serviços de Faturamento:</strong> Compartilhamos dados cadastrais mínimos e informações de cobrança com os gateways de pagamento encarregados de processar os pagamentos e emitir notas fiscais.
                    </li>
                    <li>
                      <strong>Cumprimento da Lei:</strong> Em face de mandados judiciais, ordens formais de autoridades policiais ou fiscais competentes, nos reservamos o direito de cooperar compartilhando os logs estritamente solicitados.
                    </li>
                  </ul>
                </div>
              </section>

              {/* SECTION 5: Seus Direitos (LGPD) */}
              <section id="direitos-titular" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Shield className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">5. Seus Direitos (LGPD)</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você, na qualidade de titular de dados pessoais processados como Controlador por nós, dispõe de uma série de direitos:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Confirmação de Tratamento e Acesso:</strong> Confirmar se nós tratamos seus dados pessoais e solicitar cópia estruturada dos dados tratados.</li>
                    <li><strong>Retificação:</strong> Exigir a correção de informações desatualizadas, incompletas ou incorretas no seu cadastro de cliente.</li>
                    <li><strong>Eliminação e Revogação do Consentimento:</strong> Solicitar a exclusão completa de seus dados pessoais coletados sob consentimento anterior, bem como interromper o recebimento de alertas de marketing.</li>
                    <li><strong>Portabilidade:</strong> Solicitar a exportação de seus dados para outras ferramentas digitais de sua escolha.</li>
                  </ul>
                  <p>
                    Para exercer quaisquer destes direitos, basta registrar um e-mail formal endereçado ao nosso Encarregado de Dados (DPO) através do canal descrito na seção 8 desta política.
                  </p>
                </div>
              </section>

              {/* SECTION 6: Segurança dos Dados */}
              <section id="seguranca" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">6. Segurança dos Dados</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Nós adotamos padrões internacionais e rígidos de segurança da informação para garantir a integridade dos seus dados de atendimento e evitar episódios de vazamentos de privacidade:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Criptografia de ponta a ponta em conexões de dados externos e criptografia TLS/SSL nas requisições HTTP do Dashboard.</li>
                    <li>Bancos de dados isolados e acessos administrativos restritos a funcionários específicos mediante verificação multifator (MFA).</li>
                    <li>Cópias de segurança (backups) automáticas e isoladas para evitar perdas acidentais de leads e históricos de chat.</li>
                  </ul>
                </div>
              </section>

              {/* SECTION 7: Retenção de Dados */}
              <section id="retencao" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">7. Retenção de Dados</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Mantemos seus dados cadastrais e logs de atendimento ativos no sistema enquanto perdurar sua assinatura ativa no GM CRM ou conforme necessário para prestar o serviço.
                  </p>
                  <p>
                    Caso sua conta seja cancelada ou desativada, procedemos com a anonimização e exclusão permanente dos seus bancos de dados e mídias de chat em até 60 dias úteis, resguardados os dados que somos legalmente obrigados a manter armazenados (ex: prazos de guarda exigidos pela Receita Federal ou pelo Marco Civil da Internet).
                  </p>
                </div>
              </section>

              {/* SECTION 8: Contato */}
              <section id="contato" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">8. Canal de Contato (DPO)</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Para exercer os seus direitos regulamentados na LGPD ou expressar qualquer dúvida jurídica sobre o tratamento de informações do GM CRM, envie um e-mail para o nosso Encarregado de Proteção de Dados (DPO) no endereço abaixo:
                  </p>
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 font-mono text-center font-bold text-indigo-400 my-4 text-xs selection:bg-indigo-400 selection:text-black select-all">
                    dpo@gm-crm.com
                  </div>
                  <p>
                    Responderemos sua solicitação em um prazo máximo de 15 dias úteis, em conformidade com as exigências legais.
                  </p>
                </div>
              </section>

            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-16 pb-12 bg-[#070913] text-xs text-slate-400 z-10 relative no-print mt-auto">
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
                  Quer saber como funciona por dentro do GM CRM e ainda ganhar 14 dias grátis?
                </h4>
              </div>
              <button
                onClick={() => setLocation("/auth?plan=pro")}
                className="bg-black hover:bg-black/90 text-white pl-6 pr-3.5 py-3 rounded-full text-xs font-bold flex items-center gap-3 transition-colors shrink-0 shadow-lg shadow-black/30 border border-white/5"
              >
                <span>Clique aqui</span>
                <span className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-black shrink-0 shadow-sm">
                  <ArrowLeft className="h-4 w-4 stroke-[3] rotate-180" />
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
                  <span>Av Etelvina de Souza Majone, 1-199 Bauru - SP</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>+55 11 94111-3090</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>sales@beecrm.io</span>
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
                <li><a href="/ajuda" className="hover:text-white transition-colors">Central de Ajuda</a></li>
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
            <p>© 2026 GM CRM. Todos os direitos reservados.</p>
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

// Inline Lucide React definitions for Instagram, Linkedin, Facebook, MapPin to avoid build errors
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

function Phone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function Mail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
