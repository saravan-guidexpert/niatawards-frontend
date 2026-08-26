import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { createNomination } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import TeacherPhotoUpload from "@/components/nomination/TeacherPhotoUpload";

const awardCategories = [
  "Student Transformation Award",
  "Teaching Innovation Award",
  "Beyond Classroom Impact Award",
  "Future Readiness Award",
];

const categoryGuide = [
  { title: "Student Transformation Award",  icon: "⭐", desc: "Teacher who changed a student's life through deep mentorship, care, and personal attention.", bg: "bg-primary/5",   border: "border-primary/20",   color: "text-primary"   },
  { title: "Teaching Innovation Award",     icon: "💡", desc: "Teacher who uses creative, tech-driven, or fresh methods that make learning exciting.",      bg: "bg-secondary/5", border: "border-secondary/20", color: "text-secondary" },
  { title: "Beyond Classroom Impact Award", icon: "🌍", desc: "Teacher who goes beyond the syllabus — community work, life skills, emotional support.",     bg: "bg-primary/5",   border: "border-primary/20",   color: "text-primary"   },
  { title: "Future Readiness Award",        icon: "🚀", desc: "Teacher who prepares students for tomorrow's careers with practical, future-focused education.", bg: "bg-secondary/5", border: "border-secondary/20", color: "text-secondary" },
];

const educationOptions = [
  "School – Class 1 to 5",
  "School – Class 6 to 8",
  "School – Class 9 to 10",
  "School – Class 11 to 12",
  "Diploma / ITI",
  "Undergraduate (B.Tech / B.Com / BA / B.Sc etc.)",
  "Postgraduate (M.Tech / MBA / MA / M.Sc etc.)",
  "Other",
];

const StudentNominationForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentName:     user?.name || "",
    currentEducation: "",
    schoolName:      "",
    teacherName:     "",
    teacherPhone:    "",
    teachingSubject: "",
    awardCategory:   "",
    specialThing:    "",
    impactStory:     "",
    awardsRecognition: "",
    teacherSocial:   "",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setForm(p => ({ ...p, awardCategory: decodeURIComponent(cat) }));
  }, []);

  const set = (key: string, val: string) => setForm((p) => {
    const next = { ...p, [key]: val };
    try { localStorage.setItem("niat_nomination_draft", JSON.stringify(next)); } catch {}
    return next;
  });

  // Restore draft
  useEffect(() => {
    try {
      const draft = localStorage.getItem("niat_nomination_draft");
      if (draft) {
        const d = JSON.parse(draft);
        setForm(f => ({ ...f, ...d, studentName: user?.name || f.studentName }));
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentEducation) {
      toast({ title: "Please select your current education", variant: "destructive" });
      return;
    }
    if (!form.awardCategory) {
      toast({ title: "Please select an award category", variant: "destructive" });
      return;
    }
    if (form.teacherPhone.replace(/\D/g, "").length < 10) {
      toast({ title: "Please enter a valid 10-digit teacher phone number", variant: "destructive" });
      return;
    }
    // Honeypot
    const honeypot = (document.getElementById("_hp_field") as HTMLInputElement)?.value;
    if (honeypot) { navigate("/thank-you"); return; }

    setLoading(true);
    try {
      if (photoBusy) {
        toast({ title: "Please wait for the photo to finish uploading", variant: "destructive" });
        setLoading(false);
        return;
      }
      await createNomination({
        type:              "student",
        student_name:      form.studentName.trim(),
        student_class:     form.currentEducation,
        school_name:       form.schoolName.trim(),
        phone:             form.teacherPhone.trim(),
        teacher_name:      form.teacherName.trim(),
        award_category:    form.awardCategory,
        special_thing:     form.specialThing.trim(),
        subject:           form.teachingSubject.trim() || null,
        impact_story:      form.impactStory.trim() || null,
        board:             form.awardsRecognition.trim() || null,
        photo_url:         photoUrl || null,
      });
      localStorage.removeItem("niat_nomination_draft");
      navigate("/thank-you");
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = categoryGuide.find(c => c.title === form.awardCategory);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Nominate Your Teacher</h1>
      <p className="text-foreground/60 mb-6 sm:mb-8 text-sm sm:text-base">Tell us about the teacher who inspires you</p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

        {/* Honeypot */}
        <input id="_hp_field" name="_honeypot" type="text" defaultValue=""
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }} />

        {/* Your Name */}
        <div>
          <Label>Your Name</Label>
          <Input className="mt-1.5 h-12 text-base" value={form.studentName}
            onChange={(e) => set("studentName", e.target.value)} required />
        </div>

        {/* Current Education */}
        <div>
          <Label>Current Education</Label>
          <Select value={form.currentEducation} onValueChange={(v) => set("currentEducation", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select your current education" /></SelectTrigger>
            <SelectContent>
              {educationOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* School / College Name */}
        <div>
          <Label>School Name / College Name</Label>
          <Input className="mt-1.5 h-12 text-base" value={form.schoolName}
            onChange={(e) => set("schoolName", e.target.value)}
            placeholder="e.g. Delhi Public School / Osmania University"
            required />
        </div>

        {/* Teacher Name */}
        <div>
          <Label>Teacher's Name</Label>
          <Input className="mt-1.5 h-12 text-base" value={form.teacherName}
            onChange={(e) => set("teacherName", e.target.value)} required />
        </div>

        {/* Teacher Phone */}
        <div>
          <Label>Teacher Phone Number</Label>
          <Input className="mt-1.5 h-12 text-base" type="tel" inputMode="numeric"
            value={form.teacherPhone}
            onChange={(e) => set("teacherPhone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number" required />
        </div>

        {/* Teaching Subject */}
        <div>
          <Label>Teaching Subject</Label>
          <Input className="mt-1.5 h-12 text-base" value={form.teachingSubject}
            onChange={(e) => set("teachingSubject", e.target.value)}
            placeholder="e.g. Mathematics, Physics, English..." required />
        </div>

        {/* Award Category */}
        <div>
          <Label>Award Category</Label>
          <Select value={form.awardCategory} onValueChange={(v) => set("awardCategory", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{awardCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>

          <AnimatePresence mode="wait">
            {!form.awardCategory && (
              <motion.div key="guide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="mt-3">
                <p className="text-xs text-foreground/60 mb-2 font-medium flex items-center gap-1.5">
                  <span>💬</span> Not sure which to pick? Tap a category below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryGuide.map((cat, i) => (
                    <motion.button key={cat.title} type="button"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                      onClick={() => set("awardCategory", cat.title)}
                      className={`text-left p-3 rounded-xl border cursor-pointer transition-shadow hover:shadow-md ${cat.bg} ${cat.border}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{cat.icon}</span>
                        <span className={`text-xs font-semibold leading-tight ${cat.color}`}>
                          {cat.title.replace(" Award", "")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/60 leading-snug">{cat.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
            {form.awardCategory && selectedCat && (
              <motion.div key="selected" initial={{ opacity: 0, scale: 0.96, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className={`mt-3 p-3 rounded-xl border flex items-start gap-3 ${selectedCat.bg} ${selectedCat.border}`}>
                <span className="text-2xl">{selectedCat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${selectedCat.color} flex items-center gap-1`}>
                    <span>✓</span> {selectedCat.title}
                  </p>
                  <p className="text-xs text-foreground/60 mt-0.5 leading-snug">{selectedCat.desc}</p>
                  <button type="button" onClick={() => set("awardCategory", "")}
                    className="text-[10px] text-foreground/60 underline mt-1 hover:text-foreground transition-colors">
                    Change category
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* What's special */}
        <div>
          <Label>What's one special thing about this teacher?</Label>
          <Textarea className="mt-1.5" value={form.specialThing}
            onChange={(e) => set("specialThing", e.target.value)} rows={3} required />
        </div>

        {/* Impact Story */}
        <div>
          <Label>How has this teacher impacted you?</Label>
          <Textarea className="mt-1.5" value={form.impactStory}
            onChange={(e) => set("impactStory", e.target.value)}
            rows={4} placeholder="Share in 2–3 sentences how this teacher made a difference in your life..." required />
        </div>

        {/* Awards / Recognition — Optional */}
        <div>
          <Label>
            Did this teacher receive any awards or recognition before?{" "}
            <span className="text-foreground/40 font-normal">(Optional)</span>
          </Label>
          <Textarea className="mt-1.5" value={form.awardsRecognition}
            onChange={(e) => set("awardsRecognition", e.target.value)}
            rows={2}
            placeholder="e.g. Best Teacher Award 2023, State Level Recognition..." />
        </div>

        {/* LinkedIn / Social — Optional */}
        <div>
          <Label>
            Teacher's LinkedIn or Social Media Profile{" "}
            <span className="text-foreground/40 font-normal">(Optional)</span>
          </Label>
          <Input className="mt-1.5 h-12 text-base" value={form.teacherSocial}
            onChange={(e) => set("teacherSocial", e.target.value)}
            placeholder="https://linkedin.com/in/teacher-name or Instagram/Twitter link" />
        </div>

        <TeacherPhotoUpload value={photoUrl} onChange={setPhotoUrl} variant="light" onBusyChange={setPhotoBusy} />

        <Button id="btn-student-form-submit" type="submit" variant="hero" size="lg"
          className="w-full h-14 rounded-xl text-base font-bold" disabled={loading || photoBusy}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Nomination"}
        </Button>

      </form>
    </motion.div>
  );
};

export default StudentNominationForm;
