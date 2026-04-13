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

function readStoredAuth(storage: Storage): StoredAuth | null {
  const raw = storage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as StoredAuth;
}

export function loadStoredAuth(): StoredAuth | null {
  try {
    const localAuth = readStoredAuth(window.localStorage);
    if (localAuth) return localAuth;

    const sessionAuth = readStoredAuth(window.sessionStorage);
    if (!sessionAuth) return null;

    // Migrate older sessions so mobile resume survives tab suspension/restarts.
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionAuth));
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return sessionAuth;
  } catch {
    return null;
  }
}

export function saveStoredAuth(data: StoredAuth) {
  const serialized = JSON.stringify(data);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
