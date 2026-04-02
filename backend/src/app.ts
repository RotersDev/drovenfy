import express from "express";
import { apiRouter } from "./routes";

/** App Express com rotas em `/api` (usado pelo servidor unificado e por `dev-api`). */
export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api", apiRouter);
  return app;
}
