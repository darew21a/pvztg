export function validateReleaseConfig(env = process.env) {
  const errors = [];
  if (env.NODE_ENV !== "production") errors.push("NODE_ENV debe ser production.");
  if (!env.APP_VERSION?.trim()) errors.push("APP_VERSION es obligatorio.");
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) errors.push("JWT_SECRET debe tener al menos 32 caracteres.");
  if (!env.CLIENT_URL?.trim()) {
    errors.push("CLIENT_URL es obligatorio.");
  } else {
    try {
      const clientUrl = new URL(env.CLIENT_URL);
      if (!["http:", "https:"].includes(clientUrl.protocol)
        || clientUrl.origin !== env.CLIENT_URL.replace(/\/$/, "")) {
        errors.push("CLIENT_URL debe contener únicamente un origen HTTP o HTTPS válido.");
      }
    } catch {
      errors.push("CLIENT_URL debe contener únicamente un origen HTTP o HTTPS válido.");
    }
  }
  if (!env.DB_USER?.trim() || env.DB_USER === "root") errors.push("DB_USER debe ser un usuario dedicado.");
  if (!env.DB_PASSWORD) errors.push("DB_PASSWORD no puede estar vacío.");
  if (!env.METRICS_TOKEN || env.METRICS_TOKEN.length < 32) errors.push("METRICS_TOKEN debe tener al menos 32 caracteres.");
  return errors;
}

if (process.argv[1]?.endsWith("releaseCheck.js")) {
  const errors = validateReleaseConfig();
  if (errors.length) {
    console.error("Configuración de lanzamiento inválida:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log("Configuración de lanzamiento válida.");
  }
}
