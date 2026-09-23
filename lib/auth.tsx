"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, onUnauthorized, setToken, type UserOut, type UserRole } from "./api";

interface AuthContextValue {
  user: UserOut | null;
  /** True until the initial "do we already have a valid token" check finishes. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  // api.ts can't use useRouter itself (it's not a component) -- this wires
  // its 401 handler back to a real redirect, once, from the top of the tree.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      router.push("/login");
    });
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.access_token);
    const me = await api.me();
    setUser(me);
  }, []);

  const register = useCallback(
    async (email: string, password: string, role: UserRole = "teacher") => {
      await api.register(email, password, role);
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
