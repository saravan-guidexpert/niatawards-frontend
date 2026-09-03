import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Clock,
  Images,
  Loader2,
  Search,
  Sparkles,
  Square,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cloudinaryDisplayUrl } from "@/lib/cloudinaryUrl";
import { API_URL } from "@/lib/apiBase";
import {
  IMAGE_MANAGEMENT_CATEGORIES,
  type ImageManagementCategoryId,
  type NominationKind,
  type PortraitAdminStatus,
} from "@/lib/nominationKind";
import {
  adminEstimateVideoGeneration,
  adminGenerateTeacherPortrait,
  adminGetTeacherPortraitPhones,
  adminGetTeacherPortraitSummary,
  adminGetTeacherPortraits,
  adminGetVideoGenerationJobs,
  adminRegenerateTeacherPortrait,
  adminStartVideoGeneration,
  adminGetTeacherVideoPreview,
  type TeacherPortraitCategorySummary,
  type TeacherPortraitGenerateResult,
  type TeacherPortraitKindSummary,
  type TeacherPortraitListItem,
  type VideoGenerationEstimate,
  type VideoGenerationJobView,
} from "@/lib/apiAdmin";
import VideoGenerationJobPanel from "@/components/admin/VideoGenerationJobPanel";

const CHECKERBOARD = {
  backgroundColor: "#ececec",
  backgroundImage:
    "linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
} as const;

const STATUS_LABEL: Record<PortraitAdminStatus, string> = {
  NOT_GENERATED: "Not generated",
  GENERATING: "Generating",
  GENERATED: "Generated",
  NEEDS_REVIEW: "Needs review",
  FAILED: "Failed",
  NO_PHOTO: "No photo",
};

const VIDEO_STATUS_LABEL = {
  generated: "Generated",
  not_generated: "Not generated",
  processing: "Processing",
  failed: "Failed",
} as const;

type VideoStatusFilter = keyof typeof VIDEO_STATUS_LABEL;

const STATUS_CHIP: Record<PortraitAdminStatus, string> = {
  NOT_GENERATED: "bg-white/10 text-white/70 border-white/15",
  GENERATING: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  GENERATED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  NEEDS_REVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  FAILED: "bg-red-500/15 text-red-300 border-red-500/25",
  NO_PHOTO: "bg-white/10 text-white/50 border-white/15",
};

const VIDEO_STATUS_CHIP: Record<VideoStatusFilter | "blocked", string> = {
  generated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  not_generated: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  processing: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  failed: "bg-red-500/15 text-red-300 border-red-500/25",
  blocked: "bg-white/10 text-white/55 border-white/15",
};

const GROUPS = [
  { group: "Student nominated teacher", kind: "student" as NominationKind },
  { group: "Teacher nominated teacher", kind: "teacher" as NominationKind },
  { group: "Teacher nominated other teacher", kind: "colleague" as NominationKind },
];

type JobState = "queued" | "generating" | "generated" | "failed" | "needs_review" | "skipped";

type BatchRow = {
  phone: string;
  name: string;
  status: JobState;
  detail?: string;
};

const JOB_LABEL: Record<JobState, string> = {
  queued: "In queue",
  generating: "Calling OpenAI…",
  generated: "Generated",
  failed: "Failed",
  needs_review: "Needs review",
  skipped: "Skipped",
};

const emptyStatus = (): Record<PortraitAdminStatus, number> => ({
  NOT_GENERATED: 0,
  GENERATING: 0,
  GENERATED: 0,
  NEEDS_REVIEW: 0,
  FAILED: 0,
  NO_PHOTO: 0,
});

const formatWhen = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

const runPool = async <T,>(items: T[], limit: number, fn: (item: T) => Promise<void>) => {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) || 0 }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  });
  await Promise.all(workers);
};

type PanelMode = "images" | "videos";

