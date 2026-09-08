import "dotenv/config";
import * as db from "../server/db";
import bcrypt from "bcryptjs";
import { loadRules, consultarConvenio, verificarProcedimentoUnidade, saveCompanyRules } from "../server/services/rulesEngine";

async function runValidationTests() {
  console.log("================================================================================");
  console.log(" INICIANDO TESTES DE VALIDAÇÃO: ESPAÇO PHYSIO & ISOLAMENTO MULTI-TENANT DE REGRAS");
  console.log("================================================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - Detalhes: ${detail}` : ""}`);
    }
  }

  // ── TESTE 1: Login e credenciais de espaçophysio@gmail.com ──
  console.log("\n--- TESTE 1: Validação de Conta e Credenciais (espaçophysio@gmail.com) ---");
  const targetEmail = "espaçophysio@gmail.com";
  const user = await db.getUserByEmail(targetEmail);

  assert(!!user, `Usuário '${targetEmail}' localizado no banco de dados`);
  if (user) {
    assert(user.id === 54, `ID do usuário Espaço Physio é 54 (atual: ${user.id})`);
    assert(user.role === "admin", `Role do usuário é 'admin' (atual: ${user.role})`);
    assert(user.isActive === true, `Conta está ativa`);

    const passwordMatch = await bcrypt.compare("Testevip123@", user.password || "");
    assert(passwordMatch, "Senha 'Testevip123@' bate exatamente com o hash bcrypt");
  }

  // ── TESTE 2: Isolamento do Motor de Regras para Espaço Physio (ID 54) ──
  console.log("\n--- TESTE 2: Motor de Regras para Espaço Physio (ID 54) ---");
  const physioRules = loadRules(54);
  assert(physioRules.isClinic === true, "isClinic é true para Espaço Physio");
  assert(Object.keys(physioRules.unidades?.unidades_atendimento || {}).length === 4, "Possui as 4 unidades (Asa Norte, Asa Sul, Noroeste, Lago Sul)");
  assert(Object.keys(physioRules.convenios || {}).length >= 35, `Possui os convênios homologados (total: ${Object.keys(physioRules.convenios || {}).length})`);

  // TotalPass -> Handoff imediato
  const totalpassCheck = consultarConvenio("TotalPass", 54);
  assert(totalpassCheck.transferirHumano === true, "TotalPass aciona transferência humana imediata");

  // Wellhub -> Handoff imediato
  const wellhubCheck = consultarConvenio("Wellhub", 54);
  assert(wellhubCheck.transferirHumano === true, "Wellhub/Gympass aciona transferência humana imediata");

  // Seguros Unimed -> Bloqueio
  const segurosUnimedCheck = consultarConvenio("Seguros Unimed", 54);
  assert(segurosUnimedCheck.aceito === false, "Seguros Unimed NÃO é aceito");

  // Unimed Nacional -> Aceito
  const unimedCheck = consultarConvenio("Unimed", 54);
  assert(unimedCheck.aceito === true, "Unimed Nacional SAW é aceito");

  // Restrição de Procedimento por Unidade
  const respAsaNorte = verificarProcedimentoUnidade("Fisioterapia Respiratória", "asa_norte", 54);
  assert(respAsaNorte.permitido === false, "Asa Norte bloqueia Fisioterapia Respiratória");

  const pilatesAsaNorte = verificarProcedimentoUnidade("Pilates", "asa_norte", 54);
  assert(pilatesAsaNorte.permitido === true, "Asa Norte permite Pilates");

  // ── TESTE 3: Isolamento para Outras Empresas (Ex: ID 999 ou Empresa Genérica) ──
  console.log("\n--- TESTE 3: Isolamento para Empresa Genérica / Outro Negócio (ID 999) ---");
  const otherCompanyRules = loadRules(999);
  assert(otherCompanyRules.isClinic === false, "isClinic é FALSE para empresa comum (não é clínica)");
  assert(Object.keys(otherCompanyRules.convenios || {}).length === 0, "Nenhum convênio clínico injetado para outra empresa");
  assert(Object.keys(otherCompanyRules.unidades?.unidades_atendimento || {}).length === 0, "Nenhuma unidade clínica injetada para outra empresa");

  // Consultar TotalPass na outra empresa -> não encontra regras médicas
  const otherTotalPass = consultarConvenio("TotalPass", 999);
  assert(otherTotalPass.encontrado === false, "Outra empresa NÃO possui gatilhos de convênios médicos");

  // Salvar e carregar regra personalizada para empresa 999
  console.log("\n--- TESTE 4: Salvamento de Regra Customizada para Empresa Genérica ---");
  await saveCompanyRules(999, {
    companyId: 999,
    isClinic: false,
    profileName: "E-commerce de Varejo",
    regrasGerais: ["Frete grátis acima de R$ 199", "Devolução em 7 dias"],
  });

  const customLoaded = loadRules(999);
  assert(customLoaded.profileName === "E-commerce de Varejo", "Regra customizada de outra empresa salva e carregada com sucesso");
  assert(customLoaded.regrasGerais?.length === 2, "Regras gerais da empresa 999 persistidas sem afetar Espaço Physio");

  // Confirma que Espaço Physio não foi modificado
  const physioRecheck = loadRules(54);
  assert(physioRecheck.isClinic === true, "Espaço Physio permanece 100% isolado com regras de clínica");

  console.log("\n================================================================================");
  console.log(` RESULTADO FINAL: ${passed}/${total} testes passaram com sucesso!`);
  console.log("================================================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runValidationTests().catch(err => {
  console.error("Erro fatal nos testes:", err);
  process.exit(1);
});
