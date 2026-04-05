import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../components/ui/Button";
import { ShoppingListScanCheckout } from "../../components/receipts/ShoppingListScanCheckout";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient } from "../../lib/api/apiClient";
import {
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  CreateShoppingListItemRequest,
  InventoryItemResponse,
  ShoppingListCatalogItemResponse,
  ShoppingListItemResponse,
  UpdateShoppingListItemRequest,
} from "../../lib/api/contracts";
import { formatDateTime } from "../../lib/utils/formatters";
import { clearPendingShoppingPurchase } from "../../lib/shopping-list/purchaseSession";

type DraftState = {
  name: string;
  notes: string;
  desiredQty: string;
};

type CheckoutChoice = "manual" | "scan" | null;

type ManualCheckoutItem = {
  shopping_list_item_id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
};

const sourceLabelMap: Record<ShoppingListItemResponse["source"], string> = {
  MANUAL: "Manual",
  INVENTORY: "Inventario",
  SYSTEM: "Sistema",
  HISTORY: "Historico",
  TEMPLATE: "Template",
};

function toNumber(value: string) {
  return Number(value.replace(",", "."));
}

function formatQuantity(value: number | string) {
  return String(value).replace(/\.0+$/, "");
}

function formatDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeDraftPayload(draft: DraftState): CreateShoppingListItemRequest | null {
  const name = draft.name.trim();
  const desiredQty = toNumber(draft.desiredQty);
  if (!name || Number.isNaN(desiredQty) || desiredQty <= 0) return null;

  return {
    name,
    notes: draft.notes.trim() || null,
    desired_qty: desiredQty,
  };
}

