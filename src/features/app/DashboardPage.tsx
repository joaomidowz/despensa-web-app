import { Link } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";

const quickStats = [
  { label: "Itens em estoque", value: "48" },
  { label: "Compras do mes", value: "12" },
  { label: "Reposicoes sugeridas", value: "7" },
];

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
];

export function DashboardPage() {
  const { user } = useAuth();

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
        {quickStats.map((stat) => (
          <SectionCard key={stat.label}>
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
          </SectionCard>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
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
