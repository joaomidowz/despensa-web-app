import { ConfirmReceiptRequest, ReceiptScanResponse } from "../../lib/api/contracts";
import { formatCurrency } from "../../lib/utils/formatters";
import { Button } from "../ui/Button";
import { SectionCard } from "../ui/SectionCard";

type ReceiptScanEditorProps = {
  draft: ConfirmReceiptRequest;
  rendered?: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  previewUrl?: string | null;
  onChange: (next: ConfirmReceiptRequest) => void;
  onSubmit: () => void;
  onReset: () => void;
};

function toNumber(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recalcItem(item: ConfirmReceiptRequest["items"][number]) {
  return {
    ...item,
    total_price: Number(((item.quantity * item.unit_price) - item.discount_amount).toFixed(2)),
  };
}

export function buildConfirmReceiptDraft(scan: ReceiptScanResponse): ConfirmReceiptRequest {
  return {
    market_name: scan.market_name,
    receipt_date: scan.receipt_date,
    total_amount: Number(scan.total_amount),
    items: scan.items.map((item) => ({
      product_name: item.display_name || item.raw_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      discount_amount: Number(item.discount_amount),
      total_price: Number(item.total_price),
      item_type: item.item_type,
    })),
  };
}

export function ReceiptScanEditor({
  draft,
  rendered = true,
  disabled = false,
  isSubmitting = false,
  previewUrl,
  onChange,
  onSubmit,
  onReset,
}: ReceiptScanEditorProps) {
  if (!rendered) return null;

  const calculatedTotal = draft.items.reduce((sum, item) => sum + Number(item.total_price), 0);
  const hasTotalMismatch = Math.abs(calculatedTotal - Number(draft.total_amount)) > 0.02;

  function updateItem(
    index: number,
    recipe: (current: ConfirmReceiptRequest["items"][number]) => ConfirmReceiptRequest["items"][number],
  ) {
    const nextItems = [...draft.items];
    nextItems[index] = recipe(nextItems[index]);
    onChange({ ...draft, items: nextItems });
  }

  function removeItem(index: number) {
    onChange({
      ...draft,
      items: draft.items.filter((_, currentIndex) => currentIndex !== index),
    });
  }

  function addItem() {
    onChange({
      ...draft,
      items: [
        ...draft.items,
        {
          product_name: "",
          quantity: 1,
          unit_price: 0,
          discount_amount: 0,
          total_price: 0,
          item_type: "PRODUCT",
        },
      ],
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_20rem]">
      <SectionCard className="overflow-hidden p-0">
        <div className="grid gap-4 p-4 sm:gap-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Mercado
            <input
              className="input-shell"
              disabled={disabled}
              value={draft.market_name}
              onChange={(event) => onChange({ ...draft, market_name: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Data da compra
            <input
              className="input-shell"
              disabled={disabled}
              type="datetime-local"
              value={draft.receipt_date.slice(0, 16)}
              onChange={(event) =>
                onChange({ ...draft, receipt_date: new Date(event.target.value).toISOString() })
              }
            />
          </label>
          </div>

          <div className="grid gap-3 rounded-[28px] bg-secondary/70 p-4">
            <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tertiary">Itens lidos</p>
            <Button
              disabled={disabled}
              leftIcon={<span className="material-symbols-outlined">add</span>}
              size="sm"
              variant="ghost"
              onClick={addItem}
            >
              Adicionar item
            </Button>
          </div>
            <p className="text-xs text-muted">Arraste a tabela na horizontal para revisar todos os campos.</p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-border/10 bg-white">
          <table className="w-full min-w-[38rem] border-collapse">
            <thead className="sticky top-0 bg-secondary/90 text-left backdrop-blur">
              <tr className="align-middle">
                <th className="sticky left-0 z-10 bg-secondary/90 px-3 py-3 align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-nowrap sm:px-4">
                  Produto
                </th>
                <th className="px-2 py-3 align-middle text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-nowrap sm:px-3">
                  Qtd
                </th>
                <th className="px-2 py-3 align-middle text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-nowrap sm:px-3">
                  Unit.
                </th>
                <th className="px-2 py-3 align-middle text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-nowrap sm:px-3">
                  Desc.
                </th>
                <th className="px-2 py-3 align-middle text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-nowrap sm:px-3">
                  Total
                </th>
                <th className="px-2 py-3 align-middle text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-nowrap sm:px-3">
                  Acao
                </th>
              </tr>
            </thead>
            <tbody>
              {draft.items.map((item, index) => (
                <tr key={`${item.product_name}-${index}`} className="border-t border-border/10 align-top">
                  <td className="sticky left-0 z-[1] min-w-[11.5rem] bg-white px-2 py-2 shadow-[8px_0_14px_-12px_rgba(23,23,23,0.22)] sm:min-w-[13rem] sm:px-3 sm:py-3">
                      <input
                        className="input-shell rounded-xl px-3 py-2 text-xs sm:text-sm"
                        disabled={disabled}
                        value={item.product_name}
                        onChange={(event) =>
                          updateItem(index, (current) => ({ ...current, product_name: event.target.value }))
                        }
                      />
                  </td>
                  <td className="w-[4.25rem] px-2 py-2 sm:w-[5rem] sm:px-3 sm:py-3">
                      <input
                        className="input-shell rounded-xl px-2 py-2 text-center text-xs sm:text-sm"
                        disabled={disabled}
                        inputMode="decimal"
                        value={String(item.quantity)}
                        onChange={(event) =>
                          updateItem(index, (current) =>
                            recalcItem({ ...current, quantity: toNumber(event.target.value) }),
                          )
                        }
                      />
                  </td>
                  <td className="w-[5.25rem] px-2 py-2 sm:w-[6rem] sm:px-3 sm:py-3">
                      <input
                        className="input-shell rounded-xl px-2 py-2 text-center text-xs sm:text-sm"
                        disabled={disabled}
                        inputMode="decimal"
                        value={String(item.unit_price)}
                        onChange={(event) =>
                          updateItem(index, (current) =>
                            recalcItem({ ...current, unit_price: toNumber(event.target.value) }),
                          )
                        }
                      />
                  </td>
                  <td className="w-[5.25rem] px-2 py-2 sm:w-[6rem] sm:px-3 sm:py-3">
                      <input
                        className="input-shell rounded-xl px-2 py-2 text-center text-xs sm:text-sm"
                        disabled={disabled}
                        inputMode="decimal"
                        value={String(item.discount_amount)}
                        onChange={(event) =>
                          updateItem(index, (current) =>
                            recalcItem({ ...current, discount_amount: toNumber(event.target.value) }),
                          )
                        }
                      />
                  </td>
                  <td className="w-[5.5rem] px-2 py-2 sm:w-[6.5rem] sm:px-3 sm:py-3">
                      <div className="rounded-xl border border-border/10 bg-secondary/40 px-2 py-2 text-center text-xs font-semibold text-ink sm:px-3 sm:text-sm">
                        {formatCurrency(item.total_price)}
                      </div>
                  </td>
                  <td className="w-[3.5rem] px-2 py-2 text-center sm:w-[4rem] sm:px-3 sm:py-3">
                      <Button
                        aria-label="Remover item"
                        className="h-9 min-h-9 min-w-9 rounded-xl px-0"
                        disabled={disabled || draft.items.length <= 1}
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:sticky xl:top-24 xl:self-start">
        <SectionCard className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Resumo</p>
          <div className="rounded-3xl bg-secondary/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Total da nota</p>
            <input
              className="input-shell mt-2"
              disabled={disabled}
              inputMode="decimal"
              value={String(draft.total_amount)}
              onChange={(event) => onChange({ ...draft, total_amount: toNumber(event.target.value) })}
            />
          </div>
          <div className="rounded-3xl bg-secondary/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Total calculado</p>
            <p className="mt-2 text-2xl font-bold text-ink">{formatCurrency(calculatedTotal)}</p>
            <p className={`mt-2 text-sm ${hasTotalMismatch ? "text-red-600" : "text-muted"}`}>
              {hasTotalMismatch
                ? "A soma dos itens nao bate com o total da nota."
                : "Os itens batem com o total informado."}
            </p>
          </div>
          <div className="grid gap-3">
            <Button disabled={disabled || hasTotalMismatch || !draft.items.length} isLoading={isSubmitting} isFullWidth onClick={onSubmit}>
              Confirmar compra
            </Button>
            <Button disabled={disabled} isFullWidth variant="outline" onClick={onReset}>
              Escanear outra imagem
            </Button>
          </div>
        </SectionCard>

        <SectionCard rendered={Boolean(previewUrl)}>
          {previewUrl ? (
            <img
              alt="Preview do recibo enviado"
              className="max-h-[28rem] w-full rounded-[28px] object-cover"
              src={previewUrl}
            />
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
