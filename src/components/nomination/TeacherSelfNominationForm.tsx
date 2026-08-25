import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { createNomination } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const classesTeaching = [
  "Primary (Class 1–5)",
  "Middle School (Class 6–8)",
  "High School (Class 9–10)",
  "Senior Secondary (Class 11–12)",
  "Undergraduate / College",
  "Postgraduate / College",
  "All Classes",
];

const TeacherSelfNominationForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.name || "",
    school: "",
    subject: "",
    experience: "",
    classesTeaching: "",
    impactStory: "",
    phone: user?.phone || "",
  });

  const set = (key: string, val: string) => setForm((p) => {
    const next = { ...p, [key]: val };
    try { localStorage.setItem("niat_teacher_draft", JSON.stringify(next)); } catch {}
    return next;
  });

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem("niat_teacher_draft");
      if (draft) {
        const d = JSON.parse(draft);
        setForm(f => ({ ...f, ...d, phone: user?.phone || d.phone, fullName: user?.name || d.fullName }));
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classesTeaching) {
      toast({ title: "Please select which class you are teaching", variant: "destructive" });
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Please enter a valid 10-digit phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await createNomination({
        type: "teacher",
        full_name: form.fullName.trim(),
        school_name: form.school.trim(),
        subject: form.subject.trim(),
        experience: form.experience,
        student_class: form.classesTeaching,
        impact_story: form.impactStory.trim(),
        phone: form.phone.trim(),
      });
      localStorage.removeItem("niat_teacher_draft");
      navigate("/thank-you");
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-2">Teacher Self-Nomination</h1>
      <p className="text-foreground/60 mb-8">Share your story and showcase your impact</p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Full Name */}
        <div>
          <Label>Full Name</Label>
          <Input className="mt-1.5 h-12 text-base" value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)} required />
        </div>

        {/* School Name or College Name */}
        <div>
          <Label>School Name or College Name</Label>
          <Input className="mt-1.5 h-12 text-base" value={form.school}
            onChange={(e) => set("school", e.target.value)}
            placeholder="e.g. Delhi Public School / Osmania University"
            required />
        </div>

        {/* Phone */}
        <div>
          <Label>Phone Number</Label>
          <Input className="mt-1.5 h-12 text-base" type="tel" inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit number" required />
        </div>

        {/* Subject + Experience */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Subject</Label>
            <Input className="mt-1.5" value={form.subject}
              onChange={(e) => set("subject", e.target.value)} required />
          </div>
          <div>
            <Label>Years of Experience</Label>
            <Input className="mt-1.5" type="number" min="0" max="50"
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)} required />
          </div>
        </div>

        {/* Which class are you teaching */}
        <div>
          <Label>Which Class Are You Teaching?</Label>
          <Select value={form.classesTeaching} onValueChange={(v) => set("classesTeaching", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select class level" />
            </SelectTrigger>
            <SelectContent>
              {classesTeaching.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Impact Story */}
        <div>
          <Label>Your Impact Story <span className="text-foreground/40 font-normal">(write 2–3 sentences)</span></Label>
          <Textarea className="mt-1.5" value={form.impactStory}
            onChange={(e) => set("impactStory", e.target.value)}
            rows={4}
            placeholder="Describe how you've made a difference in your students' lives in 2–3 sentences..."
            required />
          <p className="text-xs text-foreground/40 mt-1">
            {form.impactStory.trim().split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        <Button id="btn-teacher-form-submit" type="submit" variant="hero" size="lg"
          className="w-full h-14 rounded-xl text-base font-bold" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Application"}
        </Button>

      </form>
    </motion.div>
  );
};

export default TeacherSelfNominationForm;
