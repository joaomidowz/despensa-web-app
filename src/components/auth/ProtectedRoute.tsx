import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-4">
        <div className="glass-panel rounded-[28px] px-6 py-5 text-center shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
            Sessao
          </p>
          <p className="mt-2 text-base text-muted">Validando seu acesso...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate replace to="/auth" />;
  }
  return <Outlet />;
}
