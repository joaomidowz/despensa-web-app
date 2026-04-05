import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";

type HeaderProps = {
  title?: string;
  leftSlot?: "menu" | "back" | "none";
};

export function Header({ leftSlot = "back", title = "Gestor de Despensa" }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signOut, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasAvatarError, setHasAvatarError] = useState(false);
  const isPublicHome = location.pathname === "/";
  const shouldShowMenu = leftSlot === "menu";
  const shouldShowLeftButton = leftSlot !== "none";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setHasAvatarError(false);
  }, [user?.avatar_url]);

  function handleLeftAction() {
    if (shouldShowMenu) {
      setIsMenuOpen((current) => !current);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }

  function handleSignOut() {
    signOut();
    setIsMenuOpen(false);
    navigate("/auth");
  }

  function goTo(path: string) {
    setIsMenuOpen(false);
    navigate(path);
  }

  const displayInitial = user?.name?.slice(0, 1).toUpperCase() ?? "U";

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border/10 bg-white/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {shouldShowLeftButton ? (
            <button
              aria-label={shouldShowMenu ? "Abrir menu" : "Voltar"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/15 bg-secondary text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              type="button"
              onClick={handleLeftAction}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {shouldShowMenu ? "menu" : "arrow_back"}
              </span>
            </button>
          ) : (
            <div className="h-11 w-11" aria-hidden="true" />
          )}
          <Link className="truncate text-sm font-bold text-tertiary sm:text-base" to="/">
            {title}
          </Link>
        </div>

        <nav className="hidden items-center justify-center gap-2 sm:flex">
          <NavLink className="nav-link" to="/">
            Inicio
          </NavLink>
          <NavLink className="nav-link" to="/pricing">
            Precos
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink className="nav-link" to="/app">
                App
              </NavLink>
              <button className="nav-link" type="button" onClick={handleSignOut}>
                Sair
              </button>
            </>
          ) : (
            !isPublicHome && (
              <NavLink className="nav-link" to="/auth">
                Entrar
              </NavLink>
            )
          )}
        </nav>

        {isAuthenticated && user ? (
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-tertiary">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
            <Link
              aria-label="Abrir perfil"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              to="/app/profile"
            >
              {user.avatar_url && !hasAvatarError ? (
                <img
                  alt={`Avatar de ${user.name}`}
                  className="h-11 w-11 rounded-full object-cover shadow-lg shadow-primary/20"
                  src={user.avatar_url}
                  key={user.avatar_url}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={() => setHasAvatarError(true)}
                />
              ) : (
                <div
                  aria-label="Perfil do usuario"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-bold text-white shadow-lg shadow-primary/25"
                >
                  {displayInitial}
                </div>
              )}
            </Link>
          </div>
        ) : (
          <div className="ml-auto h-11 w-11" aria-hidden="true" />
        )}
      </div>
    </header>
    {shouldShowMenu && isMenuOpen ? (
      <div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm sm:hidden" onClick={() => setIsMenuOpen(false)}>
        <aside
          aria-label="Menu de navegacao"
          className="flex h-full w-[82vw] max-w-sm flex-col gap-5 bg-white px-5 py-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/10 pb-4">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-tertiary">
                {user?.name ?? "Gestor de Despensa"}
              </p>
              <p className="truncate text-sm text-muted">
                {user?.email ?? "Navegacao do aplicativo"}
              </p>
            </div>
            <button
              aria-label="Fechar menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/15 bg-secondary text-tertiary"
              type="button"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          <nav className="grid gap-2">
            <MobileNavButton icon="space_dashboard" label="Inicio do app" onClick={() => goTo("/app")} />
            <MobileNavButton icon="scan" label="Escanear recibo" onClick={() => goTo("/app/scan")} />
            <MobileNavButton icon="receipt_long" label="Historico de compras" onClick={() => goTo("/app/receipts")} />
            <MobileNavButton icon="inventory_2" label="Inventario" onClick={() => goTo("/app/inventory")} />
            <MobileNavButton icon="shopping_cart" label="Lista de compras" onClick={() => goTo("/app/shopping-list")} />
            <MobileNavButton icon="account_circle" label="Perfil" onClick={() => goTo("/app/profile")} />
            <MobileNavButton icon="sell" label="Precos" onClick={() => goTo("/pricing")} />
          </nav>

          <button
            className="mt-auto flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white"
            type="button"
            onClick={handleSignOut}
          >
            Sair
          </button>
        </aside>
      </div>
    ) : null}
    </>
  );
}

function MobileNavButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border/10 bg-secondary/70 px-4 text-left text-ink transition hover:bg-secondary"
      type="button"
      onClick={onClick}
    >
      <span className="material-symbols-outlined text-primary" aria-hidden="true">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
