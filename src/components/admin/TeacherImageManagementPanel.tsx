import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Search } from "lucide-react";
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
  const [categoryId, setCategoryId] = useState<ImageManagementCategoryId>("student_with_photo");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TeacherPortraitListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [jobStatus, setJobStatus] = useState<Record<string, string>>({});

  const category = IMAGE_MANAGEMENT_CATEGORIES.find((c) => c.id === categoryId) || IMAGE_MANAGEMENT_CATEGORIES[0];
  const withPhoto = category.photo === "with_photo";
  const summaryFor = useMemo(() => {
    const map = new Map(summary.map((row) => [row.id, row]));
    return map;
  }, [summary]);

  const loadSummary = useCallback(async () => {
    const data = await adminGetTeacherPortraitSummary();
    setSummary(Array.isArray(data.categories) ? data.categories : []);
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
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 24);
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
    setJobStatus({});
  }, [categoryId, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const pagePhones = items.map((row) => row.phone);
  const selectedOnPage = pagePhones.filter((phone) => selected.has(phone));
  const allPageSelected = pagePhones.length > 0 && selectedOnPage.length === pagePhones.length;

  const togglePhone = (phone: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(phone);
      else next.delete(phone);
      return next;
    });
  };

  const togglePage = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const phone of pagePhones) {
        if (on) next.add(phone);
        else next.delete(phone);
      }
      return next;
    });
  };

  const selectAllMatching = async () => {
    try {
      const data = await adminGetTeacherPortraitPhones({
        kind: category.kind,
        photo: category.photo,
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search.trim() || undefined,
      });
      setSelected(new Set(data.phones || []));
      toast({ title: `Selected ${data.total.toLocaleString("en-IN")} teachers` });
    } catch (err: unknown) {
      toast({
        title: "Could not select all",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    }
  };

  const applyResult = (phone: string, result: Awaited<ReturnType<typeof adminGenerateTeacherPortrait>>) => {
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
      toast({ title: "Select teachers first", description: "Choose one or more teachers to process." });
      return;
    }
    const queue = regenerate
      ? phones
      : phones.filter((phone) => {
          const row = items.find((item) => item.phone === phone);
          return !row || row.portrait_status !== "GENERATED";
        });
    if (!queue.length) {
      toast({ title: "Nothing to generate", description: "Selected teachers already have finalized images. Use Regenerate to replace them." });
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: queue.length });
    let failed = 0;
    let generated = 0;
    try {
      await runPool(queue, 2, async (phone) => {
        setJobStatus((prev) => ({ ...prev, [phone]: "generating" }));
        setItems((prev) =>
          prev.map((row) => (row.phone === phone ? { ...row, portrait_status: "GENERATING" } : row))
        );
        try {
          const result = regenerate
            ? await adminRegenerateTeacherPortrait(phone)
            : await adminGenerateTeacherPortrait({ phone, regenerate: false });
          applyResult(phone, result);
          if (result.ok && !result.skipped) {
            generated += 1;
            setJobStatus((prev) => ({ ...prev, [phone]: "generated" }));
          } else if (result.needs_review) {
            failed += 1;
            setJobStatus((prev) => ({ ...prev, [phone]: "needs_review" }));
          } else if (result.ok && result.skipped) {
            setJobStatus((prev) => ({ ...prev, [phone]: result.reason || "skipped" }));
          } else {
            failed += 1;
            setJobStatus((prev) => ({ ...prev, [phone]: "failed" }));
          }
        } catch (err: unknown) {
          failed += 1;
          const message = err instanceof Error ? err.message : "Generation failed";
          setJobStatus((prev) => ({ ...prev, [phone]: "failed" }));
          setItems((prev) =>
            prev.map((row) =>
              row.phone === phone ? { ...row, portrait_status: "FAILED", portrait_error: message } : row
            )
          );
        } finally {
          setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      });
      await loadSummary();
      toast({
        title: regenerate ? "Regenerate finished" : "Generate finished",
        description: `${generated} finalized, ${failed} need attention, ${queue.length} processed.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const generateFromCandidate = async (phone: string, sourceNominationId: string) => {
    setBusy(true);
    try {
      const result = await adminGenerateTeacherPortrait({
        phone,
        regenerate: true,
        source_nomination_id: sourceNominationId,
      });
      applyResult(phone, result);
      await loadSummary();
      if (result.ok && !result.skipped) toast({ title: "Finalized image generated" });
      else if (result.needs_review) toast({ title: "Still needs review", variant: "destructive" });
      else if (!result.ok) toast({ title: "Generation failed", description: result.error, variant: "destructive" });
    } catch (err: unknown) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const activeSummary = summaryFor.get(categoryId);
  const statusCounts = activeSummary?.status || emptyStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
          Teacher Image Management
        </h2>
        <p className="text-xs text-primary-foreground/40 mt-1">
          Unique teachers per category. Finalized images are cropped production assets reused by video generation.
        </p>
      </div>

      <div className="space-y-4">
        {GROUPS.map((group) => (
          <div key={group.kind} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/45 mb-3">{group.group}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {IMAGE_MANAGEMENT_CATEGORIES.filter((cat) => cat.kind === group.kind).map((cat) => {
                const row = summaryFor.get(cat.id);
                const selectedCat = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      selectedCat
                        ? "border-secondary bg-secondary/10"
                        : "border-primary-foreground/10 bg-primary-foreground/[0.03] hover:border-primary-foreground/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-primary-foreground">{cat.photoLabel}</p>
                        <p className="text-[11px] text-primary-foreground/40 mt-0.5">{group.group}</p>
                      </div>
                      <div className="text-2xl font-heading font-bold text-primary-foreground">
                        {(row?.unique_teachers ?? 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    {row ? (
                      <p className="text-[11px] text-primary-foreground/45 mt-2">
                        {cat.photo === "without_photo"
                          ? `${row.status.NO_PHOTO} without photo`
                          : `${row.status.GENERATED} generated · ${row.status.NOT_GENERATED} not generated · ${row.status.NEEDS_REVIEW} review`}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="font-heading font-bold text-primary-foreground">
                {category.group} · {category.photoLabel}
              </p>
              <p className="text-xs text-primary-foreground/40 mt-0.5">
                {total.toLocaleString("en-IN")} unique teacher{total !== 1 ? "s" : ""}
                {selected.size ? ` · ${selected.size} selected` : ""}
                {busy ? ` · ${progress.done} / ${progress.total}` : ""}
              </p>
            </div>
            {withPhoto ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="hero-outline"
                  size="sm"
                  className="text-xs h-9"
                  disabled={busy || selected.size === 0}
                  onClick={() => void runSelected(false)}
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Generate finalized images
                </Button>
                <Button
                  variant="hero-outline"
                  size="sm"
                  className="text-xs h-9"
                  disabled={busy || selected.size === 0}
                  onClick={() => void runSelected(true)}
                >
                  Regenerate image
                </Button>
              </div>
            ) : (
              <p className="text-xs text-primary-foreground/40">Generate is hidden for without-photo teachers.</p>
            )}
          </div>
          {busy ? (
            <div className="h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden">
              <div
                className="h-full bg-secondary transition-all"
                style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
              />
            </div>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
              <Input
                placeholder="Search name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
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
            <div className="flex flex-wrap items-center gap-3 text-xs text-primary-foreground/55">
              <label className="inline-flex items-center gap-2">
                <Checkbox checked={allPageSelected} onCheckedChange={(on) => togglePage(Boolean(on))} />
                Select page
              </label>
              <button type="button" className="font-semibold text-secondary hover:text-secondary/80" onClick={() => void selectAllMatching()}>
                Select all matching ({total.toLocaleString("en-IN")})
              </button>
              {selected.size > 0 ? (
                <button type="button" className="hover:text-primary-foreground" onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
            <span className="ml-3 text-primary-foreground/60 text-sm">Loading unique teachers…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-primary-foreground/40">No unique teachers in this category.</div>
        ) : (
          <div className="p-3 sm:p-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((row, i) => (
              <motion.div
                key={row.phone}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3 space-y-3"
              >
                <div className="flex items-start gap-3">
                  {withPhoto ? (
                    <Checkbox
                      checked={selected.has(row.phone)}
                      onCheckedChange={(on) => togglePhone(row.phone, Boolean(on))}
                      className="mt-1"
                    />
                  ) : null}
                  <div
                    className="relative w-20 h-36 rounded-lg overflow-hidden border border-white/10 flex-shrink-0"
                    style={row.cropped_cloudinary_url ? CHECKERBOARD : { background: "rgba(255,255,255,0.04)" }}
                  >
                    {row.cropped_cloudinary_url ? (
                      <img
                        src={cloudinaryDisplayUrl(row.cropped_cloudinary_url, { width: 240, height: 426, crop: "fit" })}
                        alt={row.name}
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/35 text-center px-1">
                        {withPhoto ? "No finalized image" : "No photo"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-bold text-white truncate">{row.name || "Unnamed teacher"}</p>
                    <p className="text-xs text-primary-foreground/50">{row.phone}</p>
                    <p className="text-[11px] text-primary-foreground/40 mt-1">
                      {row.nomination_count} nomination{row.nomination_count !== 1 ? "s" : ""} in this category
                    </p>
                    <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CHIP[row.portrait_status]}`}>
                      {STATUS_LABEL[row.portrait_status]}
                    </span>
                    {jobStatus[row.phone] ? (
                      <p className="text-[11px] text-primary-foreground/45 mt-1">{jobStatus[row.phone].replace(/_/g, " ")}</p>
                    ) : null}
                  </div>
                </div>
                <div className="text-[11px] text-primary-foreground/45 space-y-0.5">
                  <p>Source nomination: {row.source_nomination_id || "—"}</p>
                  <p>Last generated: {formatWhen(row.finalized_at || row.generated_at)}</p>
                  {row.portrait_error ? <p className="text-amber-300">{row.portrait_error}</p> : null}
                </div>
                {row.portrait_status === "NEEDS_REVIEW" && row.candidates.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40">Pick a source photo</p>
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
            ))}
          </div>
        )}

        {total > pageSize ? (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-primary-foreground/10 text-xs text-primary-foreground/50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="font-semibold text-secondary disabled:text-primary-foreground/25 disabled:pointer-events-none"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="font-semibold text-secondary disabled:text-primary-foreground/25 disabled:pointer-events-none"
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
