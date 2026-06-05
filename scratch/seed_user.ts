import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load env variables from crm_discord/.env
dotenv.config({ path: path.resolve(__dirname, '../crm_discord/.env') });

import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { upsertUser, getUserByEmail } from '../server/db';

async function main() {
  console.log("Loading environment...");
  console.log("DATABASE_URL from env:", process.env.DATABASE_URL);
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in crm_discord/.env!");
    process.exit(1);
  }

  const email = "exemplo@gmail.com";
  const password = "exemplo";

  console.log(`Hashing password for ${email}...`);
  const hashedPassword = await bcrypt.hash(password, 10);
  const openId = `local-${nanoid()}`;

  console.log(`Upserting user into database...`);
  try {
    await upsertUser({
      openId,
      name: "Exemplo",
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("User seeded successfully! Verifying...");
    const verifiedUser = await getUserByEmail(email);
    console.log("Verified User in DB:", verifiedUser);
  } catch (error) {
    console.error("Failed to seed user:", error);
  }
}

main();
