import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Calendar, Sparkles, User, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createNominationDraft, updateNominationDraft } from "@/lib/api";
import { getDraftSession, saveDraftSession } from "@/lib/nominationDraft";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MobileOtpField = lazy(() => import("@/components/nomination/MobileOtpField"));
const InlineNominationForm = lazy(() => import("@/components/nomination/InlineNominationForm"));

const OtpFieldFallback = () => (
  <div aria-hidden="true">
    <div className="h-4 mb-2" />
    <div className="h-12 sm:h-14" />
  </div>
);

const NominationFormFallback = () => (
  <div
    className="w-full rounded-2xl"
    style={{
      background: "rgba(10,3,3,0.95)",
      border: "1.5px solid rgba(255,255,255,0.2)",
      backdropFilter: "blur(28px)",
      minHeight: 280,
    }}
    aria-hidden="true"
  />
);

declare function gtag(...args: any[]): void;
const track = (event: string, params?: Record<string, any>) => { try { gtag("event", event, params); } catch {} };

const DEADLINE = new Date("2026-09-03T23:59:59");

const HERO_PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  left: `${10 + i * 9}%`,
  top: `${20 + (i % 4) * 20}%`,
  duration: `${3 + (i % 3)}s`,
  delay: `${i * 0.5}s`,
}));

