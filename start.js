import { spawn } from "node:child_process";

process.env.NODE_ENV = "development";

console.log("[Wrapper] Starting dev server with NODE_ENV=development...");

const child = spawn("npx", ["tsx", "watch", "server/_core/index.ts"], {
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  console.log(`[Wrapper] Dev server exited with code ${code}`);
  process.exit(code || 0);
});
