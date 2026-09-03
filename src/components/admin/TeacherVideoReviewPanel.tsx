import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clapperboard,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cloudinaryDisplayUrl } from "@/lib/cloudinaryUrl";
import { API_URL } from "@/lib/apiBase";
import {
  adminGetVideoReviews,
  adminReviewVideo,
  type PortraitStatus,
  type VideoReviewCounts,
  type VideoReviewItem,
} from "@/lib/apiAdmin";

const emptyCounts: VideoReviewCounts = {
  total: 0,
  with_photo: 0,
  without_photo: 0,
  needs_with_photo_regen: 0,
  ready_for_review: 0,
  approved: 0,
  rejected: 0,
  failed: 0,
  student_with_photo: 0,
  student_without_photo: 0,
  teacher_with_photo: 0,
  teacher_without_photo: 0,
  colleague_with_photo: 0,
  colleague_without_photo: 0,
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "student_with_photo", label: "Student nominated teacher — with photo" },
  { value: "student_without_photo", label: "Student nominated teacher — without photo" },
  { value: "teacher_with_photo", label: "Teacher nominated teacher — with photo" },
  { value: "teacher_without_photo", label: "Teacher nominated teacher — without photo" },
  { value: "colleague_with_photo", label: "Teacher nominated other teacher — with photo" },
  { value: "colleague_without_photo", label: "Teacher nominated other teacher — without photo" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Generation Failed" },
  { value: "portrait_ready", label: "Portrait Ready" },
  { value: "portrait_needs_review", label: "Needs Review" },
  { value: "portrait_processing", label: "Processing" },
  { value: "portrait_failed", label: "Failed" },
] as const;

const PORTRAIT_STATUS_LABEL: Record<PortraitStatus, string> = {
  NOT_STARTED: "Not Started",
  PROCESSING: "Processing",
  READY: "Ready",
  NEEDS_REVIEW: "Needs Review",
  FAILED: "Failed",
  NOT_PROVIDED: "Not Provided",
};

