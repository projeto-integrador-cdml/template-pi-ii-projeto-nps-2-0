import "dotenv/config";
import * as db from "../server/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

async function main() {
  console.log("=== CRIANDO / ATUALIZANDO CONTA ESPAÇO PHYSIO ===");
  const targetEmail = "espaçophysio@gmail.com";
  const asciiEmail = "espacophysio@gmail.com";
  const passwordPlain = "Testevip123@";
  const hashedPassword = await bcrypt.hash(passwordPlain, 10);

  const existing = await db.getUserByEmail(targetEmail) || await db.getUserByEmail(asciiEmail);

  if (existing) {
    console.log(`[Seed] Usuário já existente encontrado com ID ${existing.id} (${existing.email}). Atualizando senha e papel...`);
    const mysqlDb = await db.getDb();
    if (mysqlDb) {
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await mysqlDb.update(users).set({
        name: "Espaço Physio",
        email: targetEmail,
        password: hashedPassword,
        role: "admin",
        isActive: true,
        companyName: "Espaço Physio",
      }).where(eq(users.id, existing.id));
      console.log(`[Seed] ✅ Usuário ID ${existing.id} atualizado com sucesso!`);
    }
  } else {
    console.log(`[Seed] Criando nova conta ${targetEmail}...`);
    const openId = `local-${nanoid()}`;
    await db.upsertUser({
      openId,
      name: "Espaço Physio",
      email: targetEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      companyName: "Espaço Physio",
      maxAttendants: 10,
    });
    const created = await db.getUserByEmail(targetEmail);
    console.log(`[Seed] ✅ Conta criada com sucesso! ID: ${created?.id}`);
  }

  const user = await db.getUserByEmail(targetEmail) || await db.getUserByEmail(asciiEmail);
  if (user) {
    // Configura o perfil da empresa como clínica no settings
    await db.upsertSetting(user.id, "company_type", "clinic");
    await db.upsertSetting(user.id, "company_rules_profile", "regras_clinica_fisioterapia");
    console.log(`[Seed] ✅ Configurações de perfil clínico vinculadas à empresa ID ${user.id}!`);

    // Testa verificação de senha com bcrypt
    const passwordValid = await bcrypt.compare(passwordPlain, user.password || "");
    console.log(`[Seed] Validação de senha ('${passwordPlain}'):`, passwordValid ? "✅ CORRETA" : "❌ INCORRETA");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("[Seed Error]:", err);
  process.exit(1);
});
