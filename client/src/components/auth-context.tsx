import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Verify token with backend
      fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Invalid token");
        })
        .then((data) => {
          setUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem("auth_token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("auth_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    
    // Optional: Call logout endpoint
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }).catch(() => {
        // Ignore errors on logout
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
