import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme, type SidebarSide } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  Users,
  Target,
  CheckSquare,
  Bot,
  Mic,
  Settings,
  LogOut,
  PanelLeft,
  Shield,
  MessageCircle,
  UserCheck,
  BarChart3,
  Sun,
  Moon,
  Check,
  Paintbrush,
  PanelRight,
  GripVertical,
} from "lucide-react";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: Target, label: "Funil de Vendas", path: "/pipeline" },
  { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
  { icon: Bot, label: "Assistente IA", path: "/ai" },
  { icon: Mic, label: "Gravações", path: "/recordings" },
  { icon: MessageCircle, label: "WhatsApp", path: "/whatsapp" },
  { icon: BarChart3, label: "Relatórios", path: "/reports" },
];

const adminMenuItems = [
  { icon: Shield, label: "Usuários", path: "/admin/users" },
  { icon: UserCheck, label: "Atendentes", path: "/admin/attendants" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { sidebarSide } = useTheme();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
    }
  }, [loading, user, setLocation]);

  if (loading || !user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        sidebarSide={sidebarSide}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  sidebarSide: SidebarSide;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  sidebarSide,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme, palette, setPalette, setSidebarSide, buttonPosition, setButtonPosition } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const allItems = [...menuItems, ...(user?.role === "admin" ? adminMenuItems : [])];
  const activeMenuItem = allItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  // Draggable button state
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [btnPos, setBtnPos] = useState<{ x: number; y: number }>(() => {
    // -1 means "use default bottom-right corner"
    if (buttonPosition.x === -1) return { x: -1, y: -1 };
    return buttonPosition;
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  // Sidebar resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      let newWidth: number;
      if (sidebarSide === "right") {
        newWidth = window.innerWidth - e.clientX;
      } else {
        newWidth = e.clientX - sidebarLeft;
      }
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth, sidebarSide]);

  // Draggable customize button
  const handleBtnMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    isDragging.current = false;
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const onMouseMove = (me: MouseEvent) => {
      isDragging.current = true;
      const x = me.clientX - dragOffset.current.x;
      const y = me.clientY - dragOffset.current.y;
      const clampedX = Math.max(0, Math.min(x, window.innerWidth - 44));
      const clampedY = Math.max(0, Math.min(y, window.innerHeight - 44));
      setBtnPos({ x: clampedX, y: clampedY });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (isDragging.current) {
        // Save position after drag ends
        setBtnPos(prev => {
          if (prev.x !== -1) {
            setButtonPosition(prev);
          }
          return prev;
        });
      } else {
        // It was a click
        setCustomizeOpen(true);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [setButtonPosition]);

  // Touch support for draggable button
  const handleBtnTouchStart = useCallback((e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    isDragging.current = false;
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    const onTouchMove = (te: TouchEvent) => {
      isDragging.current = true;
      const t = te.touches[0];
      const x = Math.max(0, Math.min(t.clientX - dragOffset.current.x, window.innerWidth - 44));
      const y = Math.max(0, Math.min(t.clientY - dragOffset.current.y, window.innerHeight - 44));
      setBtnPos({ x, y });
    };

    const onTouchEnd = () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      if (isDragging.current) {
        setBtnPos(prev => {
          if (prev.x !== -1) setButtonPosition(prev);
          return prev;
        });
      } else {
        setCustomizeOpen(true);
      }
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  }, [setButtonPosition]);

  // Sync btnPos from context when it changes (e.g. loaded from server)
  useEffect(() => {
    if (buttonPosition.x !== -1) {
      setBtnPos(buttonPosition);
    }
  }, [buttonPosition]);

  // Compute the floating button style
  const floatingBtnStyle: CSSProperties =
    btnPos.x === -1
      ? { position: "fixed", bottom: 24, right: 24, zIndex: 50 }
      : { position: "fixed", left: btnPos.x, top: btnPos.y, zIndex: 50 };

  const sidebarEl = (
    <div className="relative" ref={sidebarRef}>
      <Sidebar
        collapsible="icon"
        className="border-r-0"
        disableTransition={isResizing}
        side={sidebarSide}
      >
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 transition-all w-full">
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
              aria-label="Toggle navigation"
            >
              <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
            </button>
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold tracking-tight truncate gradient-text text-lg">
                  Project ES
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 pt-2">
          <SidebarMenu className="px-2 py-1 space-y-0.5">
            {menuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-10 transition-all font-normal"
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-sidebar-foreground/60"}`} />
                    <span className={isActive ? "text-primary font-medium" : ""}>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          {user?.role === "admin" && (
            <>
              <div className="px-4 py-3">
                <div className="h-px bg-sidebar-border" />
              </div>
              {!isCollapsed && (
                <div className="px-4 pb-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                    Administração
                  </span>
                </div>
              )}
              <SidebarMenu className="px-2 py-1 space-y-0.5">
                {adminMenuItems.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-10 transition-all font-normal"
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-sidebar-foreground/60"}`} />
                        <span className={isActive ? "text-primary font-medium" : ""}>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                    {user?.name || "-"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate mt-1.5">
                    {user?.role === "admin" ? "Administrador" : "Usuário"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCustomizeOpen(true)} className="cursor-pointer">
                <Paintbrush className="mr-2 h-4 w-4" />
                <span>Personalizar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      {/* Resize handle */}
      <div
        className={`absolute top-0 ${sidebarSide === "right" ? "left-0" : "right-0"} w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
        onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
        style={{ zIndex: 50 }}
      />
    </div>
  );

  return (
    <>
      {sidebarSide === "left" && sidebarEl}

      <SidebarInset className="relative min-w-0 flex-1">
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground font-medium">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCustomizeOpen(true)}
              className="h-9 w-9 rounded-lg mr-1 text-primary hover:text-primary"
              title="Personalizar Aparência"
            >
              <Paintbrush className="h-4.5 w-4.5" />
            </Button>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>

      {sidebarSide === "right" && sidebarEl}

      {/* Floating Draggable Customize Button (desktop only) */}
      {!isMobile && (
        <button
          ref={btnRef}
          id="customize-btn"
          style={floatingBtnStyle}
          onMouseDown={handleBtnMouseDown}
          onTouchStart={handleBtnTouchStart}
          title="Personalizar Aparência — arraste para mover"
          className="h-11 w-11 rounded-full glass-card border border-border shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform text-primary select-none group"
          aria-label="Personalizar"
        >
          <GripVertical className="h-3 w-3 absolute top-1 left-1/2 -translate-x-1/2 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
          <Paintbrush className="h-4.5 w-4.5" />
        </button>
      )}

      {/* Customize Modal */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-[460px] glass-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Paintbrush className="h-5 w-5 text-primary" />
              Personalizar Painel
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              As preferências são salvas automaticamente para sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">

            {/* Tema */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tema</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all focus:outline-none ${
                    theme === "light"
                      ? "border-primary bg-primary/10 text-primary shadow-sm font-semibold"
                      : "border-border hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all focus:outline-none ${
                    theme === "dark"
                      ? "border-primary bg-primary/10 text-primary shadow-sm font-semibold"
                      : "border-border hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  Escuro
                </button>
              </div>
            </div>

            {/* Cores */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paleta de Cores ({theme === "light" ? "Tons Pastel" : "Cores Neon"})
              </h4>
              <div className="grid grid-cols-5 gap-2.5">
                {(["green", "red", "orange", "pink", "yellow"] as const).map((colorName) => {
                  const bgPreview =
                    theme === "light"
                      ? {
                          green: "bg-[oklch(0.72_0.12_145)]",
                          red: "bg-[oklch(0.70_0.15_25)]",
                          orange: "bg-[oklch(0.70_0.16_48)]",
                          pink: "bg-[oklch(0.71_0.14_330)]",
                          yellow: "bg-[oklch(0.78_0.13_85)]",
                        }[colorName]
                      : {
                          green: "bg-[oklch(0.75_0.25_145)] shadow-[0_0_10px_oklch(0.75_0.25_145/40%)]",
                          red: "bg-[oklch(0.65_0.25_25)] shadow-[0_0_10px_oklch(0.65_0.25_25/40%)]",
                          orange: "bg-[oklch(0.70_0.20_50)] shadow-[0_0_10px_oklch(0.70_0.20_50/40%)]",
                          pink: "bg-[oklch(0.65_0.26_330)] shadow-[0_0_10px_oklch(0.65_0.26_330/40%)]",
                          yellow: "bg-[oklch(0.80_0.22_95)] shadow-[0_0_10px_oklch(0.80_0.22_95/40%)]",
                        }[colorName];

                  const label = {
                    green: "Verde",
                    red: "Vermelho",
                    orange: "Laranja",
                    pink: "Rosa",
                    yellow: "Amarelo",
                  }[colorName];

                  const active = palette === colorName;

                  return (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => setPalette(colorName)}
                      className="flex flex-col items-center gap-1.5 focus:outline-none group"
                      title={label}
                    >
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${bgPreview} ${
                          active
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                      >
                        {active && (
                          <Check className={`h-4 w-4 ${
                            colorName === "yellow" || (colorName === "green" && theme === "light")
                              ? "text-black"
                              : "text-white"
                          }`} />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posição da Sidebar */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Posição da Barra Lateral
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarSide("left")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all focus:outline-none ${
                    sidebarSide === "left"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <PanelLeft className="h-4 w-4" />
                  Esquerda
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarSide("right")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all focus:outline-none ${
                    sidebarSide === "right"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <PanelRight className="h-4 w-4" />
                  Direita
                </button>
              </div>
            </div>

            {/* Reset button position */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Botão Flutuante</p>
                <p className="text-xs text-muted-foreground mt-0.5">Arraste o botão para reposicionar</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBtnPos({ x: -1, y: -1 });
                  setButtonPosition({ x: -1, y: -1 });
                }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-accent/50"
              >
                Resetar posição
              </button>
            </div>

          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setCustomizeOpen(false)} className="text-xs h-9 px-4">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
