import React, { createContext, useState, useCallback, useEffect } from "react";
import { authAPI } from "../services/api";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("access_token");
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user data from backend
  const fetchUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authAPI.getProfile();
      setUser(response.data);
    } catch (error: any) {
      // axios interceptor will handle 401 by redirecting; also clear local state
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch user on token change
  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      const accessToken = (response.data as any)?.access;
      if (!accessToken) {
        throw new Error("Login failed: no access token");
      }
      localStorage.setItem("access_token", accessToken);
      setToken(accessToken);
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail || error?.message || "Login failed";
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
