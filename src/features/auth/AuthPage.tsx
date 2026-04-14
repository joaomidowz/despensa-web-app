import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { GoogleSignInButton } from "../../components/auth/GoogleSignInButton";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import { loadPendingInviteToken } from "../../lib/households/invite";

type AuthResponse = {
  access_token: string;
  token_type: string;
  is_new_user: boolean;
  user: {
    user_id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    household_id?: string | null;
  };
};

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const pendingInviteToken = loadPendingInviteToken();

  async function handleGoogleCredential(googleIdToken: string) {
    setIsLoading(true);

    try {
      const response = await apiClient<AuthResponse>("/auth/google", {
        method: "POST",
        body: {
          google_id_token: googleIdToken,
        },
      });

      signIn(response.access_token, response.user);
      showToast(
        response.is_new_user
          ? "Conta criada com sucesso. Voce ja pode continuar."
          : "Login realizado com sucesso.",
        "success",
      );
      setIsLoading(false);
      navigate("/app");
    } catch (error) {
      setIsLoading(false);
      if (error instanceof ApiClientError) return;
      showToast("Nao foi possivel concluir o login agora.", "error");
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.85fr)] lg:items-stretch">
        <SectionCard className="bg-primary text-white lg:min-h-[24rem] lg:px-8 lg:py-8">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              Acesso
            </p>
            <h1 className="max-w-[24rem] text-4xl font-bold leading-tight lg:text-[2.7rem]">
              Sua casa organizada, compras sob controle e menos desperdicio no fim do mes.
            </h1>
            <p className="max-w-[23rem] text-base leading-8 text-white/85">
              Centralize a lista da familia, acompanhe o que falta na despensa e volte a comprar
              com clareza, rapidez e previsibilidade.
            </p>
          </div>
        </SectionCard>

        <SectionCard className="lg:max-w-[34rem]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                Entrar
              </p>
              <h2 className="text-3xl font-bold">Entre e comece em segundos</h2>
              <p className="text-sm leading-7 text-muted">
                Use sua conta Google para acessar sua despensa, revisar compras recentes e manter
                tudo sincronizado no mesmo lugar.
              </p>
            </div>

            <GoogleSignInButton disabled={isLoading} onCredential={handleGoogleCredential} />

            <Button isFullWidth isLoading={isLoading} size="lg" type="button" variant="outline">
              Aguardando credencial do Google
            </Button>

            {pendingInviteToken ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted">
                Ha um convite aguardando voce. Depois do login, vamos concluir a entrada na casa com
                o codigo <strong>{pendingInviteToken}</strong>.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
