const RENDER_BACKEND_URL = "https://chating-server-a39o.onrender.com";
const RENDER_WS_URL = "wss://chating-server-a39o.onrender.com";

export const API_BASE = 
  process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== "undefined" && window.location.hostname === "localhost" 
    ? "http://localhost:8000" 
    : RENDER_BACKEND_URL);

export function getWsUrl(username: string, token: string): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const base = process.env.NEXT_PUBLIC_WS_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    return `${base}/ws/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`;
  }

  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" && window.location.port === "3000") {
      return `ws://localhost:8000/ws/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`;
    }
  }

  return `${RENDER_WS_URL}/ws/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`;
}

export function getAuthHeaders(token?: string): Record<string, string> {
  const tok = token || (typeof window !== "undefined" ? localStorage.getItem("couple_token") : null);
  const headers: Record<string, string> = {};
  if (tok) {
    headers["Authorization"] = `Bearer ${tok}`;
  }
  return headers;
}
