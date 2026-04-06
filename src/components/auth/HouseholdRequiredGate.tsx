import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import {
  CreateHouseholdRequest,
  HouseholdResponse,
  JoinHouseholdRequest,
  JoinHouseholdResponse,
} from "../../lib/api/contracts";
import {
  clearPendingInviteToken,
  loadPendingInviteToken,
  normalizeInviteToken,
} from "../../lib/households/invite";
import { Button } from "../ui/Button";

type GateMode = "create" | "join";

export function HouseholdRequiredGate() {
  const navigate = useNavigate();
  const { token, refreshUser, signOut, user } = useAuth();
  const { showToast } = useToast();
  const initialPendingInvite = loadPendingInviteToken();
  const [mode, setMode] = useState<GateMode>(initialPendingInvite ? "join" : "create");
  const [householdName, setHouseholdName] = useState("");
  const [inviteToken, setInviteToken] = useState(initialPendingInvite);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const payload: CreateHouseholdRequest = { name: householdName.trim() };
      const response = await apiClient<HouseholdResponse>("/households", {
        method: "POST",
        token,
        body: payload,
      });
      clearPendingInviteToken();
      await refreshUser();
      showToast(`Casa "${response.name}" criada com sucesso.`, "success");
      navigate("/app", { replace: true });
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        showToast("Nao foi possivel criar a casa agora.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const normalizedInviteToken = normalizeInviteToken(inviteToken);
      const payload: JoinHouseholdRequest = { invite_token: normalizedInviteToken };
      const response = await apiClient<JoinHouseholdResponse>("/households/join", {
        method: "POST",
        token,
        body: payload,
      });
      clearPendingInviteToken();
      await refreshUser();
      showToast(response.message || `Voce entrou em "${response.household_name}".`, "success");
      navigate("/app", { replace: true });
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        showToast("Nao foi possivel entrar na casa agora.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(82,75,224,0.16),_transparent_38%),linear-gradient(180deg,_#f3f3ff_0%,_#ebeafe_100%)] px-4 py-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-border/15 bg-white shadow-[0_28px_80px_rgba(57,52,156,0.18)]">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-primary px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              Falta um passo
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight">
              {user?.name ? `${user.name}, escolha a sua casa para continuar.` : "Escolha a sua casa para continuar."}
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/85">
              Voce entrou com sucesso, mas ainda nao esta em nenhuma casa. Crie uma nova ou use um
              convite existente para liberar o restante do app.
            </p>
            {initialPendingInvite ? (
              <div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                Detectamos um convite pendente. Voce pode entrar direto usando o codigo abaixo ou o link que recebeu.
              </div>
            ) : null}
            <div className="mt-8 rounded-[24px] border border-white/15 bg-white/10 p-4 text-sm text-white/85">
              Enquanto isso nao for concluido, dashboard, estoque, compras e lista ficam bloqueados.
            </div>
          </section>

          <section className="px-6 py-8 sm:px-8">
            <div className="inline-flex rounded-full border border-border/20 bg-secondary p-1">
              <button
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode === "create" ? "bg-white text-tertiary shadow-sm" : "text-muted",
                ].join(" ")}
                onClick={() => setMode("create")}
                type="button"
              >
                Criar casa
              </button>
              <button
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode === "join" ? "bg-white text-tertiary shadow-sm" : "text-muted",
                ].join(" ")}
                onClick={() => setMode("join")}
                type="button"
              >
                Entrar com convite
              </button>
            </div>

            {mode === "create" ? (
              <form className="mt-6 space-y-5" onSubmit={handleCreateHousehold}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-tertiary" htmlFor="household-name">
                    Nome da casa
                  </label>
                  <input
                    className="input-shell"
                    id="household-name"
                    maxLength={50}
                    minLength={3}
                    onChange={(event) => setHouseholdName(event.target.value)}
                    placeholder="Ex.: Casa Joao e Ana"
                    required
                    value={householdName}
                  />
                </div>

                <Button
                  isFullWidth
                  isLoading={isSubmitting}
                  size="lg"
                  type="submit"
                  disabled={householdName.trim().length < 3}
                >
                  Criar e continuar
                </Button>
              </form>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={handleJoinHousehold}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-tertiary" htmlFor="invite-token">
                    Link ou token do convite
                  </label>
                  <input
                    autoCapitalize="off"
                    className="input-shell"
                    id="invite-token"
                    onChange={(event) => setInviteToken(event.target.value)}
                    placeholder="Cole o link completo ou o codigo recebido"
                    required
                    value={inviteToken}
                  />
                </div>

                <Button
                  isFullWidth
                  isLoading={isSubmitting}
                  size="lg"
                  type="submit"
                  disabled={normalizeInviteToken(inviteToken).length < 3}
                >
                  Entrar e continuar
                </Button>
              </form>
            )}

            <div className="mt-6 rounded-[24px] border border-border/15 bg-secondary/70 p-4 text-sm text-muted">
              Nao quer continuar agora?
              <button
                className="ml-2 font-semibold text-tertiary underline underline-offset-4"
                onClick={() => void signOut()}
                type="button"
              >
                Sair da conta
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
