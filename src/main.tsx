import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./app/layouts/AppLayout";
import { PublicLayout } from "./app/layouts/PublicLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./app/providers/AuthProvider";
import { ToastProvider } from "./app/providers/ToastProvider";
import { HomePage } from "./features/marketing/HomePage";
import { PricingPage } from "./features/marketing/PricingPage";
import { AuthPage } from "./features/auth/AuthPage";
import { DashboardPage } from "./features/app/DashboardPage";
import { ScanPage } from "./features/receipts/ScanPage";
import { ReceiptHistoryPage } from "./features/receipts/ReceiptHistoryPage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import { ShoppingListPage } from "./features/shopping-list/ShoppingListPage";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/pricing", element: <PricingPage /> },
      { path: "/auth", element: <AuthPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "scan", element: <ScanPage /> },
          { path: "receipts", element: <ReceiptHistoryPage /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "shopping-list", element: <ShoppingListPage /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
