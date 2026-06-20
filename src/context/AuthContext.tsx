import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api, { extractErrorMessage } from "../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Validate active sessions on initialization
  useEffect(() => {
    async function loadStoredAuth() {
      const storedToken = localStorage.getItem("well_dropp_jwt");
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await api.get("/profile");
          setUser(res.data);
        } catch (error) {
          console.warn("Session validation failed on reload, clearing token", error);
          localStorage.removeItem("well_dropp_jwt");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const res = await api.post("/login", { email, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      
      localStorage.setItem("well_dropp_jwt", receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return receivedUser;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  };

  const logout = () => {
    localStorage.removeItem("well_dropp_jwt");
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get("/profile");
      setUser(res.data);
    } catch (error) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
