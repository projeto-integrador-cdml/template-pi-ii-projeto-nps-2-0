import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

let cachedRules: any = null;

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function loadRules(): any {
  if (cachedRules) return cachedRules;
  try {
    const filePath = path.resolve(process.cwd(), "regras_clinica.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      cachedRules = JSON.parse(data);
      return cachedRules;
    }
  } catch (err: any) {
    console.error("[RulesEngine] Erro ao carregar regras_clinica.json:", err.message);
  }
  return { unidades: { lista_geral_procedimentos: [], unidades_atendimento: {} }, convenios: {} };
}

export function consultarConvenio(convenioNome: string): RuleResult {
  const rules = loadRules();
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

  // 2. Busca nos convênios cadastrados
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
    detalhes: "Convênio não localizado na tabela oficial de credenciados.",
  };
}

export function verificarProcedimentoUnidade(procedimento: string, unidadeChave: string): { permitido: boolean; motivo?: string } {
  const rules = loadRules();
  const unidades = rules.unidades?.unidades_atendimento || {};
  const normUnit = normalize(unidadeChave);

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
}): RuleResult {
  const rules = loadRules();
  const res: RuleResult = {
    encontrado: false,
    aceito: true,
    transferirHumano: false,
  };

  if (params.convenioNome) {
    const convRes = consultarConvenio(params.convenioNome);
    Object.assign(res, convRes);
    if (convRes.transferirHumano) {
      return res;
    }
  }

  if (params.unidade && params.procedimento) {
    const unitRes = verificarProcedimentoUnidade(params.procedimento, params.unidade);
    if (!unitRes.permitido) {
      res.unidadePermitida = false;
      res.mensagemRestricao = unitRes.motivo;
    } else {
      res.unidadePermitida = true;
    }
  }

  return res;
}
