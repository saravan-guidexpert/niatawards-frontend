import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
const VotePage        = lazy(() => import("./pages/VotePage.tsx"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage.tsx"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/* Skip to content — accessibility */}
          <a href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-secondary focus:text-black focus:rounded-lg focus:font-bold focus:text-sm">
            Skip to main content
          </a>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<Index />} />
              <Route path="/login"         element={<LoginPage />} />
              <Route path="/nominate"      element={<NominatePage />} />
              <Route path="/thank-you"     element={<ThankYouPage />} />
              <Route path="/voteniatteachers"          element={<VotePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
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
