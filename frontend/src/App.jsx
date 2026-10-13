import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { SellerDashboard } from "./pages/SellerDashboard";
import { RegisterLandPage } from "./pages/RegisterLandPage";
import { BuyerDashboard } from "./pages/BuyerDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LandDetailsPage } from "./pages/LandDetailsPage";
import { PublicVerifyPage } from "./pages/PublicVerifyPage";
import { NotificationsPage } from "./pages/NotificationsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Core App Shell */}
          <Route
            path="/"
            element={
              <Layout>
                <PublicVerifyPage />
              </Layout>
            }
          />
          <Route
            path="/verify"
            element={
              <Layout>
                <PublicVerifyPage />
              </Layout>
            }
          />
          <Route
            path="/lands/:id"
            element={
              <Layout>
                <LandDetailsPage />
              </Layout>
            }
          />
          <Route
            path="/seller"
            element={
              <Layout>
                <SellerDashboard />
              </Layout>
            }
          />
          <Route
            path="/register"
            element={
              <Layout>
                <RegisterLandPage />
              </Layout>
            }
          />
          <Route
            path="/buyer"
            element={
              <Layout>
                <BuyerDashboard />
              </Layout>
            }
          />
          <Route
            path="/admin"
            element={
              <Layout>
                <AdminDashboard />
              </Layout>
            }
          />
          <Route
            path="/notifications"
            element={
              <Layout>
                <NotificationsPage />
              </Layout>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