const mediaUrl = (value: string | null | undefined) => {
  const path = String(value || "").trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const CHECKERBOARD = {
  backgroundColor: "#ececec",
  backgroundImage:
    "linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
} as const;

const formatWhen = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

const nominatorLabel = (item: VideoReviewItem) =>
  String(item.student_name || item.nominator_name || "").trim() || "—";

const reviewBucket = (item: VideoReviewItem) => {
  if (!item.eligible) return "not_eligible";
  if (item.generation_status === "failed") return "failed";
  if (item.review_status === "ready_for_review" && item.video_url) return "ready_for_review";
  if (item.review_status === "approved") return "approved";
  if (item.review_status === "rejected") return "rejected";
  if (item.review_status === "regeneration_required") return "regeneration_required";
  return "pending";
};

const KIND_LABEL: Record<string, string> = {
  student: "Student nominated teacher",
  teacher: "Teacher nominated teacher",
  colleague: "Teacher nominated other teacher",
};

const presentationKey = (item: VideoReviewItem) => {
  const kind = item.nomination_kind || (item.nomination_type === "teacher" ? "teacher" : "student");
  const photo = item.photo_state || item.video_category;
  return `${kind}_${photo}`;
};

const portraitFilterMatch = (item: VideoReviewItem, filter: string) => {
  if (
    filter === "student_with_photo" ||
    filter === "student_without_photo" ||
    filter === "teacher_with_photo" ||
    filter === "teacher_without_photo" ||
    filter === "colleague_with_photo" ||
    filter === "colleague_without_photo"
  ) {
    return presentationKey(item) === filter;
  }
  if (filter === "with_photo") return item.video_category === "with_photo";
  if (filter === "without_photo") return item.video_category === "without_photo";
  if (filter === "portrait_ready") return item.portrait_status === "READY";
  if (filter === "portrait_needs_review") return item.portrait_status === "NEEDS_REVIEW";
  if (filter === "portrait_processing") return item.portrait_status === "PROCESSING";
  if (filter === "portrait_failed") return item.portrait_status === "FAILED";
  return null;
};

const generationLabel = (item: VideoReviewItem) => {
  if (!item.eligible) return "Not eligible";
  if (item.generation_status === "generated" && item.video_url) return "Generated";
  if (item.generation_status === "failed") return "Generation failed";
  return "Pending generation";
};

const reviewLabel = (item: VideoReviewItem) => {
  if (!item.eligible) return "Not eligible";
  const map: Record<string, string> = {
    ready_for_review: "Ready for review",
    approved: "Approved",
    rejected: "Rejected",
    regeneration_required: "Regeneration required",
    none: "Not reviewed",
  };
  return map[item.review_status] || item.review_status;
};

const videoPlayerUrl = (item: VideoReviewItem) => {
  const base = mediaUrl(item.video_url);
  if (!base) return null;
  const rid = String(item.video_render_id || "").trim();
  if (!rid) return base;
  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(rid)}`;
};

const PAGE_SIZE = 12;

const PortraitVideo = ({ url, title }: { url: string; title: string }) => {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[220px] rounded-xl overflow-hidden border border-white/10 bg-black">
      <div className="relative w-full" style={{ paddingTop: "177.78%" }}>
        {playing ? (
          <video
            className="absolute inset-0 h-full w-full object-contain bg-black"
            src={url}
            controls
            autoPlay
            playsInline
            preload="none"
            title={title}
          />
        ) : (
          <button
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black text-white/80 hover:text-white"
            onClick={() => setPlaying(true)}
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-lg">
              ▶
            </span>
            <span className="text-[11px]">Play video</span>
          </button>
        )}
      </div>
    </div>
  );
};

const FrameLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] font-semibold tracking-wide text-primary-foreground/45 mb-1.5 uppercase">{children}</p>
);

const StillFrame = ({
  label,
  empty,
  checkerboard,
  children,
}: {
  label: string;
  empty?: string;
  checkerboard?: boolean;
  children?: ReactNode;
}) => (
  <div className="min-w-0">
    <FrameLabel>{label}</FrameLabel>
    <div
      className="relative w-full overflow-hidden rounded-xl border border-white/10"
      style={{ aspectRatio: "9 / 16", ...(checkerboard ? CHECKERBOARD : { background: "rgba(0,0,0,0.35)" }) }}
    >
      {children || (
        <div className="absolute inset-0 flex items-center justify-center text-center px-2 text-[11px] text-white/40">
          {empty || "Not Provided"}
        </div>
      )}
    </div>
  </div>
);

const portraitStatusText = (item: VideoReviewItem) =>
  PORTRAIT_STATUS_LABEL[item.portrait_status] || item.portrait_status;

const ValidationList = ({ item }: { item: VideoReviewItem }) => {
  const report = item.portrait_report;
  if (!report || item.portrait_status === "NOT_PROVIDED") return null;
  const rows: { ok: boolean; warn?: boolean; text: string }[] = [];
  if (report.background_removed === true) rows.push({ ok: true, text: "Background removed" });
  if (report.background_removed === false) rows.push({ ok: false, warn: true, text: "Background not removed" });
  if (report.alpha_valid === true) rows.push({ ok: true, text: "Alpha valid" });
  if (report.alpha_valid === false) rows.push({ ok: false, warn: true, text: "Alpha invalid" });
  if (report.halo_detected === false) rows.push({ ok: true, text: "No halo detected" });
  if (report.halo_detected === true) rows.push({ ok: false, warn: true, text: "Halo detected" });
  if (report.composition_valid === true) rows.push({ ok: true, text: "Composition valid" });
  if (report.composition_valid === false) rows.push({ ok: false, warn: true, text: "Composition issue" });
  if (report.source_appearance_preserved === true) rows.push({ ok: true, text: "Source appearance preserved" });
  if (report.validation_status === "needs_review" || report.validation_status === "needs_manual_review") {
    rows.push({ ok: false, warn: true, text: "Needs manual review" });
  }
  if (!rows.length) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-primary-foreground/45 uppercase mb-1.5">
        Portrait Validation
      </p>
      <ul className="space-y-0.5 text-[11px] text-primary-foreground/65">
        {rows.map((row) => (
          <li key={row.text}>
            {row.ok ? "✓" : "⚠"} {row.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

const TeacherVideoReviewPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoReviewItem[]>([]);
  const [counts, setCounts] = useState<VideoReviewCounts>(emptyCounts);
  const [filter, setFilter] = useState<string>("ready_for_review");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<VideoReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await adminGetVideoReviews();
      setItems(Array.isArray(data.items) ? data.items : []);
      setCounts({ ...emptyCounts, ...(data.counts || {}) });
    } catch (err: unknown) {
      if (quiet) return;
      const message = err instanceof Error ? err.message : "Failed to load video reviews";
      toast({ title: "Failed to load", description: message, variant: "destructive" });
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const bucket = reviewBucket(item);
      const portraitMatch = portraitFilterMatch(item, filter);
      const matchFilter =
        portraitMatch !== null
          ? portraitMatch
          : filter === "all" ||
            bucket === filter ||
            (filter === "ready_for_review" && bucket === "regeneration_required");
      if (!matchFilter) return false;
      if (!q) return true;
      const haystack = [
        item.teacher_name,
        item.student_name,
        item.nominator_name,
        item.nomination_id,
        item.teacher_phone,
      ];
      return haystack.some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [items, filter, search]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const act = async (item: VideoReviewItem, action: "approve" | "reject", reason?: string) => {
    setBusyId(item.nomination_id);
    try {
      const updated = await adminReviewVideo(item.nomination_id, action, reason);
      setItems((prev) => prev.map((row) => (row.nomination_id === updated.nomination_id ? updated : row)));
      const data = await adminGetVideoReviews();
      setItems(Array.isArray(data.items) ? data.items : []);
      setCounts({ ...emptyCounts, ...(data.counts || {}) });
      toast({
        title: action === "approve" ? "Video approved" : "Video rejected",
        description:
          action === "approve"
            ? "Marked for a future message stage. Nothing was sent."
            : "Rejection saved. Nothing was sent.",
      });
      setRejecting(null);
      setRejectReason("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Could not update review", description: message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const cards = [
    { label: "Total submitted nominations", value: counts.total },
    { label: "Student · with photo", value: counts.student_with_photo || 0 },
    { label: "Student · without photo", value: counts.student_without_photo || 0 },
    { label: "Teacher · with photo", value: counts.teacher_with_photo || 0 },
    { label: "Colleague · with photo", value: counts.colleague_with_photo || 0 },
    { label: "Ready for Review", value: counts.ready_for_review },
    { label: "Approved", value: counts.approved },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        <span className="ml-3 text-primary-foreground/60">Loading video reviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {cards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4"
          >
            <div className="text-2xl sm:text-3xl font-bold text-primary-foreground font-heading">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 space-y-3">
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2">
              <Clapperboard className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              Teacher Video Review
            </h2>
            <p className="text-xs text-primary-foreground/40 mt-1">
              {visible.length.toLocaleString("en-IN")} matching · showing {paged.length} on this page.
              Videos load only after you click Play.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
              <Input
                placeholder="Search teacher, student, nomination ID, teacher phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="py-16 text-center text-primary-foreground/40">
            {filter === "ready_for_review" && !search
              ? "No videos ready for review yet."
              : "No nominations match this filter."}
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-4">
            {paged.map((item, i) => {
              const canReview =
                item.eligible &&
                Boolean(item.video_url) &&
                (item.review_status === "ready_for_review" || item.review_status === "regeneration_required");
              return (
                <motion.div
                  key={item.nomination_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-4 grid lg:grid-cols-[220px_1fr] gap-4"
                >
                  <div>
                    <FrameLabel>Generated Video</FrameLabel>
                    {item.video_url ? (
                      <PortraitVideo
                        key={`${item.video_url}:${item.video_render_id || ""}`}
                        url={videoPlayerUrl(item) || item.video_url}
                        title={`Nomination ${item.nomination_id}`}
                      />
                    ) : (
                      <div className="mx-auto w-full max-w-[220px] rounded-xl border border-dashed border-white/15 bg-black/30 flex items-center justify-center text-white/35 text-xs text-center p-4" style={{ aspectRatio: "9 / 16" }}>
                        No generated video yet
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-white truncate">{item.teacher_name || "Unnamed teacher"}</p>
                      <p className="text-xs text-primary-foreground/50 truncate">Nominated by {nominatorLabel(item)}</p>
                      <p className="text-[11px] text-primary-foreground/35 break-all">Nomination {item.nomination_id}</p>
                      <p className="text-[11px] font-semibold mt-1">
                        {KIND_LABEL[item.nomination_kind || ""] || item.nomination_type || "Nomination"} ·{" "}
                        {item.video_category === "with_photo" ? "With Photo" : "Without Photo"}
                      </p>
                      <p className="text-[11px] text-primary-foreground/55">
                        Photo: {item.teacher_photo_provided ? "YES" : "NO"}
                      </p>
                      {item.category_mismatch ? (
                        <p className="text-[11px] text-amber-300">
                          Current video used no portrait — queued for with-photo regeneration
                        </p>
                      ) : null}
                      <p className="text-[11px] text-primary-foreground/55 mt-1">Teacher Phone: {item.teacher_phone || "—"}</p>
                      <p className="text-[11px] text-primary-foreground/55">Portrait Phone: {item.portrait_phone || "—"}</p>
                      <p className="text-[11px] font-semibold mt-0.5">
                        Mapping: {item.portrait_mapping || "—"}
                        {item.portrait_mapping_reason && item.portrait_mapping !== "MATCH" ? ` (${item.portrait_mapping_reason})` : ""}
                      </p>
                      <p className="text-[11px] text-primary-foreground/55">
                        Category Icon: {item.category_icon_filename || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-primary-foreground/45 uppercase mb-2">
                        Teacher Portrait
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <StillFrame
                          label="Original Photo"
                          empty={item.teacher_photo_provided ? "Unavailable" : "Not Provided"}
                        >
                          {item.teacher_photo_url ? (
                            <img
                              src={cloudinaryDisplayUrl(item.teacher_photo_url, { width: 360, crop: "limit" })}
                              alt={`Original photo for nomination ${item.nomination_id}`}
                              className="absolute inset-0 h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : null}
                        </StillFrame>
                        <StillFrame
                          label="Prepared Portrait"
                          checkerboard={Boolean(mediaUrl(item.portrait_url))}
                          empty={item.portrait_status === "NOT_PROVIDED" ? "Not Provided" : "No portrait yet"}
                        >
                          {mediaUrl(item.portrait_url) ? (
                            <img
                              src={mediaUrl(item.portrait_url) || ""}
                              alt={`Prepared portrait for nomination ${item.nomination_id}`}
                              className="absolute inset-0 h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : null}
                        </StillFrame>
                        <StillFrame
                          label="Template Preview"
                          empty={item.portrait_status === "NOT_PROVIDED" ? "Not Provided" : "No template preview yet"}
                        >
                          {mediaUrl(item.portrait_preview_url) ? (
                            <img
                              src={mediaUrl(item.portrait_preview_url) || ""}
                              alt={`Template preview for nomination ${item.nomination_id}`}
                              className="absolute inset-0 h-full w-full object-contain bg-[#f6f6f6]"
                              loading="lazy"
                            />
                          ) : null}
                        </StillFrame>
                      </div>
                      <p className="text-xs text-primary-foreground/55 mt-2">
                        Portrait Status: {portraitStatusText(item)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">{generationLabel(item)}</span>
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">{reviewLabel(item)}</span>
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">
                        Photo: {item.teacher_photo_provided ? "YES" : "NO"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">
                        Portrait: {portraitStatusText(item)}
                      </span>
                      {item.ready_for_message && (
                        <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300">Ready for message (not sent)</span>
                      )}
                    </div>
                    <ValidationList item={item} />
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-primary-foreground/55">
                      <p>Teacher phone: {item.teacher_phone || "—"}</p>
                      <p>Student phone: {item.nominator_phone || "—"}</p>
                      <p>Generated: {formatWhen(item.generated_at)}</p>
                      <p>Approved: {formatWhen(item.approved_at)}</p>
                    </div>
                    {item.rejection_reason && (
                      <p className="text-xs text-destructive/80">Rejected: {item.rejection_reason}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="hero-outline"
                        size="sm"
                        className="h-8 text-[11px] gap-1"
                        disabled={!canReview || busyId === item.nomination_id}
                        onClick={() => void act(item, "approve")}
                      >
                        {busyId === item.nomination_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Approve
                      </Button>
                      <Button
                        variant="hero-outline"
                        size="sm"
                        className="h-8 text-[11px] gap-1"
                        disabled={!canReview || busyId === item.nomination_id}
                        onClick={() => {
                          setRejecting(item);
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                      <Button variant="hero-outline" size="sm" className="h-8 text-[11px]" disabled title="Unavailable until the video renderer is implemented">
                        Regenerate (unavailable)
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 px-1 pt-2 text-xs text-white/50">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="font-semibold text-secondary disabled:text-white/25 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="font-semibold text-secondary disabled:text-white/25 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-5 space-y-3">
            <h3 className="font-heading font-bold text-white">Reject this video?</h3>
            <p className="text-xs text-white/50">
              Nomination {rejecting.nomination_id}. A reason is required. Nothing will be sent to the student.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason"
              className="bg-white/5 border-white/10 text-white min-h-[96px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="hero-outline" size="sm" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="hero-outline"
                size="sm"
                disabled={!rejectReason.trim() || busyId === rejecting.nomination_id}
                onClick={() => void act(rejecting, "reject", rejectReason.trim())}
              >
                Save rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherVideoReviewPanel;
