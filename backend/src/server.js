import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import crypto from "node:crypto";
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import departamentosRoutes from "./routes/departamentos.routes.js";
import unidadesRoutes from "./routes/unidades.routes.js";
import combustibleRoutes from "./routes/combustible.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import edenredRoutes from "./routes/edenred.routes.js";
import anomaliasRoutes from "./routes/anomalias.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";
import adminDeletionRoutes from "./routes/admin-deletion.routes.js";
import { pingDatabase, pool } from "./config/db.js";
import { validateReleaseConfig } from "./config/releaseCheck.js";
import { isOriginAllowed } from "./config/corsPolicy.js";
import { getMetrics, recordRequest } from "./utils/metrics.js";
import { getBuildInfo } from "./utils/buildInfo.js";
import { programarReconciliacionAnomalias } from "./services/anomalyCaseService.js";

dotenv.config();

export const app = express();
const port = Number(process.env.PORT || 4000);
let httpServer;
let shuttingDown = false;

function metricsTokenMatches(req) {
  const expected = String(process.env.METRICS_TOKEN || "").trim();
  const received = req.get("x-metrics-token") || "";
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return Boolean(expected)
    && receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  const errors = validateReleaseConfig();
  if (errors.length > 0) throw new Error(`Configuración de producción inválida: ${errors.join(" ")}`);
}

app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    recordRequest({ path: req.path, status: res.statusCode, durationMs });
    if (res.statusCode >= 400 || process.env.LOG_REQUESTS === "true") {
      console.info(JSON.stringify({
        event: "http_request",
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
      }));
    }
  });
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS."));
  },
  credentials: true,
  exposedHeaders: [
    "X-Pagination-Page",
    "X-Pagination-Limit",
    "X-Pagination-Total",
    "X-Pagination-Total-Pages",
  ],
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/metrics", (req, res) => {
  if (!metricsTokenMatches(req)) {
    return res.status(404).end();
  }
  return res.json(getMetrics());
});

app.get("/api/version", (_req, res) => {
  res.json(getBuildInfo());
});

app.use("/api", authRoutes);
app.use("/api", departamentosRoutes);
app.use("/api", usuariosRoutes);
app.use("/api", unidadesRoutes);
app.use("/api", combustibleRoutes);
app.use("/api", reportesRoutes);
app.use("/api", uploadsRoutes);
app.use("/api", edenredRoutes);
app.use("/api", anomaliasRoutes);
app.use("/api", notificacionesRoutes);
app.use("/api", adminDeletionRoutes);

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "PV-ZTG backend",
    docs: "/api/health",
    status: "ready",
  });
});

app.use((err, req, res, _next) => {
  const requestId = req.requestId || crypto.randomUUID();
  console.error(JSON.stringify({
    event: "http_error",
    requestId,
    name: err?.name,
    message: err?.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  }));
  if (err?.name === "MulterError") {
    const mensaje = err.code === "LIMIT_FILE_SIZE"
      ? "El archivo excede el límite de 10 MB."
      : "El archivo no tiene un formato permitido (PDF, JPG o PNG).";
    return res.status(400).json({ mensaje, requestId });
  }
  res.status(500).json({ mensaje: "Error interno del servidor.", requestId });
});

async function start() {
  try {
    validateProductionConfig();
    if (!(await pingDatabase())) {
      throw new Error("La base de datos no respondió al health check.");
    }
    programarReconciliacionAnomalias();
    httpServer = app.listen(port, () => {
      console.log(`Server API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("No fue posible iniciar el backend. Verifica MySQL y la configuración de conexión:", error.message);
    process.exit(1);
  }

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Recibida señal ${signal}; cerrando el backend de forma segura.`);

    try {
      if (httpServer) {
        await new Promise((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error("No fue posible cerrar el backend correctamente:", error.message);
      process.exit(1);
    }
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

if (process.env.NODE_ENV !== "test") {
  start();
}
