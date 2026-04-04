import { SectionCard } from "../../components/ui/SectionCard";

export function InventoryPage() {
  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
          Inventario
        </p>
        <h1 className="mt-3 text-3xl font-bold">Estoque da casa</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Proxima task: integrar o inventario real, estados vazios e a futura lista de compras.
        </p>
      </SectionCard>
    </div>
  );
}
