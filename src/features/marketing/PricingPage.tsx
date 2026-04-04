import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";

const plans = [
  {
    name: "Inicio",
    price: "R$ 0",
    description: "Para validar o fluxo de recibos e acompanhar uma casa pequena.",
    items: ["1 casa", "ate 20 scans por mes", "revisao manual de itens"],
  },
  {
    name: "Casa Ativa",
    price: "R$ 19,90",
    description: "Para familias que querem manter historico e lista automatica sempre viva.",
    items: ["3 membros", "scans ilimitados", "historico de compras e alertas"],
  },
  {
    name: "Organizacao Total",
    price: "R$ 39,90",
    description: "Para uso recorrente com foco em rotina, reposicao e consolidacao de gastos.",
    items: ["membros ilimitados", "prioridade no processamento", "painel expandido"],
  },
];

export function PricingPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <SectionCard className="glass-panel p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
            Precos
          </p>
          <h1 className="text-4xl font-bold">Planos ficticios para validar a oferta do produto.</h1>
          <p className="max-w-2xl text-base leading-7 text-muted">
            Esta tela existe para testar posicionamento e conversa comercial antes da precificacao
            real.
          </p>
        </div>
      </SectionCard>

      <section className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {plans.map((plan, index) => (
          <SectionCard
            key={plan.name}
            className={
              index === 1
                ? "flex h-full flex-col border-primary/40 bg-primary px-5 py-6 text-white"
                : "flex h-full flex-col px-5 py-6"
            }
          >
            <div className="flex h-full flex-col gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[2rem] font-bold leading-none">{plan.name}</h2>
                  {index === 1 ? (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className={`text-sm leading-7 ${index === 1 ? "text-white/80" : "text-muted"}`}>
                  {plan.description}
                </p>
              </div>
              <div className="pt-1 text-5xl font-bold leading-none">{plan.price}</div>
              <div className="grid gap-3">
                {plan.items.map((item) => (
                  <div
                    key={item}
                    className={`rounded-2xl px-4 py-4 text-sm leading-6 ${
                      index === 1 ? "bg-white/10 text-white" : "bg-secondary/80 text-ink"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <Link className="mt-auto" to="/auth">
                <Button isFullWidth size="lg" variant={index === 1 ? "secondary" : "primary"}>
                  Testar este plano
                </Button>
              </Link>
            </div>
          </SectionCard>
        ))}
      </section>
    </main>
  );
}
