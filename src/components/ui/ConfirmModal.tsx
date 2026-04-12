import { createPortal } from "react-dom";
import { ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmModal({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isOpen,
  isLoading = false,
  tone = "danger",
  onCancel,
  onConfirm,
  footerNote,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isOpen: boolean;
  isLoading?: boolean;
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
  footerNote?: ReactNode;
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end bg-ink/45 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-[28px] bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tertiary">Confirmacao</p>
        <h2 className="mt-3 text-2xl font-bold text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
        {footerNote ? <div className="mt-4 rounded-2xl bg-secondary/60 px-4 py-3 text-sm text-muted">{footerNote}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={isLoading} variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            isLoading={isLoading}
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
