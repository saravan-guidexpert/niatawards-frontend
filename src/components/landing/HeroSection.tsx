import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Star, ArrowRight, Calendar, Sparkles, User, Phone, Loader2, CheckCircle2, ChevronDown, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import InlineNominationForm from "@/components/nomination/InlineNominationForm";

declare function gtag(...args: any[]): void;
const track = (event: string, params?: Record<string, any>) => { try { gtag("event", event, params); } catch {} };
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// ── Countdown target: Sep 3, 2026 ──
const DEADLINE = new Date("2026-09-03T23:59:59");

const useCountdown = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, DEADLINE.getTime() - now.getTime());
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

const CountdownBox = ({ value, label, delay }: { value: number; label: string; delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
    className="flex flex-col items-center">
    <div className="relative w-14 h-14 sm:w-16 sm:h-16">
      <div className="absolute inset-0 rounded-xl bg-secondary/25 blur-md" />
      <div className="relative w-full h-full rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
        <AnimatePresence mode="popLayout">
          <motion.span key={value} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.18 }} className="font-heading text-2xl sm:text-3xl font-bold text-white">
            {String(value).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
    <span className="text-[10px] text-white/70 mt-1.5 uppercase tracking-widest font-semibold">{label}</span>
  </motion.div>
);

const Field = ({ label, icon: Icon, prefix, value, onChange, onKeyDown, placeholder, type = "text", inputMode, maxLength, autoFocus }: any) => (
  <div>
    <label className="block text-[12px] font-semibold text-white/80 mb-1.5 uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-white/25 bg-white/10 focus-within:border-secondary/70 focus-within:bg-white/15 transition-all duration-200">
      {prefix && (
        <div className="px-3.5 flex items-center self-stretch border-r border-white/15 bg-white/5 flex-shrink-0">
          <span className="text-[14px] font-bold text-white/80">{prefix}</span>
        </div>
      )}
      {Icon && !prefix && (
        <div className="pl-3.5 flex items-center flex-shrink-0">
          <Icon className="w-4 h-4 text-white/50" />
        </div>
      )}
      <input value={value} onChange={onChange} onKeyDown={onKeyDown} type={type} inputMode={inputMode}
        maxLength={maxLength} autoFocus={autoFocus} placeholder={placeholder}
        className="flex-1 h-12 px-3.5 bg-transparent text-white text-[15px] font-medium placeholder:text-white/35 focus:outline-none" />
    </div>
  </div>
);

