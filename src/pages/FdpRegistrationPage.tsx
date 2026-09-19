import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BookOpen,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { copyTextWithFallback } from "@/lib/copyText";
import {
  completeFdpRegistration,
  initiateFdpRegistration,
  type FdpRegistrationResult,
} from "@/lib/apiFdp";
import { getUtmParams } from "@/lib/utm";

const POPULAR_SUBJECTS = [
  "Computer Science / AI & Data",
  "Mathematics & Statistics",
  "Physics & Applied Sciences",
  "Chemistry & Material Sciences",
  "Biology & Life Sciences",
  "Commerce, Finance & Economics",
  "English & Humanities",
  "Engineering (Circuit & Non-Circuit)",
  "Social Sciences",
  "Other",
];

const EXPERIENCE_LEVELS = [
  { id: "0-2 Years", title: "0 – 2 Years", desc: "Early Career Faculty" },
  { id: "3-5 Years", title: "3 – 5 Years", desc: "Growing Educator" },
  { id: "6-10 Years", title: "6 – 10 Years", desc: "Experienced Faculty" },
  { id: "10+ Years", title: "10+ Years", desc: "Senior Faculty / HOD" },
];

export default function FdpRegistrationPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Current Step: 1 (Identity), 2 (Academic Details), 3 (Confirmation)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);

  // Step 2 State
  const [teachingSubject, setTeachingSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [city, setCity] = useState("");
  const [experienceYears, setExperienceYears] = useState("3-5 Years");
  const [receiveUpdates, setReceiveUpdates] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 3 Confirmation
  const [registeredData, setRegisteredData] = useState<FdpRegistrationResult | null>(null);

  // Clean phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
  };

  // Step 1: Proceed directly to Step 2 without OTP
  const handleProceedToStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      toast({
        title: "Name required",
        description: "Please enter your full name (at least 2 characters).",
        variant: "destructive",
      });
      return;
    }

    if (phone.length !== 10) {
      toast({
        title: "Invalid mobile number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    setStep1Loading(true);
    try {
      const utm = getUtmParams();
      await initiateFdpRegistration({
        full_name: cleanName,
        phone,
        utm,
      });
      setStep(2);
    } catch (err: any) {
      toast({
        title: "Could not save details",
        description: err.message || "Failed to proceed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStep1Loading(false);
    }
  };

  // Step 2: Complete Registration
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject =
      teachingSubject === "Other" ? customSubject.trim() : teachingSubject.trim();

    if (!finalSubject) {
      toast({
        title: "Subject required",
        description: "Please select or specify your current teaching subject.",
        variant: "destructive",
      });
      return;
    }

    if (!institutionName.trim()) {
      toast({
        title: "Institution required",
        description: "Please enter your college or school name.",
        variant: "destructive",
      });
      return;
    }

    if (!city.trim()) {
      toast({
        title: "City required",
        description: "Please enter your current city or town.",
        variant: "destructive",
      });
      return;
    }

    if (!experienceYears) {
      toast({
        title: "Experience required",
        description: "Please select your years of teaching experience.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await completeFdpRegistration({
        phone,
        teaching_subject: finalSubject,
        institution_name: institutionName.trim(),
        city: city.trim(),
        experience_years: experienceYears,
        receive_updates: receiveUpdates,
      });

      setRegisteredData(res.registration);
      setStep(3);
      toast({
        title: "Registration Confirmed!",
        description: "Your participation in the FDP has been confirmed.",
      });
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message || "Failed to submit registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const maskedPhone =
    phone.length === 10 ? `******${phone.slice(-4)}` : phone;

  return (
    <div className="min-h-screen bg-[#09090D] text-white selection:bg-amber-500/30 selection:text-amber-200 relative overflow-x-hidden font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[550px] h-[550px] bg-amber-600/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-red-800/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#09090D]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo — 237×56 lockup matching homepage */}
          <Link
            to="/"
            className="flex-shrink min-w-0 max-w-[55vw] sm:max-w-none flex items-center no-underline"
          >
            <img
              src="/niat-lockup.svg?v=2"
              alt="NIAT - NxtWave of Innovation in Advanced Technologies"
              width={237}
              height={56}
              className="h-8 w-auto sm:h-10 max-w-full"
              style={{ display: "block", objectFit: "contain" }}
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-white/70 hover:text-white hover:bg-white/5 gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Awards Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Faculty Development Program (FDP)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight sm:leading-snug">
            Empowering Educators with <br />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Next-Gen Teaching Methodologies
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-white/60 mt-3 leading-relaxed">
            Register for the upcoming Faculty Development Program. Enhance your pedagogical toolkit, discover AI-assisted learning frameworks, and connect with academic leaders.
          </p>

          {/* Quick Perks Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-5 text-[11px] sm:text-xs text-white/70">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Verified Certificate
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              Hands-on Workshops
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Interactive Sessions
            </span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="flex items-center justify-between relative">
            {/* Connecting Track */}
            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-white/10 -z-0">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
                style={{
                  width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
                }}
              />
            </div>

            {/* Step 1 Pill */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step > 1
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                    : step === 1
                    ? "bg-amber-500/20 text-amber-300 border-2 border-amber-500 ring-4 ring-amber-500/10"
                    : "bg-zinc-800 text-white/40 border border-white/10"
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold tracking-wide ${
                  step === 1 ? "text-amber-400 font-bold" : step > 1 ? "text-white" : "text-white/40"
                }`}
              >
                Educator Details
              </span>
            </div>

            {/* Step 2 Pill */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step > 2
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                    : step === 2
                    ? "bg-amber-500/20 text-amber-300 border-2 border-amber-500 ring-4 ring-amber-500/10"
                    : "bg-zinc-800 text-white/40 border border-white/10"
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : "2"}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold tracking-wide ${
                  step === 2 ? "text-amber-400 font-bold" : step > 2 ? "text-white" : "text-white/40"
                }`}
              >
                Academic Profile
              </span>
            </div>

            {/* Step 3 Pill */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === 3
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/10"
                    : "bg-zinc-800 text-white/40 border border-white/10"
                }`}
              >
                {step === 3 ? <Check className="w-4 h-4 stroke-[3]" /> : "3"}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold tracking-wide ${
                  step === 3 ? "text-emerald-400 font-bold" : "text-white/40"
                }`}
              >
                Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-zinc-900/60 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

            <AnimatePresence mode="wait">
              {/* ================= STEP 1: IDENTITY & OTP ================= */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white font-heading">
                      Educator Information
                    </h2>
                    <p className="text-xs text-white/50 mt-1">
                      Please enter your full name and mobile number to proceed.
                    </p>
                  </div>

                  <form onSubmit={handleProceedToStep2} className="space-y-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                        Full Name <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Dr. Ramesh Rao / Prof. Anjali Sharma"
                          className="pl-10 h-12 rounded-xl bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 text-sm focus-visible:ring-amber-500/60 focus-visible:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                        Mobile Number <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 flex items-center gap-1.5 text-xs font-bold text-white/70 pointer-events-none">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          <span>+91</span>
                          <span className="text-white/20">|</span>
                        </div>
                        <Input
                          type="tel"
                          required
                          maxLength={10}
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="98765 43210"
                          className="pl-20 h-12 rounded-xl bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 text-sm font-mono tracking-wider focus-visible:ring-amber-500/60 focus-visible:border-amber-500"
                        />
                      </div>
                      <p className="text-[11px] text-white/40 pl-1">
                        Your direct contact number for FDP coordination and program access.
                      </p>
                    </div>

                    {/* Submit Step 1 Button */}
                    <div className="pt-3">
                      <Button
                        type="submit"
                        disabled={step1Loading || phone.length !== 10 || !fullName.trim()}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.99] gap-2"
                      >
                        {step1Loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            Saving Details...
                          </>
                        ) : (
                          <>
                            <span>Proceed to Step 2</span>
                            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ================= STEP 2: ACADEMIC PROFILE & PREFERENCES ================= */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white font-heading">
                        Academic Profile & Preferences
                      </h2>
                      <p className="text-xs text-white/50 mt-1">
                        Tell us about your teaching domain and institution to customize your FDP curriculum.
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitProfile} className="space-y-4">
                    {/* Current Teaching Subject */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                        Current Teaching Subject <span className="text-amber-400">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {POPULAR_SUBJECTS.map((subj) => {
                          const isSelected = teachingSubject === subj;
                          return (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => setTeachingSubject(subj)}
                              className={`px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                                isSelected
                                  ? "bg-amber-500/15 border-amber-500 text-amber-300 font-semibold shadow-sm"
                                  : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white"
                              }`}
                            >
                              <span className="truncate">{subj}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom subject field if "Other" selected */}
                      {teachingSubject === "Other" && (
                        <div className="pt-2 animate-in fade-in duration-200">
                          <Input
                            type="text"
                            required
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="Enter your specific teaching discipline / subject..."
                            className="h-11 rounded-xl bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 text-xs focus-visible:ring-amber-500/60"
                          />
                        </div>
                      )}
                    </div>

                    {/* College / School Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                        College / School Name <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          type="text"
                          required
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          placeholder="e.g. Oxford Engineering College / Narayana Junior College"
                          className="pl-10 h-11 rounded-xl bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 text-xs focus-visible:ring-amber-500/60"
                        />
                      </div>
                    </div>

                    {/* Current City / Town */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                        Current City / Town <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Hyderabad, Vijayawada, Visakhapatnam, Bengaluru..."
                          className="pl-10 h-11 rounded-xl bg-white/[0.06] border-white/15 text-white placeholder:text-white/30 text-xs focus-visible:ring-amber-500/60"
                        />
                      </div>
                    </div>

                    {/* Years of Experience */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                        Years of Experience <span className="text-amber-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {EXPERIENCE_LEVELS.map((exp) => {
                          const isSelected = experienceYears === exp.id;
                          return (
                            <button
                              key={exp.id}
                              type="button"
                              onClick={() => setExperienceYears(exp.id)}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                isSelected
                                  ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500/50"
                                  : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white"
                              }`}
                            >
                              <div className="text-xs font-bold">{exp.title}</div>
                              <div className="text-[10px] text-white/40 mt-0.5 truncate">
                                {exp.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Future Updates Preference (Yes / No interactive buttons) */}
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5 mt-2">
                      <label className="text-xs font-semibold text-white/90 block">
                        Would you like to receive updates about future FDP Programs & Workshops?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setReceiveUpdates(true)}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                            receiveUpdates === true
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/20"
                              : "bg-white/[0.04] border-white/10 text-white/50 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Yes, keep me updated</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReceiveUpdates(false)}
                          className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                            receiveUpdates === false
                              ? "bg-zinc-800 border-zinc-500 text-zinc-200 shadow-md ring-2 ring-zinc-500/20"
                              : "bg-white/[0.04] border-white/10 text-white/50 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          <X className="w-4 h-4 text-zinc-400" />
                          <span>No, thanks</span>
                        </button>
                      </div>
                    </div>

                    {/* Submit Step 2 Button */}
                    <div className="pt-3">
                      <Button
                        type="submit"
                        disabled={submitting || !institutionName.trim() || !city.trim()}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm shadow-xl shadow-amber-500/25 transition-all gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            Finalizing Registration...
                          </>
                        ) : (
                          <>
                            <span>Complete FDP Registration</span>
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ================= STEP 3: CONFIRMATION ================= */}
              {step === 3 && registeredData && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center space-y-6"
                >
                  {/* Celebration Icon */}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 shadow-2xl shadow-emerald-500/30">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-white font-heading">
                      Registration Confirmed!
                    </h2>
                    <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-md mx-auto">
                      Thank you, <strong className="text-white">{registeredData.full_name}</strong>! Your seat for the Faculty Development Program has been reserved.
                    </p>
                  </div>

                  {/* Pass / Receipt Card */}
                  <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 text-left relative overflow-hidden backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-white/40 block">
                          Registration Reference ID
                        </span>
                        <span className="text-base sm:text-lg font-bold font-mono text-amber-400">
                          {registeredData.registration_id}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void copyTextWithFallback(registeredData.registration_id);
                          toast({ title: "Registration ID copied to clipboard!" });
                        }}
                        className="h-8 text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        Copy ID
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-white/40 block">
                          Teaching Subject
                        </span>
                        <span className="text-xs font-semibold text-white block mt-0.5">
                          {registeredData.teaching_subject}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-white/40 block">
                          Institution
                        </span>
                        <span className="text-xs font-semibold text-white block mt-0.5 truncate">
                          {registeredData.institution_name}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-white/40 block">
                          City / Town
                        </span>
                        <span className="text-xs font-semibold text-white block mt-0.5">
                          {registeredData.city}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-white/40 block">
                          Experience
                        </span>
                        <span className="text-xs font-semibold text-white block mt-0.5">
                          {registeredData.experience_years}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
                      <span>Verified Mobile: <strong>+91 {registeredData.phone}</strong></span>
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {registeredData.receive_updates ? "Opted-in for future updates" : "Registered"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const shareText = `I have registered for the NIAT Faculty Development Program (FDP)! Registration ID: ${registeredData.registration_id}. Visit: https://www.niatawards.in/fdp-registration`;
                        if (navigator.share) {
                          navigator.share({ title: "NIAT FDP Registration", text: shareText });
                        } else {
                          void copyTextWithFallback(shareText);
                          toast({ title: "Invite link copied to clipboard!" });
                        }
                      }}
                      className="w-full sm:w-auto h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      Share with Colleagues
                    </Button>

                    <Link to="/" className="w-full sm:w-auto">
                      <Button
                        type="button"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-2"
                      >
                        <Home className="w-3.5 h-3.5" />
                        Return to Homepage
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/40">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© 2026 NIAT (NxtWave of Innovation in Advanced Technologies). All rights reserved.</p>
          <p className="text-[11px] text-white/30">
            For faculty inquiries or institutional bulk registrations, contact{" "}
            <a href="mailto:fdp@niat.edu" className="text-amber-400/80 hover:underline">
              support@niatawards.in
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
