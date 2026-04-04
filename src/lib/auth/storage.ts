const AUTH_STORAGE_KEY = "gestor-despensa.auth";

export type StoredAuth = {
  token: string;
  user: {
    user_id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    household_id?: string | null;
  };
};

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveStoredAuth(data: StoredAuth) {
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredAuth() {
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
