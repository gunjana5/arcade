// login / register helpers. token lives in localStorage
const TOKEN_KEY = "arcade_token";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type AuthSession = { token: string; username: string };

export function getToken(): string | null {
  // next can run this on the server too - guard window
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function authPost(path: string, username: string, password: string): Promise<AuthSession> {
  // register + login both return { token, username } - stash token for later calls
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as AuthSession;
  setToken(data.token);
  return data;
}

export async function register(username: string, password: string): Promise<AuthSession> {
  return authPost("/api/auth/register", username, password);
}

export async function login(username: string, password: string): Promise<AuthSession> {
  return authPost("/api/auth/login", username, password);
}

export async function me(): Promise<{ username: string } | null> {
  // who am i? clears token if the api says 401 (e.g. wiped users.db)
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearToken();
    return null;
  }
  return res.json();
}

export function logout(): void {
  clearToken();
}
