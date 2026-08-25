import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// TODO-SECURITY: Move these to Supabase Edge Function auth — never hardcode credentials in client JS
// These are readable by anyone who inspects the JS bundle.
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USER || "NIAT_admin";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASS || "Niat_teachers_2026";
const SESSION_KEY = "niat_admin_session";

export const isAdminLoggedIn = () => {
  return sessionStorage.getItem(SESSION_KEY) === "true";
};

export const adminLogout = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate a slight delay for UX
    await new Promise(r => setTimeout(r, 600));

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      toast({ title: "Welcome, Admin!", description: "Redirecting to dashboard..." });
      navigate("/admin");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast({ title: "Invalid credentials", description: "Please check your username and password.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B1A1A] to-[#6B1212] shadow-xl shadow-[#8B1A1A]/30 ring-1 ring-white/10 flex items-center justify-center mx-auto mb-4">
            <img src="/niat-logo.webp" alt="NIAT" className="w-11 h-11 object-contain" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary-foreground">Admin Portal</h1>
          <p className="text-primary-foreground/50 text-sm mt-1">NIAT Future-Ready Educator Awards 2026</p>
        </div>

        {/* Card */}
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-2xl p-8 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-primary-foreground/10">
            <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">Restricted Access</p>
              <p className="text-xs text-primary-foreground/40">Authorized personnel only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-primary-foreground/70 text-sm">Username</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10 bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 focus:border-secondary"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <Label className="text-primary-foreground/70 text-sm">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10 pr-10 bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 focus:border-secondary"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/30 hover:text-primary-foreground/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full py-5 rounded-xl text-sm font-semibold mt-2"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                "Sign In to Dashboard"
              )}
            </Button>
          </form>
        </motion.div>

        <p className="text-center text-primary-foreground/30 text-xs mt-6">
          © 2026 Nxtwave of Innovation in Advanced Technologies
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
