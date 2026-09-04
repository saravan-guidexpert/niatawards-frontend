import React, { useState, useEffect, useMemo, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Award, Users, TrendingUp, Download, Search,
  CheckCircle2, Eye, BarChart3, Star,
  Loader2, RefreshCw, Pencil, X, Save,
  Calendar as CalendarIcon, Copy, ImageOff, Globe2,
  Hourglass, Trash2, Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cloudinaryDisplayUrl } from "@/lib/cloudinaryUrl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { adminLogout, isAdminLoggedIn } from "./AdminLoginPage";
import { adminDeleteNomination, adminGetMe, adminGetNominations, adminLogoutApi, adminUpdateNomination } from "@/lib/apiAdmin";
import CampaignsPanel from "@/components/admin/CampaignsPanel";
import DigitalMarketingPanel from "@/components/admin/DigitalMarketingPanel";
import AccessManagementPanel from "@/components/admin/AccessManagementPanel";
import FunnelAnalytics from "@/components/admin/FunnelAnalytics";
import UniqueTeachersPanel from "@/components/admin/UniqueTeachersPanel";
import TeacherImageManagementPanel from "@/components/admin/TeacherImageManagementPanel";
import OfflineTeamPanel from "@/components/admin/OfflineTeamPanel";
import TeacherVideoReviewPanel from "@/components/admin/TeacherVideoReviewPanel";
import WhatsAppOpsPanel from "@/components/admin/WhatsAppOpsPanel";
import TeacherVideoMessagingPanel from "@/components/admin/TeacherVideoMessagingPanel";
import AfterSessionNominationsPanel from "@/components/admin/AfterSessionNominationsPanel";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { adminTabLabel, isTabAllowed, type AdminTab } from "@/lib/adminNav";
import { copyTextWithFallback } from "@/lib/copyText";
import { memberForNomination } from "@/lib/offlineTeamRoster";
import {
  allowedAdminTabs,
  firstAllowedTab,
  getAdminSession,
  getAdminUser,
  hasAdminPermission,
  isSuperAdmin,
  PANEL_PERMISSIONS,
  setAdminSession,
} from "@/lib/adminSession";

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

// Leads that stopped before step 1 have no teacher_name or full_name yet.
const displayName = (n: any) =>
  n.teacher_name || n.full_name || n.nominator_name || n.student_name || "—";
const classOrExp = (n: any) => n.student_class || (n.experience ? `${n.experience} yrs` : "");
const formatDateIn = (value: string) => new Date(value).toLocaleDateString("en-IN");

const isIncomplete = (n: any) => n.status === "draft";

const STAGE_LABELS: Record<string, string> = {
  identity: "Name and phone",
  otp_sent: "OTP sent",
  otp_verified: "OTP verified",
  details: "Details filled",
  submitted: "Submitted",
};

const FUNNEL_STAGE_ORDER = ["otp_requested", "otp_verified", "form_step1", "submitted"] as const;

const FUNNEL_FILTERS = [
  { value: "All", label: "All verified" },
  { value: "otp_requested", label: "OTP requested (all leads)" },
  { value: "otp_not_verified", label: "Never verified OTP" },
  { value: "otp_verified", label: "OTP verified" },
  { value: "form_step1", label: "Details filled" },
  { value: "submitted", label: "Submitted" },
] as const;

/** Maps a nomination to the same funnel ids used in Funnel Analytics. */
const nominationFunnelStage = (n: any) => {
  if (!isIncomplete(n) || n.form_step === "submitted") return "submitted";
  if (n.form_step === "details") return "form_step1";
  if (n.form_step === "otp_verified" || n.phone_verified) return "otp_verified";
  return "otp_requested";
};

/** Abandoned drafts that requested OTP (or only entered a number) but never verified. */
const neverVerifiedOtp = (n: any) =>
  isIncomplete(n) &&
  !n.phone_verified &&
  n.form_step !== "otp_verified" &&
  n.form_step !== "details" &&
  n.form_step !== "submitted";

const reachedFunnelStage = (n: any, stage: string) => {
  const have = FUNNEL_STAGE_ORDER.indexOf(nominationFunnelStage(n) as (typeof FUNNEL_STAGE_ORDER)[number]);
  const need = FUNNEL_STAGE_ORDER.indexOf(stage as (typeof FUNNEL_STAGE_ORDER)[number]);
  return have >= 0 && need >= 0 && have >= need;
};

const matchesFunnelFilter = (n: any, filter: string) => {
  // "All verified" matches the funnel's OTP-verified bar: submitted + in-progress
  // people who actually verified. The extra unverified drafts live in their own filter.
  if (filter === "All") return !neverVerifiedOtp(n);
  if (filter === "otp_not_verified") return neverVerifiedOtp(n);
  return reachedFunnelStage(n, filter);
};

const phoneKey = (n: any) => String(n.nominator_phone || n.phone || "").replace(/\D/g, "").slice(-10);

const uniquePhoneCount = (rows: any[]) =>
  new Set(rows.map(phoneKey).filter((p) => p.length === 10)).size;

const copiedNominationsTitle = (rows: any[]) => {
  const phones = uniquePhoneCount(rows);
  const noun = `nomination${rows.length !== 1 ? "s" : ""}`;
  if (phones > 0 && phones !== rows.length) {
    return `Copied ${rows.length} ${noun} (${phones} unique phones)`;
  }
  return `Copied ${rows.length} ${noun}`;
};

const stageLabel = (n: any) => {
  if (!isIncomplete(n) || n.form_step === "submitted") return "Submitted";
  return STAGE_LABELS[n.form_step] || "Started";
};

const formatDateTimeIn = (value: string) =>
  new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

const yesNo = (value: unknown) => (value === true ? "Yes" : value === false ? "No" : "");

type CopyColumn = { header: string; key?: string; value?: (n: any) => unknown };

const BASE_COPY_COLUMNS: CopyColumn[] = [
  { header: "ID", key: "id" },
  { header: "Type", key: "type" },
  { header: "Teacher/Applicant", value: displayName },
  { header: "Teacher Name", key: "teacher_name" },
  { header: "Applicant Full Name", key: "full_name" },
  { header: "Student", key: "student_name" },
  { header: "School", key: "school_name" },
  { header: "Board", key: "board" },
  { header: "Category", key: "award_category" },
  { header: "Class", value: classOrExp },
  { header: "Student Class", key: "student_class" },
  { header: "Class Group", key: "class_group" },
  { header: "Experience (yrs)", key: "experience" },
  { header: "Subject", key: "subject" },
  { header: "Teacher Phone", key: "phone" },
  { header: "Teacher Social", key: "teacher_social" },
  { header: "User Name", key: "nominator_name" },
  { header: "User Phone", key: "nominator_phone" },
  { header: "Phone Verified", key: "phone_verified", value: (n) => yesNo(n.phone_verified) },
  { header: "Status", key: "status" },
  { header: "Stage", value: stageLabel },
  { header: "Form Step", key: "form_step" },
  { header: "WhatsApp Status", key: "whatsapp_status" },
  { header: "WhatsApp Attempt", key: "whatsapp_attempt" },
  { header: "WhatsApp Error", key: "whatsapp_error" },
  { header: "Date", key: "created_at", value: (n) => (n.created_at ? formatDateTimeIn(n.created_at) : "") },
  { header: "Photo URL", key: "photo_url" },
  { header: "Special thing", key: "special_thing" },
  { header: "Impact story", key: "impact_story" },
  { header: "Care Rating", key: "care_rating" },
  { header: "Clarity Rating", key: "clarity_rating" },
  { header: "Motivation Rating", key: "motivation_rating" },
  { header: "Support Rating", key: "support_rating" },
  { header: "UTM Source", key: "utm_source" },
  { header: "UTM Medium", key: "utm_medium" },
  { header: "UTM Campaign", key: "utm_campaign" },
  { header: "UTM Term", key: "utm_term" },
  { header: "UTM Content", key: "utm_content" },
];

