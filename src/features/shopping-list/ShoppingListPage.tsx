import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { ManualCheckoutPanel } from "../../components/carrinho/ManualCheckoutPanel";
import { PasteListImporter } from "../../components/carrinho/PasteListImporter";
import { ShoppingListItemCard } from "../../components/carrinho/ShoppingListItemCard";
import { ShoppingModeEditor } from "../../components/carrinho/ShoppingModeEditor";
import {
  DraftState,
  ManualCheckoutItem,
  ParsedShoppingListItem,
  buildDraftFromItem,
  getEstimatedLineTotal,
  toNumber,
} from "../../components/carrinho/types";
import { ShoppingListScanCheckout } from "../../components/receipts/ShoppingListScanCheckout";
import { Button } from "../../components/ui/Button";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import {
  BulkUpdateShoppingListItemCheckedRequest,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  CreateShoppingListItemRequest,
  InventoryItemResponse,
  ShoppingListCatalogItemResponse,
  ShoppingListItemResponse,
  UpdateShoppingListItemRequest,
} from "../../lib/api/contracts";
import {
  getCheckedSnapshot,
  markCheckedDeltasSynced,
  overlayLocalCheckedState,
  saveCheckedDelta,
  ShoppingListCheckedDelta,
} from "../../lib/shopping-list/autoSave";
import { clearPendingShoppingPurchase } from "../../lib/shopping-list/purchaseSession";
import { formatCurrency, formatDateTime, formatQuantity } from "../../lib/utils/formatters";

type CheckoutChoice = "manual" | "scan" | null;

type DraftMap = Record<string, DraftState>;

function formatDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildDraftPayload(
  draft: DraftState,
): CreateShoppingListItemRequest | null {
  const name = draft.name.trim();
  const desiredQty = draft.desiredQty.trim() ? toNumber(draft.desiredQty) : 1;
  const estimatedUnitPrice = draft.estimatedUnitPrice.trim()
    ? toNumber(draft.estimatedUnitPrice)
    : null;

  if (!name || Number.isNaN(desiredQty) || desiredQty <= 0) return null;
  if (estimatedUnitPrice !== null && (Number.isNaN(estimatedUnitPrice) || estimatedUnitPrice < 0)) {
    return null;
  }

  return {
    name,
    category: draft.category.trim() || null,
    notes: draft.notes.trim() || null,
    desired_qty: desiredQty,
    estimated_unit_price: estimatedUnitPrice,
  };
}

function draftsMatch(left: DraftState, right: DraftState) {
  return (
    left.name === right.name &&
    left.category === right.category &&
    left.notes === right.notes &&
    left.desiredQty === right.desiredQty &&
    left.estimatedUnitPrice === right.estimatedUnitPrice
  );
}

function mergeItemWithDraft(
  item: ShoppingListItemResponse,
  draft: DraftState | undefined,
  checked: boolean,
): ShoppingListItemResponse {
  if (!draft) return { ...item, checked };

  return {
    ...item,
    name: draft.name,
    category: draft.category || null,
    notes: draft.notes || null,
    desired_qty: draft.desiredQty,
    estimated_unit_price: draft.estimatedUnitPrice || null,
    checked,
  };
}

