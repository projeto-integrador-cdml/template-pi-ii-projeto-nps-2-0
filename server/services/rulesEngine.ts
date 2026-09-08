import fs from "fs";
import path from "path";

export interface RuleResult {
  encontrado: boolean;
  convenioNome?: string;
  aceito: boolean;
  transferirHumano: boolean;
  motivoTransferencia?: string;
  autorizacao?: string | null;
  observacoes?: string | null;
  elegibilidade?: string | null;
  procedimentosPermitidos?: string[];
  unidadePermitida?: boolean;
  mensagemRestricao?: string;
  detalhes?: string;
}

const rulesCache: Record<number | string, any> = {};

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Carrega regras isoladas por empresa.
 * - Empresa 54 (Espaço Physio): carrega as regras completas da clínica (4 unidades, 38 convênios, TotalPass/Wellhub, etc.)
 * - Outras empresas: carregam data/company_rules/company_${companyId}.json ou perfil genérico vazio.
 */
export function loadRules(companyId?: number): any {
  const key = companyId ?? "default";
  if (rulesCache[key]) return rulesCache[key];

  // 1. Verifica se existe arquivo customizado de regras para a empresa
  if (companyId) {
    const customPath = path.resolve(process.cwd(), "data", "company_rules", `company_${companyId}.json`);
    if (fs.existsSync(customPath)) {
      try {
        const data = fs.readFileSync(customPath, "utf-8");
        const parsed = JSON.parse(data);
        rulesCache[key] = parsed;
        return parsed;
      } catch (err: any) {
        console.error(`[RulesEngine] Erro ao ler regras da empresa ${companyId}:`, err.message);
      }
    }
  }

  // 2. Se for a conta Espaço Physio (ID 54), carrega as regras da clínica fisioterápica
  const isEspacoPhysio = companyId === 54;
  if (isEspacoPhysio) {
    try {
      const filePath = path.resolve(process.cwd(), "regras_clinica.json");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(data);
        const clinicProfile = {
          companyId: 54,
          isClinic: true,
          profileName: "Espaço Physio (Clínica • 4 Unidades • 38 Convênios)",
          ...parsed,
        };
        rulesCache[key] = clinicProfile;
        return clinicProfile;
      }
    } catch (err: any) {
      console.error("[RulesEngine] Erro ao carregar regras_clinica.json para Espaço Physio:", err.message);
    }
  }

  // 3. Para outras empresas (ou sem ID), retorna perfil padrão sem regras de convênios/unidades clínicas
  const defaultProfile = {
    companyId: companyId || 0,
    isClinic: false,
    profileName: "CRM Padrão / Empresa",
    unidades: { lista_geral_procedimentos: [], unidades_atendimento: {} },
    convenios: {},
    regrasGerais: [],
    transferirHumanoGatilhos: [],
  };
  rulesCache[key] = defaultProfile;
  return defaultProfile;
}

/**
 * Salva regras customizadas para uma empresa específica
 */