export function ShoppingListPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const scanSectionRef = useRef<HTMLDivElement | null>(null);
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [checkoutChoice, setCheckoutChoice] = useState<CheckoutChoice>(null);
  const [newItem, setNewItem] = useState<DraftState>({
    name: "",
    notes: "",
    desiredQty: "1",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);
  const [editingDraft, setEditingDraft] = useState<DraftState>({
    name: "",
    notes: "",
    desiredQty: "1",
  });
  const [manualCheckout, setManualCheckout] = useState({
    market_name: "",
    receipt_date: formatDateTimeInput(new Date()),
    items: [] as ManualCheckoutItem[],
  });

  const suggestedQuery = useQuery({
    queryKey: ["inventory", "shopping-list"],
    queryFn: () => apiClient<InventoryItemResponse[]>("/inventory?status=comprar", { token }),
    enabled: Boolean(token),
  });

  const shoppingListQuery = useQuery({
    queryKey: ["shopping-list", "items"],
    queryFn: () => apiClient<ShoppingListItemResponse[]>("/shopping-list/items", { token }),
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

  const activeItems = useMemo(
    () => (shoppingListQuery.data ?? []).filter((item) => !item.checked),
    [shoppingListQuery.data],
  );

  const checkedItems = useMemo(
    () => (shoppingListQuery.data ?? []).filter((item) => item.checked),
    [shoppingListQuery.data],
  );

  useEffect(() => {
    setManualCheckout((current) => ({
      ...current,
      items: checkedItems.map((item) => {
        const existing = current.items.find(
          (candidate) => candidate.shopping_list_item_id === item.shopping_list_item_id,
        );
        return (
          existing ?? {
            shopping_list_item_id: item.shopping_list_item_id,
            product_name: item.name,
            quantity: String(item.desired_qty),
            unit_price: "",
          }
        );
      }),
    }));
  }, [checkedItems]);

  useEffect(() => {
    if (isShoppingMode && checkoutChoice === "scan" && checkedItems.length) {
      scanSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [checkoutChoice, checkedItems.length, isShoppingMode]);

  function markItemPending(id: string) {
    setPendingItemIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  function clearItemPending(id: string) {
    setPendingItemIds((current) => current.filter((candidate) => candidate !== id));
  }

  function replaceShoppingListItems(
    updater: (current: ShoppingListItemResponse[]) => ShoppingListItemResponse[],
  ) {
    queryClient.setQueryData<ShoppingListItemResponse[]>(["shopping-list", "items"], (current) =>
      updater(current ?? []),
    );
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateShoppingListItemRequest) =>
      apiClient<ShoppingListItemResponse>("/shopping-list/items", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: (createdItem) => {
      replaceShoppingListItems((current) => [createdItem, ...current]);
      setNewItem({ name: "", notes: "", desiredQty: "1" });
      showToast("Item adicionado na lista de compras.", "success");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateShoppingListItemRequest }) =>
      apiClient<ShoppingListItemResponse>(`/shopping-list/items/${id}`, {
        method: "PATCH",
        token,
        body: payload,
      }),
    onMutate: async ({ id, payload }) => {
      markItemPending(id);
      const previousItems = queryClient.getQueryData<ShoppingListItemResponse[]>([
        "shopping-list",
        "items",
      ]);

      replaceShoppingListItems((current) =>
        current.map((item) =>
          item.shopping_list_item_id === id
            ? {
                ...item,
                name: payload.name ?? item.name,
                category:
                  payload.category !== undefined ? payload.category : item.category,
                notes: payload.notes !== undefined ? payload.notes : item.notes,
                desired_qty:
                  payload.desired_qty !== undefined ? payload.desired_qty : item.desired_qty,
                checked: payload.checked ?? item.checked,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );

      return { previousItems, id };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["shopping-list", "items"], context?.previousItems ?? []);
    },
    onSuccess: (updatedItem) => {
      replaceShoppingListItems((current) =>
        current.map((item) =>
          item.shopping_list_item_id === updatedItem.shopping_list_item_id ? updatedItem : item,
        ),
      );
      setEditingId(null);
    },
    onSettled: (data, error, variables, context) => {
      clearItemPending(context?.id ?? variables.id);
      if (!error && data) {
        showToast("Item da lista atualizado.", "success");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/shopping-list/items/${id}`, {
        method: "DELETE",
        token,
      }),
    onMutate: async (id) => {
      markItemPending(id);
      const previousItems = queryClient.getQueryData<ShoppingListItemResponse[]>([
        "shopping-list",
        "items",
      ]);
      replaceShoppingListItems((current) =>
        current.filter((item) => item.shopping_list_item_id !== id),
      );
      return { previousItems, id };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["shopping-list", "items"], context?.previousItems ?? []);
    },
    onSuccess: () => {
      showToast("Item removido da lista.", "success");
    },
    onSettled: (_data, _error, id) => {
      clearItemPending(id);
    },
  });

  const confirmManualPurchaseMutation = useMutation({
    mutationFn: (payload: ConfirmReceiptRequest) =>
      apiClient<ConfirmReceiptResponse>("/receipts", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shopping-list", "items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "shopping-list"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      await queryClient.invalidateQueries({ queryKey: ["receipts", "list"] });
      clearPendingShoppingPurchase();
      setCheckoutChoice(null);
      setIsShoppingMode(false);
      showToast("Compra manual registrada com sucesso.", "success");
    },
  });

  function addManualItem() {
    const payload = normalizeDraftPayload(newItem);
    if (!payload) {
      showToast("Preencha nome e quantidade desejada valida.", "error");
      return;
    }
    createMutation.mutate(payload);
  }

  function addExistingItem(item: ShoppingListCatalogItemResponse) {
    createMutation.mutate({
      name: item.name,
      category: item.category ?? null,
      desired_qty: 1,
    });
  }

  function beginEdit(item: ShoppingListItemResponse) {
    setEditingId(item.shopping_list_item_id);
    setEditingDraft({
      name: item.name,
      notes: item.notes ?? "",
      desiredQty: String(item.desired_qty),
    });
  }

  function saveEdit(id: string) {
    if (pendingItemIds.includes(id)) return;
    const payload = normalizeDraftPayload(editingDraft);
    if (!payload) {
      showToast("Preencha nome e quantidade desejada valida.", "error");
      return;
    }
    updateMutation.mutate({ id, payload });
  }

  function toggleChecked(item: ShoppingListItemResponse) {
    if (pendingItemIds.includes(item.shopping_list_item_id)) return;
    updateMutation.mutate({
      id: item.shopping_list_item_id,
      payload: { checked: !item.checked },
    });
  }

  function openFinalizeFlow() {
    if (!checkedItems.length) {
      showToast("Marque pelo menos um item antes de finalizar.", "error");
      return;
    }
    setCheckoutChoice("manual");
  }

  function submitManualCheckout() {
    const market_name = manualCheckout.market_name.trim();
    if (!market_name) {
      showToast("Informe o mercado para registrar a compra.", "error");
      return;
    }

    const items = manualCheckout.items.map((item) => {
      const quantity = toNumber(item.quantity);
      const unit_price = toNumber(item.unit_price);
      return {
        product_name: item.product_name,
        quantity,
        unit_price,
        discount_amount: 0,
        total_price: Number((quantity * unit_price).toFixed(2)),
        item_type: "PRODUCT" as const,
      };
    });

    if (items.some((item) => Number.isNaN(item.quantity) || item.quantity <= 0 || Number.isNaN(item.unit_price) || item.unit_price < 0)) {
      showToast("Revise quantidade e preco unitario dos itens marcados.", "error");
      return;
    }

    const total_amount = Number(
      items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2),
    );

    confirmManualPurchaseMutation.mutate({
      market_name,
      receipt_date: new Date(manualCheckout.receipt_date).toISOString(),
      total_amount,
      matched_shopping_list_item_ids: checkedItems.map((item) => item.shopping_list_item_id),
      items,
    });
  }

  return (
    <div className="grid gap-6 pb-36">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
          Lista de compras
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          {isShoppingMode ? "Compra em andamento" : "Lista persistida com anotacoes e quantidade"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          {isShoppingMode
            ? "Modo focado para marcar apenas o que esta sendo pego nesta compra."
            : "Esta tela prepara a compra. O checklist so aparece quando voce iniciar o modo de compra."}
        </p>
      </SectionCard>

      {isShoppingMode ? (
        <>
          <SectionCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Checklist da compra atual</h2>
                <p className="mt-2 text-sm text-muted">
                  {shoppingListQuery.isLoading
                    ? "Carregando itens..."
                    : `${activeItems.length} pendente(s) e ${checkedItems.length} marcado(s).`}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setCheckoutChoice(null);
                  setIsShoppingMode(false);
                }}
              >
                Sair do modo compra
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              {shoppingListQuery.isLoading ? (
                <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                  Carregando sua lista...
                </div>
              ) : shoppingListQuery.data?.length ? (
                <>
                  {activeItems.map((item) => (
                    <ShoppingListCard
                      key={item.shopping_list_item_id}
                    isBusy={pendingItemIds.includes(item.shopping_list_item_id)}
                      isEditing={editingId === item.shopping_list_item_id}
                      item={item}
                      showChecklist
                      draft={editingDraft}
                      onBeginEdit={() => beginEdit(item)}
                      onChangeDraft={setEditingDraft}
                      onDelete={() => deleteMutation.mutate(item.shopping_list_item_id)}
                      onSave={() => saveEdit(item.shopping_list_item_id)}
                      onToggleChecked={() => toggleChecked(item)}
                      onCancelEdit={() => setEditingId(null)}
                    />
                  ))}

                  {checkedItems.length ? (
                    <div className="mt-2 grid gap-3 border-t border-border/10 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Ja pegos nesta compra
                      </p>
                      {checkedItems.map((item) => (
                        <ShoppingListCard
                          key={item.shopping_list_item_id}
                        isBusy={pendingItemIds.includes(item.shopping_list_item_id)}
                          isEditing={false}
                          item={item}
                          showChecklist
                          draft={editingDraft}
                          onBeginEdit={() => beginEdit(item)}
                          onChangeDraft={setEditingDraft}
                          onDelete={() => deleteMutation.mutate(item.shopping_list_item_id)}
                          onSave={() => saveEdit(item.shopping_list_item_id)}
                          onToggleChecked={() => toggleChecked(item)}
                          onCancelEdit={() => setEditingId(null)}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                  Sua lista persistida ainda esta vazia.
                </div>
              )}
            </div>
          </SectionCard>

          {checkoutChoice ? (
            <SectionCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                Finalizar compra
              </p>
              <h2 className="mt-3 text-2xl font-bold">Fechamento da compra atual</h2>
              <p className="mt-2 text-sm text-muted">
                Escolha como registrar os itens marcados nesta compra.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <button
                  className={[
                    "rounded-[28px] border px-5 py-5 text-left transition",
                    checkoutChoice === "manual"
                      ? "border-primary bg-primary/5"
                      : "border-border/10 bg-secondary/50",
                  ].join(" ")}
                  type="button"
                  onClick={() => setCheckoutChoice("manual")}
                >
                  <p className="text-lg font-bold text-ink">Adicionar manualmente</p>
                  <p className="mt-2 text-sm text-muted">
                    Informe mercado, quantidade e preco dos itens marcados.
                  </p>
                </button>

                <button
                  className={[
                    "rounded-[28px] border px-5 py-5 text-left transition",
                    checkoutChoice === "scan"
                      ? "border-primary bg-primary/5"
                      : "border-border/10 bg-secondary/50",
                  ].join(" ")}
                  type="button"
                  onClick={() => setCheckoutChoice("scan")}
                >
                  <p className="text-lg font-bold text-ink">Escanear nota</p>
                  <p className="mt-2 text-sm text-muted">
                    Abre a leitura logo abaixo, na mesma pagina, mantendo o contexto desta compra.
                  </p>
                </button>
              </div>

              {checkoutChoice === "manual" ? (
                <div className="mt-6 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Mercado
                      <input
                        className="input-shell"
                        placeholder="Nome do mercado"
                        value={manualCheckout.market_name}
                        onChange={(event) =>
                          setManualCheckout((current) => ({
                            ...current,
                            market_name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Data da compra
                      <input
                        className="input-shell"
                        type="datetime-local"
                        value={manualCheckout.receipt_date}
                        onChange={(event) =>
                          setManualCheckout((current) => ({
                            ...current,
                            receipt_date: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-3">
                    {manualCheckout.items.map((item) => {
                      const quantity = toNumber(item.quantity) || 0;
                      const unitPrice = toNumber(item.unit_price) || 0;
                      const total = quantity * unitPrice;
                      return (
                        <div
                          key={item.shopping_list_item_id}
                          className="rounded-[28px] bg-secondary/60 px-4 py-4"
                        >
                          <p className="text-sm font-semibold text-ink">{item.product_name}</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-[10rem_10rem_1fr]">
                            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                              Quantidade
                              <input
                                className="input-shell"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(event) =>
                                  setManualCheckout((current) => ({
                                    ...current,
                                    items: current.items.map((candidate) =>
                                      candidate.shopping_list_item_id === item.shopping_list_item_id
                                        ? { ...candidate, quantity: event.target.value }
                                        : candidate,
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                              Preco unitario
                              <input
                                className="input-shell"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={item.unit_price}
                                onChange={(event) =>
                                  setManualCheckout((current) => ({
                                    ...current,
                                    items: current.items.map((candidate) =>
                                      candidate.shopping_list_item_id === item.shopping_list_item_id
                                        ? { ...candidate, unit_price: event.target.value }
                                        : candidate,
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                                Total do item
                              </p>
                              <p className="mt-2 text-sm font-semibold text-ink">
                                R$ {total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] bg-secondary/60 px-5 py-5">
                  <p className="text-sm text-muted">
                    A leitura da nota aparece abaixo nesta mesma pagina, com revisao dos matches sugeridos antes da confirmacao.
                  </p>
                </div>
              )}
            </SectionCard>
          ) : null}
        </>
      ) : (
        <>
          <SectionCard>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_9rem_auto]">
              <input
                className="input-shell"
                placeholder="Nome do item"
                value={newItem.name}
                onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="input-shell"
                placeholder="Anotacao opcional"
                value={newItem.notes}
                onChange={(event) => setNewItem((current) => ({ ...current, notes: event.target.value }))}
              />
              <input
                className="input-shell"
                inputMode="decimal"
                placeholder="Qtd"
                value={newItem.desiredQty}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, desiredQty: event.target.value }))
                }
              />
              <Button isLoading={createMutation.isPending} onClick={addManualItem}>
                Adicionar
              </Button>
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Lista atual</h2>
                  <p className="mt-2 text-sm text-muted">
                    {shoppingListQuery.isLoading
                      ? "Carregando itens..."
                      : `${activeItems.length} item(ns) preparado(s) para a compra.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {shoppingListQuery.isLoading ? (
                  <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                    Carregando sua lista...
                  </div>
                ) : shoppingListQuery.data?.length ? (
                  activeItems.map((item) => (
                    <ShoppingListCard
                      key={item.shopping_list_item_id}
                      isBusy={pendingItemIds.includes(item.shopping_list_item_id)}
                      isEditing={editingId === item.shopping_list_item_id}
                      item={item}
                      showChecklist={false}
                      draft={editingDraft}
                      onBeginEdit={() => beginEdit(item)}
                      onChangeDraft={setEditingDraft}
                      onDelete={() => deleteMutation.mutate(item.shopping_list_item_id)}
                      onSave={() => saveEdit(item.shopping_list_item_id)}
                      onToggleChecked={() => toggleChecked(item)}
                      onCancelEdit={() => setEditingId(null)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                    Sua lista persistida ainda esta vazia.
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
                      <Button
                        isLoading={createMutation.isPending}
                        variant="ghost"
                        onClick={() => addExistingItem(item)}
                      >
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
        </>
      )}

      {isShoppingMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/10 bg-white/92 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-tertiary">Compra em andamento</p>
              <p className="text-xs text-muted">
                {checkedItems.length
                  ? `${checkedItems.length} item(ns) marcado(s) prontos para finalizar.`
                  : "Marque pelo menos um item para habilitar a finalizacao."}
              </p>
            </div>
            {checkoutChoice === "scan" ? (
              <Button disabled={!checkedItems.length} size="lg">
                Scan abaixo
              </Button>
            ) : (
              <Button
                disabled={!checkedItems.length}
                isLoading={confirmManualPurchaseMutation.isPending}
                size="lg"
                onClick={checkoutChoice === "manual" ? submitManualCheckout : openFinalizeFlow}
              >
                {checkoutChoice === "manual" ? "Confirmar compra manual" : "Finalizar compra"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!isShoppingMode && activeItems.length ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/10 bg-white/92 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-tertiary">Compra pronta para iniciar</p>
              <p className="text-xs text-muted">
                {activeItems.length} item(ns) aguardando checklist no mercado.
              </p>
            </div>
            <Button size="lg" onClick={() => setIsShoppingMode(true)}>
              Fazer compras
            </Button>
          </div>
        </div>
      ) : null}

      {isShoppingMode && checkoutChoice === "scan" && checkedItems.length ? (
        <div ref={scanSectionRef}>
          <ShoppingListScanCheckout
            checkedItems={checkedItems}
            onComplete={() => {
              clearPendingShoppingPurchase();
              setCheckoutChoice(null);
              setIsShoppingMode(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ShoppingListCard({
  item,
  showChecklist,
  isEditing,
  isBusy,
  draft,
  onChangeDraft,
  onBeginEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onToggleChecked,
}: {
  item: ShoppingListItemResponse;
  showChecklist: boolean;
  isEditing: boolean;
  isBusy: boolean;
  draft: DraftState;
  onChangeDraft: (draft: DraftState) => void;
  onBeginEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onToggleChecked: () => void;
}) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-4 py-4">
      <div className="flex items-start gap-3">
        {showChecklist ? (
          <input
            checked={item.checked}
            className="mt-1 h-4 w-4 rounded border-border/30 accent-primary"
            disabled={isBusy}
            type="checkbox"
            onChange={onToggleChecked}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="grid gap-3">
              <input
                className="input-shell"
                value={draft.name}
                onChange={(event) => onChangeDraft({ ...draft, name: event.target.value })}
              />
              <input
                className="input-shell"
                placeholder="Anotacao"
                value={draft.notes}
                onChange={(event) => onChangeDraft({ ...draft, notes: event.target.value })}
              />
              <input
                className="input-shell"
                inputMode="decimal"
                placeholder="Quantidade desejada"
                value={draft.desiredQty}
                onChange={(event) => onChangeDraft({ ...draft, desiredQty: event.target.value })}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className={["text-sm font-semibold text-ink", item.checked ? "line-through opacity-70" : ""].join(" ")}>
                  {item.name}
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {sourceLabelMap[item.source]}
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {formatQuantity(item.desired_qty)} un
                </span>
              </div>
              {item.notes ? <p className="mt-2 text-sm text-muted">{item.notes}</p> : null}
              <p className="mt-2 text-xs text-muted">
                {item.category ?? "Sem categoria"} · atualizado {formatDateTime(item.updated_at)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <Button disabled={isBusy} size="sm" variant="ghost" onClick={onCancelEdit}>
              Cancelar
            </Button>
            <Button isLoading={isBusy} size="sm" onClick={onSave}>
              Salvar
            </Button>
          </>
        ) : (
          <>
            <Button disabled={isBusy} size="sm" variant="ghost" onClick={onBeginEdit}>
              Editar
            </Button>
            {showChecklist ? (
              <Button disabled={isBusy} size="sm" variant="outline" onClick={onToggleChecked}>
                {item.checked ? "Desmarcar" : "Marcar"}
              </Button>
            ) : null}
            <Button disabled={isBusy} size="sm" variant="ghost" onClick={onDelete}>
              Remover
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
