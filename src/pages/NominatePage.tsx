import { useState, useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Star, Phone, Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import InlineNominationForm from "@/components/nomination/InlineNominationForm";

declare function gtag(...args: any[]): void;
const track = (event: string, params?: Record<string, any>) => { try { gtag("event", event, params); } catch {} };

const NominatePage = () => {
  const { isAuthenticated, user, sendOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"login" | "otp" | "form">("login");
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp]     = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, skip straight to form
  useEffect(() => {
    if (isAuthenticated) setStep("form");
  }, [isAuthenticated]);

  const iCls = "w-full h-12 rounded-xl px-4 text-[15px] font-medium text-white placeholder:text-white/35 focus:outline-none transition-all border";
  const iStyle = { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" };

  const handleSend = async () => {
    if (!name.trim()) { toast({ title: "Please enter your name", variant: "destructive" }); return; }
    if (phone.replace(/\D/g, "").length < 10) { toast({ title: "Enter a valid 10-digit number", variant: "destructive" }); return; }
    setLoading(true);
    const result = await sendOtp(phone);
    setLoading(false);
    if (result.success) { track("get_otp_clicked"); setStep("otp"); }
    else toast({ title: result.error || "Failed to send OTP", variant: "destructive" });
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    const ok = await verifyOtp(otp, name.trim());
    setLoading(false);
    if (ok) { track("otp_verified"); setStep("form"); }
    else { toast({ title: "Invalid OTP. Please try again.", variant: "destructive" }); setOtp(""); }
  };

  return (
    <div className="min-h-screen bg-gradient-dark" id="main-content" role="main">
      <Navbar />
      <div className="pt-[56px] min-h-screen flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-1.5 mb-4">
              <Star className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase tracking-widest">NIAT Awards 2026</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-1">Nominate a Teacher</h1>
            <p className="text-white/45 text-sm">Celebrate the educator who changed your life</p>
          </div>

          {/* Login step */}
          {step === "login" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6"
              style={{ background: "rgba(10,3,3,0.9)", border: "1.5px solid rgba(255,255,255,0.15)", backdropFilter: "blur(20px)" }}>
              <div className="h-[3px] rounded-full mb-5 -mx-6 -mt-6"
                style={{ background: "linear-gradient(90deg, transparent, #d97706, transparent)" }} />
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-white/60 mb-1.5 uppercase tracking-wider">Your Full Name</label>
                  <input className={iCls} style={iStyle} placeholder="e.g. Rahul Sharma" value={name}
                    onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} autoFocus />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-white/60 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="h-12 px-3 flex items-center rounded-xl text-white/60 text-sm font-bold flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }}>+91</div>
                    <input className={iCls} style={iStyle} placeholder="10-digit number" type="tel" inputMode="numeric"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={e => e.key === "Enter" && handleSend()} />
                  </div>
                </div>
                <button onClick={handleSend} disabled={loading}
                  className="w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#9B2020,#7A1515)", color: "#fff", boxShadow: "0 4px 20px rgba(107,18,18,0.5)" }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Phone className="w-4 h-4" /> Get OTP</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* OTP step */}
          {step === "otp" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl p-6"
              style={{ background: "rgba(10,3,3,0.9)", border: "1.5px solid rgba(255,255,255,0.15)", backdropFilter: "blur(20px)" }}>
              <div className="h-[3px] rounded-full mb-5 -mx-6 -mt-6"
                style={{ background: "linear-gradient(90deg, transparent, #d97706, transparent)" }} />
              <button onClick={() => { setStep("login"); setOtp(""); }}
                className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Change number
              </button>
              <p className="text-white font-semibold mb-1">Hey {name.split(" ")[0]}! 👋</p>
              <p className="text-white/45 text-sm mb-5">OTP sent to +91 {phone}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-white/60 mb-1.5 uppercase tracking-wider">Enter 6-Digit OTP</label>
                  <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && handleVerify()}
                    type="tel" inputMode="numeric" maxLength={6} autoFocus
                    className="w-full h-14 rounded-xl text-center text-2xl font-bold tracking-[0.5em] text-white focus:outline-none transition-all border"
                    style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)", color: "#fff" }} />
                </div>
                <button onClick={handleVerify} disabled={loading || otp.length < 6}
                  className="w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#9B2020,#7A1515)", color: "#fff" }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify &amp; Continue</>}
                </button>
                <button onClick={handleSend} className="w-full text-center text-sm text-white/30 hover:text-secondary transition-colors">
                  Didn't receive? Resend OTP
                </button>
              </div>
            </motion.div>
          )}

          {/* Form step */}
          {step === "form" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <InlineNominationForm
                userName={user?.name || name}
                userPhone={user?.phone || phone}
              />
            </motion.div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NominatePage;
