const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4179",
  "http://127.0.0.1:4179",
]);

export function isOriginAllowed(origin, {
  clientUrl = process.env.CLIENT_URL,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  if (!origin) return true;

  let configuredOrigin;
  if (clientUrl) {
    try {
      configuredOrigin = new URL(clientUrl).origin;
    } catch {
      return false;
    }
  }

  if (origin === configuredOrigin) return true;
  if (nodeEnv === "production") return false;

  return DEVELOPMENT_ORIGINS.has(origin)
    || /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/.test(origin);
}
