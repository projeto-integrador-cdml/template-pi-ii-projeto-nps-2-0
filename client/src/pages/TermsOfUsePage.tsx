import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, ShieldCheck, HelpCircle,
  Scale, FileText, ChevronRight, AlertTriangle
} from "lucide-react";

export default function TermsOfUsePage() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });

  // Currently active section id
  const [activeSection, setActiveSection] = useState("aceitacao");

  // Sections config for Table of Contents
  const sections = [
    { id: "aceitacao", label: "1. Aceitação dos Termos" },
    { id: "licenca-servicos", label: "2. Licença e Serviços" },
    { id: "cadastro-contas", label: "3. Cadastro e Contas" },
    { id: "pagamento-cancelamento", label: "4. Assinatura e Faturamento" },
    { id: "regras-conduta", label: "5. Conduta e Política Antispam" },
    { id: "isencao-whatsapp", label: "6. Responsabilidade e WhatsApp" },
    { id: "propriedade-intelectual", label: "7. Propriedade Intelectual" },
    { id: "legislacao-foro", label: "8. Foro e Legislação" }
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
        @keyframes orbit-p-terms {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, -30px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orbit-c-terms {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, 30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-orbit-p-terms {
          animation: orbit-p-terms 24s ease-in-out infinite;
        }
        .animate-orbit-c-terms {
          animation: orbit-c-terms 20s ease-in-out infinite;
        }
        .glass-card-terms {
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
        <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-[150px] animate-orbit-p-terms" />
        <div className="absolute bottom-[10%] right-[-15%] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[140px] animate-orbit-c-terms" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff02_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070913]/85 backdrop-blur-md no-print">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 md:flex-1 justify-start cursor-pointer" onClick={() => setLocation("/")}>
            <div className="relative h-9 w-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#ec4899] opacity-35 blur-[1px]" />
              <div className="absolute inset-0 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center shadow-lg">
                <span className="font-black text-sm tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">ES</span>
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm tracking-tight text-white leading-none">Project ES</span>
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-bold mb-2">
            <Scale className="h-3.5 w-3.5 text-purple-400" />
            <span>Contrato de Uso de Software</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Termos de <br/>
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">Uso e Serviço</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Por favor, leia atentamente as condições de licenciamento e uso da nossa plataforma de automação e inteligência artificial omnichannel.
          </p>
        </div>
      </section>

      {/* Main Document Section (Split Grid Layout) */}
      <section className="container pb-24 relative z-10 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl mx-auto items-start">
          
          {/* Left Column: Sticky Table of Contents */}
          <aside className="lg:col-span-4 sticky top-24 space-y-6 hidden lg:block no-print text-left">
            <div className="glass-card-terms rounded-3xl p-6 border-white/5 space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Seções do documento</h3>
              <div className="space-y-1">
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    className={`w-full text-left py-2 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${activeSection === sec.id ? 'bg-purple-600/15 border-l-2 border-purple-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
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

            {/* Help Box */}
            <div className="glass-card-terms rounded-3xl p-6 border-white/5 space-y-3">
              <div className="h-9 w-9 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <HelpCircle className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Precisa de Ajuda?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Em caso de dúvidas comerciais ou requisições formais sobre os nossos planos de contratação, contate-nos.
              </p>
              <div className="text-[11px] font-bold text-purple-400 pt-1 select-all">
                contato@suaempresa.com
              </div>
            </div>
          </aside>

          {/* Right Column: Legal Clauses Content */}
          <div className="lg:col-span-8 print-full text-left">
            <div className="glass-card-terms rounded-[32px] p-6 sm:p-10 border-white/5 shadow-2xl space-y-10 print-full">
              
              {/* Button block for mobile */}
              <div className="flex sm:hidden justify-between items-center no-print border-b border-white/5 pb-4">
                <span className="text-xs text-slate-500 font-bold uppercase">Termos de Uso</span>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="h-8 text-[10px] border-white/10 hover:bg-white/5 text-white rounded-lg px-3 flex items-center gap-1.5"
                >
                  <Printer className="h-3 w-3" /> PDF
                </Button>
              </div>

              {/* SECTION 1: Aceitação */}
              <section id="aceitacao" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">1. Aceitação dos Termos</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Ao acessar, registrar-se ou utilizar de qualquer forma a plataforma <strong>Project ES</strong> e seus subdomínios, você ("Usuário" ou "Contratante") concorda incondicionalmente em cumprir e sujeitar-se a estes Termos de Uso e Serviço, bem como à nossa Política de Privacidade.
                  </p>
                  <p>
                    Caso você esteja aceitando estes termos em nome de uma empresa ou pessoa jurídica, você declara possuir os poderes necessários para vincular tal entidade às cláusulas descritas neste documento. Se você não concorda com qualquer uma das condições estabelecidas, não deverá utilizar a nossa plataforma ou acessar nossos canais.
                  </p>
                </div>
              </section>

              {/* SECTION 2: Licença e Serviços */}
              <section id="licenca-servicos" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">2. Outorga de Licença e Serviços</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    O Project ES outorga ao usuário uma licença de uso temporária, não exclusiva, intransferível e revogável de sua plataforma de software baseada em nuvem (SaaS). A plataforma fornece:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Painel de chat omnichannel unificado (WhatsApp, Instagram, Messenger);</li>
                    <li>Módulo de automações de funil de vendas em formato Kanban;</li>
                    <li>Geração de atendentes robôs treinados via Inteligência Artificial baseada em grandes modelos de linguagem;</li>
                    <li>Módulos de relatórios de desempenho operacional e tempo médio de resposta (TMR);</li>
                    <li>Ferramentas de disparo e agendamento de campanhas.</li>
                  </ul>
                  <p>
                    A licença concedida não confere ao usuário qualquer direito de propriedade sobre o código-fonte, banco de dados ou estrutura lógica da plataforma, os quais permanecem sob propriedade exclusiva da nossa empresa.
                  </p>
                </div>
              </section>

              {/* SECTION 3: Cadastro e Contas */}
              <section id="cadastro-contas" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">3. Cadastro, Contas e Segurança</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Para usufruir dos recursos da plataforma, você deve preencher o cadastro informando dados válidos, precisos e completos. Você é o único responsável pela guarda e confidencialidade de sua senha de acesso e por todas as operações executadas em sua conta.
                  </p>
                  <p>
                    É estritamente vedada a cessão ou empréstimo de chaves de API, credenciais ou tokens de acesso a terceiros sem autorização prévia. Você concorda em notificar o suporte comercial do Project ES imediatamente caso detecte qualquer uso não autorizado ou suspeita de quebra de segurança de sua conta.
                  </p>
                </div>
              </section>

              {/* SECTION 4: Assinatura e Faturamento */}
              <section id="pagamento-cancelamento" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <Scale className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">4. Planos, Assinatura e Faturamento</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Período de Demonstração (Trial):</strong> Oferecemos 14 dias grátis para testes das ferramentas. Após o término desse período, os serviços serão suspensos a menos que uma assinatura formal seja ativada.
                    </li>
                    <li>
                      <strong>Recorrência:</strong> A cobrança de nossos planos é realizada de forma mensal ou anual recorrente, dependendo da opção selecionada no faturamento.
                    </li>
                    <li>
                      <strong>Cancelamento:</strong> Você pode solicitar o cancelamento da sua assinatura a qualquer momento através do painel de controle. O cancelamento interrompe a renovação para o mês subsequente.
                    </li>
                    <li>
                      <strong>Reembolsos:</strong> Não efetuamos reembolsos fracionados de períodos mensais já iniciados ou planos utilizados, exceto no caso de exercício do direito de arrependimento (7 dias corridos após a contratação inicial para compras online, nos termos do Código de Defesa do Consumidor brasileiro).
                    </li>
                  </ul>
                </div>
              </section>

              {/* SECTION 5: Conduta e Política Antispam */}
              <section id="regras-conduta" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">5. Uso Permitido e Política Antispam</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    O Project ES é uma ferramenta de automação e qualificação de leads legítimos. O uso da plataforma é condicionado ao respeito às leis locais e à política antispam:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>SPAM Proibido:</strong> É terminantemente proibido utilizar o Project ES para efetuar disparos em massa para números de contatos obtidos sem consentimento expresso (opt-in) ou listas frias compradas na internet.
                    </li>
                    <li>
                      <strong>Opção de Descadastro (Opt-Out):</strong> As campanhas devem incluir uma opção clara para o destinatário solicitar a interrupção das mensagens (ex: "Digite SAIR para parar").
                    </li>
                    <li>
                      <strong>Suspensão por Abuso:</strong> Nos reservamos o direito de suspender ou rescindir temporariamente a prestação de serviços de contas associadas a altos índices de denúncias de spam ou bloqueios por parte dos usuários de WhatsApp.
                    </li>
                  </ul>
                </div>
              </section>

              {/* SECTION 6: Responsabilidade e WhatsApp */}
              <section id="isencao-whatsapp" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">6. Isenção de Responsabilidade e Bloqueios no WhatsApp</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs my-2">
                    <span className="font-bold text-amber-400 block mb-1">⚠️ AVISO IMPORTANTE SOBRE BANIMENTOS:</span>
                    O WhatsApp possui algoritmos inteligentes de detecção de spam e comportamento robótico que operam de forma autônoma. 
                    <strong> O Project ES não possui ingerência, acesso ou controle sobre as punições de banimento, bloqueio ou suspensão aplicadas pela Meta Platforms, Inc. a números de telefone.</strong>
                  </div>
                  <p>
                    Você declara e aceita expressamente que:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>O uso de automações e o volume excessivo de mensagens enviadas por um chip de WhatsApp (seja via QR Code Web ou API) pode violar os termos comerciais da Meta e levar ao bloqueio definitivo da sua linha telefônica.</li>
                    <li><strong>O Project ES não oferece qualquer garantia de que sua linha de WhatsApp estará imune a banimentos e não se responsabiliza por eventuais prejuízos comerciais decorrentes de números bloqueados.</strong></li>
                    <li>A parametrização de intervalos seguros (delays) entre as mensagens e a higienização das listas de leads são de responsabilidade operacional única e exclusiva do usuário.</li>
                  </ul>
                </div>
              </section>

              {/* SECTION 7: Propriedade Intelectual */}
              <section id="propriedade-intelectual" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">7. Propriedade Intelectual</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Todas as marcas registradas, designs de telas, algoritmos de automação, códigos, artes, logos e documentos contidos no site do Project ES ou dentro do painel do cliente são propriedade exclusiva da nossa marca. 
                  </p>
                  <p>
                    É proibida qualquer tentativa de extrair o código-fonte (engenharia reversa), copiar o visual do site para ferramentas concorrentes sem autorização por escrito, ou remover avisos de copyright inseridos na plataforma.
                  </p>
                </div>
              </section>

              {/* SECTION 8: Foro e Legislação */}
              <section id="legislacao-foro" className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <Scale className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">8. Foro e Legislação Aplicável</h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                  <p>
                    Este contrato de licença e seus termos são interpretados de acordo com a legislação da República Federativa do Brasil, em especial a Lei Geral de Proteção de Dados (LGPD) e o Marco Civil da Internet.
                  </p>
                  <p>
                    Para dirimir quaisquer eventuais controvérsias judiciais decorrentes deste contrato, as partes elegem, de comum acordo, o foro da <strong>Circunscrição Judiciária de Planaltina - DF</strong> como o único competente, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
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
                  Quer saber como funciona por dentro do Project ES e ainda ganhar 14 dias grátis?
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

// Inline SVG definition for Mail to avoid compile error
function Mail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
