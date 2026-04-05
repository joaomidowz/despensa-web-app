import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "../../app/providers/ToastProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { InventoryTableRow } from "../../components/inventory/InventoryTableRow";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient } from "../../lib/api/apiClient";
import { CreateInventoryItemRequest, InventoryItemResponse } from "../../lib/api/contracts";

type InventoryTab = "in-stock" | "missing";

export function InventoryPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [manageMode, setManageMode] = useState(false);
  const [activeTab, setActiveTab] = useState<InventoryTab>("in-stock");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({
    product_name: "",
    category: "",
    current_qty: "1",
    min_qty: "1",
  });
  const inventoryQuery = useQuery({
    queryKey: ["inventory", "list"],
    queryFn: () => apiClient<InventoryItemResponse[]>("/inventory", { token }),
    enabled: Boolean(token),
  });
  const inventoryItems = inventoryQuery.data ?? [];
  const inStockItems = inventoryItems.filter((item) => Number(item.current_qty) > 0);
  const missingItems = inventoryItems.filter((item) => Number(item.current_qty) <= 0);
  const visibleItems = activeTab === "in-stock" ? inStockItems : missingItems;

  const createMutation = useMutation({
    mutationFn: (payload: CreateInventoryItemRequest) =>
      apiClient("/inventory", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "shopping-list"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      setNewItem({
        product_name: "",
        category: "",
        current_qty: "1",
        min_qty: "1",
      });
      setShowCreateForm(false);
      showToast("Item criado no inventario.", "success");
    },
  });

  function createInventoryItem() {
    const product_name = newItem.product_name.trim();
    const category = newItem.category.trim();
    const current_qty = Number(newItem.current_qty.replace(",", "."));
    const min_qty = Number(newItem.min_qty.replace(",", "."));

    if (!product_name || !category || Number.isNaN(current_qty) || Number.isNaN(min_qty)) {
      showToast("Preencha nome, categoria e quantidades validas.", "error");
      return;
    }

    createMutation.mutate({
      product_name,
      category,
      current_qty,
      min_qty,
    });
  }

  return (
    <div className="grid gap-6">
      <SectionCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
              Inventario
            </p>
            <h1 className="mt-3 text-3xl font-bold">Estoque da casa</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Estoque atual da household autenticada, com quantidade, minimo e status de reposicao.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[22rem] sm:items-end">
            <div className="grid w-full grid-cols-2 rounded-2xl bg-secondary p-1">
              <Button
                className="w-full rounded-xl"
                disabled={inventoryQuery.isLoading}
                isFullWidth
                size="sm"
                variant={activeTab === "in-stock" ? "primary" : "ghost"}
                onClick={() => setActiveTab("in-stock")}
              >
                Em estoque ({inStockItems.length})
              </Button>
              <Button
                className="w-full rounded-xl"
                disabled={inventoryQuery.isLoading}
                isFullWidth
                size="sm"
                variant={activeTab === "missing" ? "primary" : "ghost"}
                onClick={() => setActiveTab("missing")}
              >
                Faltando ({missingItems.length})
              </Button>
            </div>
            <Button
              className="w-full"
              disabled={inventoryQuery.isLoading || !visibleItems.length}
              isFullWidth
              leftIcon={
                <span className="material-symbols-outlined" aria-hidden="true">
                  {manageMode ? "close" : "edit"}
                </span>
              }
              variant={manageMode ? "secondary" : "outline"}
              onClick={() => setManageMode((current) => !current)}
            >
              {manageMode ? "Fechar edicao" : "Editar inventario"}
            </Button>
            <Button
              className="w-full"
              isFullWidth
              leftIcon={
                <span className="material-symbols-outlined" aria-hidden="true">
                  {showCreateForm ? "close" : "add_circle"}
                </span>
              }
              variant={showCreateForm ? "secondary" : "primary"}
              onClick={() => setShowCreateForm((current) => !current)}
            >
              {showCreateForm ? "Fechar novo item" : "Novo item"}
            </Button>
          </div>
        </div>
      </SectionCard>

      {showCreateForm ? (
        <SectionCard>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_10rem_10rem_auto]">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Produto
              <input
                className="input-shell"
                placeholder="Nome do produto"
                value={newItem.product_name}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, product_name: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Categoria
              <input
                className="input-shell"
                placeholder="Categoria"
                value={newItem.category}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, category: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Quantidade atual
              <input
                className="input-shell"
                inputMode="decimal"
                placeholder="Qtd atual"
                value={newItem.current_qty}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, current_qty: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Minimo desejado
              <input
                className="input-shell"
                inputMode="decimal"
                placeholder="Minimo"
                value={newItem.min_qty}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, min_qty: event.target.value }))
                }
              />
            </label>
            <Button isLoading={createMutation.isPending} onClick={createInventoryItem}>
              Salvar item
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted">
            Use este formulario para cadastrar itens que ainda nao passaram por recibo, mas ja existem na casa.
          </p>
        </SectionCard>
      ) : null}

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
      ) : visibleItems.length ? (
        <SectionCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-secondary/70 text-left">
                <tr>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Produto</th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Categoria</th>
                  {manageMode ? (
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Atual</th>
                  ) : null}
                  {!manageMode ? (
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Atual</th>
                  ) : null}
                  {!manageMode ? (
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Minimo</th>
                  ) : null}
                  {!manageMode ? (
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Status</th>
                  ) : null}
                  {!manageMode ? (
                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Atualizado</th>
                  ) : null}
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <InventoryTableRow
                    key={item.inventory_id}
                    disabled={inventoryQuery.isLoading}
                    item={item}
                    manageMode={manageMode}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-lg font-bold">
            {activeTab === "in-stock" ? "Nenhum item em estoque nesta aba." : "Nada faltando por enquanto."}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            {activeTab === "in-stock"
              ? "Os itens com quantidade acima de zero aparecem aqui."
              : "Quando algum produto zerar, ele aparece aqui para reposicao e controle."}
          </p>
        </SectionCard>
      )}
    </div>
  );
}
