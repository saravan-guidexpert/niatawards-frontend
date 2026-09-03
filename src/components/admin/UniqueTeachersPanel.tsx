import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Download,
  Eye,
  GraduationCap,
  Image,
  ImageOff,
  Layers,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cloudinaryDisplayUrl } from "@/lib/cloudinaryUrl";

// A teacher nominating a colleague is stored as a student-type row, so the
// education field is the only thing separating it from a real student entry.
const TEACHER_COLLEAGUE_EDUCATION = "Teacher / Colleague";

type TeacherSource = "student" | "self" | "peer";

const SOURCE_META: Record<TeacherSource, { label: string; short: string; chip: string }> = {
  student: {
    label: "Student submission",
    short: "Student",
    chip: "bg-primary/20 text-primary-foreground border-primary/30",
  },
  self: {
    label: "Self nomination",
    short: "Self",
    chip: "bg-secondary/15 text-secondary border-secondary/25",
  },
  peer: {
    label: "Nominated by a teacher",
    short: "Teacher",
    chip: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  },
};

const SOURCE_ORDER: TeacherSource[] = ["student", "self", "peer"];

const STATUS_RANK: Record<string, number> = { winner: 4, shortlisted: 3, pending: 2, rejected: 1 };

const STATUS_CHIP: Record<string, string> = {
  winner: "bg-green-500/10 text-green-400 border-green-500/20",
  shortlisted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-secondary/10 text-secondary border-secondary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const phone10 = (value: unknown) => String(value ?? "").replace(/\D/g, "").slice(-10);

const text = (value: unknown) => String(value ?? "").trim();

const timeOf = (value: unknown) => {
  const ms = new Date(String(value ?? "")).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const formatDateIn = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

const sourceOf = (n: any): TeacherSource => {
  if (n?.type === "teacher") return "self";
  if (text(n?.student_class) === TEACHER_COLLEAGUE_EDUCATION) return "peer";
  return "student";
};

/** On a self nomination the teacher is the person who filled the form. */
const teacherNameOf = (n: any) =>
  sourceOf(n) === "self" ? text(n?.full_name) || text(n?.nominator_name) : text(n?.teacher_name);

type TeacherRow = {
  phone: string;
  name: string;
  altNames: string[];
  school: string;
  subject: string;
  experience: string;
  category: string;
  photoUrl: string;
  counts: Record<TeacherSource, number>;
  sources: TeacherSource[];
  status: string;
  firstAt: string | null;
  lastAt: string | null;
  nominations: any[];
};

export const buildTeacherRows = (nominations: any[]): TeacherRow[] => {
  const groups = new Map<string, any[]>();
  for (const n of nominations) {
    const phone = phone10(n?.phone);
    if (phone.length !== 10) continue;
    const bucket = groups.get(phone);
    if (bucket) bucket.push(n);
    else groups.set(phone, [n]);
  }

  return Array.from(groups.entries()).map(([phone, list]) => {
    const sorted = [...list].sort((a, b) => timeOf(b?.created_at) - timeOf(a?.created_at));
    const own = sorted.find((n) => sourceOf(n) === "self");

    // The teacher's own submission is the most reliable description of them;
    // otherwise fall back to the most recent entry that filled the field in.
    const pick = (read: (n: any) => unknown) => {
      const fromSelf = own ? text(read(own)) : "";
      if (fromSelf) return fromSelf;
      for (const n of sorted) {
        const value = text(read(n));
        if (value) return value;
      }
      return "";
    };

    const counts: Record<TeacherSource, number> = { student: 0, self: 0, peer: 0 };
    let status = "";
    for (const n of sorted) {
      counts[sourceOf(n)] += 1;
      const candidate = text(n?.status);
      if ((STATUS_RANK[candidate] ?? 0) > (STATUS_RANK[status] ?? 0)) status = candidate;
    }

    const names: string[] = [];
    for (const n of sorted) {
      const name = teacherNameOf(n);
      if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        names.push(name);
      }
    }
    const primary = (own && teacherNameOf(own)) || names[0] || "";

    return {
      phone,
      name: primary || "Unnamed teacher",
      altNames: names.filter((name) => name !== primary),
      school: pick((n) => n?.school_name),
      subject: pick((n) => n?.subject),
      experience: pick((n) => n?.experience),
      category: pick((n) => n?.award_category),
      photoUrl: pick((n) => n?.photo_url),
      counts,
      sources: SOURCE_ORDER.filter((source) => counts[source] > 0),
      status: status || "pending",
      firstAt: sorted.length ? String(sorted[sorted.length - 1]?.created_at ?? "") || null : null,
      lastAt: sorted.length ? String(sorted[0]?.created_at ?? "") || null : null,
      nominations: sorted,
    };
  });
};

const COPY_HEADERS = [
  "Teacher",
  "Phone",
  "School",
  "Subject",
  "Experience",
  "Total nominations",
  "Student submissions",
  "Self nominations",
  "Teacher nominations",
  "Sources",
  "Status",
  "First nominated",
  "Last nominated",
  "Other names used",
  "Photo URL",
];

const teacherRowCells = (t: TeacherRow) => [
  t.name,
  t.phone,
  t.school,
  t.subject,
  t.experience,
  t.counts.student + t.counts.self + t.counts.peer,
  t.counts.student,
  t.counts.self,
  t.counts.peer,
  t.sources.map((s) => SOURCE_META[s].label).join(" + "),
  t.status,
  formatDateIn(t.firstAt),
  formatDateIn(t.lastAt),
  t.altNames.join(" / "),
  t.photoUrl,
];

const flattenCell = (value: unknown) => String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");

const SourceChips = ({ t }: { t: TeacherRow }) => (
  <div className="flex flex-wrap gap-1">
    {t.sources.map((source) => (
      <span
        key={source}
        title={`${SOURCE_META[source].label} · ${t.counts[source]}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SOURCE_META[source].chip}`}
      >
        {SOURCE_META[source].short}
        <span className="opacity-60">{t.counts[source]}</span>
      </span>
    ))}
  </div>
);

const StatusChip = ({ status }: { status: string }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
      STATUS_CHIP[status] || "bg-white/5 text-white/50 border-white/15"
    }`}
  >
    {status}
  </span>
);

const TeacherPhoto = ({ t, size }: { t: TeacherRow; size: number }) =>
  t.photoUrl ? (
    <img
      src={cloudinaryDisplayUrl(t.photoUrl, { width: size * 2 })}
      alt={t.name}
      width={size}
      height={size}
      className="rounded-lg object-cover border border-white/10"
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div
      className="rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20"
      style={{ width: size, height: size }}
    >
      <ImageOff className="w-4 h-4" />
    </div>
  );

interface Props {
  nominations: any[];
  onView: (nominations: any[], title: string) => void;
  title?: string;
  subtitle?: string;
}

const UniqueTeachersPanel = ({
  nominations,
  onView,
  title = "Unique teachers",
  subtitle = "One row per teacher, matched on their phone number across student submissions, self nominations, and teachers nominating others.",
}: Props) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [photoFilter, setPhotoFilter] = useState("All");
  const [sort, setSort] = useState("nominations");

  const teachers = useMemo(() => buildTeacherRows(nominations), [nominations]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      const matchSearch =
        !q ||
        [t.name, t.phone, t.school, t.subject, ...t.altNames].some((value) =>
          value.toLowerCase().includes(q)
        );
      const matchSource =
        sourceFilter === "All" ||
        (sourceFilter === "multi"
          ? t.sources.length > 1
          : t.counts[sourceFilter as TeacherSource] > 0);
      const hasPhoto = Boolean(t.photoUrl);
      const matchPhoto =
        photoFilter === "All" ||
        (photoFilter === "with" ? hasPhoto : !hasPhoto);
      return matchSearch && matchSource && matchPhoto;
    });
  }, [teachers, search, sourceFilter, photoFilter]);

  const stats = useMemo(
    () => ({
      unique: filteredTeachers.length,
      student: filteredTeachers.filter((t) => t.counts.student > 0).length,
      self: filteredTeachers.filter((t) => t.counts.self > 0).length,
      peer: filteredTeachers.filter((t) => t.counts.peer > 0).length,
      multi: filteredTeachers.filter((t) => t.sources.length > 1).length,
      withPhoto: filteredTeachers.filter((t) => Boolean(t.photoUrl)).length,
    }),
    [filteredTeachers]
  );

  const visible = useMemo(() => {
    const total = (t: TeacherRow) => t.counts.student + t.counts.self + t.counts.peer;
    return [...filteredTeachers].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") return timeOf(b.lastAt) - timeOf(a.lastAt);
      return total(b) - total(a) || timeOf(b.lastAt) - timeOf(a.lastAt);
    });
  }, [filteredTeachers, sort]);

  const copyAll = async () => {
    if (visible.length === 0) {
      toast({ title: "Nothing to copy", description: "No teachers match the current filters.", variant: "destructive" });
      return;
    }
    const tsv = [COPY_HEADERS, ...visible.map(teacherRowCells)]
      .map((row) => row.map(flattenCell).join("\t"))
      .join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      toast({ title: `Copied ${visible.length} teacher${visible.length !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Copy failed", description: "Could not access the clipboard.", variant: "destructive" });
    }
  };

  const exportCSV = () => {
    if (visible.length === 0) {
      toast({ title: "Nothing to export", description: "No teachers match the current filters.", variant: "destructive" });
      return;
    }
    const csv = [COPY_HEADERS, ...visible.map(teacherRowCells)]
      .map((row) => row.map((cell) => `"${flattenCell(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "unique-teachers.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openTeacher = (t: TeacherRow) =>
    onView(t.nominations, `${t.name} · ${t.phone} · ${t.nominations.length} nomination${t.nominations.length !== 1 ? "s" : ""}`);

  const statCards = [
    { label: "Unique teachers", value: stats.unique, icon: GraduationCap, color: "bg-primary" },
    { label: "From students", value: stats.student, icon: Users, color: "bg-blue-600" },
    { label: "Self-nominated", value: stats.self, icon: UserCheck, color: "bg-secondary" },
    { label: "From teachers", value: stats.peer, icon: UserPlus, color: "bg-green-600" },
    { label: "Multiple sources", value: stats.multi, icon: Layers, color: "bg-white/20" },
    { label: "With photo", value: stats.withPhoto, icon: Image, color: "bg-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-primary-foreground font-heading">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                {title}
              </h2>
              <p className="text-xs text-primary-foreground/40 mt-1">{subtitle}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={copyAll}>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
              <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
              <Input
                placeholder="Search teacher, phone, school, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
              />
            </div>
            <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[210px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All sources</SelectItem>
                  <SelectItem value="student">Student submissions</SelectItem>
                  <SelectItem value="self">Self nominations</SelectItem>
                  <SelectItem value="peer">Nominated by a teacher</SelectItem>
                  <SelectItem value="multi">Multiple sources</SelectItem>
                </SelectContent>
              </Select>
              <Select value={photoFilter} onValueChange={setPhotoFilter}>
                <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[160px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All photos</SelectItem>
                  <SelectItem value="with">Has photo</SelectItem>
                  <SelectItem value="without">No photo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[180px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nominations">Most nominations</SelectItem>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="lg:hidden p-3 space-y-3">
          {visible.map((t) => (
            <div
              key={t.phone}
              className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3 space-y-3"
            >
              <div className="flex items-start gap-3">
                <TeacherPhoto t={t} size={48} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-white text-base leading-tight truncate" title={t.name}>
                    {t.name}
                  </h3>
                  <p className="text-sm text-primary-foreground/70">{t.phone}</p>
                  <p className="text-xs text-primary-foreground/45 truncate">{t.school || "—"}</p>
                </div>
                <StatusChip status={t.status} />
              </div>
              {t.altNames.length > 0 && (
                <p className="text-[11px] text-primary-foreground/35">Also entered as {t.altNames.join(", ")}</p>
              )}
              <SourceChips t={t} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-primary-foreground/40">
                  {t.nominations.length} nomination{t.nominations.length !== 1 ? "s" : ""} · last{" "}
                  {formatDateIn(t.lastAt)}
                </p>
                <Button
                  variant="hero-outline"
                  size="sm"
                  className="h-8 text-[11px] gap-1"
                  onClick={() => openTeacher(t)}
                >
                  <Eye className="w-3 h-3" /> View
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block px-2 pb-2">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[64px]" />
              <col />
              <col className="w-[116px]" />
              <col />
              <col className="w-[13%]" />
              <col className="w-[190px]" />
              <col className="w-[92px]" />
              <col className="w-[104px]" />
              <col className="w-[104px]" />
              <col className="w-[84px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-primary-foreground/10">
                {["Photo", "Teacher", "Phone", "School", "Subject", "Nominated by", "Total", "Status", "Last", ""].map(
                  (h, i) => (
                    <th
                      key={h || `col-${i}`}
                      className={`text-[10px] sm:text-xs font-semibold text-primary-foreground/40 uppercase tracking-wider px-2.5 py-3 whitespace-nowrap ${
                        i >= 9 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((t, i) => (
                <motion.tr
                  key={t.phone}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i, 12) * 0.02 }}
                  className="border-b border-primary-foreground/5 hover:bg-primary-foreground/[0.04] transition-colors"
                >
                  <td className="px-2.5 py-3 align-middle">
                    <TeacherPhoto t={t} size={44} />
                  </td>
                  <td className="px-2.5 py-3 align-middle min-w-0">
                    <p className="truncate text-xs sm:text-sm font-medium text-primary-foreground" title={t.name}>
                      {t.name}
                    </p>
                    {t.altNames.length > 0 && (
                      <p
                        className="truncate text-[10px] text-primary-foreground/35"
                        title={`Also entered as ${t.altNames.join(", ")}`}
                      >
                        also {t.altNames.join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/75 whitespace-nowrap">
                    {t.phone}
                  </td>
                  <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/60 min-w-0">
                    <p className="truncate" title={t.school}>
                      {t.school || "—"}
                    </p>
                  </td>
                  <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/60 min-w-0">
                    <p className="truncate" title={t.subject}>
                      {t.subject || "—"}
                    </p>
                  </td>
                  <td className="px-2.5 py-3 align-middle">
                    <SourceChips t={t} />
                  </td>
                  <td className="px-2.5 py-3 align-middle text-xs font-semibold text-primary-foreground/80">
                    {t.nominations.length}
                  </td>
                  <td className="px-2.5 py-3 align-middle">
                    <StatusChip status={t.status} />
                  </td>
                  <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/40 whitespace-nowrap">
                    {formatDateIn(t.lastAt)}
                  </td>
                  <td className="px-2.5 py-3 align-middle text-right">
                    <Button
                      variant="hero-outline"
                      size="sm"
                      className="h-8 text-[11px] gap-1"
                      onClick={() => openTeacher(t)}
                    >
                      <Eye className="w-3 h-3" /> View
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {visible.length === 0 && (
          <div className="py-16 text-center text-primary-foreground/40">
            {teachers.length === 0
              ? "No teachers yet. Nominations with a valid teacher phone number will appear here."
              : "No teachers match your filters."}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniqueTeachersPanel;
