import { Button } from "../ui/Button";
import { ShoppingListItemResponse } from "../../lib/api/contracts";
import { formatCurrency, formatDateTime, formatQuantity } from "../../lib/utils/formatters";
import { DraftState, getEstimatedLineTotal, toNumber } from "./types";

const sourceLabelMap: Record<ShoppingListItemResponse["source"], string> = {
  MANUAL: "Manual",
  INVENTORY: "Recomendado",
  SYSTEM: "Sistema",
  HISTORY: "Historico",
  TEMPLATE: "Template",
};

export function ShoppingListItemCard({
  item,
  draft,
  isBusy,
  isEditing,
  onBeginEdit,
  onCancelEdit,
  onChangeDraft,
  onDelete,
  onSave,
}: {
  item: ShoppingListItemResponse;
  draft: DraftState;
  isBusy: boolean;
  isEditing: boolean;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onChangeDraft: (draft: DraftState) => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  const estimatedLineTotal = getEstimatedLineTotal(item);

  return (
    <div className="rounded-[24px] bg-secondary/55 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Produto
                <input
                  className="input-shell"
                  value={draft.name}
                  onChange={(event) => onChangeDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Tipo
                <input
                  className="input-shell"
                  value={draft.category}
                  onChange={(event) => onChangeDraft({ ...draft, category: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Quantidade
                <input
                  className="input-shell"
                  inputMode="decimal"
                  placeholder="1"
                  value={draft.desiredQty}
                  onChange={(event) => onChangeDraft({ ...draft, desiredQty: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Preco unitario estimado
                <input
                  className="input-shell"
                  inputMode="decimal"
                  placeholder="Opcional"
                  value={draft.estimatedUnitPrice}
                  onChange={(event) =>
                    onChangeDraft({ ...draft, estimatedUnitPrice: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted lg:col-span-2">
                Observacoes
                <input
                  className="input-shell"
                  value={draft.notes}
                  onChange={(event) => onChangeDraft({ ...draft, notes: event.target.value })}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {sourceLabelMap[item.source]}
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {formatQuantity(item.desired_qty)} un
                </span>
                {item.estimated_unit_price ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary">
                    {formatCurrency(toNumber(item.estimated_unit_price))}
                  </span>
                ) : null}
              </div>
              {item.notes ? <p className="mt-2 text-sm text-muted">{item.notes}</p> : null}
              <p className="mt-2 text-xs text-muted">
                {item.category ?? "Sem tipo definido"} · atualizado {formatDateTime(item.updated_at)}
              </p>
              <p className="mt-2 text-sm text-muted">
                Total estimado:{" "}
                <strong className="text-ink">
                  {estimatedLineTotal === null ? "nao informado" : formatCurrency(estimatedLineTotal)}
                </strong>
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
            <Button
              disabled={isBusy}
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              Remover
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
