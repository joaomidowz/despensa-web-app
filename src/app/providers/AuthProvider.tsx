import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import { clearStoredAuth, loadStoredAuth, saveStoredAuth } from "../../lib/auth/storage";

export type AuthUser = {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  household_id?: string | null;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setIsBootstrapping(false);
      return;
    }
    setToken(stored.token);
    setUser(stored.user);
  }, []);

  async function refreshUserWithToken(activeToken: string) {
    const me = await apiClient<AuthUser>("/auth/me", {
      method: "GET",
      token: activeToken,
    });
    setUser(me);
    saveStoredAuth({ token: activeToken, user: me });
  }

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    let isMounted = true;
    refreshUserWithToken(token)
      .catch((error) => {
        if (!isMounted) return;
        if (error instanceof ApiClientError && error.status === 401) {
          setToken(null);
          setUser(null);
          clearStoredAuth();
        }
      })
      .finally(() => {
        if (isMounted) setIsBootstrapping(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      signIn: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        saveStoredAuth({ token: nextToken, user: nextUser });
      },
      signOut: () => {
        setToken(null);
        setUser(null);
        clearStoredAuth();
      },
      refreshUser: async () => {
        if (!token) return;
        await refreshUserWithToken(token);
      },
      isAuthenticated: Boolean(token),
      isBootstrapping,
    }),
    [isBootstrapping, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
