import { SectionCard } from "../ui/SectionCard";

export function ReceiptScanProgress({
  progress,
  title,
  description,
  fileName,
}: {
  progress: number;
  title: string;
  description: string;
  fileName?: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <SectionCard className="overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(82,75,224,0.16),_transparent_38%),linear-gradient(180deg,_#f7f6ff_0%,_#eeecff_100%)]">
      <div className="grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="material-symbols-outlined text-[16px]">autorenew</span>
              Processando leitura
            </span>
            <h3 className="text-2xl font-bold text-ink">{title}</h3>
            <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-[28px] bg-white/80 shadow-sm">
            <span className="text-2xl font-bold text-primary">{safeProgress}%</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-full bg-white/80">
          <div
            className="h-4 rounded-full bg-[linear-gradient(90deg,_#524be0_0%,_#6d67f7_52%,_#8a84ff_100%)] transition-[width] duration-300"
            style={{ width: `${safeProgress}%` }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatusStep active={safeProgress >= 5} done={safeProgress >= 34} label="Preparando imagem" />
          <StatusStep active={safeProgress >= 34} done={safeProgress >= 72} label="Lendo itens da nota" />
          <StatusStep active={safeProgress >= 72} done={safeProgress >= 100} label="Conferindo resposta" />
        </div>

        {fileName ? (
          <div className="rounded-[24px] bg-white/75 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Arquivo em leitura</p>
            <p className="mt-1 text-sm font-semibold text-ink">{fileName}</p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function StatusStep({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[24px] border px-4 py-4 transition",
        done
          ? "border-primary/20 bg-primary/10"
          : active
            ? "border-primary/15 bg-white/85"
            : "border-border/10 bg-white/55",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            "grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition",
            done
              ? "bg-primary text-white"
              : active
                ? "bg-primary/12 text-primary"
                : "bg-secondary text-muted",
          ].join(" ")}
        >
          {done ? <span className="material-symbols-outlined text-[16px]">check</span> : "•"}
        </div>
        <p className="text-sm font-semibold text-ink">{label}</p>
      </div>
    </div>
  );
}
