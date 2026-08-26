import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { captureUtmParams } from "./lib/utm";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Eagerly load landing page only
import Index from "./pages/Index.tsx";

// Lazy load everything else — reduces initial bundle significantly
const NominatePage    = lazy(() => import("./pages/NominatePage.tsx"));
const ThankYouPage    = lazy(() => import("./pages/ThankYouPage.tsx"));
const AdminPage       = lazy(() => import("./pages/AdminPage.tsx"));
const AdminLoginPage  = lazy(() => import("./pages/AdminLoginPage.tsx"));
const LoginPage       = lazy(() => import("./pages/LoginPage.tsx"));
const NotFound        = lazy(() => import("./pages/NotFound.tsx"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
    <Loader2 className="w-8 h-8 text-secondary animate-spin" />
  </div>
);

const queryClient = new QueryClient();

function UtmCapture() {
  const location = useLocation();
  useEffect(() => {
    captureUtmParams();
  }, [location.pathname, location.search]);
  return null;
}

function NominateRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/nominate-student", search: location.search, hash: location.hash }} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <UtmCapture />
          {/* Skip to content — accessibility */}
          <a href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-secondary focus:text-black focus:rounded-lg focus:font-bold focus:text-sm">
            Skip to main content
          </a>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<Index />} />
              <Route path="/login"         element={<LoginPage />} />
              <Route path="/nominate"      element={<NominateRedirect />} />
              <Route path="/nominate-student" element={<NominatePage role="student" />} />
              <Route path="/nominate-teacher" element={<NominatePage role="teacher" />} />
              <Route path="/thank-you"     element={<ThankYouPage />} />
              <Route path="/admin-login"   element={<AdminLoginPage />} />
              <Route path="/admin"         element={<AdminPage />} />
              <Route path="*"             element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