const IGNORED_COPY_KEYS = new Set(["_id", "__v", "draft_token"]);

const prettyHeader = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * The fixed columns plus any field the API has started returning since, so a new
 * backend field shows up in exports without anyone remembering to add it here.
 */
export const copyColumns = (rows: any[]): CopyColumn[] => {
  const known = new Set(BASE_COPY_COLUMNS.map((c) => c.key).filter(Boolean) as string[]);
  const extras: CopyColumn[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (known.has(key) || IGNORED_COPY_KEYS.has(key)) continue;
      known.add(key);
      extras.push({ header: prettyHeader(key), key });
    }
  }
  return [...BASE_COPY_COLUMNS, ...extras];
};

const cellValue = (col: CopyColumn, n: any) => {
  const raw = col.value ? col.value(n) : col.key ? n?.[col.key] : "";
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") return JSON.stringify(raw);
  return raw;
};

export const nominationSheet = (rows: any[]) => {
  const cols = copyColumns(rows);
  return [cols.map((c) => c.header), ...rows.map((n) => cols.map((c) => cellValue(c, n)))];
};

const flattenCell = (value: unknown) => String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");

export const nominationsToTsv = (rows: any[]) =>
  nominationSheet(rows)
    .map((row) => row.map(flattenCell).join("\t"))
    .join("\n");

const nominationsToCsv = (rows: any[]) =>
  nominationSheet(rows)
    .map((row) => row.map((v) => `"${flattenCell(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

const MODAL_PAGE_SIZE = 50;

const hasUtm = (n: any) =>
  Boolean(n?.utm_source || n?.utm_medium || n?.utm_campaign || n?.utm_term || n?.utm_content);

const utmSourceKey = (n: any) => (String(n?.utm_source || "").trim() || "direct");

const prettyUtm = (value: string) => {
  const v = (value || "").trim();
  if (!v || v.toLowerCase() === "direct") return "Direct / Organic";
  const map: Record<string, string> = {
    facebook: "Facebook", fb: "Facebook", instagram: "Instagram", ig: "Instagram",
    google: "Google", youtube: "YouTube", whatsapp: "WhatsApp", twitter: "X / Twitter",
    linkedin: "LinkedIn", email: "Email", sms: "SMS", cpc: "Paid (CPC)", organic: "Organic",
    social: "Social", referral: "Referral",
  };
  return map[v.toLowerCase()] || v.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const decodeUtmValue = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  } catch {
    return raw.replace(/\+/g, " ").trim();
  }
};

const utmLinkName = (n: any) => {
  const member = memberForNomination(n);
  if (member?.name) return member.name;
  const content = decodeUtmValue(n?.utm_content);
  if (content) return content;
  const medium = String(n?.utm_medium || "").trim();
  if (medium) return prettyUtm(medium);
  const campaign = String(n?.utm_campaign || "").trim();
  if (campaign) return campaign;
  return "Direct / Organic";
};

const LEAD_DETAILS_COPY_COLUMNS: CopyColumn[] = [
  { header: "Teacher", value: displayName },
  { header: "Student", key: "student_name" },
  { header: "School", key: "school_name" },
  { header: "Teacher Phone", key: "phone" },
  { header: "User Phone", key: "nominator_phone" },
  { header: "Status", key: "status" },
  { header: "UTM Link Name", value: utmLinkName },
  { header: "UTM Source", key: "utm_source" },
  { header: "UTM Medium", key: "utm_medium" },
  { header: "UTM Campaign", key: "utm_campaign" },
  { header: "UTM Term", key: "utm_term" },
  { header: "UTM Content", key: "utm_content" },
  { header: "Date", key: "created_at", value: (n) => (n.created_at ? formatDateTimeIn(n.created_at) : "") },
];

const leadDetailsToTsv = (rows: any[]) =>
  [
    LEAD_DETAILS_COPY_COLUMNS.map((c) => c.header),
    ...rows.map((n) => LEAD_DETAILS_COPY_COLUMNS.map((c) => flattenCell(cellValue(c, n)))),
  ]
    .map((row) => row.join("\t"))
    .join("\n");

const utmChipClass = (source: string) => {
  const k = source.toLowerCase();
  if (k.includes("facebook") || k === "fb") return "bg-blue-500/15 text-blue-300 border-blue-500/25";
  if (k.includes("instagram") || k === "ig") return "bg-pink-500/15 text-pink-300 border-pink-500/25";
  if (k.includes("google")) return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  if (k.includes("whatsapp")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (k.includes("youtube")) return "bg-red-500/15 text-red-300 border-red-500/25";
  if (k === "direct") return "bg-white/8 text-white/45 border-white/12";
  return "bg-secondary/15 text-secondary border-secondary/25";
};

// `phone` is the teacher's number (their own, on a self-nomination); `nominator_phone`
// is whoever filled the form. Both are shown because admins contact either side.
const PhonePair = ({ n }: { n: any }) => (
  <div className="space-y-0.5 text-xs leading-tight">
    <p className="text-primary-foreground/75">
      <span className="text-primary-foreground/35">Teacher </span>{n.phone || "—"}
    </p>
    <p className="text-primary-foreground/75">
      <span className="text-primary-foreground/35">User </span>{n.nominator_phone || "—"}
    </p>
  </div>
);

const UtmChip = ({ n, className = "", compact = false }: { n: any; className?: string; compact?: boolean }) => {
  const source = utmSourceKey(n);
  const campaign = String(n?.utm_campaign || "").trim();
  const full = campaign ? `${prettyUtm(source)} · ${campaign}` : prettyUtm(source);
  return (
    <span
      title={full}
      className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full text-[10px] font-semibold border ${utmChipClass(source)} ${className}`}
    >
      <Globe2 className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate">{compact ? prettyUtm(source) : full}</span>
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const value = (status || "pending").toString();
  const styles: Record<string, string> = {
    shortlisted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    winner: "bg-green-500/10 text-green-400 border-green-500/20",
    pending: "bg-secondary/10 text-secondary border-secondary/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    draft: "bg-white/5 text-white/50 border-white/15",
  };
  const labels: Record<string, string> = { draft: "Incomplete" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[value] || styles.pending}`}>
      {labels[value] || value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
};

const WhatsAppStatusBadge = ({ n, compact = false }: { n: any; compact?: boolean }) => {
  if (n.type !== "student" || n.status === "draft") {
    return compact ? <span className="text-xs text-primary-foreground/30">—</span> : null;
  }
  const value = String(n.whatsapp_status || "not_sent");
  const styles: Record<string, string> = {
    submitted: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    sent: "bg-sky-500/15 text-sky-300 border-sky-500/25",
    queued: "bg-white/10 text-white/70 border-white/15",
    delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    read: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    failed: "bg-red-500/15 text-red-300 border-red-500/25",
    retry_exhausted: "bg-red-500/15 text-red-300 border-red-500/25",
    not_sent: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  };
  const labels: Record<string, string> = compact
    ? {
        submitted: "Submitted",
        sent: "Sent",
        queued: "Queued",
        delivered: "Delivered",
        read: "Read",
        failed: "Failed",
        retry_exhausted: "Exhausted",
        not_sent: "Not sent",
      }
    : {
        submitted: "WA submitted",
        sent: "WA sent",
        queued: "WA queued",
        delivered: "WA delivered",
        read: "WA read",
        failed: "WA failed",
        retry_exhausted: "WA exhausted",
        not_sent: "WA not sent",
      };
  const attempt = n.whatsapp_attempt ? ` #${n.whatsapp_attempt}` : "";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${styles[value] || styles.not_sent}`}
      title={n.whatsapp_error || `${labels[value] || value}${attempt}`}
    >
      {labels[value] || value}{attempt}
    </span>
  );
};

