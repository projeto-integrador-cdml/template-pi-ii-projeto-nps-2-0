import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Lock, Mail, User, Phone, ArrowLeft, ShieldCheck, 
  CreditCard, Sparkles, AlertCircle, CheckCircle2 
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: string;
  desc: string;
};

const plans: Record<string, Plan> = {
  starter: { id: "starter", name: "Starter", price: "R$ 97/mês", desc: "1 Atendente, Áudio Humanizado básico" },
  pro: { id: "pro", name: "Pro", price: "R$ 197/mês", desc: "Até 5 Atendentes, Áudio Humanizado ilimitado, Assistente IA" },
  enterprise: { id: "enterprise", name: "Enterprise", price: "R$ 397/mês", desc: "Atendentes ilimitados, suporte VIP" },
};

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  // Obter o plano selecionado da URL
  const queryParams = new URLSearchParams(window.location.search);
  const selectedPlanId = queryParams.get("plan") || "";
  const selectedPlan = plans[selectedPlanId];

  const [loginRole, setLoginRole] = useState<"admin" | "attendant">("admin");
  const [isLogin, setIsLogin] = useState<boolean>(!selectedPlan);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<number>(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const loginMutation = trpc.auth.login.useMutation();
  const loginAttendantMutation = trpc.attendants.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  // Redireciona se o usuário já estiver logado
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      if (loginRole === "admin") {
        const res = await loginMutation.mutateAsync({ email, password });
        if (res.success) {
          localStorage.removeItem("attendant_token");
          toast.success(`Bem-vindo de volta, ${res.user?.name || "Usuário"}!`);
          utils.auth.me.setData(undefined, res.user as any);
          setLocation("/dashboard");
        }
      } else {
        const res = await loginAttendantMutation.mutateAsync({ email, password });
        if (res.token) {
          localStorage.setItem("attendant_token", res.token);
          toast.success(`Bem-vindo de volta, ${res.attendant?.name || "Atendente"}!`);
          utils.auth.me.setData(undefined, {
            id: res.attendant.id,
            openId: `attendant-${res.attendant.id}`,
            name: res.attendant.name,
            email: res.attendant.email,
            role: "attendant" as any,
            companyId: res.attendant.companyId,
            isActive: true,
          } as any);
          setLocation("/dashboard");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Por favor, preencha os campos obrigatórios (Nome, Email e Senha).");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    // Se selecionou um plano, passa para a etapa de pagamento (Checkout simulado)
    if (selectedPlan) {
      setCheckoutStep(1);
    } else {
      // Se não escolheu plano, faz cadastro direto de teste
      executeRegistration();
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardHolder || !cardNumber || !cardExpiry || !cardCvv) {
      toast.error("Preencha todas as informações de pagamento.");
      return;
    }
    
    setLoading(true);
    // Simular processamento do gateway de pagamento
    setTimeout(() => {
      executeRegistration();
    }, 2000);
  };

  const executeRegistration = async () => {
    setLoading(true);
    try {
      const res = await registerMutation.mutateAsync({
        name,
        email,
        password,
        phone: phone || undefined,
      });

      if (res.success) {
        if (selectedPlan) {
          setCheckoutStep(2); // Vai para tela de parabéns/sucesso
        } else {
          toast.success("Cadastro realizado com sucesso!");
          utils.auth.me.setData(undefined, res.user as any);
          setLocation("/dashboard");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro.");
      setCheckoutStep(0); // Volta para o form se der erro
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    utils.auth.me.invalidate();
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between py-12 relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-[10%] left-[-15%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-15%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="container max-w-lg mx-auto flex items-center justify-between px-6 z-10">
        <button 
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
          Voltar para Home
        </button>
        <span className="font-extrabold text-sm tracking-tight gradient-text">GM CRM</span>
      </header>

      {/* Main Container */}
      <main className="container max-w-lg mx-auto p-4 z-10">
        {/* LOGIN SCREEN */}
        {isLogin && (
          <Card className="glass-card shadow-2xl">
            <CardHeader className="space-y-2 text-center pb-2">
              <CardTitle className="text-xl font-bold tracking-tight">Fazer Login</CardTitle>
              <CardDescription className="text-xs">Digite suas credenciais para entrar no GM CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/20 border border-border/10 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setLoginRole("admin")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    loginRole === "admin"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                  }`}
                >
                  Administrador
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("attendant")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    loginRole === "attendant"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                  }`}
                >
                  Atendente
                </button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemplo@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs">Senha</Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 text-xs mt-2">
                  {loading ? "Entrando..." : "Entrar no Painel"}
                </Button>

                <div className="text-center text-xs mt-4">
                  <span className="text-muted-foreground">Não tem uma assinatura? </span>
                  <button 
                    type="button" 
                    onClick={() => { setIsLogin(false); }}
                    className="text-primary font-medium hover:underline"
                  >
                    Adquirir Acesso
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* SIGNUP / CHECKOUT FLOW */}
        {!isLogin && (
          <Card className="glass-card shadow-2xl">
            {/* Indicador de Passos no Checkout */}
            {selectedPlan && (
              <div className="flex justify-center border-b border-border/20 py-3 bg-muted/10">
                <div className="flex items-center gap-6 text-[10px] font-semibold text-muted-foreground">
                  <span className={checkoutStep >= 0 ? "text-primary" : ""}>1. Cadastro</span>
                  <span className="h-px w-6 bg-border" />
                  <span className={checkoutStep >= 1 ? "text-primary" : ""}>2. Pagamento</span>
                  <span className="h-px w-6 bg-border" />
                  <span className={checkoutStep >= 2 ? "text-primary" : ""}>3. Acesso</span>
                </div>
              </div>
            )}

            {/* Passo 0: Form de Cadastro */}
            {checkoutStep === 0 && (
              <>
                <CardHeader className="space-y-2 text-center pb-2">
                  <CardTitle className="text-xl font-bold tracking-tight">Criar Sua Conta</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedPlan 
                      ? `Você selecionou o plano ${selectedPlan.name} (${selectedPlan.price})`
                      : "Preencha os dados abaixo para iniciar sua conta de teste"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-name" className="text-xs">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="João da Silva"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-9 h-10 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-xs">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="joao@gmail.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-10 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-phone" className="text-xs">Telefone / WhatsApp (Opcional)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 h-10 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-pass" className="text-xs">Crie uma Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-pass"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 h-10 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-10 text-xs mt-2">
                      {selectedPlan ? "Ir para Pagamento" : "Criar Minha Conta"}
                    </Button>

                    <div className="text-center text-xs mt-4">
                      <span className="text-muted-foreground">Já possui uma conta? </span>
                      <button 
                        type="button" 
                        onClick={() => { setIsLogin(true); }}
                        className="text-primary font-medium hover:underline"
                      >
                        Entrar agora
                      </button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

            {/* Passo 1: Pagamento Simulado */}
            {checkoutStep === 1 && selectedPlan && (
              <>
                <CardHeader className="space-y-2 text-center pb-2">
                  <CardTitle className="text-xl font-bold tracking-tight flex items-center justify-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Checkout Seguro
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Assinatura do Plano **{selectedPlan.name}** · <span className="text-foreground font-semibold">{selectedPlan.price}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-[10px] text-muted-foreground leading-relaxed mb-4 flex gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Esta é uma simulação de pagamento. Digite qualquer dado fictício de teste abaixo para liberar seu acesso imediatamente.</span>
                  </div>

                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="card-name" className="text-xs">Nome no Cartão</Label>
                      <Input
                        id="card-name"
                        type="text"
                        placeholder="JOAO S ALVES"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="h-10 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="card-num" className="text-xs">Número do Cartão</Label>
                      <Input
                        id="card-num"
                        type="text"
                        placeholder="4444 5555 6666 7777"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="h-10 text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="card-exp" className="text-xs">Validade</Label>
                        <Input
                          id="card-exp"
                          type="text"
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="h-10 text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="card-cvv" className="text-xs">CVV</Label>
                        <Input
                          id="card-cvv"
                          type="password"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="h-10 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold py-2 border-t border-border/20 mt-4">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> Total Pago hoje
                      </span>
                      <span className="text-lg text-primary">{selectedPlan.price}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setCheckoutStep(0)} className="w-[30%] h-10 text-xs">
                        Voltar
                      </Button>
                      <Button type="submit" disabled={loading} className="w-[70%] h-10 text-xs bg-emerald-600 hover:bg-emerald-700">
                        {loading ? "Processando..." : "Confirmar Assinatura"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

            {/* Passo 2: Sucesso/Acesso */}
            {checkoutStep === 2 && selectedPlan && (
              <CardContent className="py-10 text-center space-y-6">
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Parabéns, sua assinatura do plano **{selectedPlan.name}** foi ativa. Sua conta do painel administrativo do GM CRM está liberada!
                  </p>
                </div>

                <div className="p-4 bg-muted/20 border border-border/10 rounded-xl max-w-xs mx-auto text-left space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Usuário:</span>
                    <span className="font-semibold text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Plano:</span>
                    <span className="font-semibold text-primary">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-semibold text-emerald-500">Ativo</span>
                  </div>
                </div>

                <Button onClick={handleGoToDashboard} className="w-full max-w-xs h-10 text-xs mt-4">
                  Acessar Meu Painel
                </Button>
              </CardContent>
            )}
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="container max-w-lg mx-auto text-center px-6 z-10">
        <p className="text-[10px] text-muted-foreground/60">
          GM CRM &copy; 2026 · Conexão Criptografada e Segura SSL
        </p>
      </footer>
    </div>
  );
}
