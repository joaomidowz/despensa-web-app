import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { GoogleSignInButton } from "../../components/auth/GoogleSignInButton";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { apiClient, ApiClientError } from "../../lib/api/apiClient";
import { loadPendingInviteToken } from "../../lib/households/invite";

const PUBLIC_VERSION = "Alpha 1.5.0";

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
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard className="bg-primary text-white">
          <div className="space-y-4">
            <div className="hidden lg:flex">
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-left backdrop-blur">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Versao atual
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{PUBLIC_VERSION}</p>
              </div>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
              Acesso
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Entre para revisar compras e organizar a casa em um fluxo unico.
            </h1>
            <p className="text-sm leading-7 text-white/85">
              No MVP, a autenticacao vai conectar ao backend com token centralizado no client e
              isolamento de rotas privadas.
            </p>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                Entrar
              </p>
              <h2 className="text-3xl font-bold">Comece com Google</h2>
              <p className="text-sm leading-7 text-muted">
                A autenticacao local usa o `POST /api/auth/google` do backend e salva a sessao
                neste dispositivo para retomar o app com mais seguranca.
              </p>
            </div>

            <GoogleSignInButton disabled={isLoading} onCredential={handleGoogleCredential} />

            <Button isFullWidth isLoading={isLoading} size="lg" type="button" variant="outline">
              Aguardando credencial do Google
            </Button>

            <div className="rounded-2xl border border-border/15 bg-secondary/70 p-4 text-sm text-muted">
              Tokens e headers de autenticacao ficarao centralizados no client. Componentes de tela
              nao vao carregar credenciais por conta propria.
            </div>

            {pendingInviteToken ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted">
                Um convite pendente foi detectado nesta sessao. Depois do login, o app vai levar
                voce para concluir a entrada na household com o codigo <strong>{pendingInviteToken}</strong>.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
