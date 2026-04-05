import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryItemResponse, UpdateInventoryItemRequest } from "../../lib/api/contracts";
import { apiClient } from "../../lib/api/apiClient";
import { formatDateTime } from "../../lib/utils/formatters";
import { Button } from "../ui/Button";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";

type InventoryTableRowProps = {
  item: InventoryItemResponse;
  rendered?: boolean;
  disabled?: boolean;
  manageMode?: boolean;
};

export function InventoryTableRow({
  item,
  rendered = true,
  disabled = false,
  manageMode = false,
}: InventoryTableRowProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    product_name: item.product.name,
    category: item.product.category,
    current_qty: String(item.current_qty),
    min_qty: String(item.min_qty),
  });

  if (!rendered) return null;

  const refreshRelatedData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["shopping-list", "items"] });
    await queryClient.invalidateQueries({ queryKey: ["inventory", "shopping-list"] });
    await queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const updateInventoryCache = (
    inventoryId: string,
    updater: (current: InventoryItemResponse) => InventoryItemResponse,
  ) => {
    queryClient.setQueryData<InventoryItemResponse[]>(["inventory", "list"], (currentItems) =>
      currentItems?.map((currentItem) =>
        currentItem.inventory_id === inventoryId ? updater(currentItem) : currentItem,
      ) ?? [],
    );
  };

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateInventoryItemRequest) =>
      apiClient<InventoryItemResponse>(`/inventory/${item.inventory_id}`, {
        method: "PUT",
        token,
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      await refreshRelatedData();
      showToast("Item do inventario atualizado com sucesso.", "success");
      setIsEditing(false);
    },
  });

  const consumeMutation = useMutation({
    mutationFn: () =>
      apiClient(`/inventory/${item.inventory_id}/consume`, {
        method: "PATCH",
        token,
        body: { amount: 1 },
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["inventory", "list"] });
      const previousItems = queryClient.getQueryData<InventoryItemResponse[]>(["inventory", "list"]);

      updateInventoryCache(item.inventory_id, (currentItem) => {
        const nextQty = Number(currentItem.current_qty) - 1;
        return {
          ...currentItem,
          current_qty: nextQty,
          status: nextQty <= Number(currentItem.min_qty) ? "Comprar" : "Em Estoque",
          updated_at: new Date().toISOString(),
        };
      });

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["inventory", "list"], context?.previousItems ?? []);
    },
    onSuccess: async () => {
      await refreshRelatedData();
      showToast("Item consumido do estoque.", "success");
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiClient(`/inventory/${item.inventory_id}/add`, {
        method: "PATCH",
        token,
        body: { amount: 1 },
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["inventory", "list"] });
      const previousItems = queryClient.getQueryData<InventoryItemResponse[]>(["inventory", "list"]);

      updateInventoryCache(item.inventory_id, (currentItem) => {
        const nextQty = Number(currentItem.current_qty) + 1;
        return {
          ...currentItem,
          current_qty: nextQty,
          status: nextQty <= Number(currentItem.min_qty) ? "Comprar" : "Em Estoque",
          updated_at: new Date().toISOString(),
        };
      });

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["inventory", "list"], context?.previousItems ?? []);
    },
    onSuccess: async () => {
      await refreshRelatedData();
      showToast("Quantidade adicionada ao estoque.", "success");
    },
  });

  const addToShoppingListMutation = useMutation({
    mutationFn: () =>
      apiClient("/shopping-list/items/from-inventory", {
        method: "POST",
        token,
        body: {
          inventory_id: item.inventory_id,
          desired_qty: 1,
        },
      }),
    onSuccess: async () => {
      await refreshRelatedData();
      showToast("Item enviado para a lista de compras.", "success");
    },
  });

  function save() {
    updateMutation.mutate({
      product_name: form.product_name.trim(),
      category: form.category.trim(),
      current_qty: Number(form.current_qty.replace(",", ".")),
      min_qty: Number(form.min_qty.replace(",", ".")),
    });
  }

  return (
    <tr className="border-b border-border/10 align-top last:border-b-0">
      <td className="px-4 py-4">
        {manageMode && isEditing ? (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Produto
            <input
              className="input-shell"
              disabled={disabled}
              value={form.product_name}
              onChange={(event) => setForm((current) => ({ ...current, product_name: event.target.value }))}
            />
          </label>
        ) : (
          <span className="font-semibold text-ink">{item.product.name}</span>
        )}
      </td>
      <td className="px-4 py-4">
        {manageMode && isEditing ? (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Categoria
            <input
              className="input-shell"
              disabled={disabled}
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
          </label>
        ) : (
          <span className="text-sm text-ink">{item.product.category}</span>
        )}
      </td>
      {manageMode ? (
        <td className="px-4 py-4">
          <span className="text-sm font-semibold text-ink">{String(item.current_qty)}</span>
        </td>
      ) : null}
      {!manageMode ? <td className="px-4 py-4">
        {manageMode && isEditing ? (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Atual
            <input
              className="input-shell"
              disabled={disabled}
              value={form.current_qty}
              onChange={(event) => setForm((current) => ({ ...current, current_qty: event.target.value }))}
            />
          </label>
        ) : (
          <span className="text-sm text-ink">{String(item.current_qty)}</span>
        )}
      </td> : null}
      {!manageMode ? <td className="px-4 py-4">
        {manageMode && isEditing ? (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Minimo
            <input
              className="input-shell"
              disabled={disabled}
              value={form.min_qty}
              onChange={(event) => setForm((current) => ({ ...current, min_qty: event.target.value }))}
            />
          </label>
        ) : (
          <span className="text-sm text-ink">{String(item.min_qty)}</span>
        )}
      </td> : null}
      {!manageMode ? <td className="px-4 py-4 text-sm font-semibold text-tertiary">{item.status}</td> : null}
      {!manageMode ? <td className="px-4 py-4 text-sm text-muted">{formatDateTime(item.updated_at)}</td> : null}
      <td className="w-[1%] whitespace-nowrap px-3 py-4">
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          {manageMode && isEditing ? (
            <>
              <Button disabled={disabled} size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button disabled={disabled} isLoading={updateMutation.isPending} size="sm" onClick={save}>
                Salvar
              </Button>
            </>
          ) : (
            <>
              {manageMode ? (
                <>
                  <Button
                    aria-label="Consumir 1 unidade"
                    className="h-10 min-h-10 min-w-10 px-0"
                    disabled={disabled}
                    isLoading={consumeMutation.isPending}
                    size="sm"
                    variant="ghost"
                    onClick={() => consumeMutation.mutate()}
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </Button>
                  <Button
                    aria-label="Adicionar 1 unidade"
                    className="h-10 min-h-10 min-w-10 px-0"
                    disabled={disabled}
                    isLoading={addMutation.isPending}
                    size="sm"
                    variant="ghost"
                    onClick={() => addMutation.mutate()}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </Button>
                  <Button
                    aria-label="Editar produto"
                    className="h-10 min-h-10 min-w-10 px-0"
                    disabled={disabled}
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Button>
                </>
              ) : null}
              <Button
                aria-label="Adicionar item a lista de compras"
                className={manageMode ? "h-10 min-h-10 min-w-10 px-0" : ""}
                disabled={disabled}
                isLoading={addToShoppingListMutation.isPending}
                size="sm"
                variant={Number(item.current_qty) <= Number(item.min_qty) ? "primary" : "outline"}
                onClick={() => addToShoppingListMutation.mutate()}
              >
                {manageMode ? (
                  <span className="material-symbols-outlined text-[18px]">playlist_add</span>
                ) : (
                  "Adicionar a lista"
                )}
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
