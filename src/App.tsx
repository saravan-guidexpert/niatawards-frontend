import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { captureUtmParams } from "./lib/utm";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Eagerly load landing page only
import Index from "./pages/Index.tsx";

const RELOAD_FLAG = "niat_chunk_reload";

const readFlag = () => {
  try { return sessionStorage.getItem(RELOAD_FLAG); } catch { return null; }
};
const writeFlag = (value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(RELOAD_FLAG);
    else sessionStorage.setItem(RELOAD_FLAG, value);
  } catch { /* private mode: fall through to the thrown error */ }
};

/**
 * A tab left open across a deploy still asks for the previous build's chunk
 * hashes, which 404 once the new deployment goes live. Reload once to pick up
 * the current index.html rather than crashing the route mid-nomination.
 */
const lazyRoute = <T extends ComponentType<never>>(load: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      const mod = await load();
      writeFlag(null);
      return mod;
    } catch (err) {
      if (readFlag()) throw err;
      writeFlag("1");
      window.location.reload();
      return new Promise<never>(() => {});
    }
  });

// Lazy load everything else — reduces initial bundle significantly
const NominatePage    = lazyRoute(() => import("./pages/NominatePage.tsx"));
const ThankYouPage    = lazyRoute(() => import("./pages/ThankYouPage.tsx"));
const AdminPage       = lazyRoute(() => import("./pages/AdminPage.tsx"));
const AdminLoginPage  = lazyRoute(() => import("./pages/AdminLoginPage.tsx"));
const LoginPage       = lazyRoute(() => import("./pages/LoginPage.tsx"));
const NotFound        = lazyRoute(() => import("./pages/NotFound.tsx"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
    <Loader2 className="w-8 h-8 text-secondary animate-spin" />
  </div>
);

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
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Toaster />
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
);

export default App;
