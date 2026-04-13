import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  signOut: (options?: { skipRequest?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setIsBootstrapping(false);
      return;
    }
    setToken(stored.token);
    setUser(stored.user);
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  function clearAuthState() {
    // Auth transitions must drop cached household-scoped data to avoid stale IDs leaking between sessions.
    queryClient.clear();
    setToken(null);
    setUser(null);
    clearStoredAuth();
  }

  async function refreshUserWithToken(activeToken: string) {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshRequest = apiClient<AuthUser>("/auth/me", {
      method: "GET",
      token: activeToken,
    })
      .then((me) => {
        setUser(me);
        saveStoredAuth({ token: activeToken, user: me });
      })
      .finally(() => {
        refreshInFlightRef.current = null;
      });

    refreshInFlightRef.current = refreshRequest;
    return refreshRequest;
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
          clearAuthState();
        }
      })
      .finally(() => {
        if (isMounted) setIsBootstrapping(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    async function revalidateSession() {
      const activeToken = tokenRef.current;
      if (!activeToken) return;

      try {
        await refreshUserWithToken(activeToken);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          clearAuthState();
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void revalidateSession();
      }
    }

    function handleFocus() {
      void revalidateSession();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      signIn: (nextToken, nextUser) => {
        queryClient.clear();
        setToken(nextToken);
        setUser(nextUser);
        saveStoredAuth({ token: nextToken, user: nextUser });
      },
      signOut: async (options) => {
        if (token && !options?.skipRequest) {
          try {
            await apiClient<void>("/auth/logout", {
              method: "POST",
              token,
            });
          } catch {
            // The local session still needs to be cleared even if logout fails remotely.
          }
        }
        clearAuthState();
      },
      refreshUser: async () => {
        if (!token) return;
        await refreshUserWithToken(token);
      },
      isAuthenticated: Boolean(token),
      isBootstrapping,
    }),
    [isBootstrapping, queryClient, token, user],
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
