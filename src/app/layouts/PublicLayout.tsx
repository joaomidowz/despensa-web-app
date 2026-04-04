import { Outlet, useLocation } from "react-router-dom";
import { Header } from "../../components/navigation/Header";

export function PublicLayout() {
  const location = useLocation();
  const leftSlot: "none" | "back" = location.pathname === "/" ? "none" : "back";

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Header leftSlot={leftSlot} />
      <Outlet />
    </div>
  );
}