const NominationActions = ({
  n,
  updating,
  stacked,
  canDelete,
  onView,
  onDelete,
}: {
  n: any;
  updating: string | null;
  stacked?: boolean;
  canDelete?: boolean;
  onView: () => void;
  onDelete: () => void;
}) => {
  const btn = stacked
    ? "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-semibold w-full min-h-[44px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    : "inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const deleting = updating === n.id + "delete";

  return (
    <div className={stacked ? "grid grid-cols-2 gap-1.5" : "inline-flex items-center gap-1.5"}>
      <button type="button" onClick={onView} className={`${btn} border border-white/10 bg-white/[0.06] text-white/90 hover:bg-white/12`}>
        <Eye className="w-3.5 h-3.5" /> View
      </button>
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className={`${btn} border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20`}
          title="Delete this nomination"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </button>
      ) : null}
    </div>
  );
};

const NominationDetailCard = ({ n, onPhotoClick }: { n: any; onPhotoClick?: (n: any) => void }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 space-y-3">
    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      {n.photo_url ? (
        <button type="button" onClick={() => onPhotoClick?.(n)} className="flex-shrink-0 w-full sm:w-auto">
          <img
            src={cloudinaryDisplayUrl(n.photo_url, { width: 560 })}
            alt={displayName(n)}
            width={224}
            height={176}
            className="w-full h-44 sm:w-28 sm:h-28 rounded-xl object-cover border border-white/10"
            loading="lazy"
            decoding="async"
          />
        </button>
      ) : (
        <div className="w-full h-32 sm:w-28 sm:h-28 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/25">
          <ImageOff className="w-8 h-8" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${n.type === "student" ? "bg-primary/20 text-primary-foreground" : "bg-secondary/20 text-secondary"}`}>{n.type}</span>
          <StatusBadge status={n.status} />
          <WhatsAppStatusBadge n={n} />
          <UtmChip n={n} />
        </div>
        <h3 className="font-heading font-bold text-white text-base">{displayName(n)}</h3>
        <p className="text-xs text-white/50">{n.school_name || "—"}</p>
        <p className="text-xs text-white/35">{n.created_at ? new Date(n.created_at).toLocaleString("en-IN") : "—"}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <p className="text-white/40">Student: <span className="text-white/80">{n.student_name || "—"}</span></p>
      <p className="text-white/40">Teacher phone: <span className="text-white/80">{n.phone || "—"}</span></p>
      <p className="text-white/40">User phone: <span className="text-white/80">{n.nominator_phone || "—"}</span></p>
      <p className="text-white/40">Category: <span className="text-white/80">{n.award_category || "—"}</span></p>
      <p className="text-white/40">Class: <span className="text-white/80">{classOrExp(n) || "—"}</span></p>
      {n.subject && <p className="text-white/40 col-span-2">Subject: <span className="text-white/80">{n.subject}</span></p>}
    </div>
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-2">Campaign attribution</p>
      {hasUtm(n) ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="text-white/40 col-span-2">UTM link: <span className="text-white/85">{utmLinkName(n)}</span></p>
          <p className="text-white/40">Source: <span className="text-white/85">{prettyUtm(n.utm_source || "direct")}</span></p>
          <p className="text-white/40">Medium: <span className="text-white/85">{n.utm_medium ? prettyUtm(n.utm_medium) : "—"}</span></p>
          <p className="text-white/40 col-span-2">Campaign: <span className="text-white/85">{n.utm_campaign || "—"}</span></p>
          {n.utm_term && <p className="text-white/40">Term: <span className="text-white/85">{n.utm_term}</span></p>}
          {n.utm_content && <p className="text-white/40">Content: <span className="text-white/85">{n.utm_content}</span></p>}
        </div>
      ) : (
        <p className="text-xs text-white/40">Direct / organic — no UTM parameters on this nomination.</p>
      )}
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

const uniqueSorted = (values: (string | undefined | null)[]) =>
  Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const ViewNominationsModal = ({
  nominations, title, onClose, onPhotoClick,
}: {
  nominations: any[];
  title: string;
  onClose: () => void;
  onPhotoClick?: (n: any) => void;
}) => {
  const { toast } = useToast();
  const list = useMemo(
    () => (Array.isArray(nominations) ? nominations.filter(Boolean) : []),
    [nominations],
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");
  const [layout, setLayout] = useState<"table" | "cards">("table");
  const [detail, setDetail] = useState<any | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<string>(String(MODAL_PAGE_SIZE));
  const [copying, setCopying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const types = useMemo(() => uniqueSorted(list.map((n) => n.type)), [list]);
  const statuses = useMemo(() => uniqueSorted(list.map((n) => n.status)), [list]);
  const classes = useMemo(() => uniqueSorted(list.map((n) => classOrExp(n))), [list]);
  const subjects = useMemo(() => uniqueSorted(list.map((n) => n.subject)), [list]);
  const categories = useMemo(() => uniqueSorted(list.map((n) => n.award_category)), [list]);
  const sources = useMemo(() => uniqueSorted(list.map((n) => utmSourceKey(n))), [list]);
  const links = useMemo(() => uniqueSorted(list.map((n) => utmLinkName(n))), [list]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return list.filter((n) => {
      if (q) {
        const hay = [
          displayName(n), n.student_name, n.school_name, n.phone, n.nominator_name,
          n.nominator_phone, n.subject, n.special_thing, n.impact_story, n.utm_campaign,
          n.utm_source, n.utm_medium, n.utm_content, utmLinkName(n),
        ].some((v) => String(v || "").toLowerCase().includes(q));
        if (!hay) return false;
      }
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (classFilter !== "all" && classOrExp(n) !== classFilter) return false;
      if (subjectFilter !== "all" && String(n.subject || "").trim() !== subjectFilter) return false;
      if (categoryFilter !== "all" && n.award_category !== categoryFilter) return false;
      if (sourceFilter !== "all" && utmSourceKey(n) !== sourceFilter) return false;
      if (linkFilter !== "all" && utmLinkName(n) !== linkFilter) return false;
      return true;
    });
  }, [list, search, typeFilter, statusFilter, classFilter, subjectFilter, categoryFilter, sourceFilter, linkFilter]);

  const filtersActive =
    search.trim().length > 0 ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    classFilter !== "all" ||
    subjectFilter !== "all" ||
    categoryFilter !== "all" ||
    sourceFilter !== "all" ||
    linkFilter !== "all";

  const rowsPerPage = pageSize === "all" ? Math.max(1, filtered.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);
  const rangeStart = filtered.length === 0 ? 0 : safePage * rowsPerPage + 1;
  const rangeEnd = Math.min(filtered.length, (safePage + 1) * rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, statusFilter, classFilter, subjectFilter, categoryFilter, sourceFilter, linkFilter, pageSize]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [safePage, layout, detail]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setClassFilter("all");
    setSubjectFilter("all");
    setCategoryFilter("all");
    setSourceFilter("all");
    setLinkFilter("all");
  };

  const copyAll = async () => {
    if (copying) return;
    if (filtered.length === 0) {
      toast({ title: "Nothing to copy", description: "No nominations match the current filters.", variant: "destructive" });
      return;
    }
    setCopying(true);
    try {
      const result = await copyTextWithFallback(nominationsToTsv(filtered), "nominations.tsv");
      if (result === "copied") {
        toast({ title: copiedNominationsTitle(filtered) });
      } else {
        toast({
          title: `Downloaded ${filtered.length} nomination${filtered.length !== 1 ? "s" : ""}`,
          description: uniquePhoneCount(filtered) !== filtered.length
            ? `${uniquePhoneCount(filtered)} unique phones. Clipboard was too large, so a TSV file was saved instead.`
            : "Clipboard was too large, so a TSV file was saved instead.",
        });
      }
    } catch {
      toast({ title: "Copy failed", description: "Could not copy or download the list.", variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const selectClass = "bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9";
  const filterLabel = (value: string, allLabel: string) => (value === "all" ? allLabel : value);

  const pager = filtered.length > MODAL_PAGE_SIZE && !detail ? (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 border-t border-white/10 text-xs text-white/50">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Rows</span>
        <Select value={pageSize} onValueChange={setPageSize}>
          <SelectTrigger className="h-8 w-[92px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["50", "100", "250", "500"].map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <span>{rangeStart}–{rangeEnd} of {filtered.length.toLocaleString("en-IN")}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={safePage === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="font-semibold text-secondary hover:text-secondary/80 disabled:text-white/25 disabled:pointer-events-none"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          className="font-semibold text-secondary hover:text-secondary/80 disabled:text-white/25 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  ) : null;

  return (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-[95vw] xl:max-w-7xl max-h-[90dvh] overflow-hidden flex flex-col text-white"
    >
      <div className="flex flex-col gap-3 p-3 sm:p-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-base sm:text-lg font-bold text-white truncate">{title || "Nominations"}</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {filtered.length} of {list.length} nomination{list.length !== 1 ? "s" : ""}
              {filtered.length > MODAL_PAGE_SIZE ? ` · showing ${rangeStart}–${rangeEnd}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="hero-outline"
              size="sm"
              className="gap-1.5 text-xs h-9"
              onClick={() => {
                setDetail(null);
                setPage(0);
                setLayout((cur) => (cur === "table" ? "cards" : "table"));
              }}
            >
              <Eye className="w-3.5 h-3.5" /> {layout === "table" ? "View all" : "Table"}
            </Button>
            <Button
              type="button"
              variant="hero-outline"
              size="sm"
              className="gap-1.5 text-xs h-9"
              disabled={copying || filtered.length === 0}
              onClick={() => void copyAll()}
            >
              {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              {copying ? "Copying…" : `Copy all (${filtered.length.toLocaleString("en-IN")})`}
            </Button>
            <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search teacher, student, school, phone, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{filterLabel(typeFilter, "All types")}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{statusFilter === "all" ? "All status" : statusFilter === "draft" ? "Incomplete" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s === "draft" ? "Incomplete" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{filterLabel(classFilter, "All classes")}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{filterLabel(subjectFilter, "All subjects")}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{filterLabel(categoryFilter, "All categories")}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{sourceFilter === "all" ? "All sources" : prettyUtm(sourceFilter)}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{prettyUtm(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={linkFilter} onValueChange={setLinkFilter}>
            <SelectTrigger className={selectClass}><span className="truncate">{linkFilter === "all" ? "All UTM links" : linkFilter}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All UTM links</SelectItem>
              {links.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-secondary hover:text-secondary/80 self-center justify-self-start">
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="overflow-auto flex-1 pb-6 safe-bottom">
        {detail ? (
          <div className="p-3 sm:p-5 space-y-3">
            <button type="button" onClick={() => setDetail(null)} className="text-[11px] font-semibold text-secondary hover:text-secondary/80">
              ← Back to table
            </button>
            <NominationDetailCard n={detail} onPhotoClick={onPhotoClick} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-white/50 py-10 text-center px-4">
            {list.length === 0 ? "No nominations attributed to this influencer yet." : "No nominations match the current filters."}
          </p>
        ) : layout === "cards" ? (
          <div className="p-3 sm:p-5 space-y-4">
            {pageRows.map((n, i) => (
              <NominationDetailCard key={n.id || n._id || i} n={n} onPhotoClick={onPhotoClick} />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[1280px]">
            <thead className="sticky top-0 z-10 bg-[#141414]">
              <tr className="border-b border-white/10">
                {["Teacher", "Student", "School", "Class", "Subject", "Status", "UTM link", "Source", "Medium", "Campaign", "Date", ""].map((h) => (
                  <th key={h || "action"} className="text-left text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((n, i) => (
                <tr key={n.id || n._id || i} className="border-b border-white/5 hover:bg-white/[0.04]">
                  <td className="px-3 py-2.5 text-sm font-medium text-white whitespace-nowrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {n.photo_url ? (
                        <button type="button" onClick={() => onPhotoClick?.(n)} className="flex-shrink-0">
                          <img
                            src={cloudinaryDisplayUrl(n.photo_url, { width: 64 })}
                            alt=""
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-cover border border-white/10"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <ImageOff className="w-3.5 h-3.5 text-white/25" />
                        </div>
                      )}
                      <span className="truncate max-w-[160px]">{displayName(n)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/80 whitespace-nowrap">{n.student_name || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-white/70 max-w-[160px] truncate">{n.school_name || "—"}</td>
                  <td className="px-3 py-2.5 text-[11px] text-white/60 max-w-[140px] truncate">{classOrExp(n) || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-white/70 whitespace-nowrap">{n.subject || "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={n.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-white/85 max-w-[180px] truncate" title={utmLinkName(n)}>{utmLinkName(n)}</td>
                  <td className="px-3 py-2.5"><UtmChip n={n} compact /></td>
                  <td className="px-3 py-2.5 text-[11px] text-white/60 whitespace-nowrap">{n.utm_medium ? prettyUtm(n.utm_medium) : "—"}</td>
                  <td className="px-3 py-2.5 text-[11px] text-white/50 max-w-[160px] truncate" title={n.utm_campaign || ""}>{n.utm_campaign || "—"}</td>
                  <td className="px-3 py-2.5 text-[11px] text-white/45 whitespace-nowrap">{n.created_at ? new Date(n.created_at).toLocaleString("en-IN") : "—"}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setDetail(n)}
                      className="text-[11px] font-semibold text-secondary hover:text-secondary/80"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pager}
    </motion.div>
  </div>
  );
};

const PhotoLightbox = ({ photo, onClose }: { photo: { url: string; name: string }; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative max-w-3xl w-full min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/60 text-white/80 hover:text-white flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
        <img
          src={cloudinaryDisplayUrl(photo.url, { width: 1400, crop: "limit" })}
          alt={photo.name}
          className="w-full max-h-[80dvh] object-contain rounded-xl"
        />
        <p className="text-center text-white/80 text-sm mt-3 px-2">{photo.name}</p>
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
          // "draft" is not an assignable status, so an incomplete lead keeps its stage
          // unless the admin explicitly picks one above.
          ...(isIncomplete(form) ? {} : { status: form.status }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto safe-bottom"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-5 border-b border-white/10 sticky top-0 bg-[#141414] z-10">
          <div>
            <h2 className="font-heading text-lg font-bold text-white">Edit Nomination</h2>
            <p className="text-xs text-white/40 mt-0.5">Make changes and save</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-3 sm:p-5 space-y-4">

          {/* Status — most important, at top */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/10">
            <Label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 block">Application Status</Label>
            {isIncomplete(form) && (
              <p className="text-xs text-white/40 mb-3">
                This lead is incomplete ({stageLabel(nomination)}). Pick a status only if you want to move it into review.
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                src={cloudinaryDisplayUrl(form.photo_url, { width: 224 })}
                alt={form.teacher_name || form.full_name || "Teacher"}
                width={112}
                height={112}
                className="h-28 w-28 rounded-xl object-cover border border-white/10"
              />
            </div>
          )}

          {/* Teacher / Applicant Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nomination.type === "student" ? (
              <>
                <div>
                  <Label className="text-white/60 text-xs mb-1.5 block">Teacher Full Name</Label>
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
        <div className="flex items-center justify-between p-3 sm:p-5 border-t border-white/10 sticky bottom-0 bg-[#141414]">
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




// ── Main Admin Page ──
const AdminPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [nominations, setNominations] = useState<any[]>([]);
  const [adminUser, setAdminUser] = useState(getAdminUser());
  const tabs = allowedAdminTabs(adminUser);
  const [activeTab, setActiveTab] = useState<AdminTab>(firstAllowedTab(adminUser));
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [funnelFilter, setFunnelFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [tablePage, setTablePage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState<string>(String(MODAL_PAGE_SIZE));
  const [editingNom, setEditingNom] = useState<any | null>(null);
  const [viewingNoms, setViewingNoms] = useState<any[] | null>(null);
  const [viewingTitle, setViewingTitle] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const [showUtmDetails, setShowUtmDetails] = useState(false);
  const [copyingDetails, setCopyingDetails] = useState(false);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin-login");
      return;
    }
    const current = getAdminUser();
    const allowed = allowedAdminTabs(current);
    if (!isTabAllowed(activeTab, allowed)) {
      setActiveTab(firstAllowedTab(current));
    }
    const session = getAdminSession();
    if (!session) return;
    void adminGetMe()
      .then(({ user }) => {
        const role = user.role === "super_admin" ? "super_admin" as const : "staff" as const;
        const nextUser = {
          ...session.user,
          ...user,
          role,
          permissions: role === "super_admin" ? [...PANEL_PERMISSIONS] : user.permissions,
        };
        setAdminSession({ token: session.token, user: nextUser });
        setAdminUser(nextUser);
      })
      .catch(() => undefined);
  }, []);

  const handleLogout = () => {
    void adminLogoutApi().catch(() => undefined);
    adminLogout();
    navigate("/admin-login");
  };

  const submitted = nominations.filter(n => !isIncomplete(n));
  const total = submitted.length;
  const pending = submitted.filter(n => n.status === "pending").length;
  const shortlisted = submitted.filter(n => n.status === "shortlisted").length;
  const winners = submitted.filter(n => n.status === "winner").length;
  const incompleteLeads = nominations.length - submitted.length;
  const unverifiedLeads = nominations.filter(neverVerifiedOtp).length;

  const categoryCount = submitted.reduce((acc: Record<string, number>, n) => {
    acc[n.award_category] = (acc[n.award_category] || 0) + 1;
    return acc;
  }, {});

  const fetchNominations = async () => {
    setLoading(true);
    try {
      const canLoadNominations =
        isSuperAdmin() ||
        hasAdminPermission("nominations") ||
        hasAdminPermission("campaigns") ||
        hasAdminPermission("digital");

      const noms = canLoadNominations ? await adminGetNominations() : [];
      setNominations(noms);
    } catch (err: any) {
      if (!isAdminLoggedIn()) {
        navigate("/admin-login");
        return;
      }
      toast({ title: "Failed to load", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn()) fetchNominations();
  }, []);

  const handleEditSave = (updated: any) => {
    setNominations(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const deleteNomination = async (n: any) => {
    if (adminUser?.role !== "super_admin") return;
    const name = displayName(n);
    const confirmed = window.confirm(`Delete this nomination for ${name}? This cannot be undone.`);
    if (!confirmed) return;
    setUpdating(n.id + "delete");
    try {
      await adminDeleteNomination(n.id);
      setNominations((prev) => prev.filter((row) => row.id !== n.id));
      toast({ title: "Nomination deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const canDeleteNominations = adminUser?.role === "super_admin";

  const filtered = useMemo(() => nominations.filter(n => {
    const q = search.toLowerCase();
    const haystack = [
      n.teacher_name, n.full_name, n.school_name, n.student_name,
      n.phone, n.nominator_name, n.nominator_phone,
      n.utm_source, n.utm_medium, n.utm_campaign, n.utm_content, utmLinkName(n),
    ];
    const matchSearch = haystack.some(v => String(v || "").toLowerCase().includes(q));
    const matchCategory = categoryFilter === "All" || n.award_category === categoryFilter;
    const matchStatus = statusFilter === "All" || n.status === statusFilter;
    const matchFunnel = matchesFunnelFilter(n, funnelFilter);
    const matchType = typeFilter === "All" || n.type === typeFilter;
    const matchSource = sourceFilter === "All" || utmSourceKey(n) === sourceFilter;
    const matchDate = !dateFilter || istDayKey(n.created_at) === istDayKey(dateFilter);
    return matchSearch && matchCategory && matchStatus && matchFunnel && matchType && matchSource && matchDate;
  }), [nominations, search, categoryFilter, statusFilter, funnelFilter, typeFilter, sourceFilter, dateFilter]);

  useEffect(() => {
    setTablePage(0);
  }, [search, categoryFilter, statusFilter, funnelFilter, typeFilter, sourceFilter, dateFilter, tablePageSize]);

  const rowsPerPage = tablePageSize === "all" ? Math.max(1, filtered.length) : Number(tablePageSize);
  const tablePageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safeTablePage = Math.min(tablePage, tablePageCount - 1);
  const tableRows = useMemo(
    () => filtered.slice(safeTablePage * rowsPerPage, (safeTablePage + 1) * rowsPerPage),
    [filtered, safeTablePage, rowsPerPage],
  );
  const tableRangeStart = filtered.length === 0 ? 0 : safeTablePage * rowsPerPage + 1;
  const tableRangeEnd = Math.min(filtered.length, (safeTablePage + 1) * rowsPerPage);

  const categories = ["All", ...Array.from(new Set(nominations.map(n => n.award_category).filter(Boolean)))];
  const utmSources = ["All", ...Array.from(new Set(nominations.map(utmSourceKey)))];

  const exportCSV = () => {
    // BOM so Excel opens Indian names and other non-ASCII text correctly.
    const blob = new Blob(["\uFEFF", nominationsToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nominations.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyAllFiltered = async () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to copy", description: "No nominations match the current filters.", variant: "destructive" });
      return;
    }
    try {
      const result = await copyTextWithFallback(nominationsToTsv(filtered), "nominations.tsv");
      if (result === "copied") {
        toast({ title: copiedNominationsTitle(filtered) });
      } else {
        toast({
          title: `Downloaded ${filtered.length} nomination${filtered.length !== 1 ? "s" : ""}`,
          description: uniquePhoneCount(filtered) !== filtered.length
            ? `${uniquePhoneCount(filtered)} unique phones. Clipboard was too large, so a TSV file was saved instead.`
            : "Clipboard was too large, so a TSV file was saved instead.",
        });
      }
    } catch {
      toast({ title: "Copy failed", description: "Could not copy or download the list.", variant: "destructive" });
    }
  };

  const openViewAll = () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to view", description: "No nominations match the current filters.", variant: "destructive" });
      return;
    }
    setViewingTitle(null);
    setViewingNoms(filtered);
  };

  const openLeadDetailsAll = () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to view", description: "No leads match the current filters.", variant: "destructive" });
      return;
    }
    setViewingTitle(`Lead details · UTM links (${filtered.length.toLocaleString("en-IN")})`);
    setViewingNoms(filtered);
  };

  const copyLeadDetailsAll = async () => {
    if (copyingDetails) return;
    if (filtered.length === 0) {
      toast({ title: "Nothing to copy", description: "No leads match the current filters.", variant: "destructive" });
      return;
    }
    setCopyingDetails(true);
    try {
      const result = await copyTextWithFallback(leadDetailsToTsv(filtered), "lead-details.tsv");
      if (result === "copied") {
        toast({
          title: copiedNominationsTitle(filtered),
          description: "Includes teacher, phones, and the UTM link name each lead came from.",
        });
      } else {
        toast({
          title: `Downloaded ${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`,
          description: uniquePhoneCount(filtered) !== filtered.length
            ? `${uniquePhoneCount(filtered)} unique phones. Clipboard was too large, so a TSV file was saved instead.`
            : "Clipboard was too large, so a TSV file was saved instead.",
        });
      }
    } catch {
      toast({ title: "Copy failed", description: "Could not copy or download the lead details.", variant: "destructive" });
    } finally {
      setCopyingDetails(false);
    }
  };

  if (!isAdminLoggedIn()) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0505" }}>
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  const campaignBadge = submitted.filter(hasUtm).length;

  return (
    <div className="min-h-screen lg:flex" style={{ background: "hsl(0,0%,8%)" }}>
      <AdminSidebar
        activeTab={activeTab}
        allowed={tabs}
        badges={campaignBadge > 0 ? { campaigns: campaignBadge } : undefined}
        user={adminUser}
        onSelect={setActiveTab}
        onLogout={handleLogout}
        actions={
          <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-8 px-2" onClick={fetchNominations}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        }
      />

      <div className="min-w-0 flex-1 flex flex-col">
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
        {viewingNoms !== null && (
          <ViewNominationsModal
            key="view-nominations"
            nominations={viewingNoms}
            title={viewingTitle || (viewingNoms.length === 1 ? "Nomination details" : "View all nominations")}
            onClose={() => { setViewingNoms(null); setViewingTitle(null); }}
            onPhotoClick={(n) => n.photo_url && setLightbox({ url: n.photo_url, name: displayName(n) })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lightbox && (
          <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>

      <div className="hidden lg:flex sticky top-0 z-30 items-center justify-between gap-3 min-h-14 px-5 xl:px-8 border-b border-primary-foreground/10 bg-[#0f0808]/90 backdrop-blur-lg">
        <div className="min-w-0">
          <h1 className="font-heading text-base xl:text-lg font-bold text-primary-foreground truncate">{adminTabLabel(activeTab)}</h1>
          <p className="text-[11px] text-primary-foreground/40 truncate">
            {adminUser?.name || adminUser?.username
              ? `${adminUser.name || adminUser.username}${adminUser.role === "super_admin" ? " · Super admin" : ""}`
              : "Future-Ready Educator Awards 2026"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/" className="text-[11px] font-semibold text-primary-foreground/45 hover:text-primary-foreground px-2">
            View site
          </Link>
          <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={fetchNominations}>
            <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Refresh</span>
          </Button>
          {activeTab !== "access" && activeTab !== "whatsapp" && activeTab !== "teacher-video-messaging" && activeTab !== "teachers" && activeTab !== "teacher-images" && activeTab !== "video-production" && activeTab !== "videos" && activeTab !== "offline" && activeTab !== "after-session" && (
            <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 py-6 sm:py-8 px-3 sm:px-5 xl:px-8 ${
        activeTab === "nominations" || activeTab === "teachers" || activeTab === "teacher-images" || activeTab === "video-production" || activeTab === "videos" || activeTab === "teacher-video-messaging" || activeTab === "offline" || activeTab === "after-session"
          ? "w-full"
          : "w-full max-w-6xl"
      }`}>
        {activeTab === "access" ? (
          <AccessManagementPanel />
        ) : activeTab === "whatsapp" ? (
          <WhatsAppOpsPanel />
        ) : activeTab === "teacher-video-messaging" ? (
          <TeacherVideoMessagingPanel />
        ) : activeTab === "videos" ? (
          <TeacherVideoReviewPanel />
        ) : activeTab === "teacher-images" ? (
          <TeacherImageManagementPanel mode="images" />
        ) : activeTab === "video-production" ? (
          <TeacherImageManagementPanel mode="videos" />
        ) : activeTab === "after-session" ? (
          <AfterSessionNominationsPanel />
        ) : activeTab === "nominations" ? (
          <>
            <FunnelAnalytics
              dateKey={dateFilter ? istDayKey(dateFilter) : undefined}
              onStageClick={(stageId) => {
                if (stageId === "shortlisted") {
                  setFunnelFilter("All");
                  setStatusFilter("shortlisted");
                  return;
                }
                if (stageId === "winners") {
                  setFunnelFilter("All");
                  setStatusFilter("winner");
                  return;
                }
                setStatusFilter("All");
                setFunnelFilter(stageId);
              }}
            />
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                <span className="ml-3 text-primary-foreground/60">Loading nominations…</span>
              </div>
            ) : (
          <>
            {/* Shortlisted → voting banner */}
            {shortlisted === 0 && pending > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl mb-5 border border-amber-500/30 bg-amber-500/10">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white"><span className="text-amber-400">{pending}</span> nomination{pending !== 1 ? "s" : ""} awaiting review</p>
                  <p className="text-xs text-primary-foreground/40">{pending} nomination{pending !== 1 ? "s" : ""} still in review</p>
                </div>
              </div>
            )}
            {shortlisted > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl mb-5 border border-blue-500/20 bg-blue-500/10">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white"><span className="text-blue-400">{shortlisted}</span> nomination{shortlisted !== 1 ? "s" : ""} shortlisted</p>
                  <p className="text-xs text-primary-foreground/40">These teachers have been shortlisted for the next stage</p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { label: "Total Nominations", value: total, icon: Users, color: "bg-primary" },
                { label: "Pending Review", value: pending, icon: Eye, color: "bg-secondary" },
                { label: "Shortlisted", value: shortlisted, icon: CheckCircle2, color: "bg-blue-600" },
                { label: "Winners", value: winners, icon: Award, color: "bg-green-600" },
                { label: "Incomplete leads", value: incompleteLeads, icon: Hourglass, color: "bg-white/20" },
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
                  { label: "Student Nominations", count: submitted.filter(n => n.type === "student").length, color: "bg-primary" },
                  { label: "Teacher Self-Nominations", count: submitted.filter(n => n.type === "teacher").length, color: "bg-secondary" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-xs sm:text-sm text-primary-foreground/70">{item.label}</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-primary-foreground">{item.count}</span>
                  </div>
                ))}
                {submitted[0] && (
                  <div className="mt-2 p-4 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-semibold text-primary-foreground">Latest Submission</span>
                    </div>
                    <p className="text-sm text-primary-foreground/60 flex items-center gap-2">
                      {submitted[0].photo_url ? (
                        <img
                          src={cloudinaryDisplayUrl(submitted[0].photo_url, { width: 64 })}
                          alt=""
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-lg object-cover border border-white/10"
                        />
                      ) : null}
                      {submitted[0].teacher_name || submitted[0].full_name || "—"}
                    </p>
                    <p className="text-xs text-primary-foreground/40">{submitted[0].school_name || ""} · {new Date(submitted[0].created_at).toLocaleDateString("en-IN")}</p>
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
                    <div className="min-w-0">
                      <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground">
                        All Nominations <span className="text-primary-foreground/40 font-normal text-sm">({filtered.length})</span>
                      </h2>
                      {funnelFilter === "All" && unverifiedLeads > 0 && (
                        <p className="text-xs text-primary-foreground/40 mt-0.5">
                          {unverifiedLeads.toLocaleString("en-IN")} never-verified OTP leads are hidden. Choose “Never verified OTP” or “OTP requested (all leads)” to include them.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9" onClick={openViewAll}>
                        <Eye className="w-3.5 h-3.5" /> View all ({filtered.length.toLocaleString("en-IN")})
                      </Button>
                      <Button
                        variant="hero-outline"
                        size="sm"
                        className="gap-1.5 text-xs h-9"
                        onClick={() => setShowUtmDetails((open) => !open)}
                      >
                        <Table2 className="w-3.5 h-3.5" /> {showUtmDetails ? "Hide details" : "Details"}
                      </Button>
                      <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => void copyAllFiltered()}>
                        <Copy className="w-3.5 h-3.5" /> Copy all ({filtered.length.toLocaleString("en-IN")})
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
                      <Input placeholder="Search teacher, student, school, phone..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-full bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9" />
                    </div>
                    <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground text-xs w-full min-w-0 lg:w-auto"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-primary-foreground/50 flex-shrink-0" />
                            <span className="truncate">{dateFilter ? dateFilter.toLocaleDateString("en-IN") : "All dates"}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3 bg-[#141414] border-white/10" align="start">
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
                        <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[130px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === "All" ? "All Categories" : c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[110px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["All","pending","shortlisted","winner","rejected","draft"].map(s => (
                            <SelectItem key={s} value={s}>
                              {s === "All" ? "All Status" : s === "draft" ? "Incomplete" : s.charAt(0).toUpperCase() + s.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={funnelFilter} onValueChange={setFunnelFilter}>
                        <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[220px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FUNNEL_FILTERS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[100px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Types</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[120px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {utmSources.map(s => (
                            <SelectItem key={s} value={s}>{s === "All" ? "All sources" : prettyUtm(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:hidden p-3 space-y-3">
                {tableRows.map((n) => (
                  <div key={n.id} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3 space-y-3">
                    {n.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setLightbox({ url: n.photo_url, name: displayName(n) })}
                        className="block w-full"
                      >
                        <img
                          src={cloudinaryDisplayUrl(n.photo_url, { width: 800 })}
                          alt={displayName(n)}
                          width={800}
                          height={384}
                          className="w-full h-48 rounded-xl object-cover border border-white/10"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                        <ImageOff className="w-8 h-8" />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${n.type === "student" ? "bg-primary/20 text-primary-foreground" : "bg-secondary/20 text-secondary"}`}>{n.type}</span>
                        <StatusBadge status={n.status} />
                        <WhatsAppStatusBadge n={n} />
                        <UtmChip n={n} />
                      </div>
                      <p className="text-xs text-primary-foreground/50">Stage: {stageLabel(n)}</p>
                      <h3 className="font-heading font-bold text-white text-lg leading-tight">{displayName(n)}</h3>
                      <p className="text-sm text-primary-foreground/60">{n.school_name || "—"}</p>
                      {n.student_name && <p className="text-xs text-primary-foreground/45">Student: {n.student_name}</p>}
                      <p className="text-sm text-primary-foreground/70">Teacher: {n.phone || "—"}</p>
                      <p className="text-sm text-primary-foreground/70">User: {n.nominator_phone || "—"}</p>
                      <p className="text-xs text-primary-foreground/40">{n.created_at ? formatDateIn(n.created_at) : "—"}</p>
                      {n.award_category && (
                        <Badge variant="outline" className="text-[10px] border-primary-foreground/20 text-primary-foreground/60">{n.award_category.replace(" Award", "")}</Badge>
                      )}
                    </div>
                    <NominationActions
                      n={n}
                      updating={updating}
                      stacked
                      canDelete={canDeleteNominations}
                      onView={() => setViewingNoms([n])}
                      onDelete={() => void deleteNomination(n)}
                    />
                  </div>
                ))}
              </div>
              <div className="hidden lg:block px-2 pb-2">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[72px]" />
                    <col className="w-[72px]" />
                    <col />
                    <col />
                    <col />
                    <col className="w-[11%]" />
                    <col className="w-[132px]" />
                    <col className="w-[104px]" />
                    <col className="w-[108px]" />
                    <col className="w-[108px]" />
                    <col className="w-[92px]" />
                    <col className="w-[168px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-primary-foreground/10">
                      {["Type","Photo","Teacher / Applicant","Student","School","Campaign","Phones","Status","WhatsApp","Stage","Date","Actions"].map(h => (
                        <th
                          key={h}
                          className={`text-[10px] sm:text-xs font-semibold text-primary-foreground/40 uppercase tracking-wider px-2.5 py-3 whitespace-nowrap ${
                            h === "Actions" ? "text-right" : "text-left"
                          }`}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((n) => (
                      <tr key={n.id}
                        className="border-b border-primary-foreground/5 hover:bg-primary-foreground/[0.04] transition-colors">
                        <td className="px-2.5 py-3 align-middle">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${n.type === "student" ? "bg-primary/20 text-primary-foreground" : "bg-secondary/20 text-secondary"}`}>{n.type}</span>
                        </td>
                        <td className="px-2.5 py-3 align-middle">
                          {n.photo_url ? (
                            <button
                              type="button"
                              onClick={() => setLightbox({ url: n.photo_url, name: displayName(n) })}
                              className="block"
                              title="View photo"
                            >
                              <img
                                src={cloudinaryDisplayUrl(n.photo_url, { width: 88 })}
                                alt={displayName(n)}
                                width={44}
                                height={44}
                                className="w-11 h-11 rounded-lg object-cover border border-white/10 hover:ring-2 hover:ring-white/30"
                                loading="lazy"
                                decoding="async"
                              />
                            </button>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                              <ImageOff className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-3 align-middle text-xs sm:text-sm font-medium text-primary-foreground min-w-0">
                          <p className="truncate" title={displayName(n)}>{displayName(n)}</p>
                        </td>
                        <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/60 min-w-0">
                          <p className="truncate" title={n.student_name || ""}>{n.student_name || "—"}</p>
                        </td>
                        <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/60 min-w-0">
                          <p className="truncate" title={n.school_name || ""}>{n.school_name || "—"}</p>
                        </td>
                        <td className="px-2.5 py-3 align-middle min-w-0">
                          <UtmChip n={n} compact />
                        </td>
                        <td className="px-2.5 py-3 align-middle">
                          <PhonePair n={n} />
                        </td>
                        <td className="px-2.5 py-3 align-middle"><StatusBadge status={n.status} /></td>
                        <td className="px-2.5 py-3 align-middle"><WhatsAppStatusBadge n={n} compact /></td>
                        <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/55 truncate" title={stageLabel(n)}>{stageLabel(n)}</td>
                        <td className="px-2.5 py-3 align-middle text-xs text-primary-foreground/40 whitespace-nowrap">{n.created_at ? formatDateIn(n.created_at) : "—"}</td>
                        <td className="px-2.5 py-3 align-middle text-right">
                          <NominationActions
                            n={n}
                            updating={updating}
                            canDelete={canDeleteNominations}
                            onView={() => setViewingNoms([n])}
                            onDelete={() => void deleteNomination(n)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-primary-foreground/40">
                  {nominations.length === 0 ? "No nominations yet. Share the site to get started!" : "No nominations match your filters."}
                </div>
              )}
              {filtered.length > MODAL_PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-primary-foreground/10 text-xs text-primary-foreground/50">
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">Rows</span>
                    <Select value={tablePageSize} onValueChange={setTablePageSize}>
                      <SelectTrigger className="h-8 w-[92px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["50", "100", "250", "500"].map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span>{tableRangeStart}–{tableRangeEnd} of {filtered.length.toLocaleString("en-IN")}</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={safeTablePage === 0}
                      onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                      className="font-semibold text-secondary hover:text-secondary/80 disabled:text-primary-foreground/25 disabled:pointer-events-none"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safeTablePage >= tablePageCount - 1}
                      onClick={() => setTablePage((p) => Math.min(tablePageCount - 1, p + 1))}
                      className="font-semibold text-secondary hover:text-secondary/80 disabled:text-primary-foreground/25 disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
            {showUtmDetails && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden mt-4"
              >
                <div className="p-4 sm:p-6 border-b border-primary-foreground/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground">
                      Lead details <span className="text-primary-foreground/40 font-normal text-sm">({filtered.length})</span>
                    </h2>
                    <p className="text-xs text-primary-foreground/40 mt-0.5">
                      Teacher, student, phones, and the UTM link name each lead came from.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9" onClick={openLeadDetailsAll}>
                      <Eye className="w-3.5 h-3.5" /> View all ({filtered.length.toLocaleString("en-IN")})
                    </Button>
                    <Button
                      variant="hero-outline"
                      size="sm"
                      className="gap-1.5 text-xs h-9"
                      disabled={copyingDetails || filtered.length === 0}
                      onClick={() => void copyLeadDetailsAll()}
                    >
                      {copyingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                      {copyingDetails ? "Copying…" : `Copy all (${filtered.length.toLocaleString("en-IN")})`}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowUtmDetails(false)}
                      className="text-[11px] font-semibold text-secondary hover:text-secondary/80"
                    >
                      Hide details
                    </button>
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm text-primary-foreground/40 py-12 text-center">No leads match the current filters.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1180px]">
                        <thead>
                          <tr className="border-b border-primary-foreground/10">
                            {["Teacher", "Student", "School", "Teacher phone", "User phone", "Status", "UTM link name", "Source", "Medium", "Campaign", "Date", ""].map((h) => (
                              <th key={h || "action"} className={`text-[10px] font-semibold text-primary-foreground/40 uppercase tracking-wider px-3 py-3 whitespace-nowrap ${h ? "text-left" : "text-right"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((n) => (
                            <tr key={`utm-${n.id}`} className="border-b border-primary-foreground/5 hover:bg-primary-foreground/[0.04]">
                              <td className="px-3 py-2.5 text-sm font-medium text-primary-foreground whitespace-nowrap max-w-[160px] truncate">{displayName(n)}</td>
                              <td className="px-3 py-2.5 text-xs text-primary-foreground/70 whitespace-nowrap">{n.student_name || "—"}</td>
                              <td className="px-3 py-2.5 text-xs text-primary-foreground/60 max-w-[160px] truncate">{n.school_name || "—"}</td>
                              <td className="px-3 py-2.5 text-xs text-primary-foreground/70 whitespace-nowrap">{n.phone || "—"}</td>
                              <td className="px-3 py-2.5 text-xs text-primary-foreground/70 whitespace-nowrap">{n.nominator_phone || "—"}</td>
                              <td className="px-3 py-2.5"><StatusBadge status={n.status} /></td>
                              <td className="px-3 py-2.5 text-xs text-primary-foreground max-w-[200px] truncate" title={utmLinkName(n)}>{utmLinkName(n)}</td>
                              <td className="px-3 py-2.5"><UtmChip n={n} compact /></td>
                              <td className="px-3 py-2.5 text-[11px] text-primary-foreground/60 whitespace-nowrap">{n.utm_medium ? prettyUtm(n.utm_medium) : "—"}</td>
                              <td className="px-3 py-2.5 text-[11px] text-primary-foreground/50 max-w-[180px] truncate" title={n.utm_campaign || ""}>{n.utm_campaign || "—"}</td>
                              <td className="px-3 py-2.5 text-xs text-primary-foreground/40 whitespace-nowrap">{n.created_at ? formatDateIn(n.created_at) : "—"}</td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingTitle(`Lead details · ${utmLinkName(n)}`);
                                    setViewingNoms([n]);
                                  }}
                                  className="text-[11px] font-semibold text-secondary hover:text-secondary/80"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filtered.length > MODAL_PAGE_SIZE && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-primary-foreground/10 text-xs text-primary-foreground/50">
                        <span>{tableRangeStart}–{tableRangeEnd} of {filtered.length.toLocaleString("en-IN")}</span>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            disabled={safeTablePage === 0}
                            onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                            className="font-semibold text-secondary hover:text-secondary/80 disabled:text-primary-foreground/25 disabled:pointer-events-none"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={safeTablePage >= tablePageCount - 1}
                            onClick={() => setTablePage((p) => Math.min(tablePageCount - 1, p + 1))}
                            className="font-semibold text-secondary hover:text-secondary/80 disabled:text-primary-foreground/25 disabled:pointer-events-none"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </>
            )}
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-secondary animate-spin" />
            <span className="ml-3 text-primary-foreground/60">Loading nominations…</span>
          </div>
        ) : activeTab === "teachers" ? (
          <UniqueTeachersPanel nominations={submitted} onView={(noms, title) => {
            const list = Array.isArray(noms) ? noms.filter(Boolean) : [];
            setViewingTitle(title);
            setViewingNoms(list);
          }} />
        ) : activeTab === "offline" ? (
          <OfflineTeamPanel nominations={submitted} onView={(noms, title) => {
            const list = Array.isArray(noms) ? noms.filter(Boolean) : [];
            setViewingTitle(title);
            setViewingNoms(list);
          }} />
        ) : activeTab === "campaigns" ? (
          <CampaignsPanel nominations={submitted} onView={(noms, title) => {
            const list = Array.isArray(noms) ? noms.filter(Boolean) : [];
            setViewingTitle(title);
            setViewingNoms(list);
          }} />
        ) : activeTab === "digital" ? (
          <DigitalMarketingPanel nominations={submitted} onView={(noms, title) => {
            const list = Array.isArray(noms) ? noms.filter(Boolean) : [];
            setViewingTitle(title);
            setViewingNoms(list);
          }} />
        ) : null}
      </div>
      </div>
    </div>
  );
};

export default AdminPage;
