import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
      /** Com `tsx backend/src/dev-api.ts` na porta 3001, o Vite (CLI) encaminha /api para a API real. */
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
