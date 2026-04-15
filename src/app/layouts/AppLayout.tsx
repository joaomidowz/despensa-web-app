import { Outlet } from "react-router-dom";
import { NavigationProgress } from "../../components/feedback/NavigationProgress";
import { Header } from "../../components/navigation/Header";
import { RouteTransition } from "../../components/ui/RouteTransition";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <NavigationProgress />
      <Header title="Minha despensa" leftSlot="menu" />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <RouteTransition className="flex flex-col gap-6">
          <Outlet />
        </RouteTransition>
      </main>
    </div>
  );
}
