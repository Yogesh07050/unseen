// Where the API lives.
//
// Empty string = same origin: the Vite dev proxy and the FastAPI-served PWA both
// serve the UI and /api from one host, so relative URLs work.
//
// The native Android shell (Capacitor) serves the UI from its own origin
// (https://localhost), so it must point at the backend explicitly. Build the
// native bundle with e.g.  VITE_API_BASE=https://api.example.com  — the server
// allows that origin via CORS_ORIGINS.
export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/+$/, '');

/** Prefix an /api path with the configured base. */
export const apiUrl = (path: string): string => `${API_BASE}${path}`;
