import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface AIAuditLogEntry {
  id: string;
  timestamp: string;
  companyId: number;
  sessionId: string;
  clientPhone: string;
  rawPrompt: string;
  aiResponse: string;
  tokens: {
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
  };
  toolsTriggered: string[];
  handoffTriggered: boolean;
  handoffReason?: string | null;
  assignedAttendantId?: number | null;
  assignedAttendantName?: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const LOG_FILE = path.resolve(DATA_DIR, "ai_audit_logs.json");

function ensureLogFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err: any) {
    console.error("[AILogger] Erro ao criar diretório de logs:", err.message);
  }
}

export function logAIOperation(entry: Omit<AIAuditLogEntry, "id" | "timestamp">): AIAuditLogEntry {
  ensureLogFile();
  const completeEntry: AIAuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  try {
    let logs: AIAuditLogEntry[] = [];
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, "utf-8");
      try {
        logs = JSON.parse(content);
        if (!Array.isArray(logs)) logs = [];
      } catch {
        logs = [];
      }
    }

    logs.push(completeEntry);
    // Limita tamanho para últimos 5.000 logs em memória/arquivo
    if (logs.length > 5000) {
      logs = logs.slice(-5000);
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err: any) {
    console.error("[AILogger] Erro ao gravar log de auditoria em .json:", err.message);
  }

  return completeEntry;
}

export function getAuditLogs(companyId?: number, limit = 50): AIAuditLogEntry[] {
  ensureLogFile();
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    const logs: AIAuditLogEntry[] = JSON.parse(content);
    if (!Array.isArray(logs)) return [];

    let filtered = logs;
    if (companyId) {
      filtered = logs.filter(l => l.companyId === companyId);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  } catch (err: any) {
    console.error("[AILogger] Erro ao ler logs de auditoria:", err.message);
    return [];
  }
}