export async function saveCompanyRules(companyId: number, rules: any): Promise<void> {
  const dir = path.resolve(process.cwd(), "data", "company_rules");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `company_${companyId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(rules, null, 2), "utf-8");
  delete rulesCache[companyId];
  delete rulesCache["default"];
}

export function consultarConvenio(convenioNome: string, companyId?: number): RuleResult {
  const rules = loadRules(companyId);
  const convenios = rules.convenios || {};
  const normInput = normalize(convenioNome);

  if (!normInput) {
    return {
      encontrado: false,
      aceito: false,
      transferirHumano: false,
      mensagemRestricao: "Nome do convênio não informado.",
    };
  }

  // Se não for empresa clínica e não houver convênios cadastrados
  if (!rules.isClinic && Object.keys(convenios).length === 0) {
    return {
      encontrado: false,
      aceito: false,
      transferirHumano: false,
      detalhes: "Esta empresa opera em modo CRM comercial e não possui regras de convênios clínicos ativas.",
    };
  }

  // Regras específicas de clínicas (Espaço Physio)
  if (rules.isClinic) {
    // 1. Checagem direta de gatilhos prioritários de transferência humana
    if (normInput.includes("totalpass")) {
      return {
        encontrado: true,
        convenioNome: "TOTALPASS",
        aceito: false,
        transferirHumano: true,
        motivoTransferencia: "TotalPass possui agendamento prévio e atendimento exclusivo com a recepção humana.",
        observacoes: "Somente agendamento prévio.",
        elegibilidade: "Transferir para atendente",
      };
    }

    if (normInput.includes("wellhub") || normInput.includes("gympass")) {
      return {
        encontrado: true,
        convenioNome: "WELLHUB / GYMPASS",
        aceito: false,
        transferirHumano: true,
        motivoTransferencia: "Wellhub / Gympass requer validação de check-in diário e agendamento direto com a recepção.",
        observacoes: "Somente agendamento prévio.",
        elegibilidade: "Transferir para atendente",
      };
    }

    if (normInput.includes("classpass")) {
      return {
        encontrado: true,
        convenioNome: "CLASSPASS",
        aceito: false,
        transferirHumano: true,
        motivoTransferencia: "Vagas do ClassPass são geridas exclusivamente pelo aplicativo parceiro.",
        observacoes: "Disponibilidade de vagas gerenciada exclusivamente pelo aplicativo.",
        elegibilidade: "Transferir para atendente",
      };
    }

    if (normInput.includes("segurosunimed") || (normInput.includes("seguros") && normInput.includes("unimed"))) {
      return {
        encontrado: true,
        convenioNome: "Seguros Unimed",
        aceito: false,
        transferirHumano: false,
        observacoes: "Não atendemos Seguros Unimed. Aceitamos apenas Unimed Nacional (SAW).",
        mensagemRestricao: "Não atendemos Seguros Unimed. Aceitamos apenas Unimed Nacional (SAW).",
      };
    }

    if (normInput.includes("unimed")) {
      const item = convenios["unimed_saw"];
      if (item) {
        return {
          encontrado: true,
          convenioNome: item.nome,
          aceito: true,
          transferirHumano: false,
          autorizacao: item.autorizacao,
          observacoes: item.observacoes,
          procedimentosPermitidos: item.procedimentos,
        };
      }
    }
  }

  // 2. Busca nos convênios cadastrados da empresa
  for (const key of Object.keys(convenios)) {
    const item = convenios[key];
    const normKey = normalize(key);
    const normName = normalize(item.nome);

    if (
      normInput.includes(normKey) || 
      normInput.includes(normName) || 
      normKey.includes(normInput) || 
      normName.includes(normInput) ||
      key.split("_").some(k => k.length >= 4 && normInput.includes(k))
    ) {
      return {
        encontrado: true,
        convenioNome: item.nome,
        aceito: !item.transferir_humano,
        transferirHumano: !!item.transferir_humano,
        motivoTransferencia: item.transferir_humano ? (item.observacoes || "Transferir para atendente") : undefined,
        autorizacao: item.autorizacao,
        observacoes: item.observacoes,
        elegibilidade: item.elegibilidade,
        procedimentosPermitidos: item.procedimentos,
      };
    }
  }

  return {
    encontrado: false,
    aceito: false,
    transferirHumano: false,
    detalhes: rules.isClinic 
      ? "Convênio não localizado na tabela oficial de credenciados."
      : "Regra não localizada.",
  };
}

export function verificarProcedimentoUnidade(procedimento: string, unidadeChave: string, companyId?: number): { permitido: boolean; motivo?: string } {
  const rules = loadRules(companyId);
  const unidades = rules.unidades?.unidades_atendimento || {};
  const normUnit = normalize(unidadeChave);

  if (!rules.isClinic && Object.keys(unidades).length === 0) {
    return { permitido: true };
  }

  let targetUnit: any = null;
  for (const k of Object.keys(unidades)) {
    if (normalize(k) === normUnit || normalize(unidades[k].nome) === normUnit) {
      targetUnit = unidades[k];
      break;
    }
  }

  if (!targetUnit) {
    return { permitido: true };
  }

  const naoAtende: string[] = targetUnit.nao_atende || [];
  const normProc = normalize(procedimento);

  for (const blocked of naoAtende) {
    if (normProc.includes(normalize(blocked)) || normalize(blocked).includes(normProc)) {
      return {
        permitido: false,
        motivo: `A unidade ${targetUnit.nome} não realiza o procedimento ${blocked}.`,
      };
    }
  }

  return { permitido: true };
}

export function consultarRegras(params: {
  convenioNome?: string;
  procedimento?: string;
  unidade?: string;
  companyId?: number;
}): RuleResult {
  const rules = loadRules(params.companyId);
  const res: RuleResult = {
    encontrado: false,
    aceito: true,
    transferirHumano: false,
  };

  if (params.convenioNome) {
    const convRes = consultarConvenio(params.convenioNome, params.companyId);
    Object.assign(res, convRes);
    if (convRes.transferirHumano) {
      return res;
    }
  }

  if (params.unidade && params.procedimento) {
    const unitRes = verificarProcedimentoUnidade(params.procedimento, params.unidade, params.companyId);
    if (!unitRes.permitido) {
      res.unidadePermitida = false;
      res.mensagemRestricao = unitRes.motivo;
    } else {
      res.unidadePermitida = true;
    }
  }

  return res;
}
