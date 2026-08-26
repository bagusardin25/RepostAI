export const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);
export const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000);

export function frontendOrigin() {
  return process.env.FRONTEND_ORIGIN || `http://localhost:${FRONTEND_PORT}`;
}

export function backendOrigin() {
  return process.env.BACKEND_ORIGIN || `http://127.0.0.1:${BACKEND_PORT}`;
}

export function assertDistinctPorts() {
  if (FRONTEND_PORT === BACKEND_PORT) {
    throw new Error(
      `FRONTEND_PORT and BACKEND_PORT are both ${FRONTEND_PORT}. Frontend uses 3000, backend uses 4000.`,
    );
  }
}