const TeacherImageManagementPanel = ({ mode }: { mode: PanelMode }) => {
  const { toast } = useToast();
  const isImages = mode === "images";
  const isVideos = mode === "videos";
  const [summary, setSummary] = useState<TeacherPortraitCategorySummary[]>([]);
  const [kinds, setKinds] = useState<TeacherPortraitKindSummary[]>([]);
  const [categoryId, setCategoryId] = useState<ImageManagementCategoryId>("student_with_photo");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TeacherPortraitListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nameByPhone, setNameByPhone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<BatchRow[]>([]);
  const [runTitle, setRunTitle] = useState("Generate finalized images");
  const stopRef = useRef(false);
  const [videoJob, setVideoJob] = useState<VideoGenerationJobView | null>(null);
  const [jobHistory, setJobHistory] = useState<VideoGenerationJobView[]>([]);
  const [confirm, setConfirm] = useState<VideoGenerationEstimate | null>(null);
  const [confirmPhones, setConfirmPhones] = useState<string[]>([]);
  const [confirmMode, setConfirmMode] = useState<"generate" | "regenerate">("generate");
  const [estimating, setEstimating] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    image?: string | null;
    template?: string | null;
    icon?: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [chosenSource, setChosenSource] = useState<Record<string, string>>({});

  const category = IMAGE_MANAGEMENT_CATEGORIES.find((c) => c.id === categoryId) || IMAGE_MANAGEMENT_CATEGORIES[0];
  const withPhoto = category.photo === "with_photo";
  const summaryFor = useMemo(() => new Map(summary.map((row) => [row.id, row])), [summary]);

  const jobCounts = useMemo(() => {
    const counts = { queued: 0, generating: 0, generated: 0, failed: 0, needs_review: 0, skipped: 0, total: batch.length };
    for (const row of batch) counts[row.status] += 1;
    return counts;
  }, [batch]);

  const processed = jobCounts.generated + jobCounts.failed + jobCounts.needs_review + jobCounts.skipped;
  const pct = jobCounts.total ? Math.round((processed / jobCounts.total) * 100) : 0;
  const nowGenerating = batch.find((row) => row.status === "generating");

  const loadJobs = useCallback(async () => {
    try {
      const data = await adminGetVideoGenerationJobs();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      setJobHistory(jobs);
      const running = jobs.find((job) => job.status === "running");
      if (running) setVideoJob((prev) => (prev?.job_id === running.job_id ? prev : running));
    } catch {
      /* history is secondary */
    }
  }, []);

  const loadSummary = useCallback(async () => {
    const data = await adminGetTeacherPortraitSummary();
    setSummary(Array.isArray(data.categories) ? data.categories : []);
    setKinds(Array.isArray(data.kinds) ? data.kinds : []);
  }, []);

  const loadList = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await adminGetTeacherPortraits({
        kind: category.kind,
        photo: category.photo,
        status: isImages && statusFilter !== "all" ? statusFilter : undefined,
        video_status: isVideos && statusFilter !== "all" ? statusFilter : undefined,
        q: search.trim() || undefined,
        page,
      });
      const next = Array.isArray(data.items) ? data.items : [];
      setItems(next);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 24);
      setNameByPhone((prev) => {
        const merged = { ...prev };
        for (const row of next) merged[row.phone] = row.name;
        return merged;
      });
    } catch (err: unknown) {
      if (!quiet) {
        const message = err instanceof Error ? err.message : "Failed to load teacher images";
        toast({ title: "Failed to load", description: message, variant: "destructive" });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [category.kind, category.photo, statusFilter, search, page, toast, isImages, isVideos]);

  useEffect(() => {
    void loadSummary();
    if (isVideos) void loadJobs();
  }, [loadSummary, loadJobs, isVideos]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (videoJob?.status !== "running") return;
    const timer = window.setInterval(() => {
      void loadSummary();
      void loadList(true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [videoJob?.status, loadSummary, loadList]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [categoryId, statusFilter, search]);

  useEffect(() => {
    setChosenSource((prev) => {
      const next = { ...prev };
      for (const row of items) {
        if (next[row.phone]) continue;
        if (row.source_nomination_id) next[row.phone] = row.source_nomination_id;
        else if (row.candidates[0]?.id) next[row.phone] = row.candidates[0].id;
      }
      return next;
    });
  }, [items]);

  const sourceFor = (phone: string) => {
    const row = items.find((item) => item.phone === phone);
    return chosenSource[phone] || row?.source_nomination_id || row?.candidates[0]?.id || undefined;
  };

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const pagePhones = items.map((row) => row.phone);
  const selectedOnPage = pagePhones.filter((phone) => selected.has(phone));
  const allPageSelected = pagePhones.length > 0 && selectedOnPage.length === pagePhones.length;

  const togglePhone = (phone: string, on: boolean, name?: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(phone);
      else next.delete(phone);
      return next;
    });
    if (name) setNameByPhone((prev) => ({ ...prev, [phone]: name }));
  };

  const togglePage = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of items) {
        if (on) next.add(row.phone);
        else next.delete(row.phone);
      }
      return next;
    });
    if (on) {
      setNameByPhone((prev) => {
        const merged = { ...prev };
        for (const row of items) merged[row.phone] = row.name;
        return merged;
      });
    }
  };

  const selectAllMatching = async () => {
    try {
      const data = await adminGetTeacherPortraitPhones({
        kind: category.kind,
        photo: category.photo,
        status: isImages && statusFilter !== "all" ? statusFilter : undefined,
        video_status: isVideos && statusFilter !== "all" ? statusFilter : undefined,
        q: search.trim() || undefined,
      });
      const teachers = data.teachers || (data.phones || []).map((phone) => ({ phone, name: phone }));
      setSelected(new Set(teachers.map((row) => row.phone)));
      setNameByPhone((prev) => {
        const merged = { ...prev };
        for (const row of teachers) merged[row.phone] = row.name;
        return merged;
      });
      toast({ title: `Selected ${data.total.toLocaleString("en-IN")} teachers` });
    } catch (err: unknown) {
      toast({
        title: "Could not select all",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  const patchBatch = (phone: string, patch: Partial<BatchRow>) => {
    setBatch((prev) => prev.map((row) => (row.phone === phone ? { ...row, ...patch } : row)));
  };

  const applyResult = (phone: string, result: TeacherPortraitGenerateResult) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.phone !== phone) return row;
        if (result.ok && !result.skipped) {
          return {
            ...row,
            portrait_status: "GENERATED",
            cropped_cloudinary_url: result.cropped_cloudinary_url || row.cropped_cloudinary_url,
            source_nomination_id: result.source_nomination_id || row.source_nomination_id,
            portrait_error: null,
            finalized_at: new Date().toISOString(),
            candidates: [],
          };
        }
        if (result.needs_review) {
          return {
            ...row,
            portrait_status: "NEEDS_REVIEW",
            portrait_error: result.reason || "Needs review",
            candidates: result.candidates || row.candidates,
          };
        }
        if (result.ok && result.skipped) {
          if (result.reason === "already_finalized") return { ...row, portrait_status: "GENERATED" };
          if (result.reason === "generating") return { ...row, portrait_status: "GENERATING" };
          if (result.reason === "no_photo") return { ...row, portrait_status: "NO_PHOTO" };
        }
        if (!result.ok) {
          return { ...row, portrait_status: "FAILED", portrait_error: result.error || "Generation failed" };
        }
        return row;
      })
    );
  };

  const runSelected = async (regenerate: boolean, phonesArg?: string[]) => {
    if (!withPhoto || busy) return;
    const phones = phonesArg || [...selected];
    if (!phones.length) {
      toast({ title: "Select teachers first", description: "Choose one or more teachers to generate with OpenAI." });
      return;
    }
    const queue = regenerate
      ? phones
      : phones.filter((phone) => {
          const row = items.find((item) => item.phone === phone);
          return !row || row.portrait_status !== "GENERATED";
        });
    const skippedFinalized = regenerate ? [] : phones.filter((phone) => !queue.includes(phone));
    if (!queue.length) {
      toast({
        title: "Already generated",
        description: "Every selected teacher already has a finalized image. Use Regenerate to call OpenAI again.",
      });
      return;
    }

    stopRef.current = false;
    setRunTitle(regenerate ? "Regenerating with OpenAI" : "Generating with OpenAI");
    setBatch(
      queue.map((phone) => ({
        phone,
        name: nameByPhone[phone] || items.find((row) => row.phone === phone)?.name || phone,
        status: "queued" as const,
        detail: "Waiting for OpenAI",
      }))
    );
    setBusy(true);

    try {
      await runPool(queue, 2, async (phone) => {
        if (stopRef.current) {
          patchBatch(phone, { status: "skipped", detail: "Stopped before OpenAI call" });
          return;
        }
        patchBatch(phone, { status: "generating", detail: "Calling OpenAI gpt-image-2" });
        setItems((prev) =>
          prev.map((row) => (row.phone === phone ? { ...row, portrait_status: "GENERATING" } : row))
        );
        try {
          const source_nomination_id = sourceFor(phone);
          const result = regenerate
            ? await adminRegenerateTeacherPortrait(phone, source_nomination_id)
            : await adminGenerateTeacherPortrait({ phone, regenerate: false, source_nomination_id });
          applyResult(phone, result);
          if (result.ok && !result.skipped) {
            patchBatch(phone, { status: "generated", detail: "Finalized portrait saved" });
          } else if (result.needs_review) {
            patchBatch(phone, { status: "needs_review", detail: result.reason || "Pick a source photo" });
          } else if (result.ok && result.skipped) {
            patchBatch(phone, {
              status: result.reason === "already_finalized" ? "skipped" : result.reason === "generating" ? "generating" : "skipped",
              detail: result.reason === "already_finalized" ? "Already finalized" : result.reason || "Skipped",
            });
          } else {
            patchBatch(phone, { status: "failed", detail: result.error || "OpenAI generation failed" });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "OpenAI generation failed";
          patchBatch(phone, { status: "failed", detail: message });
          setItems((prev) =>
            prev.map((row) =>
              row.phone === phone ? { ...row, portrait_status: "FAILED", portrait_error: message } : row
            )
          );
        }
      });
      await loadSummary();
      const leftover = skippedFinalized.length
        ? ` ${skippedFinalized.length} already finalized ${skippedFinalized.length === 1 ? "was" : "were"} skipped.`
        : "";
      toast({
        title: stopRef.current ? "Queue stopped" : regenerate ? "Regenerate finished" : "Generate finished",
        description: leftover || "Live counts are in the run panel.",
      });
    } finally {
      setBusy(false);
    }
  };

  const openVideoConfirm = async (regenerate: boolean) => {
    const phones = [...selected];
    if (!phones.length) {
      toast({ title: "Select teachers first", description: "Choose teachers, then generate nomination videos." });
      return;
    }
    setEstimating(true);
    try {
      const estimate = await adminEstimateVideoGeneration({
        phones,
        kind: category.kind,
        photo: category.photo,
        regenerate,
      });
      setConfirmMode(regenerate ? "regenerate" : "generate");
      setConfirmPhones(phones);
      setConfirm(estimate);
    } catch (err: unknown) {
      toast({
        title: "Could not estimate videos",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setEstimating(false);
    }
  };

  const startVideos = async () => {
    if (!confirm) return;
    const phones = confirmPhones.length ? confirmPhones : [...selected];
    try {
      const data = await adminStartVideoGeneration({
        phones,
        kind: category.kind,
        photo: category.photo,
        regenerate: confirmMode === "regenerate",
      });
      setConfirm(null);
      setVideoJob(data.job);
      await loadJobs();
      toast({
        title: `${data.queued_videos.toLocaleString("en-IN")} videos queued`,
        description: `Not ${data.teachers} teachers — one video per nomination.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Could not start generation",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  const generateOneImage = async (phone: string) => {
    if (busy) return;
    const sourceId = sourceFor(phone);
    const row = items.find((item) => item.phone === phone);
    if (row?.portrait_status === "NEEDS_REVIEW" && !sourceId) {
      toast({
        title: "Pick a source photo",
        description: "Select one of the photos, then generate. That choice is saved so this conflict will not come back.",
      });
      return;
    }
    if (sourceId) {
      await generateFromCandidate(phone, sourceId);
      return;
    }
    await runSelected(false, [phone]);
  };

  const generateOneTeacherVideos = async (phone: string, regenerate = false) => {
    setEstimating(true);
    try {
      const estimate = await adminEstimateVideoGeneration({
        phones: [phone],
        kind: category.kind,
        photo: category.photo,
        regenerate,
      });
      setConfirmMode(regenerate ? "regenerate" : "generate");
      setConfirmPhones([phone]);
      setConfirm(estimate);
    } catch (err: unknown) {
      toast({
        title: "Could not estimate videos",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setEstimating(false);
    }
  };

  const openPreview = async (row: TeacherPortraitListItem, kind: "image" | "template") => {
    if (kind === "image") {
      setPreview({ title: `${row.name} — finalized image`, image: row.cropped_cloudinary_url });
      return;
    }
    setPreviewLoading(true);
    setPreview({ title: `${row.name} — template preview` });
    try {
      const data = await adminGetTeacherVideoPreview({
        phone: row.phone,
        kind: category.kind,
        photo: category.photo,
      });
      const template = data.template_preview_url
        ? `${API_URL}${data.template_preview_url.startsWith("/") ? "" : "/"}${data.template_preview_url}`
        : null;
      setPreview({
        title: `${row.name} — template preview`,
        image: data.image_url,
        template,
        icon: data.category_icon_label,
      });
    } catch (err: unknown) {
      setPreview(null);
      toast({
        title: "Preview failed",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const generateFromCandidate = async (phone: string, sourceNominationId: string) => {
    if (busy) return;
    const name = nameByPhone[phone] || items.find((row) => row.phone === phone)?.name || phone;
    stopRef.current = false;
    setRunTitle("Generating with OpenAI");
    setBatch([{ phone, name, status: "generating", detail: "Calling OpenAI gpt-image-2" }]);
    setBusy(true);
    setChosenSource((prev) => ({ ...prev, [phone]: sourceNominationId }));
    try {
      const result = await adminGenerateTeacherPortrait({
        phone,
        regenerate: true,
        source_nomination_id: sourceNominationId,
      });
      applyResult(phone, result);
      if (result.ok && !result.skipped) patchBatch(phone, { status: "generated", detail: "Finalized portrait saved" });
      else if (result.needs_review) patchBatch(phone, { status: "needs_review", detail: result.reason || "Still needs review" });
      else if (result.ok && result.skipped && result.reason === "generating") {
        patchBatch(phone, { status: "generating", detail: "Already generating" });
        toast({ title: "Already generating", description: "Wait for the current OpenAI job, then retry if it stays stuck." });
      }
      else if (!result.ok) patchBatch(phone, { status: "failed", detail: result.error || "OpenAI generation failed" });
      await loadSummary();
      await loadList(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      patchBatch(phone, { status: "failed", detail: message });
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const activeSummary = summaryFor.get(categoryId);
  const statusCounts = activeSummary?.status || emptyStatus();
  const videoTeacherCounts = activeSummary?.videos?.teachers || {
    generated: 0,
    not_generated: 0,
    processing: 0,
    failed: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary-foreground flex items-center gap-2">
            {isVideos ? (
              <Clapperboard className="w-5 h-5 text-secondary" />
            ) : (
              <Images className="w-5 h-5 text-secondary" />
            )}
            {isVideos ? "Teacher Video Production" : "Teacher Photo Management"}
          </h2>
          <p className="text-sm text-primary-foreground/50 mt-1 max-w-2xl">
            {isVideos
              ? "Select teachers with finalized images and queue one video per eligible nomination. Image generation lives in Teacher Photo Management. Messages are never sent from here."
              : "Image is teacher-level. Generate and review one finalized portrait per unique teacher. Video generation lives in Video Production. Messages are never sent from here."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isImages && withPhoto ? (
            <>
              <Button
                size="sm"
                className="h-10 px-4 bg-secondary text-[#1a0505] font-semibold hover:bg-secondary/90"
                disabled={busy || selected.size === 0}
                onClick={() => void runSelected(false)}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate finalized images
                {selected.size ? ` (${selected.size})` : ""}
              </Button>
              <Button
                variant="hero-outline"
                size="sm"
                className="text-xs h-10"
                disabled={busy || selected.size === 0}
                onClick={() => void runSelected(true)}
              >
                Regenerate images
              </Button>
            </>
          ) : null}
          {isVideos ? (
            <>
              <Button
                size="sm"
                className="h-10 px-4 bg-secondary text-[#1a0505] font-semibold hover:bg-secondary/90"
                disabled={estimating || selected.size === 0}
                onClick={() => void openVideoConfirm(false)}
              >
                {estimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
                Generate videos
                {selected.size ? ` (${selected.size})` : ""}
              </Button>
              <Button
                variant="hero-outline"
                size="sm"
                className="text-xs h-10"
                disabled={estimating || selected.size === 0}
                onClick={() => void openVideoConfirm(true)}
              >
                Regenerate videos
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {GROUPS.map((group) => {
          const kindStats = kinds.find((row) => row.kind === group.kind);
          return (
          <div key={group.kind} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="px-1 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{group.group}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/20 border border-white/5 px-2.5 py-2">
                  <p className="text-[10px] text-white/40">Nominations</p>
                  <p className="text-lg font-heading font-bold text-white tabular-nums">
                    {(kindStats?.nominations ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 px-2.5 py-2">
                  <p className="text-[10px] text-white/40">Unique teachers</p>
                  <p className="text-lg font-heading font-bold text-white tabular-nums">
                    {(kindStats?.unique_teachers ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {IMAGE_MANAGEMENT_CATEGORIES.filter((cat) => cat.kind === group.kind).map((cat) => {
                const row = summaryFor.get(cat.id);
                const selectedCat = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`text-left rounded-xl border px-3 py-3 transition-colors ${
                      selectedCat
                        ? "border-secondary bg-secondary/15"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <p className="text-xs font-semibold text-white/80">{cat.photoLabel}</p>
                    <p className="text-2xl font-heading font-bold text-white mt-1 tabular-nums">
                      {(row?.unique_teachers ?? 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      unique · {(row?.nominations ?? 0).toLocaleString("en-IN")} nominations
                    </p>
                    {isVideos ? (
                      <>
                        <p className="text-[10px] text-emerald-300/80 mt-0.5">
                          Generated {(row?.videos?.generated ?? 0).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-amber-300/80">
                          Not generated {(row?.videos?.not_generated ?? Math.max(0, (row?.videos?.total ?? row?.nominations ?? 0) - (row?.videos?.generated ?? 0))).toLocaleString("en-IN")}
                        </p>
                        {(row?.videos?.processing || row?.videos?.failed) ? (
                          <p className="text-[10px] text-white/35">
                            {row?.videos?.processing ? `${row.videos.processing} processing` : ""}
                            {row?.videos?.processing && row?.videos?.failed ? " · " : ""}
                            {row?.videos?.failed ? `${row.videos.failed} failed` : ""}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-[10px] text-white/35 mt-0.5">
                        Images {(row?.images_finalized ?? row?.status?.GENERATED ?? 0).toLocaleString("en-IN")} / {(row?.unique_teachers ?? 0).toLocaleString("en-IN")}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      {isVideos && selected.size > 0 ? (
        <div className="rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/80">
            Selected teachers: <span className="font-heading font-bold text-white">{selected.size}</span>
          </p>
          <Button
            size="sm"
            className="h-9 bg-secondary text-[#1a0505] font-semibold"
            disabled={estimating}
            onClick={() => void openVideoConfirm(false)}
          >
            {estimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
            Generate videos
          </Button>
        </div>
      ) : null}

      {isImages && selected.size > 0 && withPhoto ? (
        <div className="rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/80">
            Selected teachers: <span className="font-heading font-bold text-white">{selected.size}</span>
          </p>
          <Button
            size="sm"
            className="h-9 bg-secondary text-[#1a0505] font-semibold"
            disabled={busy}
            onClick={() => void runSelected(false)}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate finalized images
          </Button>
        </div>
      ) : null}

      {isVideos && videoJob ? (
        <VideoGenerationJobPanel
          job={videoJob}
          onJobChange={(next) => {
            setVideoJob(next);
            if (next.status !== "running") {
              void loadSummary();
              void loadList();
              void loadJobs();
            }
          }}
          onClose={() => setVideoJob(null)}
        />
      ) : null}

      {isVideos && jobHistory.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Generation jobs</p>
          {jobHistory.slice(0, 8).map((job) => (
            <button
              key={job.job_id}
              type="button"
              onClick={() => setVideoJob(job)}
              className="w-full text-left rounded-xl border border-white/10 bg-black/20 px-3 py-2 hover:border-white/25"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white font-semibold">
                  Job #{job.job_number} · {job.total.toLocaleString("en-IN")} videos
                </p>
                <p className="text-[11px] text-white/50 capitalize">{job.status}</p>
              </div>
              <p className="text-[11px] text-white/45 mt-0.5">
                {job.completed} completed · {job.failed} failed
                {job.cancelled ? ` · ${job.cancelled} cancelled` : ""}
                {job.duration_ms ? ` · ${Math.round(job.duration_ms / 60000)}m` : ""}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {isImages && batch.length > 0 ? (
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading font-bold text-white flex items-center gap-2">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin text-secondary" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {runTitle}
                </p>
                <p className="text-sm text-white/60 mt-1">
                  {processed} of {jobCounts.total} processed
                  {nowGenerating ? ` · now ${nowGenerating.name}` : busy ? " · starting OpenAI…" : ""}
                </p>
              </div>
              {busy ? (
                <Button
                  variant="hero-outline"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => {
                    stopRef.current = true;
                  }}
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop queue
                </Button>
              ) : (
                <button type="button" className="text-xs text-white/45 hover:text-white" onClick={() => setBatch([])}>
                  Dismiss
                </button>
              )}
            </div>
            <div className="h-2 rounded-full bg-black/30 overflow-hidden">
              <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "In queue", value: jobCounts.queued, icon: Clock, tone: "text-white/80" },
                { label: "Generating", value: jobCounts.generating, icon: Loader2, tone: "text-sky-300" },
                { label: "Generated", value: jobCounts.generated, icon: CheckCircle2, tone: "text-emerald-300" },
                { label: "Failed", value: jobCounts.failed + jobCounts.needs_review, icon: XCircle, tone: "text-red-300" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                    <stat.icon className={`w-3.5 h-3.5 ${stat.tone} ${stat.label === "Generating" && busy ? "animate-spin" : ""}`} />
                    {stat.label}
                  </div>
                  <p className={`text-2xl font-heading font-bold tabular-nums mt-1 ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="max-h-56 overflow-auto rounded-xl border border-white/10 divide-y divide-white/5">
              {batch.map((row) => (
                <div key={row.phone} className="flex items-center gap-3 px-3 py-2 bg-black/10">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      row.status === "generated"
                        ? "bg-emerald-400"
                        : row.status === "generating"
                          ? "bg-sky-400 animate-pulse"
                          : row.status === "failed" || row.status === "needs_review"
                            ? "bg-red-400"
                            : "bg-white/30"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{row.name}</p>
                    <p className="text-[11px] text-white/40">{row.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-semibold text-white/80">{JOB_LABEL[row.status]}</p>
                    {row.detail ? <p className="text-[10px] text-white/40 max-w-[180px] truncate">{row.detail}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-heading font-bold text-white">
                {category.group} · {category.photoLabel}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {total.toLocaleString("en-IN")} unique teacher{total !== 1 ? "s" : ""}
                {selected.size ? ` · ${selected.size} selected` : ""}
              </p>
            </div>
            {!withPhoto ? (
              <p className="text-xs text-white/40">
                {isVideos
                  ? "No finalized image required. Videos use the approved no-photo template."
                  : "No photo in this category. Finalized portraits are not needed here."}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Search name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px] bg-white/5 border-white/10 text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isVideos ? (
                  <>
                    <SelectItem value="all">All videos</SelectItem>
                    {(Object.keys(VIDEO_STATUS_LABEL) as VideoStatusFilter[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {VIDEO_STATUS_LABEL[status]}
                        {videoTeacherCounts[status] ? ` (${videoTeacherCounts[status]})` : ""}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(Object.keys(STATUS_LABEL) as PortraitAdminStatus[])
                      .filter((status) => withPhoto || status === "NO_PHOTO")
                      .map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABEL[status]}
                          {statusCounts[status] ? ` (${statusCounts[status]})` : ""}
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/55">
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={allPageSelected} onCheckedChange={(on) => togglePage(Boolean(on))} />
              Select this page
            </label>
            <button type="button" className="font-semibold text-secondary hover:text-secondary/80" onClick={() => void selectAllMatching()}>
              Select all matching ({total.toLocaleString("en-IN")})
            </button>
            {selected.size > 0 ? (
              <button type="button" className="hover:text-white" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
            <span className="ml-3 text-white/60 text-sm">Loading unique teachers…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-white/40">No unique teachers in this category.</div>
        ) : (
          <div className="p-3 sm:p-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((row, i) => {
              const live = batch.find((job) => job.phone === row.phone);
              const generating = live?.status === "generating" || row.portrait_status === "GENERATING";
              const videos = row.videos || { generated: 0, pending: 0, processing: 0, failed: 0, total: row.nomination_count };
              const imageReady = !withPhoto || row.portrait_status === "GENERATED";
              const remaining = Math.max(0, videos.total - videos.generated);
              return (
                <motion.div
                  key={row.phone}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className={`rounded-xl border p-3 space-y-3 ${
                    generating
                      ? "border-sky-400/40 bg-sky-500/10"
                      : selected.has(row.phone)
                        ? "border-secondary/40 bg-secondary/5"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(row.phone)}
                      onCheckedChange={(on) => togglePhone(row.phone, Boolean(on), row.name)}
                      className="mt-1"
                      disabled={busy}
                    />
                    <div
                      className="relative w-[88px] h-[156px] rounded-lg overflow-hidden border border-white/10 flex-shrink-0"
                      style={row.cropped_cloudinary_url ? CHECKERBOARD : { background: "rgba(255,255,255,0.04)" }}
                    >
                      {row.cropped_cloudinary_url ? (
                        <img
                          src={cloudinaryDisplayUrl(row.cropped_cloudinary_url, { width: 240, height: 426, crop: "fit" })}
                          alt={row.name}
                          className="absolute inset-0 h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/35 text-center px-2">
                          {withPhoto ? "Awaiting finalized image" : "No photo template"}
                        </div>
                      )}
                      {generating ? (
                        <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                          <span className="text-[10px] text-white/80">OpenAI</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-white truncate">{row.name || "Unnamed teacher"}</p>
                      <p className="text-xs text-white/50">{row.phone}</p>
                      <p className="text-[11px] text-white/45 mt-1">{category.group}</p>
                      <p className="text-[11px] text-white/45">{category.photoLabel}</p>
                      <p className="text-[11px] text-white/40 mt-1">Nominations: {row.nomination_count}</p>
                      {isVideos ? (
                        <>
                          <p className="text-[11px] text-emerald-300/90 mt-2">
                            Generated: {videos.generated.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[11px] text-amber-300/90">
                            Not generated: {Math.max(0, videos.total - videos.generated).toLocaleString("en-IN")}
                            {videos.processing ? ` · ${videos.processing} processing` : ""}
                            {videos.failed ? ` · ${videos.failed} failed` : ""}
                          </p>
                          {!imageReady ? (
                            <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${VIDEO_STATUS_CHIP.blocked}`}>
                              Blocked · no finalized image
                            </span>
                          ) : videos.processing > 0 ? (
                            <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${VIDEO_STATUS_CHIP.processing}`}>
                              Processing
                            </span>
                          ) : videos.failed > 0 ? (
                            <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${VIDEO_STATUS_CHIP.failed}`}>
                              Failed
                            </span>
                          ) : videos.generated === videos.total && videos.total > 0 ? (
                            <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${VIDEO_STATUS_CHIP.generated}`}>
                              VIDEO ✓ GENERATED
                            </span>
                          ) : (
                            <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${VIDEO_STATUS_CHIP.not_generated}`}>
                              Not generated
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-white/70 mt-2">
                            Finalized image: {imageReady ? "✓ READY" : STATUS_LABEL[row.portrait_status]}
                          </p>
                          <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CHIP[row.portrait_status]}`}>
                            {STATUS_LABEL[row.portrait_status]}
                          </span>
                        </>
                      )}
                      {live ? (
                        <p className="text-[11px] text-white/55 mt-1">{live.detail || JOB_LABEL[live.status]}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.cropped_cloudinary_url ? (
                      <Button variant="hero-outline" size="sm" className="text-[11px] h-8" onClick={() => void openPreview(row, "image")}>
                        View image
                      </Button>
                    ) : null}
                    {isVideos && imageReady ? (
                      <Button variant="hero-outline" size="sm" className="text-[11px] h-8" onClick={() => void openPreview(row, "template")}>
                        View template
                      </Button>
                    ) : null}
                    {isImages && withPhoto && (row.can_generate_image || row.portrait_status === "NEEDS_REVIEW" || row.portrait_status === "FAILED") ? (
                      <Button
                        size="sm"
                        className="text-[11px] h-8 bg-secondary text-[#1a0505] font-semibold"
                        disabled={busy}
                        onClick={() => void generateOneImage(row.phone)}
                      >
                        {row.portrait_status === "FAILED" ? "Retry generate" : "Generate finalized image"}
                      </Button>
                    ) : null}
                    {isVideos && imageReady && remaining > 0 ? (
                      <Button size="sm" className="text-[11px] h-8 bg-secondary text-[#1a0505] font-semibold" disabled={estimating} onClick={() => void generateOneTeacherVideos(row.phone)}>
                        Generate remaining videos
                      </Button>
                    ) : null}
                    {isVideos && imageReady && remaining === 0 && videos.total > 0 ? (
                      <Button variant="hero-outline" size="sm" className="text-[11px] h-8" disabled={estimating} onClick={() => void generateOneTeacherVideos(row.phone, true)}>
                        Regenerate videos
                      </Button>
                    ) : null}
                  </div>
                  {row.portrait_error ? (
                    <p className="text-[11px] text-amber-300 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {row.portrait_error}
                    </p>
                  ) : null}
                  {isImages && row.portrait_status === "NEEDS_REVIEW" && row.candidates.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        Select one photo, then generate. That choice is saved so this conflict will not return.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {row.candidates.map((candidate) => {
                          const picked = (chosenSource[row.phone] || row.candidates[0]?.id) === candidate.id;
                          return (
                          <button
                            key={candidate.id}
                            type="button"
                            disabled={busy}
                            onClick={() => setChosenSource((prev) => ({ ...prev, [row.phone]: candidate.id }))}
                            className={`rounded-lg border overflow-hidden ${
                              picked ? "border-secondary ring-2 ring-secondary/60" : "border-white/10 hover:border-secondary/50"
                            }`}
                            title={`Use photo from ${candidate.teacher_name || candidate.id}`}
                          >
                            <img
                              src={cloudinaryDisplayUrl(candidate.photo_url, { width: 160, height: 160, crop: "fill" })}
                              alt={candidate.teacher_name}
                              className="w-full h-16 object-cover"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement | null)?.setAttribute("hidden", "true");
                              }}
                            />
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}

        {total > pageSize ? (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 text-xs text-white/50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-4">
              <button
                type="button"
                disabled={page <= 1 || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="font-semibold text-secondary disabled:text-white/25 disabled:pointer-events-none"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || busy}
                onClick={() => setPage((p) => p + 1)}
                className="font-semibold text-secondary disabled:text-white/25 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {isVideos && confirm ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#1a0505] p-5 space-y-4">
            <p className="font-heading font-bold text-white text-lg">
              {confirmMode === "regenerate" ? "REGENERATE VIDEOS?" : "GENERATE VIDEOS?"}
            </p>
            <div className="text-sm text-white/75 space-y-1">
              <p>Teachers: {confirm.teachers.toLocaleString("en-IN")}</p>
              <p>Nomination videos: {confirm.eligible_nominations.toLocaleString("en-IN")}</p>
              <p>Already generated: {confirm.already_generated.toLocaleString("en-IN")}</p>
              {confirm.blocked_missing_portrait ? (
                <p className="text-amber-300">Blocked (no finalized image): {confirm.blocked_missing_portrait}</p>
              ) : null}
              <p className="text-white font-semibold pt-2">
                {confirmMode === "regenerate"
                  ? `${confirm.to_generate.toLocaleString("en-IN")} VIDEOS WILL BE REGENERATED`
                  : `${confirm.to_generate.toLocaleString("en-IN")} VIDEOS WILL BE GENERATED`}
              </p>
              <p>Audio: Attached</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="hero-outline" size="sm" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-secondary text-[#1a0505] font-semibold"
                disabled={confirm.to_generate <= 0}
                onClick={() => void startVideos()}
              >
                Start generation
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {preview || previewLoading ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#1a0505] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="font-heading font-bold text-white">{preview?.title || "Preview"}</p>
              <button type="button" className="text-xs text-white/50 hover:text-white" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
            {previewLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-secondary animate-spin" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {preview?.image ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Finalized image</p>
                    <div className="rounded-xl overflow-hidden border border-white/10" style={CHECKERBOARD}>
                      <img src={cloudinaryDisplayUrl(preview.image, { width: 540, height: 960, crop: "fit" })} alt="" className="w-full" />
                    </div>
                  </div>
                ) : null}
                {preview?.template ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Template preview</p>
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                      <img src={preview.template} alt="" className="w-full" />
                    </div>
                    {preview.icon ? <p className="text-[11px] text-white/50 mt-2">Icon: {preview.icon}</p> : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TeacherImageManagementPanel;