const useCountdown = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      t = setInterval(() => setNow(new Date()), 1000);
    };
    const stop = () => {
      if (t) clearInterval(t);
      t = undefined;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        setNow(new Date());
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  const diff = Math.max(0, DEADLINE.getTime() - now.getTime());
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

const CountdownBox = ({ value, label, delay }: { value: number; label: string; delay: string }) => (
  <div className="flex flex-col items-center niat-fade-up" style={{ animationDelay: delay }}>
    <div className="relative w-14 h-14 sm:w-16 sm:h-16">
      <div className="absolute inset-0 rounded-xl bg-secondary/25 blur-md" />
      <div className="relative w-full h-full rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg overflow-hidden">
        <span key={value} className="niat-countdown-digit font-heading text-2xl sm:text-3xl font-bold text-white">
          {String(value).padStart(2, "0")}
        </span>
      </div>
    </div>
    <span className="text-[10px] text-white/70 mt-1.5 uppercase tracking-widest font-semibold">{label}</span>
  </div>
);

const HeroCountdown = () => {
  const countdown = useCountdown();
  return (
    <div className="w-full text-center">
      <p className="text-[11px] uppercase tracking-[0.25em] font-bold mb-4 text-secondary">
        Nominations Close In
      </p>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <CountdownBox value={countdown.days}    label="Days"  delay="0.7s" />
        <span className="text-3xl text-white/50 font-light mb-5">:</span>
        <CountdownBox value={countdown.hours}   label="Hours" delay="0.8s" />
        <span className="text-3xl text-white/50 font-light mb-5">:</span>
        <CountdownBox value={countdown.minutes} label="Mins"  delay="0.9s" />
        <span className="text-3xl text-white/50 font-light mb-5">:</span>
        <CountdownBox value={countdown.seconds} label="Secs"  delay="1.0s" />
      </div>
    </div>
  );
};

const Field = ({ label, id, icon: Icon, prefix, value, onChange, onKeyDown, placeholder, type = "text", inputMode, maxLength, autoFocus }: any) => (
  <div>
    <label htmlFor={id} className="block text-[12px] font-semibold text-white/80 mb-1.5 uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-white/25 bg-white/10 focus-within:border-secondary/70 focus-within:bg-white/15 transition-all duration-200">
      {prefix && (
        <div className="px-3.5 flex items-center self-stretch border-r border-white/15 bg-white/5 flex-shrink-0">
          <span className="text-[14px] font-bold text-white/80">{prefix}</span>
        </div>
      )}
      {Icon && !prefix && (
        <div className="pl-3.5 flex items-center flex-shrink-0">
          <Icon className="w-4 h-4 text-white/50" aria-hidden="true" />
        </div>
      )}
      <input id={id} value={value} onChange={onChange} onKeyDown={onKeyDown} type={type} inputMode={inputMode}
        maxLength={maxLength} autoFocus={autoFocus} placeholder={placeholder}
        className="flex-1 h-12 px-3.5 bg-transparent text-white text-[15px] font-medium placeholder:text-white/35 focus:outline-none" />
    </div>
  </div>
);

const QuickNominateCard = ({ lockedRole }: { lockedRole: "student" | "teacher" }) => {
  const { isAuthenticated, user, sendOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp" | "nominate">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [draftToken, setDraftToken] = useState(getDraftSession()?.token || "");
  const skippedOtpRef = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const persistDraft = async (nominatorName: string, nominatorPhone: string, resume = false) => {
    const draft = await createNominationDraft({
      type: lockedRole,
      nominator_name: nominatorName,
      nominator_phone: nominatorPhone,
      ...(resume ? { resume: true } : {}),
    });
    const token = String(draft.draft_token);
    setDraftToken(token);
    saveDraftSession({
      id: String(draft.id),
      token,
      type: lockedRole,
      phone: nominatorPhone.replace(/\D/g, "").slice(-10),
    });
    return token;
  };

  useEffect(() => {
    if (!isAuthenticated || skippedOtpRef.current) return;
    skippedOtpRef.current = true;
    const nominatorName = user?.name || name;
    const nominatorPhone = user?.phone || phone;
    if (!nominatorName.trim() || nominatorPhone.replace(/\D/g, "").length < 10) {
      setStep("nominate");
      return;
    }
    const existing = getDraftSession();
    if (existing?.token && existing.phone === nominatorPhone.replace(/\D/g, "").slice(-10)) {
      setDraftToken(existing.token);
      setStep("nominate");
      return;
    }
    persistDraft(nominatorName.trim(), nominatorPhone, true)
      .catch(() => undefined)
      .finally(() => setStep("nominate"));
  }, [isAuthenticated]);

  const handleSend = async (resend = false) => {
    if (name.trim().length < 2) { toast({ title: "Please enter your name", variant: "destructive" }); return; }
    if (phone.replace(/\D/g, "").length < 10) { toast({ title: "Enter a valid 10-digit number", variant: "destructive" }); return; }
    if (resend && resendIn > 0) return;
    setLoading(true);
    try {
      let token = draftToken;
      if (!resend) {
        token = await persistDraft(name.trim(), phone);
      }
      const result = await sendOtp(phone, resend);
      if (!result.success) {
        toast({ title: result.error || "Failed to send OTP", variant: "destructive" });
        return;
      }
      track(resend ? "otp_resent" : "get_otp_clicked");
      setResendIn(30);
      if (resend) toast({ title: `OTP resent to +91 ${phone}` });
      if (token) {
        await updateNominationDraft({ draft_token: token, form_step: "otp_sent" }).catch(() => undefined);
      }
      if (!resend) setStep("otp");
    } catch (err: any) {
      toast({ title: err.message || "Failed to send OTP", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    const result = await verifyOtp(otp, name.trim(), draftToken || undefined);
    setLoading(false);
    if (result.success) { track("otp_verified"); setStep("nominate"); }
    else { toast({ title: result.error || "Invalid OTP. Please try again.", variant: "destructive" }); setOtp(""); }
  };

  if (step === "nominate") {
    return (
      <Suspense fallback={<NominationFormFallback />}>
        <InlineNominationForm
          userName={user?.name || name}
          userPhone={user?.phone || phone}
          lockedRole={lockedRole}
          draftToken={draftToken}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-w-0 w-full rounded-2xl overflow-hidden"
      style={{ background: "rgba(10,3,3,0.88)", border: "1.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(28px)", boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}>
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #d97706, transparent)" }} />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <img src="/niat-logo-tight.webp" alt="NIAT" width={36} height={44} className="w-9 h-11 object-contain flex-shrink-0" />
          <div>
            <p className="font-heading font-bold text-white text-[16px] leading-tight">
              {lockedRole === "teacher" ? "Nominate Yourself" : "Nominate Your Teacher"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className="text-[11px] text-white/55">Free · Open across India · 3 mins</p>
            </div>
          </div>
        </div>

        {step === "form" ? (
          <div key="form" className="space-y-3.5 niat-step-form">
            <Field id="hero-nominator-name" label="Your Full Name" icon={User} value={name}
              onChange={(e: any) => setName(e.target.value)}
              onKeyDown={(e: any) => e.key === "Enter" && handleSend()}
              placeholder="e.g. Rahul Sharma" autoFocus />
            <Field id="hero-nominator-phone" label="Mobile Number" prefix="+91" value={phone}
              onChange={(e: any) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e: any) => e.key === "Enter" && handleSend()}
              type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number" />
            <button
              id="btn-hero-send-otp" onClick={() => handleSend()} disabled={loading || name.trim().length < 2 || phone.length < 10}
              className="niat-btn-press w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-60 mt-1"
              style={{ background: "linear-gradient(135deg, #9B2020, #7A1515)", color: "#fff", boxShadow: "0 4px 20px rgba(107,18,18,0.5)" }}>
              <div className="niat-shine absolute inset-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Phone className="w-4 h-4" /> Get OTP &amp; Nominate</>}
            </button>
            <p className="text-center text-[11px] text-white/50 pt-0.5">
              By continuing you agree to our <a href="https://www.ccbp.in/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-white/70 underline">Terms</a> &amp; <a href="https://www.ccbp.in/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white/70 underline">Privacy Policy</a>
            </p>
          </div>
        ) : (
          <div key="otp" className="space-y-4 niat-step-otp">
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
            <Suspense fallback={<OtpFieldFallback />}>
              <MobileOtpField
                value={otp}
                onChange={setOtp}
                disabled={loading}
                onEnter={handleVerify}
              />
            </Suspense>
            <button
              id="btn-hero-verify-otp" onClick={handleVerify} disabled={loading || otp.length < 6}
              className="niat-btn-press w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #9B2020, #7A1515)", color: "#fff", boxShadow: "0 4px 20px rgba(107,18,18,0.4)" }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify &amp; Continue</>}
            </button>
            <button id="btn-hero-resend-otp" onClick={() => handleSend(true)} disabled={loading || resendIn > 0}
              className="w-full text-center text-[12px] text-white/35 hover:text-secondary disabled:hover:text-white/35 disabled:cursor-not-allowed transition-colors py-1">
              {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Didn't receive OTP? Resend"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const HeroSection = ({ lockedRole = "student" }: { lockedRole?: "student" | "teacher" }) => (
  <section className="relative min-h-screen flex items-center pt-[56px]"
    style={{ background: "linear-gradient(135deg, hsl(0,0%,6%), hsl(0,12%,10%))" }}>

    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="niat-orb-a absolute top-0 left-0 w-[600px] h-[600px] bg-primary rounded-full blur-[130px]" />
      <div className="niat-orb-b absolute bottom-0 right-0 w-[700px] h-[700px] bg-primary/70 rounded-full blur-[150px]" />
      <div className="niat-orb-c absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
    </div>

    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {HERO_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="niat-particle absolute w-1 h-1 rounded-full bg-secondary/50"
          style={{ left: p.left, top: p.top, ["--niat-dur" as string]: p.duration, ["--niat-delay" as string]: p.delay }}
        />
      ))}
    </div>

    <div className="w-full relative z-10 py-10 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-w-0">

        <div>
          <div className="niat-fade-up inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
            style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-bold text-secondary tracking-widest uppercase">NIAT Presents · 2026</span>
          </div>

          <div className="overflow-hidden mb-5">
            <h1 className="niat-hero-title font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05]">
              NIAT{" "}
              <span className="relative inline-block">
                <span className="text-secondary">Guru Ratna</span>
                <span className="niat-underline absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-secondary to-secondary/30 rounded-full" />
              </span>
              <br />Awards 2026
            </h1>
          </div>

          <p className="niat-fade-up text-base sm:text-lg text-white/80 max-w-lg mb-2 leading-relaxed" style={{ animationDelay: "0.5s" }}>
            For the teachers who build futures, not just scores.
          </p>
          <p className="niat-fade-in text-sm text-white/55 max-w-lg mb-8" style={{ animationDelay: "0.7s" }}>
            Nominate the teacher who changed your life.
          </p>

          <div className="niat-fade-up flex flex-wrap gap-2" style={{ animationDelay: "0.9s" }}>
            {[
              { label: "Nominations", date: "Till Sep 3", color: "rgba(217,119,6,0.15)", border: "rgba(217,119,6,0.35)", text: "#d97706" },
            ].map(t => (
              <span key={t.label} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: t.color, border: `1px solid ${t.border}`, color: t.text }}>
                {t.label} <span style={{ opacity: 0.5 }}>·</span> <span style={{ opacity: 0.85 }}>{t.date}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="niat-hero-right flex flex-col items-center gap-5 overflow-visible min-w-0 w-full">
          <HeroCountdown />

          <div className="min-w-0 w-full">
            <QuickNominateCard lockedRole={lockedRole} />
            <p className="text-center text-white/50 text-sm mt-4">
              {lockedRole === "teacher" ? (
                <>Nominating a teacher instead?{" "}
                  <Link to="/nominate-student" className="text-secondary hover:text-secondary/80 font-medium">
                    Go to student nomination
                  </Link>
                </>
              ) : (
                <>Are you a teacher?{" "}
                  <Link to="/nominate-teacher" className="text-secondary hover:text-secondary/80 font-medium">
                    Nominate yourself
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
            style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)" }}>
            <Calendar className="w-4 h-4 text-secondary" />
            <span className="text-sm text-white font-semibold">Nominations close 3 September 2026</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
