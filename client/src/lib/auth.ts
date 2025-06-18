import { apiRequest } from "./queryClient";

export async function loginUser(email: string, password: string) {
  const response = await apiRequest("POST", "/api/login", {
    email,
    password,
  });
  
  return response.json();
}

export async function registerUser(username: string, email: string, password: string) {
  const response = await apiRequest("POST", "/api/register", {
    username,
    email,
    password,
  });
  
  return response.json();
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function removeAuthToken(): void {
  localStorage.removeItem("auth_token");
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
