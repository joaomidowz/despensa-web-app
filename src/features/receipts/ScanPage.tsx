import { SectionCard } from "../../components/ui/SectionCard";

export function ScanPage() {
  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Receipts</p>
        <h1 className="mt-3 text-3xl font-bold">Escanear recibo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Proxima task: ligar upload de imagem/base64 ao endpoint real de scan e abrir revisao dos
          itens extraidos.
        </p>
      </SectionCard>
    </div>
  );
}
