import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";

const steps = [
  {
    title: "Fotografe o cupom",
    description: "Envie a imagem e deixe o sistema reconhecer mercado, itens e totais em segundos.",
  },
  {
    title: "Revise com a IA",
    description: "Nomes e categorias chegam mais legiveis, com ajustes simples antes da confirmacao.",
  },
  {
    title: "Atualize o estoque",
    description: "A compra entra no historico e a despensa da casa reflete o que realmente foi comprado.",
  },
];

const features = [
  "Controle de gastos com leitura de preco por item",
  "Lista de compras automatica a partir do estoque minimo",
  "Separacao por casa para evitar mistura de dados entre familias",
];

export function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:22px_22px] opacity-60" />
      <div className="pointer-events-none absolute left-[-10rem] top-[-6rem] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-24 h-72 w-72 rounded-full bg-tertiary/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <SectionCard className="overflow-hidden bg-card/80 backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-border/20 bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                Despensa inteligente
              </span>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                  Sua despensa inteligente. Sem digitar nada.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted">
                  Fotografe o cupom fiscal e deixe a IA organizar o estoque da sua casa em
                  segundos, com revisao humana antes da confirmacao.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/auth">
                  <Button isFullWidth size="lg" variant="primary">
                    Comecar de graca
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button isFullWidth size="lg" variant="outline">
                    Ver planos
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm rounded-[32px] border border-border/15 bg-[#1f1b59] p-4 shadow-panel">
              <div className="rounded-[28px] bg-surface p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Inventario da semana</span>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      atualizado
                    </span>
                  </div>
                  <MockItem name="Leite Integral" category="Laticinios" status="4 und" />
                  <MockItem name="Mortadela Sadia" category="Frios" status="200 g" />
                  <MockItem name="Pizza Calabresa" category="Congelados" status="2 und" />
                  <MockItem name="Cafe Melitta" category="Bebidas" status="500 g" />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <SectionCard key={step.title}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary font-bold text-white">
                {index + 1}
              </div>
              <h2 className="text-xl font-bold">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{step.description}</p>
            </SectionCard>
          ))}
        </section>

        <SectionCard>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                Beneficios
              </p>
              <h2 className="text-3xl font-bold">Organizacao real para a rotina da casa.</h2>
            </div>
            <div className="grid gap-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-border/10 bg-secondary/75 px-4 py-4 text-sm text-ink"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="bg-primary text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Pare de perder tempo anotando itens na geladeira.</h2>
              <p className="max-w-2xl text-sm leading-7 text-white/85">
                Comece com uma rotina simples: escaneie, revise, confirme e acompanhe a despensa
                com menos atrito.
              </p>
            </div>
            <Link to="/auth">
              <Button size="lg" variant="secondary">
                Entrar no app
              </Button>
            </Link>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}

function MockItem({
  category,
  name,
  status,
}: {
  category: string;
  name: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{name}</h3>
          <p className="text-xs text-muted">{category}</p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-tertiary">
          {status}
        </span>
      </div>
    </div>
  );
}
