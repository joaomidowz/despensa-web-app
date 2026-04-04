import { Outlet } from "react-router-dom";
import { Header } from "../../components/navigation/Header";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Header title="Minha despensa" leftSlot="menu" />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