// ── Inline Nomination Form (shown after OTP verify) ──
// ── Quick Login Card ──
const QuickNominateCard = () => {
  const { isAuthenticated, user, sendOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp" | "nominate">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, go straight to nomination form
  useEffect(() => {
    if (isAuthenticated) setStep("nominate");
  }, [isAuthenticated]);

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
    if (ok) { track("otp_verified"); setStep("nominate"); }
    else { toast({ title: "Invalid OTP. Please try again.", variant: "destructive" }); setOtp(""); }
  };

  // Show inline nomination form after OTP verified
  if (step === "nominate") {
    return (
      <InlineNominationForm
        userName={user?.name || name}
        userPhone={user?.phone || phone}
        onClose={() => setStep("form")}
      />
    );
  }

  return (
    <div className="min-w-0 w-full rounded-2xl overflow-hidden"
      style={{ background: "rgba(10,3,3,0.88)", border: "1.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(28px)", boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}>
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #d97706, transparent)" }} />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <img src="/niat-logo-tight.webp" alt="NIAT" className="w-9 h-11 object-contain flex-shrink-0" />
          <div>
            <p className="font-heading font-bold text-white text-[16px] leading-tight">Nominate Your Teacher</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className="text-[11px] text-white/55">Free · Open across India · 3 mins</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div key="form" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }} className="space-y-3.5">
              <Field label="Your Full Name" icon={User} value={name}
                onChange={(e: any) => setName(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && handleSend()}
                placeholder="e.g. Rahul Sharma" autoFocus />
              <Field label="Mobile Number" prefix="+91" value={phone}
                onChange={(e: any) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e: any) => e.key === "Enter" && handleSend()}
                type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number" />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                id="btn-hero-send-otp" onClick={handleSend} disabled={loading}
                className="w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-60 mt-1"
                style={{ background: "linear-gradient(135deg, #9B2020, #7A1515)", color: "#fff", boxShadow: "0 4px 20px rgba(107,18,18,0.5)" }}>
                <motion.div animate={{ x: [-200, 400] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                  className="absolute inset-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Phone className="w-4 h-4" /> Get OTP &amp; Nominate</>}
              </motion.button>
              <p className="text-center text-[11px] text-white/30 pt-0.5">
                By continuing you agree to our <a href="https://www.ccbp.in/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-white/50 underline">Terms</a> &amp; <a href="https://www.ccbp.in/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white/50 underline">Privacy Policy</a>
              </p>
            </motion.div>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                  style={{ background: "rgba(34,197,94,0.15)" }}>
                  {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">Hey {name.split(" ")[0]}!</p>
                  <p className="text-[11px] text-white/55 truncate">OTP sent to +91 {phone}</p>
                </div>
                <button id="btn-hero-otp-back" onClick={() => { setStep("form"); setOtp(""); }}
                  className="text-[11px] font-semibold text-secondary hover:text-secondary/80 flex-shrink-0">Edit</button>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-white/80 mb-1.5 uppercase tracking-wider">Enter 6-Digit OTP</label>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleVerify()}
                  type="tel" inputMode="numeric" maxLength={6} autoFocus
                  placeholder="· · · · · ·"
                  className="w-full h-14 rounded-xl text-center text-2xl font-bold tracking-[0.6em] text-white placeholder:text-white/20 focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(217,119,6,0.7)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.25)"} />
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                id="btn-hero-verify-otp" onClick={handleVerify} disabled={loading || otp.length < 6}
                className="w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #9B2020, #7A1515)", color: "#fff", boxShadow: "0 4px 20px rgba(107,18,18,0.4)" }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify &amp; Continue</>}
              </motion.button>
              <button id="btn-hero-resend-otp" onClick={handleSend}
                className="w-full text-center text-[12px] text-white/35 hover:text-secondary transition-colors py-1">
                Didn't receive OTP? Resend
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const countdown = useCountdown();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <>
      <section ref={sectionRef} className="relative min-h-screen flex items-center pt-[56px]"
        style={{ background: "linear-gradient(135deg, hsl(0,0%,6%), hsl(0,12%,10%))" }}>

        <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.32, 0.2] }} transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary rounded-full blur-[130px]" />
          <motion.div animate={{ scale: [1.1, 1, 1.1], opacity: [0.12, 0.22, 0.12] }} transition={{ duration: 8, repeat: Infinity }}
            className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-primary/70 rounded-full blur-[150px]" />
          <motion.div animate={{ x: [-20, 20, -20], y: [-10, 10, -10] }} transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
        </motion.div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-secondary/50"
              style={{ left: `${10 + i * 9}%`, top: `${20 + (i % 4) * 20}%` }}
              animate={{ y: [-15, -45, -15], opacity: [0, 0.8, 0], scale: [0, 1.2, 0] }}
              transition={{ duration: 3 + (i % 3), delay: i * 0.5, repeat: Infinity }} />
          ))}
        </div>

        <div className="w-full relative z-10 py-10 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-w-0">

            {/* Left */}
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
                style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-bold text-secondary tracking-widest uppercase">NIAT Presents · 2026</span>
              </motion.div>

              <div className="overflow-hidden mb-5">
                <motion.h1 initial={{ y: 80 }} animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05]">
                  NIAT{" "}
                  <span className="relative inline-block">
                    <span className="text-secondary">Guru Ratna</span>
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.8 }} style={{ originX: 0 }}
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-secondary to-secondary/30 rounded-full" />
                  </span>
                  <br />Awards 2026
                </motion.h1>
              </div>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="text-base sm:text-lg text-white/80 max-w-lg mb-2 leading-relaxed">
                For the teachers who build futures, not just scores.
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="text-sm text-white/55 max-w-lg mb-8">
                Nominate the teacher who changed your life.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                className="flex flex-wrap gap-2">
                {[
                  { label: "Nominations", date: "Till Sep 3", color: "rgba(217,119,6,0.15)", border: "rgba(217,119,6,0.35)", text: "#d97706" },
                ].map(t => (
                  <span key={t.label} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
                    style={{ background: t.color, border: `1px solid ${t.border}`, color: t.text }}>
                    {t.label} <span style={{ opacity: 0.5 }}>·</span> <span style={{ opacity: 0.85 }}>{t.date}</span>
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-5 overflow-visible min-w-0 w-full">

              <div className="w-full text-center">
                <p className="text-[11px] uppercase tracking-[0.25em] font-bold mb-4 text-secondary">
                  Nominations Close In
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <CountdownBox value={countdown.days}    label="Days"  delay={0.7} />
                  <span className="text-3xl text-white/50 font-light mb-5">:</span>
                  <CountdownBox value={countdown.hours}   label="Hours" delay={0.8} />
                  <span className="text-3xl text-white/50 font-light mb-5">:</span>
                  <CountdownBox value={countdown.minutes} label="Mins"  delay={0.9} />
                  <span className="text-3xl text-white/50 font-light mb-5">:</span>
                  <CountdownBox value={countdown.seconds} label="Secs"  delay={1.0} />
                </div>
              </div>

              <div className="min-w-0 w-full">
                <QuickNominateCard />
              </div>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
                style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)" }}>
                <Calendar className="w-4 h-4 text-secondary" />
                <span className="text-sm text-white font-semibold">Nominations close 3 September 2026</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
