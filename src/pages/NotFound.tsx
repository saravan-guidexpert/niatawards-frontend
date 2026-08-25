import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    // Log 404 in dev only — no console spam in production
    if (import.meta.env.DEV) {
      console.warn("404 route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-[120px] font-heading font-bold text-primary-foreground/10 leading-none mb-2">404</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">Page not found</h1>
          <p className="text-primary-foreground/50 mb-8 text-base">The page you're looking for doesn't exist or has been moved.</p>
          <button id="btn-404-go-home" onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-[#9B2020] to-[#7A1515] text-white font-semibold text-sm ring-1 ring-white/10 hover:from-[#A52222] hover:to-[#851717] transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
