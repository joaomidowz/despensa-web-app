type ToastProps = {
  message: string;
  variant?: "error" | "success" | "info";
  onClose: () => void;
};

const variantClasses = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-border/20 bg-white text-ink",
};

export function Toast({ message, onClose, variant = "info" }: ToastProps) {
  return (
    <div
      className={`glass-panel flex items-start gap-3 rounded-2xl px-4 py-3 shadow-panel ${variantClasses[variant]}`}
      role="status"
    >
      <span className="material-symbols-outlined mt-0.5" aria-hidden="true">
        {variant === "error" ? "error" : variant === "success" ? "check_circle" : "info"}
      </span>
      <p className="flex-1 text-sm leading-6">{message}</p>
      <button
        aria-label="Fechar aviso"
        className="rounded-full p-1 text-current transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary"
        type="button"
        onClick={onClose}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  );
}
