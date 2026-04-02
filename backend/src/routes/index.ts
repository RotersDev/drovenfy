import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { menuRoutes } from "./menu.routes";
import { adminRoutes } from "./admin.routes";
import { uploadRoutes } from "./upload.routes";
import { geoRoutes } from "./geo.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/upload", uploadRoutes);
apiRouter.use("/geo", geoRoutes);
apiRouter.use("/", menuRoutes);
