import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { apiClient } from "../../lib/api/apiClient";
import { OverviewResponse } from "../../lib/api/contracts";
import { formatCurrency, formatDecimal } from "../../lib/utils/formatters";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";

const quickFlows = [
  {
    title: "Escanear recibo",
    description: "Enviar cupom, revisar itens extraidos e confirmar a compra.",
    to: "/app/scan",
    icon: "scan",
  },
  {
    title: "Historico de compras",
    description: "Acompanhar recibos confirmados e abrir detalhes de cada compra.",
    to: "/app/receipts",
    icon: "receipt_long",
  },
  {
    title: "Inventario",
    description: "Ver estoque atual, status dos itens e proximas reposicoes.",
    to: "/app/inventory",
    icon: "inventory_2",
  },
  {
    title: "Lista de compras",
    description: "Junte os itens sugeridos pelo sistema com itens adicionados manualmente.",
    to: "/app/shopping-list",
    icon: "shopping_cart",
  },
];

export function DashboardPage() {
  const { token, user } = useAuth();
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => apiClient<OverviewResponse>("/overview", { token }),
    enabled: Boolean(token),
  });

  const stats = overviewQuery.data
    ? [
        {
          label: "Itens em estoque",
          value: String(overviewQuery.data.total_inventory_items),
          helper: `${formatDecimal(overviewQuery.data.total_inventory_units)} unidades`,
        },
        {
          label: "Compras do mes",
          value: String(overviewQuery.data.month_receipts_count),
          helper: formatCurrency(overviewQuery.data.month_receipts_total),
        },
        {
          label: "Reposicoes sugeridas",
          value: String(overviewQuery.data.suggested_restock_count),
          helper: `${overviewQuery.data.low_stock_count} abaixo do minimo`,
        },
      ]
    : [];

  return (
    <div className="grid gap-6">
      <SectionCard>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Home</p>
          <h1 className="text-3xl font-bold">
            {user ? `Bem-vindo, ${user.name.split(" ")[0]}.` : "Painel inicial do app autenticado."}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            Seu login ja foi validado no backend. Agora a home vira um hub para scan, recibos e
            inventario.
          </p>
        </div>
      </SectionCard>

      <section className="grid gap-4 sm:grid-cols-3">
        {overviewQuery.isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <SectionCard key={index} className="animate-pulse">
                <div className="h-4 w-24 rounded-full bg-secondary" />
                <div className="mt-4 h-9 w-16 rounded-full bg-secondary" />
                <div className="mt-4 h-4 w-28 rounded-full bg-secondary" />
              </SectionCard>
            ))
          : stats.map((stat) => (
              <SectionCard key={stat.label}>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-3 text-3xl font-bold">{stat.value}</p>
                <p className="mt-3 text-sm text-muted">{stat.helper}</p>
              </SectionCard>
            ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {quickFlows.map((flow) => (
          <SectionCard key={flow.title} className="flex h-full flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined" aria-hidden="true">
                {flow.icon}
              </span>
            </div>
            <h2 className="text-2xl font-bold">{flow.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-muted">{flow.description}</p>
            <Link className="mt-5" to={flow.to}>
              <Button isFullWidth variant="outline">
                Abrir fluxo
              </Button>
            </Link>
          </SectionCard>
        ))}
      </section>
    </div>
  );
}
