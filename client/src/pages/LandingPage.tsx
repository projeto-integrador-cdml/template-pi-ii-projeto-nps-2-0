import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, Target, Bot, MessageCircle, BarChart3, ShieldCheck, 
  ArrowRight, Check, Play, Sparkles, HelpCircle, ChevronDown, Mic, LayoutDashboard,
  Brain, Kanban, CreditCard, MapPin, Phone, Mail, ArrowUpRight, Linkedin, Facebook, Instagram
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Mensagens do simulador que batem com a imagem enviada
  const simMessages = [
    { sender: "bot", text: "Olá! 🤖", time: "10:19" },
    { sender: "user", text: "Oi, tudo bem? Gostaríamos de saber mais...", time: "10:20" },
    { sender: "bot", text: "Com certeza! O Project ES pode ajudar. Como posso te auxiliar hoje? 😊", time: "10:21" },
    { sender: "user", text: "Você vende produtos físicos ou serviços?", time: "10:22" },
    { sender: "user", text: "Serviços de Marketing Digital", time: "10:23" },
    { sender: "bot", text: "Excelente! Nosso Pipeline Kanban é perfeito. Vamos agendar uma demonstração?", time: "10:24" }
  ];

  const handleCTA = (planId: string) => {
    setLocation(`/auth?plan=${planId}`);
  };

  const faqData = [
    {
      q: "Como funciona a automação de áudios?",
      a: "Nossa tecnologia permite que você grave áudios e envie-os em fluxos automáticos. O cliente recebe como se você estivesse gravando na hora, exibindo o status de 'gravando áudio...' no topo do chat, o que aumenta a taxa de resposta e gera máxima confiança."
    },
    {
      q: "Preciso de um número de WhatsApp específico?",
      a: "Não, você pode conectar qualquer número de WhatsApp existente de forma simples através da leitura de um QR Code diretamente nas configurações do painel."
    },
    {
      q: "O que é o Assistente de IA integrado?",
      a: "O assistente de IA usa a inteligência do ChatGPT para analisar o histórico de conversas do seu cliente, sugerir as melhores respostas e recomendar 3 ações práticas de vendas para ajudá-lo a fechar o negócio mais rápido."
    },
    {
      q: "Existe fidelidade ou multa de cancelamento?",
      a: "Não! Todos os nossos planos são mensais, sem qualquer fidelidade ou taxa de cancelamento. Você pode cancelar sua assinatura quando desejar diretamente pelo painel."
    }
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-[#f8fafc] overflow-x-hidden relative">
      {/* Estilos para animação do fundo e ondas de áudio */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes float-reverse {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-2deg); }
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
        @keyframes wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 7s ease-in-out infinite;
        }
        .animate-orbit-purple {
          animation: orbit-purple 20s ease-in-out infinite;
        }
        .animate-orbit-cyan {
          animation: orbit-cyan 24s ease-in-out infinite;
        }
        .wave-bar {
          transform-origin: bottom;
          anima        .glass-capsule {
          background: rgba(11, 13, 26, 0.55);
          backdrop-filter: blur(28px);
          border: 1.5px solid transparent;
          background-image: linear-gradient(rgba(11, 13, 26, 0.55), rgba(11, 13, 26, 0.55)), 
                            linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(6, 182, 212, 0.2));
          background-origin: border-box;
          background-clip: padding-box, border-box;
          box-shadow: 0 35px 70px -15px rgba(0, 0, 0, 0.9), 0 0 60px rgba(99, 102, 241, 0.12);
        }
        .btn-teste-gratis {
          background: rgba(30, 27, 75, 0.4);
          backdrop-filter: blur(12px);
          border: 1.5px solid transparent;
          background-image: linear-gradient(rgba(11, 13, 26, 0.85), rgba(11, 13, 26, 0.85)), 
                            linear-gradient(135deg, #a855f7, #6366f1);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.25);
          transition: all 0.3s ease;
        }
        .btn-teste-gratis:hover {
          box-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
          transform: translateY(-1px);
        }
        .btn-hero-cta {
          background: rgba(30, 27, 75, 0.3);
          backdrop-filter: blur(12px);
          border: 1.5px solid transparent;
          background-image: linear-gradient(rgba(11, 13, 26, 0.85), rgba(11, 13, 26, 0.85)), 
                            linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(6, 182, 212, 0.4));
          background-origin: border-box;
          background-clip: padding-box, border-box;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
          transition: all 0.3s ease;
        }
        .btn-hero-cta:hover {
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.4);
          transform: translateY(-1px);
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Glow backgrounds animados globais e Grid de estrelas embrulhados para evitar esticar a página */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-[160px] animate-orbit-purple" />
        <div className="absolute top-[20%] right-[-15%] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[150px] animate-orbit-cyan" />
        <div className="absolute bottom-[20%] left-[-10%] w-[900px] h-[900px] rounded-full bg-indigo-600/5 blur-[180px] animate-orbit-purple" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[150px] animate-orbit-cyan" />
        
        {/* Grid overlay de estrelas/fundo cibernético */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#070913]/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo combinando "GM Project ES" ou "Project ES" */}
          <div className="flex items-center gap-2 md:flex-1 justify-start">
            <div className="relative h-9 w-9 flex items-center justify-center">
              {/* O gradiente redondo sutil do logo */}
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
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="/planos" className="hover:text-white transition-colors">Preços</a>
            <a href="#integracoes" className="hover:text-white transition-colors">Integrações</a>
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
                {/* Botão Teste Grátis com borda gradiente exata e glow conforme a imagem */}
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
      <section className="container pt-12 pb-12 md:pt-16 md:pb-16 flex flex-col items-center text-center relative z-10">
        
        {/* Contêiner Gigante Glassmorphic (Hero Wrapper) conforme a Imagem */}
        <div className="relative w-full max-w-4xl mx-auto rounded-[40px] md:rounded-[56px] glass-capsule px-4 pt-16 pb-12 md:pb-16 flex flex-col items-center mb-12">
          
          {/* Brilhos internos do contêiner */}
          <div className="absolute -left-20 bottom-10 w-[250px] h-[250px] rounded-full bg-purple-600/20 blur-[80px] pointer-events-none animate-pulse" />
          <div className="absolute -right-20 top-10 w-[250px] h-[250px] rounded-full bg-cyan-500/20 blur-[80px] pointer-events-none animate-pulse" />
          
          {/* Formas flutuantes e efeitos de vidro */}
          {/* Vidro flutuante esquerdo */}
          <div className="absolute left-[3%] bottom-[20%] w-[180px] h-[180px] rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md rotate-12 -translate-x-14 pointer-events-none shadow-2xl flex items-center justify-center opacity-60 animate-float hidden lg:flex">
            <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 blur-md" />
          </div>
          
          {/* Vidro flutuante direito */}
          <div className="absolute right-[3%] bottom-[12%] w-[200px] h-[200px] rounded-[36px] bg-white/5 border border-white/10 backdrop-blur-md -rotate-12 translate-x-14 pointer-events-none shadow-2xl overflow-hidden opacity-60 animate-float-reverse hidden lg:flex">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-cyan-400/20 blur-md" />
          </div>

          {/* Pequena esfera ciano flutuante no topo direito */}
          <div className="absolute right-[12%] top-[8%] w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-float z-20" />
          
          {/* Pequena esfera rosa flutuante no meio esquerdo */}
          <div className="absolute left-[10%] top-[40%] w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 shadow-[0_0_15px_rgba(236,72,153,0.6)] animate-float-reverse z-20" />

          {/* Pequena esfera laranja flutuante no topo esquerdo */}
          <div className="absolute left-[15%] top-[12%] w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 shadow-[0_0_10px_rgba(251,146,60,0.5)] animate-float z-20" />

          {/* Badge v2.0 Project ES */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-semibold mb-6 relative z-10">
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">v2.0</span>
            <span className="text-white text-[11px]">Project ES</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.12] text-white relative z-10 px-4">
            Aumente suas vendas e <br/>
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">automatize seu WhatsApp</span>
          </h1>

          {/* Canais Integrados Badges com Logos Reais das Aplicações */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 md:gap-3 px-4 relative z-10">
            {/* WhatsApp */}
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-400 border border-emerald-500/20 text-[9.5px] md:text-xs font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm5.824-3.414c1.677.994 3.497 1.517 5.365 1.518l.006.002c5.626 0 10.204-4.579 10.207-10.205.002-2.727-1.061-5.29-3.002-7.23-1.94-1.94-4.508-3.004-7.239-3.004-5.632 0-10.21 4.579-10.213 10.206-.001 1.998.522 3.948 1.513 5.642l.115.195-1.002 3.658 3.743-.981.189.112c1.61.955 3.456 1.459 5.318 1.46zm9.324-5.467c-.295-.148-1.748-.862-2.019-.961-.271-.1-.469-.148-.667.148-.198.297-.768.961-.941 1.159-.173.197-.346.223-.642.075-.295-.148-1.249-.46-2.379-1.468-.88-.785-1.474-1.754-1.647-2.051-.173-.297-.018-.458.13-.606.134-.133.296-.347.444-.52.148-.173.197-.297.297-.495.1-.198.05-.371-.025-.52-.075-.148-.667-1.609-.914-2.204-.241-.58-.487-.5-.668-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.748-.713 1.995-1.402.247-.689.247-1.28.173-1.402-.073-.124-.271-.198-.567-.347z"/>
              </svg>
              <span>WhatsApp</span>
            </span>

            {/* Instagram */}
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 via-pink-500/10 to-transparent text-pink-400 border border-pink-500/20 text-[9.5px] md:text-xs font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>
              </svg>
              <span>Instagram</span>
            </span>

            {/* Messenger */}
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent text-blue-400 border border-blue-500/20 text-[9.5px] md:text-xs font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M0 7.76C0 3.301 3.493 0 8 0s8 3.301 8 7.76-3.493 7.76-8 7.76c-.81 0-1.586-.107-2.316-.307a.64.64 0 0 0-.427.03l-1.588.702a.64.64 0 0 1-.898-.566l-.044-1.423a.64.64 0 0 0-.215-.456C.956 12.108 0 10.092 0 7.76m5.546-1.459-2.35 3.728c-.225.358.214.761.551.506l2.525-1.916a.48.48 0 0 1 .578-.002l1.869 1.402a1.2 1.2 0 0 0 1.735-.32l2.35-3.728c.226-.358-.214-.761-.551-.506L9.728 7.381a.48.48 0 0 1-.578.002L7.281 5.98a1.2 1.2 0 0 0-1.735.32z"/>
              </svg>
              <span>Messenger</span>
            </span>

            {/* IA & Automações */}
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent text-purple-400 border border-purple-500/20 text-[9.5px] md:text-xs font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
              </svg>
              <span>IA & Automações</span>
            </span>
          </div>
          
          <p className="mt-6 text-xs sm:text-sm md:text-base text-slate-300 max-w-xl leading-relaxed relative z-10 px-4">
            Gerencie leads, automatize conversas com IA e escale seu negócio com a plataforma líder em CRM para WhatsApp.
          </p>

          <div className="mt-8 relative z-10">
            {/* Botão do Hero com borda gradiente exata e fundo combinando */}
            <button 
              onClick={() => handleCTA("pro")} 
              className="relative group overflow-hidden rounded-full p-[1.5px] transition-all duration-300 hover:shadow-[0_0_25px_rgba(139,92,246,0.35)] focus:outline-none"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-600/60 via-indigo-500/50 to-cyan-500/60 rounded-full" />
              <span className="relative block px-8 py-2.5 bg-[#121424] rounded-full text-xs font-bold text-white transition-colors group-hover:bg-transparent">
                Começar Teste Grátis
              </span>
            </button>
          </div>

          {/* Setores de Atuação (Para bater o início do site da Bee) */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 md:gap-2.5 px-4 relative z-10 max-w-2xl">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mr-1">Adaptado para:</span>
            {[
              { label: "Varejo & E-commerce", emoji: "🛍️" },
              { label: "Imobiliário", emoji: "🏢" },
              { label: "Saúde & Clínicas", emoji: "🩺" },
              { label: "Serviços & Startups", emoji: "⚡" },
              { label: "Educação", emoji: "🎓" }
            ].map((sector, i) => (
              <span 
                key={i} 
                className="px-3 py-1 rounded-full bg-white/[0.02] border border-white/5 text-[9.5px] md:text-xs font-semibold text-slate-300 flex items-center gap-1.5 backdrop-blur-sm select-none hover:bg-white/[0.05] transition-colors"
              >
                <span>{sector.emoji}</span>
                <span>{sector.label}</span>
              </span>
            ))}
          </div>

          {/* Celular Mockup Centralizado (Conforme Imagem) */}
          <div className="mt-16 w-full max-w-[270px] sm:max-w-[310px] rounded-[44px] border-[10px] border-[#1e2030] bg-[#090b11] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden aspect-[9/18.5] flex flex-col relative z-10 transition-transform duration-500 hover:scale-[1.02] border-b-0 rounded-b-none">
            
            {/* Notch / Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[76px] h-[20px] bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#111] absolute right-3" />
            </div>

            {/* Brilhos internos da tela */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none z-20" />
            
            {/* Top bar do celular */}
            <div className="bg-[#121422] px-4 pt-7 pb-3 flex items-center justify-between border-b border-white/5 shrink-0 relative z-20">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px] flex items-center justify-center">
                  <div className="h-full w-full rounded-full bg-[#0d0f1a] flex items-center justify-center text-[9px] font-black text-white">ES</div>
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-[10px] text-white leading-none">Project ES v2.0</h5>
                  <span className="text-[7.5px] text-[#4ade80] flex items-center gap-1 mt-0.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                    Automatizado
                  </span>
                </div>
              </div>
            </div>

            {/* Chat history com mensagens idênticas ao mockup */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a] text-left relative z-20 scrollbar-none">
              
              {/* WhatsApp background wallpaper */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff01_1.2px,transparent_1.2px)] [background-size:12px_12px] pointer-events-none" />

              {simMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-2.5 rounded-2xl max-w-[85%] text-[9.5px] leading-relaxed relative ${
                    msg.sender === "user" 
                      ? "bg-[#005c4b] text-white rounded-tr-none shadow-md" 
                      : "bg-[#202c33] text-slate-100 rounded-tl-none border border-white/5 shadow-md"
                  }`}>
                    <p className="pb-2 pr-1">{msg.text}</p>
                    <div className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[6.5px] text-slate-400/80 select-none">
                      <span>{msg.time}</span>
                      {msg.sender === "user" && <span className="text-[#38bdf8] font-bold">✔✔</span>}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-start">
                <div className="bg-[#202c33]/60 text-slate-400 px-3 py-1.5 rounded-2xl rounded-tl-none text-[8px] animate-pulse flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  Digitando...
                </div>
              </div>
            </div>
          </div>

          {/* Três Feature Cards Embaixo do Celular (Idênticos ao Mockup e Sobrepondo 3D) */}
          <div id="recursos" className="relative z-25 -mt-16 md:-mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[95%] px-4">
            {/* Card 1: ZapVoice (Mic + Onda Senoidal contínua) */}
            <Card className="bg-[#0c0d1b]/45 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_-5px_rgba(168,85,247,0.35)] rounded-[24px] group">
              <CardContent className="p-6 text-left">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-purple-400">
                    <Mic className="h-5 w-5" />
                  </div>
                  {/* Waveform contínua roxo-ciano estilo osciloscópio */}
                  <div className="flex-1 h-8 flex items-center">
                    <svg className="w-full h-8" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M0,20 C5,20 10,12 15,12 C20,12 25,28 30,28 C35,28 40,2 45,2 C50,2 55,38 60,38 C65,38 70,15 75,15 C80,15 85,25 90,25 C95,25 97,20 100,20" 
                        stroke="url(#wave-grad)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                      <defs>
                        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                <h3 className="text-[17px] font-bold mt-5 text-white">Áudio Humanizado</h3>
                <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                  Mensagens de voz automatizadas e naturais.
                </p>
              </CardContent>
            </Card>

            {/* Card 2: AI Assistant */}
            <Card className="bg-[#0c0d1b]/45 backdrop-blur-xl border border-white/10 hover:border-[#ec4899]/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] shadow-[0_0_30px_-5px_rgba(236,72,153,0.15)] hover:shadow-[0_0_40px_-5px_rgba(236,72,153,0.35)] rounded-[24px] group">
              <CardContent className="p-6 text-left">
                <div className="h-11 w-11 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-pink-400">
                  <Brain className="h-5 w-5" />
                </div>
                <h3 className="text-[17px] font-bold mt-5 text-white">AI Assistant</h3>
                <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                  Atendimento com IA; respostas rápidas e humanas 24/7.
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Pipeline Kanban */}
            <Card className="bg-[#0c0d1b]/45 backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)] hover:shadow-[0_0_40px_-5px_rgba(6,182,212,0.35)] rounded-[24px] group">
              <CardContent className="p-6 text-left">
                <div className="h-11 w-11 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-cyan-400">
                  <Kanban className="h-5 w-5" />
                </div>
                <h3 className="text-[17px] font-bold mt-5 text-white">Pipeline Kanban</h3>
                <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                  Visualize e gerencie seu funil de vendas.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Linha de Conectividade Oficial / Badges Oficiais */}
          <div className="w-full border-t border-white/5 mt-10 pt-8 flex flex-col items-center">
            <p className="text-[9.5px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">
              Tecnologia Homologada & Integração Oficial
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              {/* Meta Business Partner Badge */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/10 bg-[#090b16]/65 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-blue-500/30 transition-colors">
                <div className="text-white fill-white bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 p-2 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4 fill-current">
                    <path d="M8.217 5.243C9.145 3.988 10.171 3 11.483 3 13.96 3 16 6.153 16.001 9.907c0 2.29-.986 3.725-2.757 3.725-1.543 0-2.395-.866-3.924-3.424l-.667-1.123-.118-.197a55 55 0 0 0-.53-.877l-1.178 2.08c-1.673 2.925-2.615 3.541-3.923 3.541C1.086 13.632 0 12.217 0 9.973 0 6.388 1.995 3 4.598 3q.477-.001.924.122c.31.086.611.22.913.407.577.359 1.154.915 1.782 1.714m1.516 2.224q-.378-.615-.727-1.133L9 6.326c.845-1.305 1.543-1.954 2.372-1.954 1.723 0 3.102 2.537 3.102 5.653 0 1.188-.39 1.877-1.195 1.877-.773 0-1.142-.51-2.61-2.87zM4.846 4.756c.725.1 1.385.634 2.34 2.001A212 212 0 0 0 5.551 9.3c-1.357 2.126-1.826 2.603-2.581 2.603-.777 0-1.24-.682-1.24-1.9 0-2.602 1.298-5.264 2.846-5.264q.137 0 .27.018"/>
                  </svg>
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[10px] font-black text-white uppercase tracking-wider">Meta</div>
                  <div className="text-[8.5px] text-slate-400 font-bold">Business Partner</div>
                </div>
              </div>

              {/* WhatsApp Tech Provider Badge */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/10 bg-[#090b16]/65 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-emerald-500/30 transition-colors">
                <div className="bg-emerald-500 text-white p-2 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm5.824-3.414c1.677.994 3.497 1.517 5.365 1.518l.006.002c5.626 0 10.204-4.579 10.207-10.205.002-2.727-1.061-5.29-3.002-7.23-1.94-1.94-4.508-3.004-7.239-3.004-5.632 0-10.21 4.579-10.213 10.206-.001 1.998.522 3.948 1.513 5.642l.115.195-1.002 3.658 3.743-.981.189.112c1.61.955 3.456 1.459 5.318 1.46zm9.324-5.467c-.295-.148-1.748-.862-2.019-.961-.271-.1-.469-.148-.667.148-.198.297-.768.961-.941 1.159-.173.197-.346.223-.642.075-.295-.148-1.249-.46-2.379-1.468-.88-.785-1.474-1.754-1.647-2.051-.173-.297-.018-.458.13-.606.134-.133.296-.347.444-.52.148-.173.197-.297.297-.495.1-.198.05-.371-.025-.52-.075-.148-.667-1.609-.914-2.204-.241-.58-.487-.5-.668-.51-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.748-.713 1.995-1.402.247-.689.247-1.28.173-1.402-.073-.124-.271-.198-.567-.347z"/>
                  </svg>
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[10px] font-black text-white uppercase tracking-wider">WhatsApp Business</div>
                  <div className="text-[8.5px] text-slate-400 font-bold">Cloud API Verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Grid de Recursos Adicionais (Superando o Bee CRM) */}
      <section id="integracoes" className="container py-24 border-t border-white/5 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 px-4">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            Tudo o que sua empresa precisa em um só lugar
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-3">
            Recursos avançados para centralizar sua operação comercial e de suporte diretamente no WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto px-4">
          
          {/* Card 1: Central Multiatendentes */}
          <div className="glass-card rounded-3xl p-8 border-white/5 hover:border-indigo-500/25 transition-all duration-300 group flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(99,102,241,0.08)]">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Central Multiatendentes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Centralize suas conversas em um único número de WhatsApp. Distribua e atribua atendimentos de forma inteligente entre seus operadores e evite a sobreposição de contatos.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-white/5 pt-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium">Uso simultâneo ilimitado de atendentes</span>
            </div>
          </div>

          {/* Card 2: Conexão Estável & API Oficial */}
          <div className="glass-card rounded-3xl p-8 border-white/5 hover:border-cyan-500/25 transition-all duration-300 group flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(6,182,212,0.08)]">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">API Oficial & QR Code</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Oferecemos conexões estáveis via API oficial ou integração instantânea via QR Code. Garanta a estabilidade e segurança do seu número com criptografia ativa de ponta a ponta.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-white/5 pt-4">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <span className="text-[10px] text-slate-400 font-medium">Conexão estável em menos de 1 minuto</span>
            </div>
          </div>

          {/* Card 3: Disparos & Campanhas em Massa */}
          <div className="glass-card rounded-3xl p-8 border-white/5 hover:border-purple-500/25 transition-all duration-300 group flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(168,85,247,0.08)]">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Disparos & Campanhas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Envie anúncios, alertas e promoções para listas selecionadas de contatos de forma automatizada. Configure atrasos inteligentes anti-bloqueio para manter a integridade do seu chip.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-white/5 pt-4">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium">Relatórios de entrega em tempo real</span>
            </div>
          </div>

          {/* Card 4: Painel White Label */}
          <div className="glass-card rounded-3xl p-8 border-white/5 hover:border-pink-500/25 transition-all duration-300 group flex flex-col justify-between hover:shadow-[0_15px_30px_rgba(236,72,153,0.08)]">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Painel White Label</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Personalize totalmente o painel com a marca, logo e domínio da sua própria empresa. Ideal para agências de marketing e revendedores que desejam vender um CRM como produto próprio.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-white/5 pt-4">
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              <span className="text-[10px] text-slate-400 font-medium">Faturamento 100% sob seu controle</span>
            </div>
          </div>

        </div>
      </section>      {/* Seção de Planos com Chamada para Ação para a página completa */}
      <section id="planos" className="container py-24 border-t border-white/5 relative z-10">
        <div className="relative w-full max-w-4xl mx-auto rounded-[32px] bg-gradient-to-tr from-purple-950/30 to-indigo-950/20 border border-purple-500/20 p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-[0_20px_50px_rgba(99,102,241,0.1)] overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="text-left flex-1 space-y-4">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
              <span>Teste Grátis por 14 Dias</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Encontre o plano ideal <br className="hidden md:block"/>
              para a sua escala
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-lg">
              Compare Starter, Pro e Enterprise. Atendentes ilimitados, automação com IA e White Label para o seu negócio deslanchar.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-center gap-3">
            <button 
              onClick={() => setLocation("/planos")} 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-8 py-3.5 rounded-full shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 group"
            >
              <span>Ver Tabela de Preços</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <span className="text-[10px] text-slate-500 font-semibold">Sem compromisso. Cancele quando quiser.</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container py-24 border-t border-white/5 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-4">
          <div className="space-y-3.5">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Perguntas Frequentes</h2>
            <p className="text-slate-400 text-xs md:text-sm">
              Tem alguma dúvida sobre o funcionamento do Project ES? Confira as respostas rápidas abaixo.
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
                  {/* Hexagon bubble outline */}
                  <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="#0c0d1b" stroke="currentColor" strokeWidth="6" />
                  {/* Inner text bubbles lines */}
                  <path d="M35 38 H65 M35 50 H65 M35 62 H55" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  {/* Speech bubble tail */}
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

            {/* Right side: Solid Blue CTA Box (Bee CRM Style) */}
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
                <li><a href="#recursos" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="/contato" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="/planos" className="hover:text-white transition-colors">Planos</a></li>
              </ul>
            </div>

            {/* Column 3: Suporte */}
            <div className="space-y-4">
              <h5 className="text-[14px] font-bold text-blue-400">Suporte</h5>
              <ul className="space-y-2.5 text-[12px] text-slate-300">
                <li><a href="/ajuda" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Perguntas Frequentes</a></li>
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
