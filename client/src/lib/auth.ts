import { apiRequest } from "./queryClient";

export async function loginUser(email: string, password: string) {
  try {
    const response = await apiRequest("/api/login", {
      method: "POST",
      body: {
        email,
        password,
      },
    });
    
    return await response.json();
  } catch (error: any) {
    // Extract JSON error message if available
    try {
      const errorData = JSON.parse(error.message.split(': ')[1]);
      throw new Error(errorData.details || errorData.error || "Login failed");
    } catch {
      throw new Error("Login failed. Please check your credentials.");
    }
  }
}

export async function registerUser(username: string, email: string, password: string) {
  try {
    const response = await apiRequest("/api/register", {
      method: "POST",
      body: {
        username,
        email,
        password,
      },
    });
    
    return await response.json();
  } catch (error: any) {
    // Extract JSON error message if available
    try {
      const errorData = JSON.parse(error.message.split(': ')[1]);
      throw new Error(errorData.details || errorData.error || "Registration failed");
    } catch {
      throw new Error("Registration failed. Please try again.");
    }
  }
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
