import { Outlet, useLocation } from "react-router-dom";
import { NavigationProgress } from "../../components/feedback/NavigationProgress";
import { Header } from "../../components/navigation/Header";
import { RouteTransition } from "../../components/ui/RouteTransition";

export function PublicLayout() {
  const location = useLocation();
  const leftSlot: "none" | "back" = location.pathname === "/" ? "none" : "back";

  return (
    <div className="min-h-screen bg-surface text-ink">
      <NavigationProgress />
      <Header leftSlot={leftSlot} />
      <RouteTransition>
        <Outlet />
      </RouteTransition>
    </div>
  );
}
