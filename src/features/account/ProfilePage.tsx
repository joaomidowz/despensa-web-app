import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import {
  CurrentHouseholdResponse,
  GenerateInviteRequest,
  GenerateInviteResponse,
} from "../../lib/api/contracts";

type CopyTarget = "link" | "code" | null;

const planLabels = [
  "Plano atual: Casa Essencial",
  "Papel inicial: Owner e Member ja mapeados",
  "Expansao futura: planos e limites reais entram depois",
];

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Aguardando geracao de convite.";
  return new Date(value).toLocaleString("pt-BR");
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ProfilePage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [latestInvite, setLatestInvite] = useState<GenerateInviteResponse | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);

  useEffect(() => {
    if (!copiedTarget) return;
    const timer = window.setTimeout(() => setCopiedTarget(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedTarget]);

  const householdQuery = useQuery({
    queryKey: ["household", "current"],
    queryFn: () => apiClient<CurrentHouseholdResponse>("/households/current", { token }),
    enabled: Boolean(token && user?.household_id),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!token || !user?.household_id) {
        throw new Error("Sessao ou household indisponivel.");
      }

      const payload: GenerateInviteRequest = {
        household_id: user.household_id,
      };

      return apiClient<GenerateInviteResponse>("/households/invite", {
        method: "POST",
        token,
        body: payload,
      });
    },
    onSuccess: (response) => {
      setLatestInvite(response);
      showToast("Convite gerado com sucesso.", "success");
    },
    onError: (error) => {
      if (error instanceof ApiClientError) return;
      showToast("Nao foi possivel gerar o convite agora.", "error");
    },
  });

  async function handleCopy(value: string, target: Exclude<CopyTarget, null>) {
    try {
      await copyText(value);
      setCopiedTarget(target);
    } catch {
      showToast("Nao foi possivel copiar agora.", "error");
    }
  }

  const household = householdQuery.data;
  const inviteLink = latestInvite?.invite_url ?? "";
  const inviteCode = latestInvite?.invite_token ?? "";
  const inviteLinkPreview = inviteLink ? "despensa-scanner.app/convite" : "Link indisponivel";

  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Perfil</p>
        <h1 className="mt-3 text-3xl font-bold">Conta, casa atual e convites</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Refinamos a superficie do perfil para mostrar a casa atual com mais contexto e deixar a
          acao de convite mais limpa, centralizada e direta.
        </p>
      </SectionCard>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <SectionCard className="grid gap-5">
          <div>
            <p className="text-sm text-muted">Conta</p>
            <h2 className="mt-3 text-2xl font-bold">{user?.name ?? "Usuario autenticado"}</h2>
            <p className="mt-2 text-sm text-muted">{user?.email ?? "Email indisponivel"}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] bg-secondary/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Status da conta
              </p>
              <p className="mt-3 text-xl font-bold text-emerald-700">Ativa</p>
              <p className="mt-2 text-sm text-muted">
                Sessao autenticada com household pronta para uso.
              </p>
            </div>

            <div className="rounded-[28px] bg-secondary/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Tokens e planos
              </p>
              <p className="mt-3 text-xl font-bold">Casa Essencial</p>
              <div className="mt-3 grid gap-2 text-sm text-muted">
                {planLabels.map((label) => (
                  <p key={label}>{label}</p>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
            Casa atual
          </p>
          <div className="rounded-[28px] bg-secondary/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Nome</p>
            <p className="mt-3 text-2xl font-bold text-ink">
              {householdQuery.isLoading ? "Carregando..." : household?.name ?? "Casa indisponivel"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {household
                ? `${household.members.length} membro(s) vinculado(s) nesta casa. Owner e Member ja aparecem separados.`
                : "Os detalhes da casa aparecem assim que a API responder."}
            </p>
          </div>

          <div className="rounded-[28px] bg-secondary/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Membros</p>
            <div className="mt-4 grid gap-3">
              {household?.members?.length ? (
                household.members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-ink">{member.name}</p>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {member.role === "OWNER" ? "Owner" : "Membro"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">
                  {householdQuery.isLoading
                    ? "Carregando membros..."
                    : "Nenhum membro encontrado para esta casa."}
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard className="overflow-hidden">
        <div className="rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(82,75,224,0.18),_transparent_38%),linear-gradient(140deg,_#f8f7ff_0%,_#f0efff_100%)] p-6 sm:p-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
              Convites
            </p>
            <h2 className="mt-3 text-3xl font-bold">Convide alguem para entrar na sua casa</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Gere um convite, copie o link ou o codigo e compartilhe do jeito que fizer mais
              sentido. O feedback visual fica no proprio botao.
            </p>
            <div className="mt-6">
              <Button isLoading={inviteMutation.isPending} size="lg" onClick={() => inviteMutation.mutate()}>
                Gerar novo convite
              </Button>
            </div>

            <div className="mt-8 grid w-full gap-4 md:grid-cols-2">
              <div className="flex min-h-[12.5rem] flex-col items-center justify-between rounded-[28px] bg-white px-5 py-6 text-center shadow-[0_18px_40px_rgba(57,52,156,0.08)]">
                <div className="w-full">
                  <span className="inline-flex rounded-full bg-primary/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Compartilhar convite
                  </span>
                  <div className="mt-5 rounded-[24px] border border-primary/10 bg-secondary/45 px-4 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Link curto
                    </p>
                    <p className="mt-3 text-sm font-semibold text-ink">
                      {inviteLinkPreview}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-5"
                  disabled={!inviteLink}
                  size="lg"
                  variant={copiedTarget === "link" ? "primary" : "outline"}
                  onClick={() => handleCopy(inviteLink, "link")}
                >
                  {copiedTarget === "link" ? "Copiado" : "Copiar link"}
                </Button>
              </div>

              <div className="flex min-h-[12.5rem] flex-col items-center justify-between rounded-[28px] bg-white px-5 py-6 text-center shadow-[0_18px_40px_rgba(57,52,156,0.08)]">
                <div className="w-full">
                  <span className="inline-flex rounded-full bg-primary/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Codigo do convite
                  </span>
                  <div className="mt-5 rounded-[24px] border border-primary/10 bg-secondary/45 px-4 py-5">
                    <p className="break-all text-lg font-bold tracking-[0.08em] text-ink">
                      {inviteCode || "Nenhum codigo gerado ainda."}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-5"
                  disabled={!inviteCode}
                  size="lg"
                  variant={copiedTarget === "code" ? "primary" : "outline"}
                  onClick={() => handleCopy(inviteCode, "code")}
                >
                  {copiedTarget === "code" ? "Copiado" : "Copiar codigo"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard>
          <p className="text-sm font-semibold text-ink">Expiracao do convite</p>
          <p className="mt-3 text-sm leading-7 text-muted">{formatDateTime(latestInvite?.expires_at)}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-sm font-semibold text-ink">Modo de entrada</p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Quem recebe pode entrar pelo link ou colando o codigo manualmente.
          </p>
        </SectionCard>
        <SectionCard>
          <p className="text-sm font-semibold text-ink">Household</p>
          <p className="mt-3 text-sm leading-7 text-muted">
            O perfil agora busca nome e membros reais da casa atual na API.
          </p>
        </SectionCard>
      </section>
    </div>
  );
}
