
export interface ExtractedCardData {
  nome_paciente?: string;
  operadora?: string;
  plano?: string;
  categoria?: string;
  numero_carteirinha?: string;
  validade?: string;
}

export interface CardValidationResult {
  valido: boolean;
  motivoBloqueio?: string;
  dadosExtraidos: ExtractedCardData;
}

export async function processarCarteirinha(params: {
  apiKey: string;
  model?: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<CardValidationResult> {
  const { apiKey, model = "gemini-2.5-flash", imageUrl, imageBase64, mimeType = "image/jpeg" } = params;

  if (!apiKey) {
    throw new Error("Chave de API do Gemini não configurada.");
  }

  let inlineData: { data: string; mimeType: string } | null = null;

  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    inlineData = { data: cleanBase64, mimeType };
  } else if (imageUrl) {
    try {
      const resp = await fetch(imageUrl);
      const arrayBuffer = await resp.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString("base64");
      const detectedMime = resp.headers.get("content-type") || mimeType;
      inlineData = { data: b64, mimeType: detectedMime };
    } catch (err: any) {
      throw new Error(`Falha ao baixar imagem da carteirinha: ${err.message}`);
    }
  }

  if (!inlineData) {
    throw new Error("Nenhuma imagem fornecida para análise.");
  }

  const prompt = `Você é um leitor de carteirinhas de planos de saúde brasileiro.
Analise a imagem da carteirinha de convênio médico com precisão.
Devolva estritamente um objeto JSON (sem markdown, sem explicações extras) com a seguinte estrutura:
{
  "nome_paciente": "Nome completo do beneficiário ou titular",
  "operadora": "Nome da operadora do plano de saúde (ex: Bradesco Saúde, Unimed, CASSI, MedSênior, etc.)",
  "plano": "Nome do plano se visível",
  "categoria": "Categoria da carteirinha (ex: Essencial, Básico, Especial, Premium, etc.)",
  "numero_carteirinha": "Número da carteirinha ou matrícula",
  "validade": "Data de validade no formato DD/MM/AAAA ou MM/AAAA (ou 'Indeterminada' se não houver)"
}`;

  let rawOutput = "";
  try {
    // Chamada direta à API do Google Generative Language
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro na API Gemini (${response.status}): ${errText}`);
    }

    const data = await response.json();
    rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  } catch (err: any) {
    throw new Error(`Falha no OCR da carteirinha: ${err.message}`);
  }

  let extracted: ExtractedCardData = {};
  try {
    extracted = JSON.parse(rawOutput);
  } catch {
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    }
  }

  // Barreira de Regras: Filtro de Negativos
  const operadoraNorm = (extracted.operadora || "").toLowerCase();
  const categoriaNorm = (extracted.categoria || "").toLowerCase();
  const planoNorm = (extracted.plano || "").toLowerCase();

  // 1. Regra Seguros Unimed
  if (operadoraNorm.includes("seguros unimed") || operadoraNorm.includes("seguros-unimed")) {
    return {
      valido: false,
      motivoBloqueio: "Identificamos que sua carteirinha é da Seguros Unimed. Informamos que atendemos exclusivamente a Unimed Nacional (SAW).",
      dadosExtraidos: extracted,
    };
  }

  // 2. Regra CASSI Essencial
  if (operadoraNorm.includes("cassi") && (categoriaNorm.includes("essencial") || planoNorm.includes("essencial"))) {
    return {
      valido: false,
      motivoBloqueio: "Identificamos que seu plano CASSI está na categoria Essencial. Esta categoria não possui cobertura em nossas unidades.",
      dadosExtraidos: extracted,
    };
  }

  // 3. Regra MedSênior Essencial
  if (operadoraNorm.includes("medsenior") && (categoriaNorm.includes("essencial") || planoNorm.includes("essencial"))) {
    return {
      valido: false,
      motivoBloqueio: "Identificamos que seu plano MedSênior está na categoria Essencial. Não atendemos a carteirinha Essencial em nossas unidades.",
      dadosExtraidos: extracted,
    };
  }

  // 4. Validade
  if (extracted.validade && extracted.validade !== "Indeterminada") {
    const parts = extracted.validade.split(/[\/\-]/);
    if (parts.length >= 2) {
      let expDate: Date | null = null;
      if (parts.length === 3) {
        // DD/MM/YYYY
        expDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else if (parts.length === 2) {
        // MM/YYYY
        expDate = new Date(parseInt(parts[1]), parseInt(parts[0]), 0);
      }
      if (expDate && !isNaN(expDate.getTime()) && expDate < new Date()) {
        return {
          valido: false,
          motivoBloqueio: `A validade da sua carteirinha expirou em ${extracted.validade}. Por favor, verifique com sua operadora.`,
          dadosExtraidos: extracted,
        };
      }
    }
  }

  return {
    valido: true,
    dadosExtraidos: extracted,
  };
}
