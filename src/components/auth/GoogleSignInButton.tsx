import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  disabled?: boolean;
  onCredential: (credential: string) => void;
};

const GOOGLE_SCRIPT_ID = "google-identity-services";

export function GoogleSignInButton({ disabled = false, onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current) return;
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (credential) onCredential(credential);
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: Math.min(buttonRef.current.offsetWidth || 320, 360),
      });
      setIsReady(true);
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google) initializeGoogle();
      else existingScript.addEventListener("load", initializeGoogle, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initializeGoogle, { once: true });
    document.head.appendChild(script);
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Defina `VITE_GOOGLE_CLIENT_ID` para ativar o login com Google.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div
        aria-disabled={disabled}
        className={disabled ? "pointer-events-none opacity-60" : ""}
        ref={buttonRef}
      />
      {!isReady ? (
        <Button isFullWidth disabled={disabled} size="lg" variant="outline">
          Preparando Google
        </Button>
      ) : null}
    </div>
  );
}
