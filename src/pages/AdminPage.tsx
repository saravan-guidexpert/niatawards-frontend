import React, { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Award, Users, TrendingUp, Download, Search,
  CheckCircle2, XCircle, Eye, BarChart3, ArrowLeft, Star,
  Loader2, RefreshCw, LogOut, Pencil, X, Save, ThumbsUp, Trophy, Medal,
  Calendar as CalendarIcon, Copy, ImageOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { isAdminLoggedIn, adminLogout } from "./AdminLoginPage";
import { adminGetNominations, adminGetVotes, adminUpdateNomination } from "@/lib/api";

const awardCategories = [
  "Student Transformation Award",
  "Teaching Innovation Award",
  "Beyond Classroom Impact Award",
  "Future Readiness Award",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const istDayKey = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const displayName = (n: any) => n.teacher_name || n.full_name || "—";
const classOrExp = (n: any) => n.student_class || (n.experience ? `${n.experience} yrs` : "");
const formatDateIn = (value: string) => new Date(value).toLocaleDateString("en-IN");

const COPY_HEADERS = [
  "Type", "Teacher/Applicant", "Student", "School", "Category", "Class",
  "Phone", "Status", "Date", "Photo URL", "Special thing", "Impact story",
];

const nominationRow = (n: any) => [
  n.type || "",
  displayName(n),
  n.student_name || "",
  n.school_name || "",
  n.award_category || "",
  classOrExp(n),
  n.phone || "",
  n.status || "",
  n.created_at ? formatDateIn(n.created_at) : "",
  n.photo_url || "",
  n.special_thing || "",
  n.impact_story || "",
];

const flattenCell = (value: unknown) => String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    shortlisted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    winner: "bg-green-500/10 text-green-400 border-green-500/20",
    pending: "bg-secondary/10 text-secondary border-secondary/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const NominationDetailCard = ({ n, onPhotoClick }: { n: any; onPhotoClick?: (n: any) => void }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
    <div className="flex items-start gap-4">
      {n.photo_url ? (
        <button type="button" onClick={() => onPhotoClick?.(n)} className="flex-shrink-0">
          <img src={n.photo_url} alt={displayName(n)} className="w-28 h-28 rounded-xl object-cover border border-white/10" />
        </button>
      ) : (
        <div className="w-28 h-28 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/25">
          <ImageOff className="w-8 h-8" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${n.type === "student" ? "bg-primary/20 text-primary-foreground" : "bg-secondary/20 text-secondary"}`}>{n.type}</span>
          <StatusBadge status={n.status} />
        </div>
        <h3 className="font-heading font-bold text-white text-base">{displayName(n)}</h3>
        <p className="text-xs text-white/50">{n.school_name || "—"}</p>
        <p className="text-xs text-white/35">{n.created_at ? new Date(n.created_at).toLocaleString("en-IN") : "—"}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <p className="text-white/40">Student: <span className="text-white/80">{n.student_name || "—"}</span></p>
      <p className="text-white/40">Phone: <span className="text-white/80">{n.phone || "—"}</span></p>
      <p className="text-white/40">Category: <span className="text-white/80">{n.award_category || "—"}</span></p>
      <p className="text-white/40">Class: <span className="text-white/80">{classOrExp(n) || "—"}</span></p>
      {n.subject && <p className="text-white/40 col-span-2">Subject: <span className="text-white/80">{n.subject}</span></p>}
    </div>
    {n.special_thing && (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Special thing</p>
        <p className="text-sm text-white/75 leading-relaxed">{n.special_thing}</p>
      </div>
    )}
    {n.impact_story && (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Impact story</p>
        <p className="text-sm text-white/75 leading-relaxed">{n.impact_story}</p>
      </div>
    )}
  </div>
);

const ViewNominationsModal = ({
  nominations, title, onClose, onPhotoClick,
}: {
  nominations: any[];
  title: string;
  onClose: () => void;
  onPhotoClick?: (n: any) => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div>
          <h2 className="font-heading text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-white/40 mt-0.5">{nominations.length} nomination{nominations.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto p-5 space-y-4">
        {nominations.map((n) => (
          <NominationDetailCard key={n.id} n={n} onPhotoClick={onPhotoClick} />
        ))}
      </div>
    </motion.div>
  </div>
);

const PhotoLightbox = ({ photo, onClose }: { photo: { url: string; name: string }; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <img src={photo.url} alt={photo.name} className="w-full max-h-[80vh] object-contain rounded-xl" />
        <p className="text-center text-white/80 text-sm mt-3">{photo.name}</p>
      </motion.div>
    </div>
  );
};

// ── Edit Modal ──
const EditModal = ({ nomination, onClose, onSave }: { nomination: any; onClose: () => void; onSave: (updated: any) => void }) => {
  const [form, setForm] = useState({ ...nomination });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (key: string, val: string) => setForm((p: any) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUpdateNomination(nomination.id, {
          teacher_name: form.teacher_name,
          full_name: form.full_name,
          school_name: form.school_name,
          award_category: form.award_category,
          student_name: form.student_name,
          student_class: form.student_class,
          phone: form.phone,
          subject: form.subject,
          special_thing: form.special_thing,
          impact_story: form.impact_story,
          status: form.status,
          experience: form.experience,
        });
      toast({ title: "✅ Nomination updated successfully!" });
      onSave(form);
      onClose();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-[#141414] z-10">
          <div>
            <h2 className="font-heading text-lg font-bold text-white">Edit Nomination</h2>
            <p className="text-xs text-white/40 mt-0.5">Make changes and save</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">

          {/* Status — most important, at top */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/10">
            <Label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 block">Application Status</Label>
            <div className="grid grid-cols-4 gap-2">
              {["pending", "shortlisted", "winner", "rejected"].map(s => (
                <button key={s} type="button"
                  onClick={() => set("status", s)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    form.status === s
                      ? s === "pending" ? "bg-secondary/20 border-secondary text-secondary"
                        : s === "shortlisted" ? "bg-blue-500/20 border-blue-400 text-blue-400"
                        : s === "winner" ? "bg-green-500/20 border-green-400 text-green-400"
                        : "bg-red-500/20 border-red-400 text-red-400"
                      : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                  }`}>
                  {s === "pending" ? "⏳ Pending" : s === "shortlisted" ? "✅ Shortlisted" : s === "winner" ? "🏆 Winner" : "❌ Reject"}
                </button>
              ))}
            </div>
          </div>

          {/* Nomination type badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${nomination.type === "student" ? "bg-primary/20 text-primary-foreground" : "bg-secondary/20 text-secondary"}`}>
              {nomination.type === "student" ? "👨‍🎓 Student Nomination" : "👩‍🏫 Teacher Self-Nomination"}
            </span>
            <span className="text-xs text-white/30">{new Date(nomination.created_at).toLocaleString("en-IN")}</span>
          </div>

          {form.photo_url && (
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">Teacher photo</Label>
              <img
                src={form.photo_url}
                alt={form.teacher_name || form.full_name || "Teacher"}
                className="h-28 w-28 rounded-xl object-cover border border-white/10"
              />
            </div>
          )}

          {/* Teacher / Applicant Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nomination.type === "student" ? (
              <>
                <div>
                  <Label className="text-white/60 text-xs mb-1.5 block">Teacher's Name</Label>
                  <Input value={form.teacher_name || ""} onChange={e => set("teacher_name", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs mb-1.5 block">Student's Name</Label>
                  <Input value={form.student_name || ""} onChange={e => set("student_name", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <Label className="text-white/60 text-xs mb-1.5 block">Applicant Full Name</Label>
                <Input value={form.full_name || ""} onChange={e => set("full_name", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              </div>
            )}
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">School / College</Label>
              <Input value={form.school_name || ""} onChange={e => set("school_name", e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            </div>
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">Phone</Label>
              <Input value={form.phone || ""} onChange={e => set("phone", e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            </div>
            {nomination.type === "student" && (
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Student Class</Label>
                <Input value={form.student_class || ""} onChange={e => set("student_class", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              </div>
            )}
            {nomination.type === "teacher" && (
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Years of Experience</Label>
                <Input value={form.experience || ""} onChange={e => set("experience", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              </div>
            )}
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">Subject</Label>
              <Input value={form.subject || ""} onChange={e => set("subject", e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
            </div>
          </div>

          {/* Award Category */}
          <div>
            <Label className="text-white/60 text-xs mb-1.5 block">Award Category</Label>
            <Select value={form.award_category || ""} onValueChange={v => set("award_category", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {awardCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Story fields */}
          {(form.special_thing !== undefined && form.special_thing !== null) && (
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">Special Thing About Teacher</Label>
              <Textarea value={form.special_thing || ""} onChange={e => set("special_thing", e.target.value)} rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none" />
            </div>
          )}
          {form.impact_story !== undefined && form.impact_story !== null && (
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">Impact Story</Label>
              <Textarea value={form.impact_story || ""} onChange={e => set("impact_story", e.target.value)} rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-white/10 sticky bottom-0 bg-[#141414]">
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-br from-[#9B2020] to-[#7A1515] text-white text-sm font-semibold ring-1 ring-white/10 hover:from-[#A52222] transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};


// ── Votes Panel Component ──
const VotesPanel = ({ votes, nominations }: { votes: any[]; nominations: any[] }) => {
  const [search, setSearch] = useState("");

  // Build leaderboard: group votes by nomination
  const countMap: Record<string, { id: string; name: string; school: string; category: string; votes: number; voters: string[] }> = {};
  votes.forEach((v: any) => {
    const nom = v.nominations;
    const name = nom?.teacher_name || nom?.full_name || "Unknown";
    if (!countMap[v.nomination_id]) {
      countMap[v.nomination_id] = { id: v.nomination_id, name, school: nom?.school_name || "", category: nom?.award_category || "", votes: 0, voters: [] };
    }
    countMap[v.nomination_id].votes++;
    countMap[v.nomination_id].voters.push(v.voter_phone);
  });

  const leaderboard = Object.values(countMap).sort((a, b) => b.votes - a.votes);
  const maxVotes = leaderboard[0]?.votes || 1;
  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map((v: any) => v.voter_phone)).size;

  // Recent votes filtered
  const filteredVotes = votes.filter((v: any) => {
    const nom = v.nominations;
    const name = (nom?.teacher_name || nom?.full_name || "").toLowerCase();
    return name.includes(search.toLowerCase()) || (v.voter_phone || "").includes(search);
  });

  const catColor: Record<string, string> = {
    "Student Transformation Award":  "text-amber-400",
    "Teaching Innovation Award":     "text-blue-400",
    "Beyond Classroom Impact Award": "text-emerald-400",
    "Future Readiness Award":        "text-purple-400",
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total Votes", value: totalVotes, icon: ThumbsUp, color: "bg-secondary" },
          { label: "Unique Voters", value: uniqueVoters, icon: Users, color: "bg-blue-600" },
          { label: "Teachers Voted", value: leaderboard.length, icon: Trophy, color: "bg-amber-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-heading">{s.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-primary-foreground/10 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="font-heading font-bold text-primary-foreground text-base">Leaderboard</h2>
            <span className="ml-auto text-xs text-primary-foreground/30">{leaderboard.length} teachers</span>
          </div>
          {leaderboard.length === 0 ? (
            <div className="py-12 text-center text-primary-foreground/30 text-sm">No votes yet</div>
          ) : (
            <div className="divide-y divide-primary-foreground/[0.04]">
              {leaderboard.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 sm:p-4 hover:bg-primary-foreground/5 transition-colors">
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    i === 0 ? "bg-amber-400/20 text-amber-400" :
                    i === 1 ? "bg-slate-400/20 text-slate-300" :
                    i === 2 ? "bg-orange-600/20 text-orange-500" :
                              "bg-primary-foreground/5 text-primary-foreground/40"
                  }`}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-foreground truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-primary-foreground/40 truncate max-w-[120px]">{t.school}</p>
                      {t.category && <span className={`text-[10px] font-semibold ${catColor[t.category] || "text-white/40"}`}>{t.category.replace(" Award","")}</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden w-full">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((t.votes / maxVotes) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary/60" />
                    </div>
                  </div>
                  {/* Vote count */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold text-white">{t.votes}</div>
                    <div className="text-[10px] text-primary-foreground/30">{totalVotes > 0 ? Math.round((t.votes/totalVotes)*100) : 0}%</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent votes log */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-primary-foreground/10">
            <div className="flex items-center gap-2 mb-3">
              <Medal className="w-4 h-4 text-blue-400" />
              <h2 className="font-heading font-bold text-primary-foreground text-base">Recent Votes</h2>
              <span className="ml-auto text-xs text-primary-foreground/30">{filteredVotes.length} records</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/30" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by teacher or phone..."
                className="w-full pl-9 pr-3 h-9 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/25 text-xs focus:outline-none focus:border-primary-foreground/20 transition-all" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[360px]">
            {filteredVotes.length === 0 ? (
              <div className="py-12 text-center text-primary-foreground/30 text-sm">No votes yet</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[#141414]">
                  <tr className="border-b border-primary-foreground/10">
                    {["Teacher", "Voter Phone", "Voter ID", "Date & Time"].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-primary-foreground/30 uppercase tracking-wider px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVotes.map((v: any, i: number) => {
                    const nom = v.nominations;
                    const name = nom?.teacher_name || nom?.full_name || "—";
                    return (
                      <tr key={v.id || i} className="border-b border-primary-foreground/[0.04] hover:bg-primary-foreground/5 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-medium text-primary-foreground max-w-[120px] truncate">{name}</td>
                        <td className="px-4 py-2.5 text-xs text-primary-foreground/50">{v.voter_phone || "—"}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-secondary/70">{v.voter_id || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-primary-foreground/40 whitespace-nowrap">
                          {v.created_at ? new Date(v.created_at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

      {/* Category breakdown */}
      {leaderboard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-secondary" />
            <h2 className="font-heading font-bold text-primary-foreground text-base">Votes by Category</h2>
          </div>
          <div className="space-y-4">
            {[
              { cat: "Student Transformation Award", color: "bg-amber-400",   text: "text-amber-400" },
              { cat: "Teaching Innovation Award",    color: "bg-blue-400",    text: "text-blue-400" },
              { cat: "Beyond Classroom Impact Award",color: "bg-emerald-400", text: "text-emerald-400" },
              { cat: "Future Readiness Award",       color: "bg-purple-400",  text: "text-purple-400" },
            ].map(({ cat, color, text }) => {
              const catVotes = votes.filter((v: any) => v.nominations?.award_category === cat).length;
              const pct = totalVotes > 0 ? Math.round((catVotes / totalVotes) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold ${text}`}>{cat.replace(" Award", "")}</span>
                    <span className="text-xs text-primary-foreground/60">{catVotes} votes ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary-foreground/10 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ── Main Admin Page ──
const AdminPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [nominations, setNominations] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"nominations" | "votes">("nominations");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [editingNom, setEditingNom] = useState<any | null>(null);
  const [viewingNoms, setViewingNoms] = useState<any[] | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin-login");
    }
  }, []);

  const handleLogout = () => { adminLogout(); navigate("/admin-login"); };

  const total = nominations.length;
  const pending = nominations.filter(n => n.status === "pending").length;
  const shortlisted = nominations.filter(n => n.status === "shortlisted").length;
  const winners = nominations.filter(n => n.status === "winner").length;

  const categoryCount = nominations.reduce((acc: Record<string, number>, n) => {
    acc[n.award_category] = (acc[n.award_category] || 0) + 1;
    return acc;
  }, {});

  const fetchNominations = async () => {
    setLoading(true);
    try {
      const noms = await adminGetNominations();
      setNominations(noms);

      const voteData = await adminGetVotes();
      const nomMap: Record<string, any> = {};
      noms.forEach(n => { nomMap[n.id] = n; });
      setVotes(voteData.map(v => ({
        ...v,
        nominations: nomMap[v.nomination_id] || null,
      })));
    } catch (err: any) {
      toast({ title: "Failed to load", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn()) fetchNominations();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id + status);
    try {
      await adminUpdateNomination(id, { status });
      setNominations(prev => prev.map(n => n.id === id ? { ...n, status } : n));
      toast({ title: `✅ Marked as ${status}!` });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const handleEditSave = (updated: any) => {
    setNominations(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const filtered = nominations.filter(n => {
    const name = (n.teacher_name || n.full_name || "").toLowerCase();
    const school = (n.school_name || "").toLowerCase();
    const studentName = (n.student_name || "").toLowerCase();
    const phone = (n.phone || "").toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || school.includes(search.toLowerCase()) || studentName.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
    const matchCategory = categoryFilter === "All" || n.award_category === categoryFilter;
    const matchStatus = statusFilter === "All" || n.status === statusFilter;
    const matchType = typeFilter === "All" || n.type === typeFilter;
    const matchDate = !dateFilter || istDayKey(n.created_at) === istDayKey(dateFilter);
    return matchSearch && matchCategory && matchStatus && matchType && matchDate;
  });

  const categories = ["All", ...Array.from(new Set(nominations.map(n => n.award_category).filter(Boolean)))];

  const exportVotesCSV = () => {
    // Build vote counts per teacher
    const countMap: Record<string, { name: string; school: string; category: string; votes: number }> = {};
    votes.forEach((v: any) => {
      const nom = v.nominations;
      const name = nom?.teacher_name || nom?.full_name || v.nomination_id;
      if (!countMap[v.nomination_id]) {
        countMap[v.nomination_id] = { name, school: nom?.school_name || "", category: nom?.award_category || "", votes: 0 };
      }
      countMap[v.nomination_id].votes++;
    });
    const sorted = Object.values(countMap).sort((a, b) => b.votes - a.votes);
    const rows = [
      ["Rank", "Teacher Name", "School", "Award Category", "Total Votes"],
      ...sorted.map((r, i) => [i + 1, r.name, r.school, r.category, r.votes]),
    ];
    const csv = rows.map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "votes.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCSV = () => {
    const rows = [
      COPY_HEADERS,
      ...filtered.map(nominationRow),
    ];
    const csv = rows.map(r => r.map(v => `"${flattenCell(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nominations.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyAllFiltered = async () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to copy", description: "No nominations match the current filters.", variant: "destructive" });
      return;
    }
    const tsv = [COPY_HEADERS, ...filtered.map(nominationRow)]
      .map((row) => row.map(flattenCell).join("\t"))
      .join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      toast({ title: `Copied ${filtered.length} nomination${filtered.length !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Copy failed", description: "Could not access the clipboard.", variant: "destructive" });
    }
  };

  const openViewAll = () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to view", description: "No nominations match the current filters.", variant: "destructive" });
      return;
    }
    setViewingNoms(filtered);
  };

  if (!isAdminLoggedIn()) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0505" }}>
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(0,0%,8%)" }}>
      {/* Edit Modal */}
      <AnimatePresence>
        {editingNom && (
          <EditModal
            nomination={editingNom}
            onClose={() => setEditingNom(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {viewingNoms && (
          <ViewNominationsModal
            nominations={viewingNoms}
            title={viewingNoms.length === 1 ? "Nomination details" : "View all nominations"}
            onClose={() => setViewingNoms(null)}
            onPhotoClick={(n) => n.photo_url && setLightbox({ url: n.photo_url, name: displayName(n) })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lightbox && (
          <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-primary-foreground/10 bg-[#6B1212]/95 backdrop-blur-lg sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 px-3 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="text-primary-foreground/50 hover:text-primary-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B1A1A] to-[#6B1212] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
              <img src="/niat-logo-tight.webp" alt="NIAT" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <h1 className="font-heading text-base sm:text-lg font-bold text-primary-foreground">Admin Dashboard</h1>
              <p className="text-[10px] sm:text-xs text-primary-foreground/40">Future-Ready Educator Awards 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={fetchNominations}>
              <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={activeTab === "votes" ? exportVotesCSV : exportCSV}>
              <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">{activeTab === "votes" ? "Export Votes" : "Export CSV"}</span>
            </Button>
            <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-primary-foreground/10 bg-gradient-dark">
        <div className="container px-3 sm:px-4 flex">
          {[
            { id: "nominations", label: "Nominations", icon: Users },
            { id: "votes", label: "Votes", icon: ThumbsUp },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-secondary text-secondary"
                  : "border-transparent text-primary-foreground/40 hover:text-primary-foreground/70"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "votes" && votes.length > 0 && (
                <span className="ml-1 bg-secondary/20 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {votes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container py-6 sm:py-8 px-3 sm:px-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-secondary animate-spin" />
            <span className="ml-3 text-primary-foreground/60">Loading...</span>
          </div>
        ) : activeTab === "nominations" ? (
          <>
            {/* Shortlisted → voting banner */}
            {shortlisted === 0 && pending > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl mb-5 border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white"><span className="text-amber-400">{pending}</span> nomination{pending !== 1 ? "s" : ""} awaiting review</p>
                    <p className="text-xs text-primary-foreground/40">Click <strong className="text-amber-400">Shortlist</strong> on any nomination below to make it appear on the voting page</p>
                  </div>
                </div>
                <Link to="/voteniatteachers" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-xs font-semibold transition-all whitespace-nowrap">
                  Voting page ↗
                </Link>
              </div>
            )}
            {shortlisted > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl mb-5 border border-blue-500/20 bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white"><span className="text-blue-400">{shortlisted}</span> nomination{shortlisted !== 1 ? "s" : ""} live on voting page</p>
                    <p className="text-xs text-primary-foreground/40">Public can vote for these teachers now</p>
                  </div>
                </div>
                <Link to="/voteniatteachers" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-semibold transition-all">
                  View voting page ↗
                </Link>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { label: "Total Nominations", value: total, icon: Users, color: "bg-primary" },
                { label: "Pending Review", value: pending, icon: Eye, color: "bg-secondary" },
                { label: "Shortlisted", value: shortlisted, icon: CheckCircle2, color: "bg-blue-600" },
                { label: "Winners", value: winners, icon: Award, color: "bg-green-600" },
              ].map((stat, i) => (
                <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
                  className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary-foreground font-heading">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Category + Type charts */}
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="lg:col-span-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6">
                <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2 mb-5">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />Nominations by Category
                </h2>
                {Object.keys(categoryCount).length === 0 ? (
                  <p className="text-primary-foreground/40 text-sm text-center py-8">No nominations yet</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(categoryCount).map(([cat, count], i) => {
                      const pct = Math.round(((count as number) / total) * 100);
                      return (
                        <motion.div key={cat} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs sm:text-sm text-primary-foreground/70 truncate max-w-[60%]">{cat}</span>
                            <span className="text-xs sm:text-sm font-semibold text-primary-foreground">{count as number} <span className="text-primary-foreground/40 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-primary-foreground/5 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.6 + i * 0.08, duration: 0.8 }}
                              className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary/60" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6 flex flex-col gap-4">
                <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />Submission Types
                </h2>
                {[
                  { label: "Student Nominations", count: nominations.filter(n => n.type === "student").length, color: "bg-primary" },
                  { label: "Teacher Self-Nominations", count: nominations.filter(n => n.type === "teacher").length, color: "bg-secondary" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-xs sm:text-sm text-primary-foreground/70">{item.label}</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-primary-foreground">{item.count}</span>
                  </div>
                ))}
                {nominations[0] && (
                  <div className="mt-2 p-4 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-semibold text-primary-foreground">Latest Submission</span>
                    </div>
                    <p className="text-sm text-primary-foreground/60 flex items-center gap-2">
                      {nominations[0].photo_url ? (
                        <img src={nominations[0].photo_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                      ) : null}
                      {nominations[0].teacher_name || nominations[0].full_name || "—"}
                    </p>
                    <p className="text-xs text-primary-foreground/40">{nominations[0].school_name || ""} · {new Date(nominations[0].created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Nominations table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-primary-foreground/10">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground">
                      All Nominations <span className="text-primary-foreground/40 font-normal text-sm">({filtered.length})</span>
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9" onClick={openViewAll}>
                        <Eye className="w-3.5 h-3.5" /> View all
                      </Button>
                      <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => void copyAllFiltered()}>
                        <Copy className="w-3.5 h-3.5" /> Copy all
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
                      <Input placeholder="Search teacher, student, school..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9" />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground text-xs"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-primary-foreground/50" />
                          {dateFilter ? dateFilter.toLocaleDateString("en-IN") : "All dates"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-[#141414] border-white/10" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilter}
                          onSelect={setDateFilter}
                          className="text-white"
                        />
                        {dateFilter && (
                          <button
                            type="button"
                            onClick={() => setDateFilter(undefined)}
                            className="mt-2 w-full text-xs text-white/60 hover:text-white py-1.5 rounded-md hover:bg-white/5"
                          >
                            Clear date
                          </button>
                        )}
                      </PopoverContent>
                    </Popover>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-auto min-w-[130px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === "All" ? "All Categories" : c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-auto min-w-[110px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["All","pending","shortlisted","winner","rejected"].map(s => (
                          <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-auto min-w-[100px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-primary-foreground/10">
                      {["Type","Photo","Teacher / Applicant","Student","School","Category","Phone","Status","Date","Actions"].map(h => (
                        <th key={h} className="text-left text-[10px] sm:text-xs font-semibold text-primary-foreground/40 uppercase tracking-wider px-4 sm:px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((n, i) => (
                      <motion.tr key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-primary-foreground/5 hover:bg-primary-foreground/5 transition-colors">
                        <td className="px-4 sm:px-5 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${n.type === "student" ? "bg-primary/20 text-primary-foreground" : "bg-secondary/20 text-secondary"}`}>{n.type}</span>
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {n.photo_url ? (
                            <button
                              type="button"
                              onClick={() => setLightbox({ url: n.photo_url, name: displayName(n) })}
                              className="block"
                              title="View photo"
                            >
                              <img src={n.photo_url} alt={displayName(n)} className="w-14 h-14 rounded-xl object-cover border border-white/10 hover:ring-2 hover:ring-white/30" />
                            </button>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                              <ImageOff className="w-5 h-5" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-xs sm:text-sm font-medium text-primary-foreground min-w-[140px]">
                          {displayName(n)}
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-xs text-primary-foreground/60 max-w-[100px] truncate">{n.student_name || "—"}</td>
                        <td className="px-4 sm:px-5 py-3 text-xs text-primary-foreground/60 max-w-[120px] truncate">{n.school_name || "—"}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <Badge variant="outline" className="text-[10px] border-primary-foreground/20 text-primary-foreground/60 whitespace-nowrap">{n.award_category?.replace(" Award","") || "—"}</Badge>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-xs text-primary-foreground/60">{n.phone || "—"}</td>
                        <td className="px-4 sm:px-5 py-3"><StatusBadge status={n.status} /></td>
                        <td className="px-4 sm:px-5 py-3 text-xs text-primary-foreground/40 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString("en-IN")}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <button onClick={() => setViewingNoms([n])}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-[11px] font-semibold">
                              <Eye className="w-3 h-3" /> View
                            </button>
                            {/* Edit */}
                            <button onClick={() => setEditingNom(n)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-[11px] font-semibold">
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            {/* Shortlist — adds to voting page */}
                            {n.status !== "shortlisted" && n.status !== "winner" && (
                              <button onClick={() => updateStatus(n.id, "shortlisted")} disabled={updating?.startsWith(n.id) ?? false}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-all text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Add to voting page">
                                {updating === n.id+"shortlisted" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Shortlist
                              </button>
                            )}
                            {/* Revoke — removes from voting, back to pending */}
                            {n.status === "shortlisted" && (
                              <button onClick={() => updateStatus(n.id, "pending")} disabled={updating?.startsWith(n.id) ?? false}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 transition-all text-[11px] font-semibold disabled:opacity-40"
                                title="Remove from voting page">
                                {updating === n.id+"pending" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Revoke
                              </button>
                            )}
                            {/* Winner */}
                            {n.status !== "winner" && (
                              <button onClick={() => updateStatus(n.id, "winner")} disabled={updating?.startsWith(n.id) ?? false}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/15 hover:bg-green-500/25 text-green-400 transition-all text-[11px] font-semibold disabled:opacity-40">
                                {updating === n.id+"winner" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3" />}
                                Winner
                              </button>
                            )}
                            {/* Reject */}
                            {n.status !== "rejected" && n.status !== "winner" && (
                              <button onClick={() => updateStatus(n.id, "rejected")} disabled={updating?.startsWith(n.id) ?? false}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-all text-[11px] font-semibold disabled:opacity-40">
                                {updating === n.id+"rejected" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-primary-foreground/40">
                  {nominations.length === 0 ? "No nominations yet. Share the site to get started!" : "No nominations match your filters."}
                </div>
              )}
            </motion.div>
          </>
        ) : (
          <VotesPanel votes={votes} nominations={nominations} />
        )}
      </div>
    </div>
  );
};

export default AdminPage;
