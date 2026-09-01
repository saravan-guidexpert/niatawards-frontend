import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clapperboard,
  ImageOff,
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
import {
  adminGetVideoReviews,
  adminReviewVideo,
  type VideoReviewCounts,
  type VideoReviewItem,
} from "@/lib/apiAdmin";

const emptyCounts: VideoReviewCounts = {
  total: 0,
  with_photo: 0,
  without_photo: 0,
  ready_for_review: 0,
  approved: 0,
  rejected: 0,
  failed: 0,
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Generation Failed" },
] as const;

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

const PortraitVideo = ({ url, title }: { url: string; title: string }) => (
  <div className="mx-auto w-full max-w-[220px] rounded-xl overflow-hidden border border-white/10 bg-black">
    <div className="relative w-full" style={{ paddingTop: "177.78%" }}>
      <video
        className="absolute inset-0 h-full w-full object-contain bg-black"
        src={url}
        controls
        playsInline
        preload="metadata"
        title={title}
      />
    </div>
  </div>
);

const TeacherVideoReviewPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoReviewItem[]>([]);
  const [counts, setCounts] = useState<VideoReviewCounts>(emptyCounts);
  const [filter, setFilter] = useState<string>("ready_for_review");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<VideoReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetVideoReviews();
      setItems(Array.isArray(data.items) ? data.items : []);
      setCounts({ ...emptyCounts, ...(data.counts || {}) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load video reviews";
      toast({ title: "Failed to load", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const bucket = reviewBucket(item);
      const matchFilter =
        filter === "all" ||
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
    { label: "Total student nominations", value: counts.total },
    { label: "With teacher photo", value: counts.with_photo },
    { label: "Without teacher photo", value: counts.without_photo },
    { label: "Ready for Review", value: counts.ready_for_review },
    { label: "Approved", value: counts.approved },
    { label: "Rejected", value: counts.rejected },
    { label: "Generation Failed", value: counts.failed },
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
              One row per submitted student nomination. Teacher photo is optional. Approve means the video
              may be used later for messaging — nothing is sent from this screen.
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
            {visible.map((item, i) => {
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
                    {item.video_url ? (
                      <PortraitVideo url={item.video_url} title={`Nomination ${item.nomination_id}`} />
                    ) : (
                      <div className="mx-auto w-full max-w-[220px] rounded-xl border border-dashed border-white/15 bg-black/30 flex items-center justify-center text-white/35 text-xs text-center p-4" style={{ aspectRatio: "9 / 16" }}>
                        No generated video yet
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      {item.teacher_photo_url ? (
                        <img
                          src={cloudinaryDisplayUrl(item.teacher_photo_url, { width: 96, height: 96, crop: "fill" })}
                          alt={item.teacher_name || "Teacher"}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover border border-white/10 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20 flex-shrink-0">
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-heading font-bold text-white truncate">{item.teacher_name || "Unnamed teacher"}</p>
                        <p className="text-xs text-primary-foreground/50 truncate">Nominated by {nominatorLabel(item)}</p>
                        <p className="text-[11px] text-primary-foreground/35 break-all">Nomination {item.nomination_id}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">{generationLabel(item)}</span>
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">{reviewLabel(item)}</span>
                      <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/70">
                        Teacher Photo: {item.teacher_photo_provided || item.teacher_photo_url ? "Available" : "Not Provided"}
                      </span>
                      {item.ready_for_message && (
                        <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300">Ready for message (not sent)</span>
                      )}
                    </div>
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
