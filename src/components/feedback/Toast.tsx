type ToastProps = {
  durationMs: number;
  message: string;
  variant?: "error" | "success" | "info";
  onClose: () => void;
};

const variantClasses = {
  error: "border-red-500/30 bg-card text-ink",
  success: "border-emerald-500/30 bg-card text-ink",
  info: "border-sky-500/30 bg-card text-ink",
};

const timerClasses = {
  error: "bg-red-400/80",
  success: "bg-emerald-400/80",
  info: "bg-sky-400/80",
};

const iconClasses = {
  error: "text-red-400",
  success: "text-emerald-400",
  info: "text-sky-400",
};

const titles = {
  error: "Erro",
  success: "Sucesso",
  info: "Informacao",
};

export function Toast({ durationMs, message, onClose, variant = "info" }: ToastProps) {
  return (
    <div
      className={`relative overflow-hidden flex items-start gap-3 rounded-[22px] border px-4 py-3 shadow-xl shadow-black/10 ${variantClasses[variant]}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`material-symbols-outlined mt-0.5 text-[20px] ${iconClasses[variant]}`}
        aria-hidden="true"
      >
        {variant === "error" ? "error" : variant === "success" ? "check_circle" : "info"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-5">{titles[variant]}</p>
        <p className="mt-1 text-sm leading-5 text-muted">{message}</p>
      </div>
      <button
        aria-label="Fechar aviso"
        className="rounded-full p-1 text-current/60 transition hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-primary"
        type="button"
        onClick={onClose}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          close
        </span>
      </button>
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-1 rounded-full ${timerClasses[variant]}`}
        style={{ animation: `toast-timer ${durationMs}ms linear forwards` }}
      />
    </div>
  );
}
