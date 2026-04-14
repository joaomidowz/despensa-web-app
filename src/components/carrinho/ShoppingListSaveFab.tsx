import { useEffect, useState } from "react";

type SaveFabState = "idle" | "loading" | "success" | "error";

export function ShoppingListSaveFab({
  disabled = false,
  onSave,
}: {
  disabled?: boolean;
  onSave: () => Promise<boolean>;
}) {
  const [state, setState] = useState<SaveFabState>("idle");
  const [isCompact, setIsCompact] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY < 64) {
        setIsHidden(false);
        setIsCompact(false);
        lastScrollY = currentScrollY;
        return;
      }

      if (delta > 10) {
        setIsHidden(true);
      } else if (delta < -10) {
        setIsHidden(false);
        setIsCompact(false);
      } else if (delta > 4) {
        setIsCompact(true);
      }

      lastScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (state !== "success") return;

    const timer = window.setTimeout(() => {
      setState("idle");
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  async function handleClick() {
    if (disabled || state === "loading") return;

    setState("loading");
    const ok = await onSave();
    setState(ok ? "success" : "error");
  }

  const visual = getVisualState(state);

  return (
    <button
      aria-label="Salvar lista"
      className={[
        "fixed bottom-24 right-4 z-50 inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-5 text-sm font-semibold shadow-[0_18px_40px_rgba(16,24,40,0.22)] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed lg:bottom-28 lg:right-8",
        visual.className,
        isCompact ? "w-14 px-0" : "min-w-[10rem]",
        isHidden ? "pointer-events-none translate-y-24 opacity-0" : "translate-y-0 opacity-100",
      ].join(" ")}
      disabled={disabled || state === "loading"}
      type="button"
      onClick={() => void handleClick()}
    >
      {state === "loading" ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      ) : (
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {visual.icon}
        </span>
      )}
      <span className={isCompact ? "sr-only" : ""}>{visual.label}</span>
    </button>
  );
}

function getVisualState(state: SaveFabState) {
  switch (state) {
    case "loading":
      return {
        icon: "progress_activity",
        label: "Salvando",
        className: "bg-primary text-white",
      };
    case "success":
      return {
        icon: "check_circle",
        label: "Salvo",
        className: "bg-emerald-600 text-white",
      };
    case "error":
      return {
        icon: "error",
        label: "Erro ao salvar",
        className: "bg-red-600 text-white",
      };
    default:
      return {
        icon: "save",
        label: "Salvar lista",
        className: "border border-border/20 bg-secondary text-tertiary",
      };
  }
}
