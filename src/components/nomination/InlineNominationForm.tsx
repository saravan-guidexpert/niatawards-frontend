import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, CheckCircle2, Loader2, ArrowRight, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createNominationDraft, getNominationDraft, updateNominationDraft, type NominationDraft } from "@/lib/api";
import { clearDraftSession, getDraftSession, saveDraftSession } from "@/lib/nominationDraft";
import { trackFunnel } from "@/lib/funnel";
import TeacherPhotoUpload from "@/components/nomination/TeacherPhotoUpload";

declare function gtag(...args: any[]): void;
const track = (event: string, params?: Record<string, any>) => { try { gtag("event", event, params); } catch {} };

// ── Shared dropdown — defined outside any form component so it never re-mounts ──
export const CustomSelect = ({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const iStyle = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full h-10 rounded-lg px-3 flex items-center justify-between text-[13px] font-medium focus:outline-none transition-all"
        style={{ ...iStyle, color: value ? "#fff" : "rgba(255,255,255,0.4)" }}>
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ml-2 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg z-[100] shadow-2xl"
          style={{ background: "#1a0505", border: "1px solid rgba(255,255,255,0.15)" }}>
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[12px] transition-colors border-b border-white/5 last:border-0"
              style={{ color: value === o ? "#d97706" : "#fff", background: value === o ? "rgba(217,119,6,0.1)" : "transparent" }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FormTextarea = ({
  label, value, onChange, placeholder, required, rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) => (
  <div>
    {label && (
      <label className="block text-[11px] font-semibold text-white/60 mb-1 uppercase tracking-wider">
        {label}
      </label>
    )}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      required={false}
      className="w-full rounded-lg px-3 py-2 text-[13px] font-medium text-white placeholder:text-white/35 focus:outline-none transition-all resize-none"
      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
    />
  </div>
);

interface Props {
  userName?: string;
  userPhone?: string;
  onClose?: () => void;
  embedded?: boolean; // true = no dark card wrapper (used on /nominate page)
  lockedRole: "student" | "teacher";
  draftToken?: string;
}

const InlineNominationForm = ({ userName = "", userPhone = "", onClose, embedded = false, lockedRole, draftToken }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const name  = user?.name  || userName;
  const phone = user?.phone || userPhone;
  const role  = lockedRole;

  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [loading, setLoading]   = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [token, setToken] = useState(draftToken || getDraftSession()?.token || "");

  const iStyle = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" };
  const iCls   = "w-full h-10 rounded-lg px-3 text-[13px] font-medium text-white placeholder:text-white/35 focus:outline-none transition-all";

  const [sf, setSf] = useState({
    studentName: name, currentEducation: "", schoolName: "",
    teacherName: "", teacherPhone: "", teachingSubject: "",
    specialThing: "", impactStory: "", awardsRecognition: "", teacherSocial: "",
  });
  const [tf, setTf] = useState({
    fullName: name, school: "", subject: "", experience: "",
    classesTeaching: "", impactStory: "", phone,
  });

  const setSF = (k: string, v: string) => setSf(p => ({ ...p, [k]: v }));
  const setTF = (k: string, v: string) => setTf(p => ({ ...p, [k]: v }));

  const hydratedRef = useRef(false);
  const skipDebounceRef = useRef(true);
  const submittingRef = useRef(false);

  const asText = (value: unknown) => (typeof value === "string" ? value : "");

  const applyDraft = (draft: NominationDraft) => {
    const teacherName = asText(draft.teacher_name);
    const nominatorPhone = asText(draft.nominator_phone) || phone.replace(/\D/g, "").slice(-10);
    const savedPhone = asText(draft.phone);
    setSf((prev) => ({
      ...prev,
      studentName: asText(draft.student_name) || prev.studentName || name,
      currentEducation: asText(draft.student_class) || prev.currentEducation,
      schoolName: asText(draft.school_name) || prev.schoolName,
      teacherName: teacherName || prev.teacherName,
      teacherPhone: teacherName ? savedPhone : prev.teacherPhone,
      teachingSubject: asText(draft.subject) || prev.teachingSubject,
      specialThing: asText(draft.special_thing) || prev.specialThing,
      impactStory: asText(draft.impact_story) || prev.impactStory,
      awardsRecognition: asText(draft.board) || prev.awardsRecognition,
      teacherSocial: asText(draft.teacher_social) || prev.teacherSocial,
    }));
    setTf((prev) => ({
      ...prev,
      fullName: asText(draft.full_name) || prev.fullName || name,
      school: asText(draft.school_name) || prev.school,
      subject: asText(draft.subject) || prev.subject,
      experience: asText(draft.experience) || prev.experience,
      classesTeaching: asText(draft.student_class) || prev.classesTeaching,
      impactStory: asText(draft.impact_story) || prev.impactStory,
      phone: savedPhone || nominatorPhone || prev.phone,
    }));
    const photo = asText(draft.photo_url);
    if (photo) setPhotoUrl(photo);
    if (draft.form_step === "details") setFormStep(2);
  };

  const rememberSession = (draft: NominationDraft, fallbackPhone: string) => {
    if (typeof draft.draft_token !== "string") return;
    setToken(draft.draft_token);
    saveDraftSession({
      id: String(draft.id),
      token: draft.draft_token,
      type: role,
      phone: fallbackPhone.replace(/\D/g, "").slice(-10),
    });
  };

  const step2Payload = () =>
    role === "student"
      ? {
          special_thing: sf.specialThing.trim() || null,
          impact_story: sf.impactStory.trim() || null,
          board: sf.awardsRecognition.trim() || null,
          teacher_social: sf.teacherSocial.trim() || null,
          photo_url: photoUrl || null,
        }
      : {
          impact_story: tf.impactStory.trim() || null,
          photo_url: photoUrl || null,
        };

  useEffect(() => {
    if (draftToken) setToken(draftToken);
  }, [draftToken]);

  useEffect(() => {
    if (!token || hydratedRef.current) return;
    let cancelled = false;
    getNominationDraft(token)
      .then((draft) => {
        if (cancelled) return;
        applyDraft(draft);
        hydratedRef.current = true;
        skipDebounceRef.current = true;
      })
      .catch(() => {
        if (!cancelled) hydratedRef.current = true;
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (token || !name.trim() || phone.replace(/\D/g, "").length < 10) return;
    let cancelled = false;
    createNominationDraft({
      type: role,
      nominator_name: name.trim(),
      nominator_phone: phone,
      resume: true,
    })
      .then((draft) => {
        if (cancelled || typeof draft.draft_token !== "string") return;
        rememberSession(draft, phone);
        applyDraft(draft);
        hydratedRef.current = true;
        skipDebounceRef.current = true;
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [token, name, phone, role]);

  useEffect(() => {
    if (formStep !== 2 || !token || !hydratedRef.current || submittingRef.current) return;
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (submittingRef.current) return;
      updateNominationDraft({ draft_token: token, ...step2Payload() }).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    formStep,
    token,
    sf.specialThing,
    sf.impactStory,
    sf.awardsRecognition,
    sf.teacherSocial,
    tf.impactStory,
  ]);

  const educationOptions = [
    "School – Class 1 to 5", "School – Class 6 to 8",
    "School – Class 9 to 10", "School – Class 11 to 12",
    "Diploma / ITI", "Undergraduate (B.Tech / B.Com / BA / B.Sc etc.)",
    "Postgraduate", "Other",
  ];
  const classesTeaching = [
    "Primary (Class 1–5)", "Middle School (Class 6–8)",
    "High School (Class 9–10)", "Senior Secondary (Class 11–12)",
    "Undergraduate / College", "Postgraduate / College", "All Classes",
  ];

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "student") {
      if (!sf.currentEducation) { toast({ title: "Please select your current education", variant: "destructive" }); return; }
      if (!sf.schoolName.trim()) { toast({ title: "Please enter school / college name", variant: "destructive" }); return; }
      if (!sf.teacherName.trim()) { toast({ title: "Please enter the teacher's name", variant: "destructive" }); return; }
      if (sf.teacherPhone.replace(/\D/g, "").length < 10) { toast({ title: "Please enter a valid teacher phone number", variant: "destructive" }); return; }
      if (!sf.teachingSubject.trim()) { toast({ title: "Please enter the teaching subject", variant: "destructive" }); return; }
    } else {
      if (!tf.school.trim()) { toast({ title: "Please enter school / college name", variant: "destructive" }); return; }
      if (tf.phone.replace(/\D/g, "").length < 10) { toast({ title: "Please enter a valid phone number", variant: "destructive" }); return; }
      if (!tf.subject.trim()) { toast({ title: "Please enter your subject", variant: "destructive" }); return; }
      if (!tf.experience) { toast({ title: "Please enter years of experience", variant: "destructive" }); return; }
      if (!tf.classesTeaching) { toast({ title: "Please select which class you teach", variant: "destructive" }); return; }
    }
    if (!token) { toast({ title: "Please verify OTP first", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const payload = role === "student"
        ? {
            draft_token: token,
            form_step: "details",
            student_name: sf.studentName.trim(),
            student_class: sf.currentEducation,
            school_name: sf.schoolName.trim(),
            teacher_name: sf.teacherName.trim(),
            phone: sf.teacherPhone.trim(),
            subject: sf.teachingSubject.trim(),
          }
        : {
            draft_token: token,
            form_step: "details",
            full_name: tf.fullName.trim(),
            school_name: tf.school.trim(),
            phone: tf.phone.trim(),
            subject: tf.subject.trim(),
            experience: tf.experience,
            student_class: tf.classesTeaching,
          };
      await updateNominationDraft(payload);
      track("form_step2_opened", { role });
      if (phone) trackFunnel("form_step1", phone, role);
      skipDebounceRef.current = true;
      setFormStep(2);
    } catch (err: any) {
      toast({
        title: "Could not save details",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    submittingRef.current = true;
    try {
      if (!token) throw new Error("Please verify OTP first");
      if (photoBusy) throw new Error("Please wait for the photo to finish uploading");
      if (role === "student") {
        if (!sf.specialThing.trim()) throw new Error("Please fill in what's special about this teacher");
        if (!sf.impactStory.trim()) throw new Error("Please describe their impact");
        await updateNominationDraft({
          draft_token: token,
          complete: true,
          student_name: sf.studentName.trim(),
          student_class: sf.currentEducation,
          school_name: sf.schoolName.trim(),
          phone: sf.teacherPhone.trim(),
          teacher_name: sf.teacherName.trim(),
          award_category: "General Nomination",
          special_thing: sf.specialThing.trim(),
          subject: sf.teachingSubject.trim() || null,
          impact_story: sf.impactStory.trim() || null,
          board: sf.awardsRecognition.trim() || null,
          teacher_social: sf.teacherSocial.trim() || null,
          photo_url: photoUrl || null,
        });
      } else {
        if (!tf.impactStory.trim()) throw new Error("Please share your impact story");
        await updateNominationDraft({
          draft_token: token,
          complete: true,
          full_name: tf.fullName.trim(),
          school_name: tf.school.trim(),
          subject: tf.subject.trim(),
          experience: tf.experience,
          student_class: tf.classesTeaching,
          impact_story: tf.impactStory.trim(),
          phone: tf.phone.trim(),
          award_category: "General Nomination",
          photo_url: photoUrl || null,
        });
      }
      clearDraftSession();
      track("nomination_submitted", { role });
      navigate(`/thank-you?type=${role}`);
    } catch (err: any) {
      submittingRef.current = false;
      console.error("Nomination submit failed:", err);
      toast({
        title: "Submission failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (url: string) => {
    setPhotoUrl(url);
    if (!token || submittingRef.current) return;
    updateNominationDraft({ draft_token: token, photo_url: url || null }).catch(() => undefined);
  };

  const handleBackToDetails = () => {
    if (token && !submittingRef.current) {
      updateNominationDraft({ draft_token: token, ...step2Payload() }).catch(() => undefined);
    }
    setFormStep(1);
  };

  const formContent = (
    <div className={embedded ? "" : "p-4"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#8B1A1A,#6B1212)" }}>
            {name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
          <div>
            <p className="text-white font-bold text-[13px]">Hey {name.split(" ")[0] || "there"}! 👋</p>
            {phone ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-white/55 text-[10px] tabular-nums">+91 {phone}</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-green-400">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Verified
                </span>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[10px] font-semibold text-secondary hover:text-secondary/80"
                  >
                    Edit
                  </button>
                )}
              </div>
            ) : (
              <p className="text-white/45 text-[10px]">Step {formStep} of 2 — {formStep === 1 ? "Basic Details" : "Tell Us More"}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2].map(s => (
              <div key={s} className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: formStep === s ? "20px" : "8px", background: formStep >= s ? "#d97706" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all ml-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1 ── */}
        {formStep === 1 && (
          <motion.form key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            onSubmit={handleStep1Next} noValidate className="space-y-2">

            {/* Role — locked to this page */}
            <div>
              <label className="block text-[11px] font-semibold text-white/60 mb-1 uppercase tracking-wider">I am a</label>
              <div
                className="w-full h-10 rounded-lg px-3 flex items-center text-[13px] font-medium select-none"
                style={{ ...iStyle, opacity: 0.85, cursor: "default" }}
                aria-disabled="true"
              >
                <span>{role === "student" ? "🎓 Student / Parent" : "👩‍🏫 Teacher (Self-Nomination)"}</span>
              </div>
            </div>

            {/* Student Step 1 */}
            {role === "student" && (
              <div className="space-y-2">
                <input style={iStyle} className={iCls} placeholder="Your Full Name" required value={sf.studentName} onChange={e => setSF("studentName", e.target.value)} />
                <CustomSelect value={sf.currentEducation} onChange={v => setSF("currentEducation", v)} options={educationOptions} placeholder="Current Education Level" />
                <input style={iStyle} className={iCls} placeholder="School / College Name" required value={sf.schoolName} onChange={e => setSF("schoolName", e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input style={iStyle} className={iCls} placeholder="Teacher's Name" required value={sf.teacherName} onChange={e => setSF("teacherName", e.target.value)} />
                  <input style={iStyle} className={iCls} placeholder="Teacher's Phone" type="tel" inputMode="numeric" required value={sf.teacherPhone} onChange={e => setSF("teacherPhone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                </div>
                <input style={iStyle} className={iCls} placeholder="Teaching Subject" required value={sf.teachingSubject} onChange={e => setSF("teachingSubject", e.target.value)} />
              </div>
            )}

            {/* Teacher Step 1 */}
            {role === "teacher" && (
              <div className="space-y-2">
                <input style={iStyle} className={iCls} placeholder="Your Full Name" required value={tf.fullName} onChange={e => setTF("fullName", e.target.value)} />
                <input style={iStyle} className={iCls} placeholder="School / College Name" required value={tf.school} onChange={e => setTF("school", e.target.value)} />
                <input style={iStyle} className={iCls} placeholder="+91 Phone Number" type="tel" inputMode="numeric" required value={tf.phone} onChange={e => setTF("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                <div className="grid grid-cols-2 gap-2">
                  <input style={iStyle} className={iCls} placeholder="Subject" required value={tf.subject} onChange={e => setTF("subject", e.target.value)} />
                  <input style={iStyle} className={iCls} placeholder="Years of Exp." type="number" min="0" max="50" required value={tf.experience} onChange={e => setTF("experience", e.target.value)} />
                </div>
                <CustomSelect value={tf.classesTeaching} onChange={v => setTF("classesTeaching", v)} options={classesTeaching} placeholder="Which Class Are You Teaching?" />
              </div>
            )}

            {role && (
              <button type="submit" disabled={loading} className="w-full h-10 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#9B2020,#7A1515)", color: "#fff", boxShadow: "0 4px 16px rgba(107,18,18,0.5)" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next — Tell Us More <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            )}
          </motion.form>
        )}

        {/* ── STEP 2 ── */}
        {formStep === 2 && (
          <motion.form key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            onSubmit={handleSubmit} noValidate className="space-y-2">

            {role === "student" && (
              <div className="space-y-2">
                <FormTextarea label="What's special about this teacher?" value={sf.specialThing} onChange={(v) => setSF("specialThing", v)} placeholder="One special thing about them..." required rows={2} />
                <FormTextarea label="How have they impacted you?" value={sf.impactStory} onChange={(v) => setSF("impactStory", v)} placeholder="Write 2–3 sentences about their impact..." required rows={3} />
                <input style={iStyle} className={iCls} placeholder="Awards / Recognition (Optional)" value={sf.awardsRecognition} onChange={e => setSF("awardsRecognition", e.target.value)} />
                <input style={iStyle} className={iCls} placeholder="Teacher's LinkedIn / Social Media (Optional)" value={sf.teacherSocial} onChange={e => setSF("teacherSocial", e.target.value)} />
                <TeacherPhotoUpload value={photoUrl} onChange={handlePhotoChange} variant="dark" onBusyChange={setPhotoBusy} />
              </div>
            )}

            {role === "teacher" && (
              <div className="space-y-2">
                <FormTextarea label="Your Impact Story (2–3 sentences)" value={tf.impactStory} onChange={(v) => setTF("impactStory", v)} placeholder="How have you made a difference in students' lives..." required rows={4} />
                <TeacherPhotoUpload value={photoUrl} onChange={handlePhotoChange} variant="dark" onBusyChange={setPhotoBusy} />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleBackToDetails}
                className="h-10 px-4 rounded-lg font-semibold text-[13px] flex items-center gap-1 text-white/60 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <ChevronDown className="w-3.5 h-3.5 rotate-90" /> Back
              </button>
              <button type="submit" disabled={loading || photoBusy}
                className="flex-1 h-10 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#9B2020,#7A1515)", color: "#fff", boxShadow: "0 4px 16px rgba(107,18,18,0.5)" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> Submit Nomination</>}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );

  if (embedded) return <div className="text-white">{formContent}</div>;

  return (
    <div className="w-full rounded-2xl"
      style={{ background: "rgba(10,3,3,0.95)", border: "1.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(28px)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #d97706, transparent)" }} />
      {formContent}
    </div>
  );
};

export default InlineNominationForm;
