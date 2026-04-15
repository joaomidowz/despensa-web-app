import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";

type HeaderProps = {
  title?: string;
  leftSlot?: "menu" | "back" | "none";
};

const STORAGE_THEME_KEY = "gestor-despensa.theme";

const APP_NAV_ITEMS = [
  { icon: "space_dashboard", label: "Inicio do app", path: "/app" },
  { icon: "scan", label: "Escanear recibo", path: "/app/scan" },
  { icon: "receipt_long", label: "Historico de compras", path: "/app/receipts" },
  { icon: "inventory_2", label: "Inventario", path: "/app/inventory" },
  { icon: "shopping_cart", label: "Lista de compras", path: "/app/shopping-list" },
  { icon: "account_circle", label: "Perfil", path: "/app/profile" },
] as const;

const APP_DESKTOP_NAV_ITEMS = [
  { icon: "inventory_2", label: "Inventario", path: "/app/inventory" },
  { icon: "receipt_long", label: "Historico", path: "/app/receipts" },
  { icon: "shopping_cart", label: "Lista de compras", path: "/app/shopping-list" },
] as const;

const PUBLIC_NAV_ITEMS = [
  { label: "Inicio", path: "/" },
  { label: "Precos", path: "/pricing" },
] as const;

export function Header({ leftSlot = "back", title = "Gestor de Despensa" }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signOut, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasAvatarError, setHasAvatarError] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const isPublicHome = location.pathname === "/";
  const shouldShowMenu = leftSlot === "menu";
  const shouldShowLeftButton = leftSlot !== "none";
  const shouldShowDesktopAppNav = shouldShowMenu && isAuthenticated;
  const shouldShowDesktopPublicNav = !shouldShowDesktopAppNav;
  const shouldShowThemeToggle = !(shouldShowDesktopPublicNav && !isAuthenticated);

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

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
    setTheme(nextTheme);
  }

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

  async function handleSignOut() {
    await signOut();
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
      <header className="sticky top-0 z-50 border-b border-border/10 bg-card/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {shouldShowLeftButton ? (
              shouldShowMenu ? (
                <>
                  <button
                    aria-label="Abrir menu"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border/15 bg-secondary text-tertiary focus:outline-none focus:ring-2 focus:ring-primary sm:hidden"
                    type="button"
                    onClick={handleLeftAction}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      menu
                    </span>
                  </button>
                  <div className="hidden h-11 w-11 sm:block" aria-hidden="true" />
                </>
              ) : (
                <button
                  aria-label="Voltar"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border/15 bg-secondary text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                  type="button"
                  onClick={handleLeftAction}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_back
                  </span>
                </button>
              )
            ) : (
              <div className="h-11 w-11" aria-hidden="true" />
            )}
            <Link className="truncate text-sm font-bold text-tertiary sm:text-base" to="/">
              {shouldShowDesktopAppNav ? "Minha despensa" : title}
            </Link>
          </div>

          <nav className="hidden items-center justify-center gap-3 sm:flex">
            {shouldShowDesktopPublicNav ? (
              <div className="items-center justify-center gap-7 lg:flex">
                {PUBLIC_NAV_ITEMS.map((item) => (
                  <DesktopNavLink key={item.path} to={item.path} variant="public">
                    {item.label}
                  </DesktopNavLink>
                ))}
              </div>
            ) : (
              <div className="hidden items-center justify-center gap-2 lg:flex">
                {APP_DESKTOP_NAV_ITEMS.map((item) => (
                  <DesktopNavLink key={item.path} to={item.path} variant="app" withIcon={item.icon}>
                    {item.label}
                  </DesktopNavLink>
                ))}
              </div>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {shouldShowThemeToggle ? (
              <button
                aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                type="button"
                onClick={toggleTheme}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
              </button>
            ) : null}

            {shouldShowDesktopPublicNav && !isAuthenticated ? (
              <Link className="hidden rounded-2xl bg-tertiary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary sm:inline-flex" to="/auth">
                Entrar
              </Link>
            ) : null}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  className="hidden text-sm font-medium text-muted transition hover:text-tertiary lg:inline-flex"
                  to="/app"
                >
                  Home
                </Link>
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
                <button className="hidden text-sm font-medium text-muted transition hover:text-tertiary lg:inline-flex" type="button" onClick={() => void handleSignOut()}>
                  Sair
                </button>
              </div>
            ) : (
              <div className="h-11 w-11" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>

      {shouldShowMenu && isMenuOpen ? (
        <div
          className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm sm:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <aside
            aria-label="Menu de navegacao"
            className="flex h-full w-[82vw] max-w-sm flex-col gap-5 bg-card px-5 py-5 shadow-2xl"
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
              {APP_NAV_ITEMS.map((item) => (
                item.path === "/app/profile" ? null : (
                <MobileNavButton
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => goTo(item.path)}
                />
                )
              ))}
              <MobileNavButton icon="sell" label="Precos" onClick={() => goTo("/pricing")} />
              <MobileNavButton
                icon={theme === "dark" ? "light_mode" : "dark_mode"}
                label={theme === "dark" ? "Modo claro" : "Modo escuro"}
                onClick={toggleTheme}
              />
              <MobileNavButton icon="logout" label="Sair" onClick={() => void handleSignOut()} />
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function DesktopNavLink({
  children,
  to,
  variant,
  withIcon,
}: {
  children: string;
  to: string;
  variant: "public" | "app";
  withIcon?: string;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        isActive
          ? `nav-link nav-link-${variant} nav-link-${variant}-active`
          : `nav-link nav-link-${variant}`
      }
      to={to}
    >
      {withIcon ? (
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {withIcon}
        </span>
      ) : null}
      <span>{children}</span>
    </NavLink>
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
