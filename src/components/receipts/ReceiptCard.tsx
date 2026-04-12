import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DeleteReceiptResponse,
  PaginatedReceiptsResponse,
  ReceiptDetailResponse,
  ReceiptListItem,
  UpdateReceiptRequest,
} from "../../lib/api/contracts";
import { apiClient } from "../../lib/api/apiClient";
import { formatCurrency, formatDateTime, formatQuantity } from "../../lib/utils/formatters";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { SectionCard } from "../ui/SectionCard";

export function ReceiptCard({ receipt }: { receipt: ReceiptListItem }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [draft, setDraft] = useState<ReceiptDetailResponse | null>(null);

  const detailQuery = useQuery({
    queryKey: ["receipts", "detail", receipt.receipt_id],
    queryFn: () => apiClient<ReceiptDetailResponse>(`/receipts/${receipt.receipt_id}`, { token }),
    enabled: Boolean(token && isExpanded),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateReceiptRequest) =>
      apiClient(`/receipts/${receipt.receipt_id}`, {
        method: "PUT",
        token,
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["receipts", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["receipts", "detail", receipt.receipt_id] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Compra atualizada com sucesso.", "success");
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient<DeleteReceiptResponse>(`/receipts/${receipt.receipt_id}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["receipts", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["receipts", "detail", receipt.receipt_id] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "shopping-list"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Compra excluida com sucesso.", "success");
      setIsDeleteModalOpen(false);
    },
  });

  function toggleExpanded() {
    setIsExpanded((current) => !current);
  }

  function startEditing() {
    if (detailQuery.data) {
      setDraft(structuredClone(detailQuery.data));
      setIsEditing(true);
    }
  }

  function saveReceipt() {
    if (!draft) return;
    updateMutation.mutate({
      market_name: draft.market_name,
      receipt_date: draft.receipt_date,
      total_amount: Number(draft.total_amount),
      items: draft.items.map((item) => ({
        product_name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_amount: Number(item.discount_amount),
        total_price: Number(item.total_price),
        item_type: item.item_type,
      })),
    });
  }

  function handleDeleteReceipt() {
    deleteMutation.mutate();
  }

  const detail = isEditing ? draft : detailQuery.data;

  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-ink">{receipt.market_name}</p>
          <p className="mt-2 text-sm text-muted">{formatDateTime(receipt.receipt_date)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary">Total</p>
          <p className="mt-2 text-xl font-bold">{formatCurrency(receipt.total_amount)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={toggleExpanded}>
          {isExpanded ? "Fechar detalhes" : "Ver compra"}
        </Button>
        {isExpanded && detailQuery.data && !isEditing ? (
          <>
            <Button variant="ghost" onClick={startEditing}>
              Editar compra
            </Button>
            <Button
              isLoading={deleteMutation.isPending}
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Excluir compra
            </Button>
          </>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="mt-5 grid gap-4 border-t border-border/10 pt-5">
          {detailQuery.isLoading ? (
            <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
              Carregando detalhes da compra...
            </div>
          ) : detail ? (
            <>
              {isEditing ? (
                <input
                  className="input-shell"
                  value={detail.market_name}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, market_name: event.target.value } : current))
                  }
                />
              ) : (
                <div className="rounded-2xl bg-secondary/60 px-4 py-4 text-sm text-muted">
                  {detail.market_name} · {formatDateTime(detail.receipt_date)}
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-border/10">
                <table className="min-w-full border-collapse">
                  <thead className="bg-secondary/70 text-left">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Produto
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Unitario
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, index) => (
                      <tr key={`${item.name}-${index}`} className="border-t border-border/10 align-top">
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                              Produto
                              <input
                                className="input-shell"
                                value={item.name}
                                onChange={(event) =>
                                  setDraft((current) => {
                                    if (!current) return current;
                                    const items = [...current.items];
                                    items[index] = { ...items[index], name: event.target.value };
                                    return { ...current, items };
                                  })
                                }
                              />
                            </label>
                          ) : (
                            <p className="text-sm font-semibold text-ink">{item.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                              Quantidade
                              <input
                                className="input-shell"
                                value={String(item.quantity)}
                                onChange={(event) =>
                                  setDraft((current) => {
                                    if (!current) return current;
                                    const items = [...current.items];
                                    items[index] = { ...items[index], quantity: event.target.value };
                                    return { ...current, items };
                                  })
                                }
                              />
                            </label>
                          ) : (
                            <span className="text-sm text-ink">{formatQuantity(item.quantity)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                              Unitario
                              <input
                                className="input-shell"
                                value={String(item.unit_price)}
                                onChange={(event) =>
                                  setDraft((current) => {
                                    if (!current) return current;
                                    const items = [...current.items];
                                    items[index] = { ...items[index], unit_price: event.target.value };
                                    return { ...current, items };
                                  })
                                }
                              />
                            </label>
                          ) : (
                            <span className="text-sm text-ink">{formatCurrency(item.unit_price)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                              Total
                              <input
                                className="input-shell"
                                value={String(item.total_price)}
                                onChange={(event) =>
                                  setDraft((current) => {
                                    if (!current) return current;
                                    const items = [...current.items];
                                    items[index] = { ...items[index], total_price: event.target.value };
                                    return { ...current, items };
                                  })
                                }
                              />
                            </label>
                          ) : (
                            <span className="text-sm font-semibold text-ink">
                              {formatCurrency(item.total_price)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button isLoading={updateMutation.isPending} onClick={saveReceipt}>
                    Salvar compra
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
              Nao foi possivel carregar os itens desta compra.
            </div>
          )}
        </div>
      ) : null}

      <ConfirmModal
        cancelLabel="Voltar"
        confirmLabel="Excluir do historico"
        description="A compra sera removida apenas do historico. O estoque atual nao sera revertido por essa acao."
        footerNote="Use isso para limpar compras de teste ou registros que voce nao quer mais visualizar."
        isLoading={deleteMutation.isPending}
        isOpen={isDeleteModalOpen}
        title="Excluir compra do historico?"
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteReceipt}
      />
    </SectionCard>
  );
}
