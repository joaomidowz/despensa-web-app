import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import {
  GenerateInviteRequest,
  GenerateInviteResponse,
} from "../../lib/api/contracts";

function maskValue(value: string | null | undefined) {
  if (!value) return "Nao disponivel";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ProfilePage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [latestInvite, setLatestInvite] = useState<GenerateInviteResponse | null>(null);

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

  async function handleCopy(value: string, label: string) {
    try {
      await copyText(value);
      showToast(`${label} copiado.`, "success");
    } catch {
      showToast(`Nao foi possivel copiar ${label.toLowerCase()}.`, "error");
    }
  }

  const householdId = user?.household_id ?? null;

  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Perfil</p>
        <h1 className="mt-3 text-3xl font-bold">Conta, household e convites</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Esta tela fecha o MVP com uma superficie clicavel de perfil e placeholders uteis enquanto
          o backoffice mais completo ainda nao existe.
        </p>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard>
          <p className="text-sm text-muted">Conta</p>
          <p className="mt-3 text-xl font-bold">{user?.name ?? "Usuario autenticado"}</p>
          <p className="mt-2 text-sm text-muted">{user?.email ?? "Email indisponivel"}</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-muted">Status da conta</p>
          <p className="mt-3 text-xl font-bold text-emerald-700">Ativa</p>
          <p className="mt-2 text-sm text-muted">Sessao autenticada no client com token valido.</p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-muted">Household atual</p>
          <p className="mt-3 text-xl font-bold">{maskValue(householdId)}</p>
          <p className="mt-2 text-sm text-muted">
            Placeholder atual do MVP baseado no `household_id` da sessao.
          </p>
        </SectionCard>

        <SectionCard>
          <p className="text-sm text-muted">Tokens disponiveis</p>
          <p className="mt-3 text-xl font-bold">{latestInvite ? "1 gerado" : "1 rotativo"}</p>
          <p className="mt-2 text-sm text-muted">
            O backend hoje trabalha com um convite ativo por household.
          </p>
        </SectionCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <SectionCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                Convites
              </p>
              <h2 className="mt-3 text-2xl font-bold">Gerar link para nova pessoa entrar</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                Use o backend existente para criar o convite. O app mostra o link e o codigo do
                token para quem preferir colar manualmente.
              </p>
            </div>
            <Button
              isLoading={inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              Gerar convite
            </Button>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[28px] bg-secondary/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Link do convite
              </p>
              <p className="mt-2 break-all text-sm text-ink">
                {latestInvite?.invite_url ?? "Gere um convite para exibir o link funcional."}
              </p>
              <div className="mt-4">
                <Button
                  disabled={!latestInvite?.invite_url}
                  size="sm"
                  variant="outline"
                  onClick={() => latestInvite && handleCopy(latestInvite.invite_url, "Link")}
                >
                  Copiar link
                </Button>
              </div>
            </div>

            <div className="rounded-[28px] bg-secondary/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Codigo do convite
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-ink">
                {latestInvite?.invite_token ?? "Nenhum codigo gerado ainda."}
              </p>
              <div className="mt-4">
                <Button
                  disabled={!latestInvite?.invite_token}
                  size="sm"
                  variant="outline"
                  onClick={() => latestInvite && handleCopy(latestInvite.invite_token, "Codigo")}
                >
                  Copiar codigo
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
            Estado atual
          </p>
          <div className="rounded-[28px] bg-secondary/70 p-4 text-sm text-muted">
            <p className="font-semibold text-ink">Conta ativa</p>
            <p className="mt-2">Sim, a sessao atual esta autenticada.</p>
          </div>
          <div className="rounded-[28px] bg-secondary/70 p-4 text-sm text-muted">
            <p className="font-semibold text-ink">Entrar por link ou codigo</p>
            <p className="mt-2">
              Ja suportado no frontend. Quem recebe pode abrir o link ou colar o codigo na tela de
              household.
            </p>
          </div>
          <div className="rounded-[28px] bg-secondary/70 p-4 text-sm text-muted">
            <p className="font-semibold text-ink">Expiracao do convite</p>
            <p className="mt-2">
              {latestInvite?.expires_at
                ? new Date(latestInvite.expires_at).toLocaleString("pt-BR")
                : "Aguardando geracao de convite."}
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
