import { SectionCard } from "../../components/ui/SectionCard";

export function ReceiptHistoryPage() {
  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Receipts</p>
        <h1 className="mt-3 text-3xl font-bold">Historico de compras</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Proxima task: conectar a listagem real de recibos confirmados e o detalhe de cada compra.
        </p>
      </SectionCard>
    </div>
  );
}
