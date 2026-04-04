import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient } from "../../lib/api/apiClient";
import {
  InventoryItemResponse,
  ShoppingListCatalogItemResponse,
} from "../../lib/api/contracts";
import { formatDateTime } from "../../lib/utils/formatters";
import {
  loadManualShoppingList,
  ManualShoppingListItem,
  saveManualShoppingList,
} from "../../lib/shopping-list/storage";

export function ShoppingListPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [manualItems, setManualItems] = useState<ManualShoppingListItem[]>(loadManualShoppingList);
  const [newItem, setNewItem] = useState("");

  const suggestedQuery = useQuery({
    queryKey: ["inventory", "shopping-list"],
    queryFn: () => apiClient<InventoryItemResponse[]>("/inventory?status=comprar", { token }),
    enabled: Boolean(token),
  });

  const catalogQuery = useQuery({
    queryKey: ["shopping-list", "catalog"],
    queryFn: () => apiClient<ShoppingListCatalogItemResponse[]>("/shopping-list/catalog", { token }),
    enabled: Boolean(token),
  });

  const suggestedItems = useMemo(
    () =>
      (suggestedQuery.data ?? []).map((item) => ({
        id: item.inventory_id,
        name: item.product.name,
        subtitle: `Atual ${item.current_qty} · minimo ${item.min_qty}`,
      })),
    [suggestedQuery.data],
  );

  function addManualItem() {
    const normalized = newItem.trim();
    if (!normalized) return;
    const next = [
      ...manualItems,
      {
        id: `${Date.now()}-${normalized}`,
        name: normalized,
      },
    ];
    setManualItems(next);
    saveManualShoppingList(next);
    setNewItem("");
    showToast("Item adicionado na sua lista manual.", "success");
  }

  function removeManualItem(id: string) {
    const next = manualItems.filter((item) => item.id !== id);
    setManualItems(next);
    saveManualShoppingList(next);
  }

  function addExistingItem(name: string) {
    const next = [
      ...manualItems,
      {
        id: `${Date.now()}-${name}`,
        name,
      },
    ];
    setManualItems(next);
    saveManualShoppingList(next);
    showToast("Item comprado anteriormente adicionado na lista.", "success");
  }

  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
          Lista de compras
        </p>
        <h1 className="mt-3 text-3xl font-bold">Recomendacoes do sistema e itens manuais</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Aqui entram os produtos abaixo do minimo e tambem o que a pessoa quer lembrar de comprar.
        </p>
      </SectionCard>

      <SectionCard>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input-shell"
            placeholder="Adicionar item manualmente"
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
          />
          <Button onClick={addManualItem}>Adicionar</Button>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard>
          <h2 className="text-2xl font-bold">Sugeridos pelo sistema</h2>
          <div className="mt-5 grid gap-3">
            {suggestedQuery.isLoading ? (
              <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                Carregando itens sugeridos...
              </div>
            ) : suggestedItems.length ? (
              suggestedItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-secondary/70 px-4 py-4">
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                Nenhuma reposicao sugerida agora.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-2xl font-bold">Itens manuais</h2>
          <div className="mt-5 grid gap-3">
            {manualItems.length ? (
              manualItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/70 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <Button variant="ghost" onClick={() => removeManualItem(item.id)}>
                    Remover
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                Sua lista manual ainda esta vazia.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-2xl font-bold">Ja comprados antes</h2>
          <div className="mt-5 grid gap-3">
            {catalogQuery.isLoading ? (
              <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                Carregando historico de produtos...
              </div>
            ) : catalogQuery.data?.length ? (
              catalogQuery.data.map((item) => (
                <div
                  key={`${item.name}-${item.last_purchased_at}`}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-secondary/70 px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {item.category ?? "Sem categoria"} · {item.purchase_count} compras · ultima{" "}
                      {formatDateTime(item.last_purchased_at)}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => addExistingItem(item.name)}>
                    Adicionar
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                Nenhum item comprado anteriormente encontrado.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
