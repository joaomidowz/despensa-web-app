import { formatCurrency } from "../../lib/utils/formatters";
import { ManualCheckoutItem, toNumber } from "./types";

type ManualCheckoutState = {
  market_name: string;
  receipt_date: string;
  items: ManualCheckoutItem[];
};

export function ManualCheckoutPanel({
  manualCheckout,
  previewTotal,
  onChange,
}: {
  manualCheckout: ManualCheckoutState;
  previewTotal: number;
  onChange: (next: ManualCheckoutState) => void;
}) {
  return (
    <div className="mt-6 grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Mercado
          <input
            className="input-shell"
            placeholder="Nome do mercado"
            value={manualCheckout.market_name}
            onChange={(event) =>
              onChange({
                ...manualCheckout,
                market_name: event.target.value,
              })
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
              onChange({
                ...manualCheckout,
                receipt_date: event.target.value,
              })
            }
          />
        </label>
      </div>

      <div className="grid gap-3">
        <div className="rounded-[24px] bg-primary/6 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Preview da compra manual
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">{formatCurrency(previewTotal)}</p>
          <p className="mt-1 text-sm text-muted">
            O total considera quantidade x preco unitario dos itens marcados.
          </p>
        </div>

        {manualCheckout.items.map((item) => {
          const quantity = toNumber(item.quantity) || 0;
          const unitPrice = toNumber(item.unit_price) || 0;
          const total = quantity * unitPrice;

          return (
            <div key={item.shopping_list_item_id} className="rounded-[28px] bg-secondary/60 px-4 py-4">
              <p className="text-sm font-semibold text-ink">{item.product_name}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[10rem_10rem_1fr]">
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Quantidade
                  <input
                    className="input-shell"
                    inputMode="decimal"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(event) =>
                      onChange({
                        ...manualCheckout,
                        items: manualCheckout.items.map((candidate) =>
                          candidate.shopping_list_item_id === item.shopping_list_item_id
                            ? { ...candidate, quantity: event.target.value }
                            : candidate,
                        ),
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Preco unitario
                  <input
                    className="input-shell"
                    inputMode="decimal"
                    placeholder="Opcional ate confirmar"
                    value={item.unit_price}
                    onChange={(event) =>
                      onChange({
                        ...manualCheckout,
                        items: manualCheckout.items.map((candidate) =>
                          candidate.shopping_list_item_id === item.shopping_list_item_id
                            ? { ...candidate, unit_price: event.target.value }
                            : candidate,
                        ),
                      })
                    }
                  />
                </label>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Total do item
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
