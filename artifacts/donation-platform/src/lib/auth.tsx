import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiUrl } from "./api";

type AuthUser = {
  id: number;
  name: string;
  mobile: string;
  role: string;
};

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;

    const clearStoredAuth = () => {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      if (!cancelled) {
        setUser(null);
        setToken(null);
      }
    };

    try {
      const storedUser = localStorage.getItem("auth_user");
      const storedToken = localStorage.getItem("auth_token");
      if (!storedUser || !storedToken) {
        setIsLoading(false);
        return () => {
          cancelled = true;
        };
      }

      const parsedUser = JSON.parse(storedUser) as Partial<AuthUser>;
      if (
        typeof parsedUser.id !== "number" ||
        typeof parsedUser.name !== "string" ||
        typeof parsedUser.mobile !== "string" ||
        typeof parsedUser.role !== "string"
      ) {
        clearStoredAuth();
        setIsLoading(false);
        return () => {
          cancelled = true;
        };
      }

      void fetch(apiUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then(async (response) => {
          if (cancelled) return;
          if (!response.ok) {
            clearStoredAuth();
            return;
          }
          const serverUser = (await response.json()) as AuthUser;
          setUser(serverUser);
          setToken(storedToken);
        })
        .catch((error) => {
          // Keep the local session during a temporary network outage. A 401
          // response still clears it immediately through the auth event below.
          console.error("Failed to validate auth session", error);
          if (!cancelled) {
            setUser(parsedUser as AuthUser);
            setToken(storedToken);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    } catch (e) {
      console.error("Failed to load auth state", e);
      clearStoredAuth();
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      setLocation("/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [setLocation]);

  const login = (newUser: AuthUser, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    localStorage.setItem("auth_token", newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
