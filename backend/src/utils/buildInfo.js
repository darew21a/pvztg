const startedAt = new Date().toISOString();

export function getBuildInfo() {
  return {
    service: "pvztg-backend",
    version: process.env.APP_VERSION || "development",
    environment: process.env.NODE_ENV || "development",
    startedAt,
  };
}
