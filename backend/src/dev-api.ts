import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { prisma } from "./database/db";
import { createApiApp } from "./app";
import { ensureBucket } from "./storage/supabase";

/** Só a API (sem Vite). Use com `vite` no frontend e proxy `/api` → esta porta. */
const PORT = Number(process.env.API_PORT || process.env.PORT) || 3001;

async function main() {
  const app = createApiApp();
  await ensureBucket();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API em http://localhost:${PORT} (rotas em /api/...)`);
  });
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

main();
