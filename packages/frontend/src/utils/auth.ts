const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5500";

export interface User {
  id: number;
  username: string;
  api_key: string;
}

export async function login(username: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  return data.user;
}

export async function register(
  username: string,
  password: string,
): Promise<User> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error("Registration failed");
  const data = await res.json();
  return data.user;
}

export function saveApiKey(apiKey: string): void {
  localStorage.setItem("taskflow_api_key", apiKey);
}

export function getApiKey(): string | null {
  return localStorage.getItem("taskflow_api_key");
}

export function logout(): void {
  localStorage.removeItem("taskflow_api_key");
}
