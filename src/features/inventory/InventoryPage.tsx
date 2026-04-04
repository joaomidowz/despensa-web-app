import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient } from "../../lib/api/apiClient";
import { InventoryItemResponse } from "../../lib/api/contracts";
import { formatDateTime, formatDecimal } from "../../lib/utils/formatters";

export function InventoryPage() {
  const { token } = useAuth();
  const inventoryQuery = useQuery({
    queryKey: ["inventory", "list"],
    queryFn: () => apiClient<InventoryItemResponse[]>("/inventory", { token }),
    enabled: Boolean(token),
  });

  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
          Inventario
        </p>
        <h1 className="mt-3 text-3xl font-bold">Estoque da casa</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Estoque atual da household autenticada, com quantidade, minimo e status de reposicao.
        </p>
      </SectionCard>

      {inventoryQuery.isLoading ? (
        <SectionCard className="animate-pulse">
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-secondary/70 px-4 py-5">
                <div className="h-4 w-40 rounded-full bg-white" />
                <div className="mt-3 h-4 w-28 rounded-full bg-white" />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : inventoryQuery.data?.length ? (
        <section className="grid gap-4">
          {inventoryQuery.data.map((item) => (
            <SectionCard key={item.inventory_id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-ink">{item.product.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.product.category}</p>
                </div>
                <div className="grid gap-1 text-sm sm:text-right">
                  <p className="font-semibold text-tertiary">{item.status}</p>
                  <p className="text-muted">
                    {formatDecimal(item.current_qty)} atual · min {formatDecimal(item.min_qty)}
                  </p>
                  <p className="text-muted">{formatDateTime(item.updated_at)}</p>
                </div>
              </div>
            </SectionCard>
          ))}
        </section>
      ) : (
        <SectionCard>
          <p className="text-lg font-bold">Inventario vazio por enquanto.</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Itens entram aqui depois da confirmacao do primeiro recibo ou de cadastro manual.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
