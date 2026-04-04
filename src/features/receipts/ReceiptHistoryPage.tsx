import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient } from "../../lib/api/apiClient";
import { PaginatedReceiptsResponse } from "../../lib/api/contracts";
import { formatCurrency, formatDateTime } from "../../lib/utils/formatters";

export function ReceiptHistoryPage() {
  const { token } = useAuth();
  const receiptsQuery = useQuery({
    queryKey: ["receipts", "list"],
    queryFn: () => apiClient<PaginatedReceiptsResponse>("/receipts?limit=20&offset=0", { token }),
    enabled: Boolean(token),
  });

  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Receipts</p>
        <h1 className="mt-3 text-3xl font-bold">Historico de compras</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Compras confirmadas na household autenticada, prontas para evoluir depois para detalhe e
          filtros.
        </p>
      </SectionCard>

      {receiptsQuery.isLoading ? (
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
      ) : receiptsQuery.data?.items.length ? (
        <section className="grid gap-4">
          {receiptsQuery.data.items.map((receipt) => (
            <SectionCard key={receipt.receipt_id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-ink">{receipt.market_name}</p>
                  <p className="mt-2 text-sm text-muted">{formatDateTime(receipt.receipt_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary">
                    Total
                  </p>
                  <p className="mt-2 text-xl font-bold">{formatCurrency(receipt.total_amount)}</p>
                </div>
              </div>
            </SectionCard>
          ))}
        </section>
      ) : (
        <SectionCard>
          <p className="text-lg font-bold">Nenhuma compra registrada ainda.</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Assim que voce confirmar o primeiro recibo, ele vai aparecer aqui.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
