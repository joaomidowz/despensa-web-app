const PENDING_INVITE_TOKEN_KEY = "gestor-despensa.pending-invite-token";

export function normalizeInviteToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const tokenFromPath = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return tokenFromPath.trim();
  } catch {
    return trimmed;
  }
}

export function savePendingInviteToken(token: string) {
  const normalized = normalizeInviteToken(token);
  if (!normalized) {
    window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
    return;
  }
  window.sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, normalized);
}

export function loadPendingInviteToken() {
  return normalizeInviteToken(window.sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY) ?? "");
}

export function clearPendingInviteToken() {
  window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
}
