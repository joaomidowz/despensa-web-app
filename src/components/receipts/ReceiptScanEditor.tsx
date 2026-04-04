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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_22rem]">
      <SectionCard className="grid gap-5">
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

          <div className="grid gap-3">
            {draft.items.map((item, index) => (
              <div key={`${item.product_name}-${index}`} className="rounded-3xl border border-border/10 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))_auto]">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Produto
                    <input
                      className="input-shell"
                      disabled={disabled}
                      value={item.product_name}
                      onChange={(event) =>
                        updateItem(index, (current) => ({ ...current, product_name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Quantidade
                    <input
                      className="input-shell"
                      disabled={disabled}
                      inputMode="decimal"
                      value={String(item.quantity)}
                      onChange={(event) =>
                        updateItem(index, (current) =>
                          recalcItem({ ...current, quantity: toNumber(event.target.value) }),
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Unitario
                    <input
                      className="input-shell"
                      disabled={disabled}
                      inputMode="decimal"
                      value={String(item.unit_price)}
                      onChange={(event) =>
                        updateItem(index, (current) =>
                          recalcItem({ ...current, unit_price: toNumber(event.target.value) }),
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Desconto
                    <input
                      className="input-shell"
                      disabled={disabled}
                      inputMode="decimal"
                      value={String(item.discount_amount)}
                      onChange={(event) =>
                        updateItem(index, (current) =>
                          recalcItem({ ...current, discount_amount: toNumber(event.target.value) }),
                        )
                      }
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Total</span>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/10 bg-secondary/40 px-4 py-3">
                      <span className="text-sm font-semibold text-ink">{formatCurrency(item.total_price)}</span>
                      <Button
                        aria-label="Remover item"
                        className="h-10 min-h-10 min-w-10 px-0"
                        disabled={disabled || draft.items.length <= 1}
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6">
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
