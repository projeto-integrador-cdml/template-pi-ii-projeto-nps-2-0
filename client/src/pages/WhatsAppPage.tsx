import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function WhatsAppPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-6">
      <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <MessageCircle className="h-10 w-10 text-emerald-500" />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold tracking-tight mb-2">WhatsApp</h1>
        <p className="text-muted-foreground">
          A integração com WhatsApp está preparada e pronta para ser conectada.
          Configure sua API key do WhatsApp Business para começar a enviar e receber mensagens dos seus clientes diretamente pelo CRM.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setLocation("/settings")}>
          <Settings className="h-4 w-4" /> Configurar
        </Button>
      </div>
      <div className="mt-4 p-4 rounded-lg border bg-accent/30 max-w-md">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Serviços compatíveis:</strong>
        </p>
        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
          <li>WhatsApp Business API (Meta)</li>
          <li>Evolution API</li>
          <li>Z-API</li>
          <li>Outros provedores de API WhatsApp</li>
        </ul>
      </div>
    </div>
  );
}
