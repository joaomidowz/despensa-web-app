import { useEffect, useRef } from "react";
import { APP_RELEASE_LABEL } from "../../config/appVersion";

type ToastVariant = "error" | "success" | "info";
type ShowToast = (message: string, variant?: ToastVariant) => void;

type VersionResponse =
  | { version?: string }
  | {
      data?: {
        version?: string;
      };
    };

const VERSION_POLL_INTERVAL_MS = 2 * 60 * 60 * 1000;
const API_BASE_URL = import.meta.env.DESPENSA_APP_API_BASE_URL ?? "http://localhost:8000/api";

function readVersion(payload: VersionResponse): string | null {
  const nestedVersion = "data" in payload ? payload.data?.version : undefined;
  const directVersion = "version" in payload ? payload.version : undefined;
  const version = directVersion ?? nestedVersion;
  return version?.trim() || null;
}

async function checkRemoteVersion(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/system/version`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as VersionResponse;
    return readVersion(payload);
  } catch {
    return null;
  }
}

async function refreshServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update()));
}

export function useVersionCheck(showToast: ShowToast) {
  const currentVersion = APP_RELEASE_LABEL.trim();
  const notifiedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      if (cancelled || !("serviceWorker" in navigator)) return;
      const remoteVersion = await checkRemoteVersion();
      if (!remoteVersion || remoteVersion === currentVersion) return;
      if (notifiedVersionRef.current === remoteVersion) return;

      notifiedVersionRef.current = remoteVersion;
      await refreshServiceWorkers();
      showToast("Nova atualização aplicada", "success");
    };

    void runCheck();

    const intervalId = window.setInterval(() => {
      void runCheck();
    }, VERSION_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentVersion, showToast]);
}
