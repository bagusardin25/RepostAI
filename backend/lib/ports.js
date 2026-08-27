const hosted = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.PORT,
);

export const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);
export const BACKEND_PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);
export const HOST = process.env.HOST || (hosted ? "0.0.0.0" : "127.0.0.1");

export function frontendOrigin() {
  return process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim() || `http://localhost:${FRONTEND_PORT}`;
}

export function backendOrigin() {
  return process.env.BACKEND_ORIGIN || `http://127.0.0.1:${BACKEND_PORT}`;
}

export function publicBackendOrigin() {
  const explicit = process.env.BACKEND_PUBLIC_ORIGIN;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, "")}`;
  }
  return "";
}

export function assertDistinctPorts() {
  if (hosted) return;
  if (FRONTEND_PORT === BACKEND_PORT) {
    throw new Error(
      `FRONTEND_PORT and BACKEND_PORT are both ${FRONTEND_PORT}. Frontend uses 3000, backend uses 4000.`,
    );
  }
}
