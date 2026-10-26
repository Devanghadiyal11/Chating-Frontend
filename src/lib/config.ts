const RENDER_BACKEND_URL = "https://chating-server-a39o.onrender.com";
const RENDER_WS_URL = "wss://chating-server-a39o.onrender.com";

function getApiBase(): string {
  let envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    // Auto-fix if Vercel environment variable has typo 'chating-server-.onrender.com' instead of 'chating-server-a39o.onrender.com'
    if (envUrl.includes("chating-server-.onrender.com")) {
      envUrl = envUrl.replace("chating-server-.onrender.com", "chating-server-a39o.onrender.com");
    }
    return envUrl;
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8000";
  }

  return RENDER_BACKEND_URL;
}

export const API_BASE = getApiBase();

export function getWsUrl(username: string, token: string): string {
  let envWs = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envWs) {
    if (envWs.includes("chating-server-.onrender.com")) {
      envWs = envWs.replace("chating-server-.onrender.com", "chating-server-a39o.onrender.com");
    }
    const base = envWs.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
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
