import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Check, ArrowRight, ArrowUpRight, HelpCircle, ChevronDown,
  MapPin, Phone, Mail, Instagram, Linkedin, Facebook, Sparkles, ShieldCheck
} from "lucide-react";

export default function PlansPage() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleCTA = (planName: string) => {
    const message = encodeURIComponent(`Olá! Gostaria de saber mais informações e os preços do plano ${planName} do Project ES.`);
    window.open(`https://wa.me/5511941113090?text=${message}`, "_blank");
  };

  const plans = {
    starter: {
      name: "Starter",
      description: "Ideal para profissionais autônomos iniciando com automações.",
      features: [
        "1 Atendente",
        "1 Conexão WhatsApp",
        "Áudios Humanizados Básicos",
        "Pipeline Kanban Simples",
        "Biblioteca de Mídias básica",
        "Suporte via e-mail",
      ],
      notIncluded: [
        "Assistente de IA Integrado",
        "Disparos em massa ilimitados",
        "Painel White Label",
      ]
    },
    pro: {
      name: "Pro",
      description: "Perfeito para pequenas e médias equipes acelerando vendas.",
      popular: true,
      features: [
        "Até 5 Atendentes",
        "1 Conexão WhatsApp",
        "Áudios Humanizados Ilimitados",
        "Pipeline Kanban Completo",
        "Assistente IA Integrado (ChatGPT)",
        "Disparos e Campanhas em Massa",
        "Suporte prioritário via WhatsApp",
      ],
      notIncluded: [
        "Múltiplas conexões WhatsApp",
        "Painel White Label",
      ]
    },
    enterprise: {
      name: "Enterprise",
      description: "Para grandes operações que precisam de escala e suporte dedicado.",
      features: [
        "Atendentes Ilimitados",
        "Conexões WhatsApp Múltiplas",
        "Áudios Humanizados Ilimitados",
        "Pipeline Kanban Completo",
        "Assistente IA Integrado",
        "Disparos em massa ilimitados",
        "Painel White Label (Marca Própria)",
        "Gerente de conta dedicado",
        "Suporte VIP 24/7",
      ],
      notIncluded: []
    }
  };

  const faqData = [
    {
      q: "Como funciona a contratação dos planos?",
      a: "Para contratar qualquer um dos planos, basta entrar em contato com nossa equipe comercial através do botão 'Entrar em Contato' ou via WhatsApp. Faremos uma demonstração personalizada e ativaremos seu acesso imediatamente."
    },
    {
      q: "Há multa ou fidelidade de cancelamento?",
      a: "Não há fidelidade nem multa de cancelamento. Nosso modelo de assinatura é recorrente e você pode cancelar quando quiser sem qualquer complicação."
    },
    {
      q: "Quais formas de pagamento são aceitas?",
      a: "Aceitamos Pix e cartões de crédito. O faturamento é automático no ciclo mensal."
    },
    {
      q: "Como funciona o período de teste de 14 dias?",
      a: "Você pode testar nossa plataforma gratuitamente por 14 dias para conhecer as automações, o Kanban e o assistente de IA antes de fechar sua assinatura."
    }
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-[#f8fafc] overflow-x-hidden relative">
      {/* Estilos CSS embutidos */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes orbit-purple {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orbit-cyan {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, 40px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-orbit-purple {
          animation: orbit-purple 20s ease-in-out infinite;
        }
        .animate-orbit-cyan {
          animation: orbit-cyan 24s ease-in-out infinite;
        }
        .glass-capsule {
          background: rgba(11, 13, 26, 0.55);
          backdrop-filter: blur(28px);
          border: 1.5px solid transparent;
          background-image: linear-gradient(rgba(11, 13, 26, 0.55), rgba(11, 13, 26, 0.55)), 
                            linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(6, 182, 212, 0.2));
          background-origin: border-box;
          background-clip: padding-box, border-box;
          box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.9), 0 0 60px rgba(99, 102, 241, 0.12);
        }
      `}</style>

      {/* Wrapper de Brilho para evitar esticar a página */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-[160px] animate-orbit-purple" />
        <div className="absolute top-[20%] right-[-15%] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[150px] animate-orbit-cyan" />
        <div className="absolute bottom-[20%] left-[-10%] w-[900px] h-[900px] rounded-full bg-indigo-600/5 blur-[180px] animate-orbit-purple" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[150px] animate-orbit-cyan" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#070913]/85 backdrop-blur-md">
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
            <a href="/planos" className="text-white hover:text-white transition-colors">Preços</a>
            <a href="/#integracoes" className="hover:text-white transition-colors">Integrações</a>
            <a href="/contato" className="hover:text-white transition-colors">Contato</a>
          </div>

          <div className="flex items-center gap-4 md:flex-1 justify-end">
            {user ? (
              <Button onClick={() => setLocation("/dashboard")} variant="default" className="text-xs h-9 rounded-full px-5">
                Acessar Painel <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button onClick={() => setLocation("/auth")} variant="ghost" className="text-xs text-slate-300 hover:text-white h-9">
                  Entrar
                </Button>
                <button 
                  onClick={() => setLocation("/auth?plan=pro")} 
                  className="relative group overflow-hidden rounded-full p-[1.5px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] focus:outline-none focus:ring-2 focus:ring-purple-500"
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
      </nav>

      {/* Hero Section */}
      <section className="container pt-20 pb-12 flex flex-col items-center text-center relative z-10">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nossos Planos</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Escolha o plano ideal para a <br/>
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">sua escala de vendas</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Sem fidelidade ou taxa de ativação. Encontre a infraestrutura ideal de automações e triagem de WhatsApp para o seu tamanho.
          </p>
        </div>
      </section>

      {/* Grid de Planos */}
      <section className="container pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 items-stretch">
          
          {/* Starter Plan */}
          <Card className="glass-card border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between h-full hover:shadow-[0_10px_35px_rgba(0,0,0,0.4)] rounded-[24px]">
            <CardContent className="p-8 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-bold text-slate-300">{plans.starter.name}</h3>
                <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{plans.starter.description}</p>
                
                <div className="my-6 min-h-[58px] flex flex-col justify-center text-left">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sob consulta</span>
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">Fale com nossa equipe comercial</span>
                </div>

                <div className="h-px bg-white/10 my-6" />
                
                <ul className="space-y-3.5 text-xs text-slate-300">
                  {plans.starter.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plans.starter.notIncluded.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-slate-500/60 line-through decoration-white/10">
                      <Check className="h-4 w-4 text-slate-600/30 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                onClick={() => handleCTA("Starter")} 
                variant="outline" 
                className="w-full mt-8 h-11 text-xs rounded-full font-bold border-white/10 hover:bg-white/5 text-white"
              >
                Entrar em Contato
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="glass-card border-purple-500/40 relative hover:border-purple-400 transition-all duration-300 flex flex-col justify-between h-full shadow-[0_10px_40px_rgba(168,85,247,0.12)] hover:shadow-[0_15px_45px_rgba(168,85,247,0.22)] rounded-[24px] scale-100 md:scale-[1.03] z-20">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg">
              Mais Vendido
            </div>
            <CardContent className="p-8 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-bold text-purple-400">{plans.pro.name}</h3>
                <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{plans.pro.description}</p>
                
                <div className="my-6 min-h-[58px] flex flex-col justify-center text-left">
                  <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">Sob consulta</span>
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">Fale com nossa equipe comercial</span>
                </div>

                <div className="h-px bg-white/10 my-6" />
                
                <ul className="space-y-3.5 text-xs text-slate-300">
                  {plans.pro.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-purple-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plans.pro.notIncluded.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-slate-500/60 line-through decoration-white/10">
                      <Check className="h-4 w-4 text-slate-600/30 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                onClick={() => handleCTA("Pro")} 
                className="w-full mt-8 h-11 text-xs rounded-full font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25"
              >
                Entrar em Contato
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="glass-card border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between h-full hover:shadow-[0_10px_35px_rgba(0,0,0,0.4)] rounded-[24px]">
            <CardContent className="p-8 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-bold text-slate-300">{plans.enterprise.name}</h3>
                <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{plans.enterprise.description}</p>
                
                <div className="my-6 min-h-[58px] flex flex-col justify-center text-left">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sob consulta</span>
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">Fale com nossa equipe comercial</span>
                </div>

                <div className="h-px bg-white/10 my-6" />
                
                <ul className="space-y-3.5 text-xs text-slate-300">
                  {plans.enterprise.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                onClick={() => handleCTA("Enterprise")} 
                variant="outline" 
                className="w-full mt-8 h-11 text-xs rounded-full font-bold border-white/10 hover:bg-white/5 text-white"
              >
                Entrar em Contato
              </Button>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* Tabela de Comparação de Recursos Detalhada */}
      <section className="container pb-24 relative z-10 border-t border-white/5 pt-20">
        <div className="text-center max-w-2xl mx-auto mb-16 px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Comparativo Completo</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-2">Veja lado a lado todos os detalhes técnicos e limites operacionais.</p>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto rounded-3xl border border-white/10 bg-[#0c0d1b]/35 backdrop-blur-xl">
          <table className="w-full min-w-[600px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold">
                <th className="p-5 font-semibold">Funcionalidade</th>
                <th className="p-5 text-center font-semibold">Starter</th>
                <th className="p-5 text-center font-semibold text-purple-400">Pro</th>
                <th className="p-5 text-center font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
              <tr>
                <td className="p-5 font-semibold text-white">Atendentes Simultâneos</td>
                <td className="p-5 text-center">1</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Até 5</td>
                <td className="p-5 text-center">Ilimitados</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Conexões WhatsApp</td>
                <td className="p-5 text-center">1 número</td>
                <td className="p-5 text-center text-purple-300 font-semibold">1 número</td>
                <td className="p-5 text-center">Múltiplos números</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Áudios Humanizados ("gravando...")</td>
                <td className="p-5 text-center">Básico</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Ilimitados</td>
                <td className="p-5 text-center">Ilimitados</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Assistente de IA integrado</td>
                <td className="p-5 text-center">Não</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Sim (ChatGPT-4)</td>
                <td className="p-5 text-center">Sim (Com ajuste fino)</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Pipeline Kanban</td>
                <td className="p-5 text-center">Sim (1 funil)</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Ilimitados</td>
                <td className="p-5 text-center">Ilimitados</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Campanhas / Envio em massa</td>
                <td className="p-5 text-center">Não</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Sim (com delay)</td>
                <td className="p-5 text-center">Sim (Ilimitados)</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Painel Customizável (White Label)</td>
                <td className="p-5 text-center">Não</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Não</td>
                <td className="p-5 text-center">Sim</td>
              </tr>
              <tr>
                <td className="p-5 font-semibold text-white">Configuração Assistida</td>
                <td className="p-5 text-center">Sim</td>
                <td className="p-5 text-center text-purple-300 font-semibold">Sim (Prioritária)</td>
                <td className="p-5 text-center">Sim (Setup Dedicado)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container py-24 border-t border-white/5 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-4">
          <div className="space-y-3.5">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Dúvidas Frequentes</h2>
            <p className="text-slate-400 text-xs md:text-sm">
              Confira as dúvidas comuns dos nossos clientes em relação a contratações, faturamento e cancelamento.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {faqData.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/10"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex items-center justify-between w-full p-4 text-left font-bold text-xs md:text-sm text-slate-200 focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${activeFaq === idx ? "rotate-180" : ""}`} />
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${activeFaq === idx ? "max-h-[300px]" : "max-h-0"}`}>
                  <p className="p-4 pt-0 text-xs md:text-sm text-slate-400 leading-relaxed border-t border-white/5">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-16 pb-12 bg-[#070913] text-xs text-slate-400 z-10 relative">
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
                <li><a href="#" className="hover:text-white transition-colors">Início</a></li>
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
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
