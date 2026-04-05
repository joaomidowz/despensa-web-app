import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import { JoinHouseholdRequest, JoinHouseholdResponse } from "../../lib/api/contracts";
import {
  clearPendingInviteToken,
  normalizeInviteToken,
  savePendingInviteToken,
} from "../../lib/households/invite";

export function InviteLandingPage() {
  const navigate = useNavigate();
  const { inviteToken = "" } = useParams();
  const normalizedInviteToken = normalizeInviteToken(inviteToken);
  const { token, user, isAuthenticated, refreshUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (normalizedInviteToken) {
      savePendingInviteToken(normalizedInviteToken);
    }
  }, [normalizedInviteToken]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Sessao nao encontrada.");
      }

      const payload: JoinHouseholdRequest = {
        invite_token: normalizedInviteToken,
      };

      return apiClient<JoinHouseholdResponse>("/households/join", {
        method: "POST",
        token,
        body: payload,
      });
    },
    onSuccess: async (response) => {
      clearPendingInviteToken();
      await refreshUser();
      showToast(response.message || `Voce entrou em "${response.household_name}".`, "success");
      navigate("/app", { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) return;
      showToast("Nao foi possivel concluir a entrada na household.", "error");
    },
  });

  const alreadyInHousehold = Boolean(user?.household_id);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard className="bg-primary text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
            Convite
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Um convite para entrar em uma household do Gestor de Despensa.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            O token deste convite ja foi detectado e ficou salvo temporariamente nesta sessao para
            o fluxo continuar apos login ou entrada manual.
          </p>
          <div className="mt-8 rounded-[28px] border border-white/15 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
              Codigo detectado
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-white">{normalizedInviteToken}</p>
          </div>
        </SectionCard>

        <SectionCard>
          {!normalizedInviteToken ? (
            <>
              <h2 className="text-2xl font-bold">Convite invalido</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                O link nao trouxe um token valido. Peca um novo link ou um codigo manual.
              </p>
            </>
          ) : !isAuthenticated ? (
            <>
              <h2 className="text-2xl font-bold">Entre para continuar</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Faça login primeiro. Depois o app reaproveita este convite automaticamente no fluxo
                de entrada da household.
              </p>
              <div className="mt-6">
                <Link to="/auth">
                  <Button isFullWidth size="lg">
                    Entrar com Google
                  </Button>
                </Link>
              </div>
            </>
          ) : alreadyInHousehold ? (
            <>
              <h2 className="text-2xl font-bold">Conta ja vinculada a uma casa</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Esta conta ja esta dentro de outra household. O backend atual nao permite trocar de
                casa por este fluxo.
              </p>
              <div className="mt-6">
                <Link to="/app/profile">
                  <Button isFullWidth variant="outline">
                    Abrir perfil
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Entrar nesta household</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Sua conta ja esta autenticada e ainda nao pertence a nenhuma casa. Agora ja da para
                entrar direto usando este convite.
              </p>
              <div className="mt-6 grid gap-3">
                <Button
                  isFullWidth
                  isLoading={joinMutation.isPending}
                  size="lg"
                  onClick={() => joinMutation.mutate()}
                >
                  Entrar agora
                </Button>
                <Link to="/app">
                  <Button isFullWidth variant="outline">
                    Abrir fluxo manual
                  </Button>
                </Link>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