export function ShoppingListPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const scanSectionRef = useRef<HTMLDivElement | null>(null);
  const checkedQueueRef = useRef<Record<string, ShoppingListCheckedDelta>>({});
  const flushTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const isFlushingCheckedQueueRef = useRef(false);
  const didHydrateCheckedQueueRef = useRef(false);
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [checkoutChoice, setCheckoutChoice] = useState<CheckoutChoice>(null);
  const [newItem, setNewItem] = useState<DraftState>({
    name: "",
    category: "",
    notes: "",
    desiredQty: "1",
    estimatedUnitPrice: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftState>({
    name: "",
    category: "",
    notes: "",
    desiredQty: "1",
    estimatedUnitPrice: "",
  });
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);
  const [isSavingShoppingMode, setIsSavingShoppingMode] = useState(false);
  const [shoppingModeDrafts, setShoppingModeDrafts] = useState<DraftMap>({});
  const [shoppingModeCheckedIds, setShoppingModeCheckedIds] = useState<string[]>([]);
  const [showShoppingPriceField, setShowShoppingPriceField] = useState(true);
  const [isClearListModalOpen, setIsClearListModalOpen] = useState(false);
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

  const baseShoppingListItems = useMemo(() => {
    const result = overlayLocalCheckedState(shoppingListQuery.data ?? []);
    return result;
  }, [shoppingListQuery.data]);

  function clearFlushTimer() {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }

  function clearRetryTimer() {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }

  function scheduleCheckedQueueFlush(delayMs = 3000) {
    clearFlushTimer();
    flushTimerRef.current = window.setTimeout(() => {
      void flushCheckedQueue();
    }, delayMs);
  }

  async function flushCheckedQueue() {
    if (!token || isFlushingCheckedQueueRef.current) return;

    const changes = Object.values(checkedQueueRef.current);
    if (!changes.length) return;

    isFlushingCheckedQueueRef.current = true;
    clearFlushTimer();

    try {
      const payload: BulkUpdateShoppingListItemCheckedRequest = {
        changes: changes.map((change) => ({
          id: change.id,
          checked: change.checked,
          ts: change.ts,
        })),
      };

      const updatedItems = await apiClient<ShoppingListItemResponse[]>("/shopping-list/items/bulk", {
        method: "PATCH",
        token,
        body: payload,
      });

      replaceShoppingListItems((current) =>
        current.map((item) => {
          const updated = updatedItems.find(
            (candidate) => candidate.shopping_list_item_id === item.shopping_list_item_id,
          );
          return updated ?? item;
        }),
      );

      for (const change of changes) {
        delete checkedQueueRef.current[change.id];
      }

      retryAttemptRef.current = 0;
      clearRetryTimer();
      markCheckedDeltasSynced(changes);
    } catch (error) {
      if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
        clearRetryTimer();
        clearFlushTimer();
        return;
      }

      const attempt = retryAttemptRef.current + 1;
      retryAttemptRef.current = attempt;
      const delayMs = Math.min(30000, 1000 * (2 ** attempt));

      clearRetryTimer();
      retryTimerRef.current = window.setTimeout(() => {
        void flushCheckedQueue();
      }, delayMs);
    } finally {
      isFlushingCheckedQueueRef.current = false;
    }
  }

  function enqueueCheckedChange(id: string, checked: boolean) {
    const change = {
      id,
      checked,
      ts: Date.now(),
    };

    checkedQueueRef.current[id] = change;
    saveCheckedDelta(change);
    retryAttemptRef.current = 0;
    clearRetryTimer();
    scheduleCheckedQueueFlush();
  }

  useEffect(() => {
    if (!isShoppingMode) return;

    const items = baseShoppingListItems.items;
    setShoppingModeDrafts(
      Object.fromEntries(items.map((item) => [item.shopping_list_item_id, buildDraftFromItem(item)])),
    );
    setShoppingModeCheckedIds(
      items.filter((item) => item.checked).map((item) => item.shopping_list_item_id),
    );
  }, [baseShoppingListItems.items, isShoppingMode]);

  useEffect(() => {
    if (!token) {
      didHydrateCheckedQueueRef.current = false;
      return;
    }

    if (!baseShoppingListItems.shouldSync || didHydrateCheckedQueueRef.current) return;

    const pendingChanges = getCheckedSnapshot().items;
    checkedQueueRef.current = {
      ...checkedQueueRef.current,
      ...pendingChanges,
    };
    didHydrateCheckedQueueRef.current = true;
    scheduleCheckedQueueFlush(0);
  }, [baseShoppingListItems.shouldSync, token]);

  useEffect(() => {
    function flushSoon() {
      void flushCheckedQueue();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushSoon();
      }
    }

    window.addEventListener("pagehide", flushSoon);
    window.addEventListener("beforeunload", flushSoon);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearFlushTimer();
      clearRetryTimer();
      window.removeEventListener("pagehide", flushSoon);
      window.removeEventListener("beforeunload", flushSoon);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  const shoppingModeItems = useMemo(
    () =>
      (shoppingListQuery.data ?? []).map((item) =>
        mergeItemWithDraft(
          item,
          shoppingModeDrafts[item.shopping_list_item_id],
          shoppingModeCheckedIds.includes(item.shopping_list_item_id),
        ),
      ),
    [baseShoppingListItems.items, shoppingModeDrafts, shoppingModeCheckedIds],
  );

  const visibleItems = isShoppingMode ? shoppingModeItems : baseShoppingListItems.items;

  const activeItems = useMemo(
    () => visibleItems.filter((item) => !item.checked),
    [visibleItems],
  );

  const checkedItems = useMemo(
    () => visibleItems.filter((item) => item.checked),
    [visibleItems],
  );

  const activeEstimatedTotal = useMemo(
    () => activeItems.reduce((sum, item) => sum + (getEstimatedLineTotal(item) ?? 0), 0),
    [activeItems],
  );

  const checkedEstimatedTotal = useMemo(
    () => checkedItems.reduce((sum, item) => sum + (getEstimatedLineTotal(item) ?? 0), 0),
    [checkedItems],
  );

  const visibleEstimatedTotal = useMemo(
    () => visibleItems.reduce((sum, item) => sum + (getEstimatedLineTotal(item) ?? 0), 0),
    [visibleItems],
  );

  const shoppingModeDirtyCount = useMemo(() => {
    if (!isShoppingMode) return 0;
    const originalItems = baseShoppingListItems.items;
    return originalItems.filter((item) => {
      const draft = shoppingModeDrafts[item.shopping_list_item_id] ?? buildDraftFromItem(item);
      const checked = shoppingModeCheckedIds.includes(item.shopping_list_item_id);
      return !draftsMatch(draft, buildDraftFromItem(item)) || checked !== item.checked;
    }).length;
  }, [baseShoppingListItems.items, isShoppingMode, shoppingModeDrafts, shoppingModeCheckedIds]);

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

  const manualCheckoutPreviewTotal = useMemo(
    () =>
      manualCheckout.items.reduce((sum, item) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) return sum;
        return sum + (quantity * unitPrice);
      }, 0),
    [manualCheckout.items],
  );

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
      setNewItem({
        name: "",
        category: "",
        notes: "",
        desiredQty: "1",
        estimatedUnitPrice: "",
      });
      showToast("Item adicionado na lista de compras.", "success");
    },
  });

  const addSuggestedMutation = useMutation({
    mutationFn: (payload: { inventory_id: string; desired_qty: number }) =>
      apiClient<ShoppingListItemResponse>("/shopping-list/items/from-inventory", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: (createdItem) => {
      replaceShoppingListItems((current) => {
        const existingIndex = current.findIndex(
          (item) => item.shopping_list_item_id === createdItem.shopping_list_item_id,
        );
        if (existingIndex === -1) return [createdItem, ...current];
        return current.map((item) =>
          item.shopping_list_item_id === createdItem.shopping_list_item_id ? createdItem : item,
        );
      });
      showToast("Recomendado adicionado na lista.", "success");
    },
  });

  const importListMutation = useMutation({
    mutationFn: async (items: ParsedShoppingListItem[]) => {
      const results = await Promise.allSettled(
        items.map((item) =>
          apiClient<ShoppingListItemResponse>("/shopping-list/items", {
            method: "POST",
            token,
            body: {
              name: item.name,
              desired_qty: item.desired_qty,
              notes: item.notes,
            },
          }),
        ),
      );

      const createdItems = results
        .filter((result): result is PromiseFulfilledResult<ShoppingListItemResponse> => result.status === "fulfilled")
        .map((result) => result.value);

      const failedCount = results.length - createdItems.length;
      return { createdItems, failedCount };
    },
    onSuccess: ({ createdItems, failedCount }) => {
      if (createdItems.length) {
        replaceShoppingListItems((current) => [...createdItems.reverse(), ...current]);
      }

      if (createdItems.length && !failedCount) {
        showToast(`${createdItems.length} item(ns) carregado(s) na lista.`, "success");
        return;
      }

      if (createdItems.length && failedCount) {
        showToast(
          `${createdItems.length} item(ns) carregado(s) e ${failedCount} ignorado(s).`,
          "info",
        );
        return;
      }

      showToast("Nao foi possivel carregar a lista colada.", "error");
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
                estimated_unit_price:
                  payload.estimated_unit_price !== undefined
                    ? payload.estimated_unit_price
                    : item.estimated_unit_price,
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
    },
    onSettled: (_data, _error, variables, context) => {
      clearItemPending(context?.id ?? variables.id);
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

  const clearListMutation = useMutation({
    mutationFn: async () => {
      const items = shoppingListQuery.data ?? [];
      const ids = items.map((item) => item.shopping_list_item_id);

      const results = await Promise.allSettled(
        ids.map((id) =>
          apiClient<void>(`/shopping-list/items/${id}`, {
            method: "DELETE",
            token,
          }),
        ),
      );

      const deletedIds = ids.filter((_, index) => results[index]?.status === "fulfilled");
      const failedCount = ids.length - deletedIds.length;
      return { deletedIds, failedCount };
    },
    onSuccess: ({ deletedIds, failedCount }) => {
      if (deletedIds.length) {
        replaceShoppingListItems((current) =>
          current.filter((item) => !deletedIds.includes(item.shopping_list_item_id)),
        );
      }
      setIsClearListModalOpen(false);

      if (deletedIds.length && !failedCount) {
        showToast("Lista atual limpa com sucesso.", "success");
        return;
      }

      if (deletedIds.length && failedCount) {
        showToast(`Lista limpa parcialmente. ${failedCount} item(ns) nao foram removidos.`, "info");
        return;
      }

      showToast("Nao foi possivel limpar a lista atual.", "error");
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
    const payload = buildDraftPayload(newItem);
    if (!payload) {
      showToast("Revise nome, categoria, quantidade e preco estimado.", "error");
      return;
    }
    createMutation.mutate(payload);
  }

  function addSuggestedItem(item: InventoryItemResponse) {
    addSuggestedMutation.mutate({
      inventory_id: item.inventory_id,
      desired_qty: 1,
    });
  }

  function addExistingItem(item: ShoppingListCatalogItemResponse) {
    createMutation.mutate({
      name: item.name,
      category: item.category ?? null,
      desired_qty: 1,
      estimated_unit_price: item.last_unit_price ? toNumber(item.last_unit_price) : null,
    });
  }

  function importPastedList(items: ParsedShoppingListItem[]) {
    if (!items.length) {
      showToast("Cole pelo menos um item para carregar a lista.", "error");
      return;
    }
    importListMutation.mutate(items);
  }

  function beginEdit(item: ShoppingListItemResponse) {
    setEditingId(item.shopping_list_item_id);
    setEditingDraft(buildDraftFromItem(item));
  }

  function saveItem(id: string) {
    if (pendingItemIds.includes(id)) return;
    const payload = buildDraftPayload(editingDraft);
    if (!payload) {
      showToast("Revise nome, categoria, quantidade e preco estimado.", "error");
      return;
    }
    updateMutation.mutate({ id, payload });
    setEditingId(null);
  }

  function toggleChecked(item: ShoppingListItemResponse) {
    if (pendingItemIds.includes(item.shopping_list_item_id)) return;
    updateMutation.mutate({
      id: item.shopping_list_item_id,
      payload: { checked: !item.checked },
    });
  }

  function updateShoppingDraft(id: string, patch: Partial<DraftState>) {
    setShoppingModeDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          name: "",
          category: "",
          notes: "",
          desiredQty: "1",
          estimatedUnitPrice: "",
        }),
        ...patch,
      },
    }));
  }

  function toggleShoppingModeChecked(id: string) {
    setShoppingModeCheckedIds((current) => {
      const nextChecked = !current.includes(id);
      enqueueCheckedChange(id, nextChecked);
      return nextChecked ? [...current, id] : current.filter((candidate) => candidate !== id);
    });
  }

  async function persistShoppingModeChanges() {
    if (!isShoppingMode || !token) return true;

    const originalItems = baseShoppingListItems.items;
    const updates: Array<{ id: string; payload: UpdateShoppingListItemRequest }> = [];

    for (const item of originalItems) {
      const draft = shoppingModeDrafts[item.shopping_list_item_id] ?? buildDraftFromItem(item);
      const draftPayload = buildDraftPayload(draft);
      if (!draftPayload) {
        showToast(`Revise o item ${item.name} antes de continuar.`, "error");
        return false;
      }

      const checked = shoppingModeCheckedIds.includes(item.shopping_list_item_id);
      const currentDraft = buildDraftFromItem(item);
      if (!draftsMatch(draft, currentDraft)) {
        updates.push({
          id: item.shopping_list_item_id,
          payload: draftPayload,
        });
      }
    }

    setIsSavingShoppingMode(true);
    try {
      await flushCheckedQueue();

      if (updates.length) {
        const updatedItems = await Promise.all(
          updates.map(({ id, payload }) =>
            apiClient<ShoppingListItemResponse>(`/shopping-list/items/${id}`, {
              method: "PATCH",
              token,
              body: payload,
            }),
          ),
        );

        replaceShoppingListItems((current) =>
          current.map((item) => {
            const updated = updatedItems.find(
              (candidate) => candidate.shopping_list_item_id === item.shopping_list_item_id,
            );
            return updated ?? item;
          }),
        );
      }

      showToast("Alteracoes da compra salvas.", "success");
      return true;
    } catch {
      showToast("Nao foi possivel salvar as alteracoes da compra.", "error");
      return false;
    } finally {
      setIsSavingShoppingMode(false);
    }
  }

  async function openFinalizeFlow() {
    if (!checkedItems.length) {
      showToast("Marque pelo menos um item antes de finalizar.", "error");
      return;
    }

    const saved = await persistShoppingModeChanges();
    if (!saved) return;
    setCheckoutChoice("scan");
  }

  async function selectCheckoutChoice(choice: Exclude<CheckoutChoice, null>) {
    const saved = await persistShoppingModeChanges();
    if (!saved) return;
    setCheckoutChoice(choice);
  }

  async function submitManualCheckout() {
    const saved = await persistShoppingModeChanges();
    if (!saved) return;

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

    if (
      items.some(
        (item) =>
          Number.isNaN(item.quantity) ||
          item.quantity <= 0 ||
          Number.isNaN(item.unit_price) ||
          item.unit_price < 0,
      )
    ) {
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
          {isShoppingMode ? "Compra em andamento" : "Lista pronta para planejar a compra"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          {isShoppingMode
            ? "No modo compra a lista abre em tabela para ajuste rapido. As alteracoes ficam locais e sao salvas em lote quando voce avancar para finalizar."
            : "A lista normal fica fechada. Clique para editar apenas quando precisar ajustar um item antes de sair para comprar."}
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
                    : `${activeItems.length} pendente(s), ${checkedItems.length} marcado(s) e ${shoppingModeDirtyCount} alteracao(oes) aguardando salvamento.`}
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

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                size="sm"
                variant={showShoppingPriceField ? "secondary" : "outline"}
                onClick={() => setShowShoppingPriceField((current) => !current)}
              >
                {showShoppingPriceField ? "Ocultar valor" : "Mostrar valor"}
              </Button>
            </div>

            <div className="mt-5 hidden gap-3 sm:grid-cols-3 md:grid">
              <div className="rounded-[24px] bg-secondary/55 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Total previsto da lista
                </p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {formatCurrency(visibleEstimatedTotal)}
                </p>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Ja peguei no carrinho
                </p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {formatCurrency(checkedEstimatedTotal)}
                </p>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Ainda falta pegar
                </p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {formatCurrency(activeEstimatedTotal)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              {shoppingListQuery.isLoading ? (
                <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                  Carregando sua lista...
                </div>
              ) : visibleItems.length ? (
                <ShoppingModeEditor
                  items={visibleItems}
                  showPriceField={showShoppingPriceField}
                  pendingItemIds={pendingItemIds}
                  onDeleteItem={(id) => deleteMutation.mutate(id)}
                  onToggleChecked={toggleShoppingModeChecked}
                  onUpdateDraft={updateShoppingDraft}
                />
              ) : (
                <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                  Sua lista persistida ainda esta vazia.
                </div>
              )}
            </div>
          </SectionCard>

          {checkoutChoice === "manual" ? (
            <SectionCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                Finalizar compra
              </p>
              <h2 className="mt-3 text-2xl font-bold">Fechamento manual da compra</h2>
              <p className="mt-2 text-sm text-muted">
                Informe mercado, quantidade e preco dos itens marcados.
              </p>
              <ManualCheckoutPanel
                manualCheckout={manualCheckout}
                previewTotal={manualCheckoutPreviewTotal}
                onChange={setManualCheckout}
              />
            </SectionCard>
          ) : null}
        </>
      ) : (
        <>
          <SectionCard>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_9rem_10rem_auto]">
              <input
                className="input-shell"
                placeholder="Nome do item"
                value={newItem.name}
                onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="input-shell"
                placeholder="Tipo do produto"
                value={newItem.category}
                onChange={(event) => setNewItem((current) => ({ ...current, category: event.target.value }))}
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
              <input
                className="input-shell"
                inputMode="decimal"
                placeholder="Preco"
                value={newItem.estimatedUnitPrice}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, estimatedUnitPrice: event.target.value }))
                }
              />
              <Button isLoading={createMutation.isPending} onClick={addManualItem}>
                Adicionar
              </Button>
            </div>
          </SectionCard>

          <PasteListImporter
            isLoading={importListMutation.isPending}
            onImport={importPastedList}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard>
              <h2 className="text-2xl font-bold">Recomendados pelo sistema</h2>
              <p className="mt-2 text-sm text-muted">
                Itens do estoque que ja entraram em status de compra. Agora voce pode adicionar direto na lista.
              </p>
              <div className="mt-5 grid gap-3">
                {suggestedQuery.isLoading ? (
                  <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                    Carregando itens sugeridos...
                  </div>
                ) : (suggestedQuery.data ?? []).length ? (
                  (suggestedQuery.data ?? []).map((item) => (
                    <div
                      key={item.inventory_id}
                      className="flex items-start justify-between gap-3 rounded-2xl bg-secondary/70 px-4 py-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.product.name}</p>
                        <p className="mt-1 text-sm text-muted">
                          {item.product.category} · atual {formatQuantity(item.current_qty)} · minimo{" "}
                          {formatQuantity(item.min_qty)}
                        </p>
                      </div>
                      <Button
                        isLoading={addSuggestedMutation.isPending}
                        size="sm"
                        variant="outline"
                        onClick={() => addSuggestedItem(item)}
                      >
                        Adicionar
                      </Button>
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
                      : `${activeItems.length} item(ns) preparado(s) para a compra · estimativa ${formatCurrency(activeEstimatedTotal)}.`}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Edite ou remova sem sair da tela. O total previsto ja considera quantidade x preco.
                  </p>
                </div>
                <Button
                  disabled={!shoppingListQuery.data?.length}
                  isLoading={clearListMutation.isPending}
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setIsClearListModalOpen(true)}
                >
                  Limpar lista
                </Button>
              </div>

              <div className="mt-5 grid gap-3">
                {shoppingListQuery.isLoading ? (
                  <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                    Carregando sua lista...
                  </div>
                ) : visibleItems.length ? (
                  activeItems.map((item) => (
                    <ShoppingListItemCard
                      key={item.shopping_list_item_id}
                      draft={editingDraft}
                      isBusy={pendingItemIds.includes(item.shopping_list_item_id)}
                      isEditing={editingId === item.shopping_list_item_id}
                      item={item}
                      onBeginEdit={() => beginEdit(item)}
                      onCancelEdit={() => setEditingId(null)}
                      onChangeDraft={setEditingDraft}
                      onDelete={() => deleteMutation.mutate(item.shopping_list_item_id)}
                      onSave={() => saveItem(item.shopping_list_item_id)}
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
              <p className="mt-2 text-sm text-muted">
                Use o ultimo preco conhecido para montar uma previsao mais realista.
              </p>
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
                        <p className="mt-1 text-xs text-muted">
                          Ultimo preco:{" "}
                          {item.last_unit_price ? formatCurrency(toNumber(item.last_unit_price)) : "nao informado"}
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

      <ConfirmModal
        cancelLabel="Voltar"
        confirmLabel="Limpar lista"
        description="Todos os itens atuais da lista de compras serao removidos para voce recomecar do zero."
        footerNote="Use isso quando quiser testar novamente o carregamento da lista colando texto."
        isLoading={clearListMutation.isPending}
        isOpen={isClearListModalOpen}
        title="Limpar lista atual?"
        onCancel={() => setIsClearListModalOpen(false)}
        onConfirm={() => clearListMutation.mutate()}
      />

      {isShoppingMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/10 bg-white/92 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-tertiary">Compra em andamento</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                Total previsto {formatCurrency(visibleEstimatedTotal)}
              </p>
            </div>
            {checkoutChoice === "scan" ? (
              <Button disabled={!checkedItems.length || isSavingShoppingMode} size="lg">
                Leitura da nota abaixo
              </Button>
            ) : (
              <Button
                disabled={!checkedItems.length || isSavingShoppingMode}
                isLoading={confirmManualPurchaseMutation.isPending || isSavingShoppingMode}
                size="lg"
                onClick={() =>
                  void (checkoutChoice === "manual" ? submitManualCheckout() : openFinalizeFlow())
                }
              >
                {checkoutChoice === "manual" ? "Confirmar compra manual" : "Finalizar compra"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!isShoppingMode && visibleItems.length ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/10 bg-white/92 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-tertiary">Compra pronta para iniciar</p>
              <p className="text-xs text-muted">
                {visibleItems.length} item(ns) na lista · estimativa {formatCurrency(visibleEstimatedTotal)}.
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
