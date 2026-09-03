import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
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
import {
  IMAGE_MANAGEMENT_CATEGORIES,
  type ImageManagementCategoryId,
  type NominationKind,
  type PortraitAdminStatus,
} from "@/lib/nominationKind";
import {
  adminGenerateTeacherPortrait,
  adminGetTeacherPortraitPhones,
  adminGetTeacherPortraitSummary,
  adminGetTeacherPortraits,
  adminRegenerateTeacherPortrait,
  type TeacherPortraitCategorySummary,
  type TeacherPortraitGenerateResult,
  type TeacherPortraitKindSummary,
  type TeacherPortraitListItem,
} from "@/lib/apiAdmin";

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

const STATUS_CHIP: Record<PortraitAdminStatus, string> = {
  NOT_GENERATED: "bg-white/10 text-white/70 border-white/15",
  GENERATING: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  GENERATED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  NEEDS_REVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  FAILED: "bg-red-500/15 text-red-300 border-red-500/25",
  NO_PHOTO: "bg-white/10 text-white/50 border-white/15",
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

const TeacherImageManagementPanel = () => {
  const { toast } = useToast();
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

  const loadSummary = useCallback(async () => {
    const data = await adminGetTeacherPortraitSummary();
    setSummary(Array.isArray(data.categories) ? data.categories : []);
    setKinds(Array.isArray(data.kinds) ? data.kinds : []);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetTeacherPortraits({
        kind: category.kind,
        photo: category.photo,
        status: statusFilter === "all" ? undefined : statusFilter,
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
      const message = err instanceof Error ? err.message : "Failed to load teacher images";
      toast({ title: "Failed to load", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [category.kind, category.photo, statusFilter, search, page, toast]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [categoryId, statusFilter, search]);

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
        status: statusFilter === "all" ? undefined : statusFilter,
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

  const runSelected = async (regenerate: boolean) => {
    if (!withPhoto || busy) return;
    const phones = [...selected];
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
          const result = regenerate
            ? await adminRegenerateTeacherPortrait(phone)
            : await adminGenerateTeacherPortrait({ phone, regenerate: false });
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

  const generateFromCandidate = async (phone: string, sourceNominationId: string) => {
    if (busy) return;
    const name = nameByPhone[phone] || items.find((row) => row.phone === phone)?.name || phone;
    stopRef.current = false;
    setRunTitle("Generating with OpenAI");
    setBatch([{ phone, name, status: "generating", detail: "Calling OpenAI gpt-image-2" }]);
    setBusy(true);
    try {
      const result = await adminGenerateTeacherPortrait({
        phone,
        regenerate: true,
        source_nomination_id: sourceNominationId,
      });
      applyResult(phone, result);
      if (result.ok && !result.skipped) patchBatch(phone, { status: "generated", detail: "Finalized portrait saved" });
      else if (result.needs_review) patchBatch(phone, { status: "needs_review", detail: result.reason || "Still needs review" });
      else if (!result.ok) patchBatch(phone, { status: "failed", detail: result.error || "OpenAI generation failed" });
      await loadSummary();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-secondary" />
            Teacher Image Management
          </h2>
          <p className="text-sm text-primary-foreground/50 mt-1 max-w-2xl">
            Unique teachers by nomination kind. Generate calls OpenAI, crops the canvas, and stores one reusable
            finalized portrait per phone.
          </p>
        </div>
        {withPhoto ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-10 px-4 bg-secondary text-[#1a0505] font-semibold hover:bg-secondary/90"
              disabled={busy || selected.size === 0}
              onClick={() => void runSelected(false)}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate with OpenAI
              {selected.size ? ` (${selected.size})` : ""}
            </Button>
            <Button
              variant="hero-outline"
              size="sm"
              className="text-xs h-10"
              disabled={busy || selected.size === 0}
              onClick={() => void runSelected(true)}
            >
              Regenerate selected
            </Button>
          </div>
        ) : null}
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
                    {row && cat.photo === "with_photo" ? (
                      <p className="text-[10px] text-white/35 mt-0.5">
                        {row.status.GENERATED} done · {row.status.NOT_GENERATED} waiting
                      </p>
                    ) : (
                      <p className="text-[10px] text-white/35 mt-0.5">No generate action</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      {batch.length > 0 ? (
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
              <p className="text-xs text-white/40">Without-photo teachers stay on the no-photo plate. Generate is not used here.</p>
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
              <SelectTrigger className="w-full sm:w-[200px] bg-white/5 border-white/10 text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABEL) as PortraitAdminStatus[])
                  .filter((status) => withPhoto || status === "NO_PHOTO")
                  .map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABEL[status]}
                      {statusCounts[status] ? ` (${statusCounts[status]})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {withPhoto ? (
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
          ) : null}
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
                    {withPhoto ? (
                      <Checkbox
                        checked={selected.has(row.phone)}
                        onCheckedChange={(on) => togglePhone(row.phone, Boolean(on), row.name)}
                        className="mt-1"
                        disabled={busy}
                      />
                    ) : null}
                    <div
                      className="relative w-[88px] h-[156px] rounded-lg overflow-hidden border border-white/10 flex-shrink-0"
                      style={row.cropped_cloudinary_url ? CHECKERBOARD : { background: "rgba(255,255,255,0.04)" }}
                    >
                      {row.cropped_cloudinary_url ? (
                        <img
                          src={cloudinaryDisplayUrl(row.cropped_cloudinary_url, { width: 240, height: 426, crop: "fit" })}
                          alt={row.name}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/35 text-center px-2">
                          {withPhoto ? "Awaiting OpenAI" : "No photo"}
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
                      <p className="text-[11px] text-white/40 mt-1">
                        {row.nomination_count} nomination{row.nomination_count !== 1 ? "s" : ""} in this category
                      </p>
                      <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CHIP[row.portrait_status]}`}>
                        {STATUS_LABEL[row.portrait_status]}
                      </span>
                      {live ? (
                        <p className="text-[11px] text-white/55 mt-1">{live.detail || JOB_LABEL[live.status]}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-[11px] text-white/45 space-y-0.5">
                    <p>Last generated: {formatWhen(row.finalized_at || row.generated_at)}</p>
                    {row.portrait_error ? (
                      <p className="text-amber-300 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {row.portrait_error}
                      </p>
                    ) : null}
                  </div>
                  {row.portrait_status === "NEEDS_REVIEW" && row.candidates.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Pick a source photo to send to OpenAI</p>
                      <div className="grid grid-cols-3 gap-2">
                        {row.candidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            disabled={busy}
                            onClick={() => void generateFromCandidate(row.phone, candidate.id)}
                            className="rounded-lg border border-white/10 overflow-hidden hover:border-secondary/50"
                            title={`Use photo from ${candidate.teacher_name || candidate.id}`}
                          >
                            <img
                              src={cloudinaryDisplayUrl(candidate.photo_url, { width: 160, height: 160, crop: "fill" })}
                              alt={candidate.teacher_name}
                              className="w-full h-16 object-cover"
                            />
                          </button>
                        ))}
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
    </div>
  );
};

export default TeacherImageManagementPanel;
