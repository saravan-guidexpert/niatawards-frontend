import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ArrowRight, Shield, User, Loader2, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { sendOtp, verifyOtp, setUserName } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const handleSendOtp = async () => {
    if (phone.length < 10) { toast({ title: "Enter a valid 10-digit number", variant: "destructive" }); return; }
    setLoading(true);
    const result = await sendOtp(phone);
    setLoading(false);
    if (result.success) setStep("otp");
    else toast({ title: result.error || "Failed to send OTP", variant: "destructive" });
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    const ok = await verifyOtp(otp, name.trim());
    setLoading(false);
    if (ok) setStep("name");
    else { toast({ title: "Invalid OTP", variant: "destructive" }); setOtp(""); }
  };

  const handleComplete = () => {
    if (!name.trim()) { toast({ title: "Please enter your name", variant: "destructive" }); return; }
    // Name already set in verifyOtp — only set here if changed on this step
    setUserName(name.trim());
    // Small delay so state settles before navigation — prevents blank flash
    setTimeout(() => navigate(from, { replace: true }), 50);
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom" id="main-content" role="main">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8B1A1A] to-[#6B1212] flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
            <img src="/niat-logo-tight.webp" alt="NIAT" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Welcome</h1>
          <p className="text-sm text-white/50 mt-1">NIAT Future-Ready Educator Awards 2026</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["phone", "otp", "name"].map((s, i) => (
            <div key={s} className={`rounded-full transition-all duration-300 ${step === s ? "w-6 h-1.5 bg-secondary" : ["phone","otp","name"].indexOf(step) > i ? "w-3 h-1.5 bg-secondary/50" : "w-3 h-1.5 bg-white/10"}`} />
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-5 h-5 text-secondary" />
                  <h2 className="font-heading text-lg font-semibold text-white">Phone number</h2>
                </div>
                <p className="text-sm text-white/50 mb-5">We'll send an OTP to verify</p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 rounded-xl bg-white/5 border border-white/15 text-white/70 text-sm font-semibold flex-shrink-0 h-12">+91</div>
                    <input type="tel" inputMode="numeric" placeholder="10-digit number" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                      className="flex-1 h-12 px-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-secondary/60 transition-all" />
                  </div>
                  <button id="btn-login-send-otp" onClick={handleSendOtp} disabled={phone.length < 10 || loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#9B2020] to-[#7A1515] text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Send OTP</>}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button id="btn-login-otp-back" onClick={() => { setStep("phone"); setOtp(""); }} className="flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors mb-4 min-h-[44px]">
                  <ChevronLeft className="w-4 h-4" /> Change number
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-secondary" />
                  <h2 className="font-heading text-lg font-semibold text-white">Verify OTP</h2>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 mb-5 mt-2">
                  <Phone className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                  <span className="text-sm text-white/60">Sent to <span className="text-white font-semibold">+91 {phone}</span></span>
                </div>
                <div className="space-y-3">
                  <input type="tel" inputMode="numeric" placeholder="Enter 6-digit OTP" maxLength={6} autoFocus
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                    className="w-full h-14 px-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-2xl font-bold tracking-[0.5em] text-center focus:outline-none focus:border-secondary/60 transition-all" />
                  <button id="btn-login-verify-otp" onClick={handleVerifyOtp} disabled={otp.length < 6 || loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#9B2020] to-[#7A1515] text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Verify</>}
                  </button>
                  <button id="btn-login-resend-otp" onClick={handleSendOtp} className="w-full text-center text-sm text-white/30 hover:text-secondary transition-colors min-h-[44px] flex items-center justify-center">
                    Didn't receive? Resend OTP
                  </button>
                </div>
              </motion.div>
            )}

            {step === "name" && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-secondary" />
                  <h2 className="font-heading text-lg font-semibold text-white">Your name</h2>
                </div>
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 mb-5">
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-xs text-white/60">Phone verified · +91 {phone}</span>
                </div>
                <div className="space-y-3">
                  <input placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} autoFocus
                    onKeyDown={e => e.key === "Enter" && handleComplete()}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 text-base font-medium focus:outline-none focus:border-secondary/60 transition-all" />
                  <p className="text-xs text-white/30">This will appear on your nomination</p>
                  <button id="btn-login-complete" onClick={handleComplete} disabled={!name.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#9B2020] to-[#7A1515] text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
                    <ArrowRight className="w-4 h-4" /> Continue
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-center text-xs text-white/20 mt-5">Free · No spam · Secure OTP verification</p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
