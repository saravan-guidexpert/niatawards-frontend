import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  adminGetTeacherVideoMessageIds,
  adminGetTeacherVideoMessageSummary,
  adminGetTeacherVideoMessages,
  adminGetTeacherVideoProgress,
  adminPreviewTeacherVideoQueue,
  adminQueueTeacherVideoMatching,
  adminQueueTeacherVideoMessages,
  adminResumeTeacherVideoMatching,
  adminRetryTeacherVideoMatching,
  adminRetryTeacherVideoMessages,
  adminSendTeacherVideoMessage,
  type TeacherVideoMatchingIds,
  type TeacherVideoMessageRow,
  type TeacherVideoMessageSummary,
  type TeacherVideoQueuePreview,
} from "@/lib/apiAdmin";

const KINDS = [
  { id: "", label: "All types" },
  { id: "student", label: "Student Nominated Teacher" },
  { id: "teacher", label: "Teacher Nominated Teacher" },
  { id: "colleague", label: "Teacher Nominated Other Teacher" },
] as const;

const PHOTOS = [
  { id: "", label: "All" },
  { id: "with_photo", label: "With photo" },
  { id: "without_photo", label: "Without photo" },
] as const;

const STATUSES = [
  { id: "", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "queued", label: "Queued" },
  { id: "submitted", label: "Submitted" },
  { id: "sent", label: "Sent" },
  { id: "delivered", label: "Delivered" },
  { id: "read", label: "Read" },
  { id: "failed", label: "Failed" },
] as const;

const EMPTY_SUMMARY: TeacherVideoMessageSummary = {
  totalGenerated: 0, ready: 0, queued: 0, submitted: 0, sent: 0, delivered: 0, read: 0, failed: 0,
};

const shortType = (kind: TeacherVideoMessageRow["nominationKind"]) => {
  if (kind === "student") return "Student → teacher";
  if (kind === "teacher") return "Teacher → teacher";
  return "Teacher → other";
};

const statusClass = (status: string) => {
  if (status === "read") return "bg-teal-500/25 text-teal-100 border-teal-300/40";
  if (status === "delivered") return "bg-emerald-500/25 text-emerald-100 border-emerald-300/40";
  if (status === "failed") return "bg-rose-500/25 text-rose-100 border-rose-300/45";
  if (status === "queued") return "bg-sky-500/25 text-sky-100 border-sky-300/40";
  if (status === "submitted" || status === "sent") return "bg-indigo-500/25 text-indigo-100 border-indigo-300/40";
  return "bg-amber-400/20 text-amber-100 border-amber-300/40";
};

const typeClass = (kind: TeacherVideoMessageRow["nominationKind"]) => {
  if (kind === "student") return "bg-sky-500/20 text-sky-100 border-sky-300/30";
  if (kind === "teacher") return "bg-violet-500/20 text-violet-100 border-violet-300/30";
  return "bg-orange-500/20 text-orange-100 border-orange-300/30";
};

const cardToneClass = (tone: "default" | "ready" | "sky" | "ok" | "bad" | "read", active: boolean) => {
  if (tone === "ready") return active ? "border-amber-300/50 bg-amber-400/15" : "border-amber-400/25 bg-amber-400/8";
  if (tone === "sky") return active ? "border-sky-300/50 bg-sky-500/20" : "border-sky-400/25 bg-sky-500/10";
  if (tone === "ok") return active ? "border-emerald-300/50 bg-emerald-500/20" : "border-emerald-400/25 bg-emerald-500/10";
  if (tone === "read") return active ? "border-teal-300/50 bg-teal-500/20" : "border-teal-400/25 bg-teal-500/10";
  if (tone === "bad") return active ? "border-rose-300/50 bg-rose-500/20" : "border-rose-400/25 bg-rose-500/10";
  return active ? "border-white/30 bg-white/10" : "border-white/12 bg-[#1c1414]";
};

const cardValueClass = (tone: "default" | "ready" | "sky" | "ok" | "bad" | "read") => {
  if (tone === "ready") return "text-amber-200";
  if (tone === "sky") return "text-sky-200";
  if (tone === "ok") return "text-emerald-200";
  if (tone === "read") return "text-teal-200";
  if (tone === "bad") return "text-rose-200";
  return "text-white";
};

const formatWhen = (value: string | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const Chip = ({
  active,
  tone = "default",
  children,
  onClick,
}: {
  active: boolean;
  tone?: "default" | "test" | "danger";
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "text-xs px-3 py-1.5 rounded-md border transition-colors",
      active && tone === "test" && "border-amber-300/60 bg-amber-400/25 text-amber-50",
      active && tone === "danger" && "border-rose-300/50 bg-rose-500/25 text-rose-50",
      active && tone === "default" && "border-secondary/50 bg-secondary/20 text-secondary",
      !active && "border-white/15 bg-[#1a1212] text-zinc-200 hover:text-white hover:border-secondary/35"
    )}
  >
    {children}
  </button>
);

const TeacherVideoMessagingPanel = () => {
  const { toast } = useToast();
  const [kind, setKind] = useState("");
  const [photo, setPhoto] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [testOnly, setTestOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<TeacherVideoMessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TeacherVideoMessageSummary>(EMPTY_SUMMARY);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedFailed, setSelectedFailed] = useState<Set<string>>(new Set());
  const [selectedReady, setSelectedReady] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState<(TeacherVideoMatchingIds & {
    filters: { kind: string; photo: string; status: string; q: string; testOnly: boolean };
  }) | null>(null);
  const [selectingAll, setSelectingAll] = useState(false);
  const [previewing, setPreviewing] = useState<TeacherVideoMessageRow | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<TeacherVideoMessageRow | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [preview, setPreview] = useState<TeacherVideoQueuePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<{
    total: number; queued: number; submitted: number; sent: number; delivered: number; read: number; failed: number; pending: number;
  } | null>(null);

  const filtersActive = Boolean(kind || photo || status || search || testOnly);

  const load = async (nextPage = page, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        adminGetTeacherVideoMessages({ kind, photo, status, q: search, testOnly, page: nextPage, limit: 25 }),
        adminGetTeacherVideoMessageSummary({ kind, photo, q: search, testOnly }),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setPage(list.page);
      setSummary(stats);
      setLoadError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setLoadError(message);
      if (!silent) {
        toast({ title: "Could not load messages", description: message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelected(new Set());
    setSelectedFailed(new Set());
    setSelectedReady(new Set());
    setMatching(null);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, photo, status, search, testOnly]);

  useEffect(() => {
    const t = setInterval(() => void load(page, true), campaignId || eventIds.length ? 4000 : 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, photo, status, search, testOnly, page, eventIds.length, campaignId]);

  useEffect(() => {
    if (!campaignId && !eventIds.length) return;
    let sawQueuedDrain = false;
    const tick = async () => {
      try {
        const progress = await adminGetTeacherVideoProgress({
          campaignId: campaignId || undefined,
          eventIds: campaignId ? [] : eventIds,
        });
        setCampaign(progress);
        if (progress.queued === 0 && progress.total > 0 && !sawQueuedDrain) {
          sawQueuedDrain = true;
          await load(page, true);
        }
      } catch {
        // keep last progress
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, eventIds.join(",")]);

  const currentFilters = { kind, photo, status, q: search, testOnly };

  const toggle = (row: TeacherVideoMessageRow) => {
    const id = row.nominationVideoId;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedFailed((prev) => {
      const next = new Set(prev);
      if (prev.has(id) || !row.canRetry) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedReady((prev) => {
      const next = new Set(prev);
      if (prev.has(id) || !row.canSend) next.delete(id);
      else next.add(id);
      return next;
    });
    setMatching(null);
  };

  const pageIds = items.map((row) => row.nominationVideoId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const allMatchingSelected = Boolean(matching && matching.ids.length > 0 && matching.ids.every((id) => selected.has(id)) && selected.size === matching.ids.length);
  const headerChecked = allMatchingSelected || (total <= items.length && allPageSelected);
  const headerState = headerChecked ? true : selected.size > 0 ? "indeterminate" : false;

  const applyMatching = (
    data: TeacherVideoMatchingIds,
    filters: { kind: string; photo: string; status: string; q: string; testOnly: boolean }
  ) => {
    setMatching({ ...data, filters });
    setSelected(new Set(data.ids));
    setSelectedFailed(new Set(data.failedIds));
    setSelectedReady(new Set(data.readyIds));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectedFailed(new Set());
    setSelectedReady(new Set());
    setMatching(null);
  };

  const selectAllMatching = async (statusOverride?: string) => {
    const filters = { ...currentFilters, status: statusOverride ?? status };
    setSelectingAll(true);
    try {
      const data = await adminGetTeacherVideoMessageIds(filters);
      applyMatching(data, filters);
      toast({
        title: `Selected ${data.total.toLocaleString("en-IN")} matching ${data.total === 1 ? "row" : "rows"}`,
        description: `${data.readyIds.length.toLocaleString("en-IN")} ready to send${data.failedIds.length ? ` · ${data.failedIds.length.toLocaleString("en-IN")} failed` : ""}`,
      });
    } catch (err: unknown) {
      toast({
        title: "Could not select all",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setSelectingAll(false);
    }
  };

  const toggleHeader = async () => {
    if (headerChecked) {
      clearSelection();
      return;
    }
    await selectAllMatching();
  };

  const sendOne = async (row: TeacherVideoMessageRow, retry = false, resume = false) => {
    setSendingId(row.nominationVideoId);
    try {
      const result = await adminSendTeacherVideoMessage(
        row.nominationVideoId,
        retry || row.messageStatus === "failed",
        resume || row.messageStatus === "queued"
      );
      toast({
        title: result.queued || result.ok
          ? (resume || row.messageStatus === "queued" ? "Send resumed" : row.isTest ? "Test message queued" : "Message queued")
          : "Could not send",
        description: result.error || `${row.teacherName} · ${row.isTest ? "9347763131" : row.teacherPhone}`,
        variant: result.ok || result.queued ? "default" : "destructive",
      });
      if (result.eventIds?.length) setEventIds((prev) => [...new Set([...prev, ...result.eventIds!])]);
      await load(page, true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Send failed";
      toast({
        title: /already|duplicate|409/i.test(message) ? "Already queued" : "Send failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
      setConfirmRow(null);
    }
  };

  const openQueue = async () => {
    if (!selectedReady.size) {
      toast({ title: "Nothing ready to send", description: "Select ready rows, or retry failed messages separately.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (allMatchingSelected && matching?.preview) {
        setPreview(matching.preview);
      } else {
        setPreview(await adminPreviewTeacherVideoQueue([...selectedReady]));
      }
      setQueueOpen(true);
    } catch (err: unknown) {
      toast({ title: "Preview failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const trackCampaign = (result: { campaignId?: string; eventIds: string[] }) => {
    if (result.campaignId) setCampaignId(result.campaignId);
    if (result.eventIds?.length) setEventIds((prev) => [...new Set([...prev, ...result.eventIds])]);
  };

  const confirmQueue = async () => {
    setBusy(true);
    try {
      const result = allMatchingSelected && matching
        ? await adminQueueTeacherVideoMatching(matching.filters)
        : await adminQueueTeacherVideoMessages([...selectedReady]);
      trackCampaign(result);
      setQueueOpen(false);
      clearSelection();
      toast({
        title: `Queued ${result.queued.toLocaleString("en-IN")} message${result.queued === 1 ? "" : "s"}`,
        description: result.skipped ? `${result.skipped.toLocaleString("en-IN")} skipped because they were already sent or invalid` : "WhatsApp sending has started in the background.",
      });
      await load(page, true);
    } catch (err: unknown) {
      toast({ title: "Queue failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmResumeQueued = async () => {
    if (!summary.queued) return;
    setBusy(true);
    setResumeOpen(false);
    try {
      let submitted = 0;
      let failed = 0;
      let batches = 0;
      while (batches < 250) {
        const result = await adminResumeTeacherVideoMatching({
          kind,
          photo,
          q: search,
          testOnly,
          status: "queued",
        });
        trackCampaign(result);
        submitted += result.submitted ?? 0;
        failed += result.failed ?? 0;
        batches += 1;
        await load(page, true);
        if (!(result.queued || result.submitted) || (result.remaining ?? 0) === 0) break;
        toast({
          title: `Submitted ${submitted.toLocaleString("en-IN")} to Gupshup`,
          description: `${(result.remaining ?? 0).toLocaleString("en-IN")} still queued. Keep this tab open.`,
        });
      }
      toast({
        title: `Submitted ${submitted.toLocaleString("en-IN")} queued message${submitted === 1 ? "" : "s"}`,
        description: failed
          ? `${failed.toLocaleString("en-IN")} failed. Remaining queued will retry on the next resume or cron sweep.`
          : "Queued teachers are being accepted by Gupshup. Refresh to watch Submitted rise.",
      });
    } catch (err: unknown) {
      toast({ title: "Resume failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const failedSelectedCount = selectedFailed.size;
  const outstanding = summary.ready + summary.queued + summary.submitted + summary.sent + summary.failed;
  const confirmRetry = async () => {
    if (!failedSelectedCount && !outstanding) return;
    setBusy(true);
    setRetryOpen(false);
    try {
      let submitted = 0;
      let failedAgain = 0;
      let batches = 0;
      while (batches < 250) {
        const selectedOnly = batches === 0 && failedSelectedCount > 0 && !allMatchingSelected;
        const result = selectedOnly
          ? await adminRetryTeacherVideoMessages([...selectedFailed])
          : await adminRetryTeacherVideoMatching({
              kind,
              photo,
              q: search,
              testOnly,
            });
        trackCampaign(result);
        submitted += result.submitted ?? result.queued ?? 0;
        failedAgain += result.failed ?? 0;
        batches += 1;
        await load(page, true);
        if (!(result.queued || result.submitted)) break;
        toast({
          title: `Submitted ${submitted.toLocaleString("en-IN")} outstanding message${submitted === 1 ? "" : "s"}`,
          description: "Retrying ready, queued, sent, and failed. Keep this tab open.",
        });
      }
      clearSelection();
      toast({
        title: `Submitted ${submitted.toLocaleString("en-IN")} outstanding message${submitted === 1 ? "" : "s"}`,
        description: failedAgain
          ? `${failedAgain.toLocaleString("en-IN")} failed again. Opt-outs and numbers not on WhatsApp stay failed.`
          : "Gupshup accepted the recoverable messages.",
      });
    } catch (err: unknown) {
      toast({ title: "Retry failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: value });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setKind("");
    setPhoto("");
    setStatus("");
    setQ("");
    setSearch("");
    setTestOnly(false);
  };

  const campaignTotal = campaign?.total || 0;
  const campaignDone = campaign
    ? campaign.submitted + campaign.sent + campaign.delivered + campaign.read + campaign.failed
    : 0;
  const progressPct = campaignTotal ? Math.round((campaignDone / campaignTotal) * 100) : 0;
  const showCampaign = Boolean((campaignId || eventIds.length) && campaign && campaignTotal > 0);

  const cards = useMemo(() => ([
    { label: "Generated", value: summary.totalGenerated, filter: "", tone: "default" as const },
    { label: "Ready", value: summary.ready, filter: "ready", tone: "ready" as const },
    { label: "Queued", value: summary.queued, filter: "queued", tone: "sky" as const },
    { label: "Sent", value: summary.sent + summary.submitted, filter: "sent", tone: "sky" as const },
    { label: "Delivered", value: summary.delivered, filter: "delivered", tone: "ok" as const },
    { label: "Read", value: summary.read, filter: "read", tone: "read" as const },
    { label: "Failed", value: summary.failed, filter: "failed", tone: "bad" as const },
  ]), [summary]);

  const rangeStart = total === 0 ? 0 : (page - 1) * 25 + 1;
  const rangeEnd = Math.min(page * 25, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-white">Teacher Video Messaging</h2>
          <p className="text-sm text-zinc-300 mt-1 max-w-2xl">
            One WhatsApp message per teacher per nomination type. Extra videos for the same teacher and type are not sent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="hero-outline"
            size="sm"
            className="gap-1.5"
            disabled={busy || summary.queued === 0}
            onClick={() => setResumeOpen(true)}
          >
            <Send className="w-3.5 h-3.5" />
            Resume queued ({summary.queued.toLocaleString("en-IN")})
          </Button>
          <Button
            variant="hero-outline"
            size="sm"
            className="gap-1.5"
            disabled={busy || outstanding === 0}
            onClick={() => setRetryOpen(true)}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry not delivered ({outstanding.toLocaleString("en-IN")})
          </Button>
          <Button variant="hero-outline" size="sm" className="gap-1.5" onClick={() => void load(page)}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      <div className="sticky top-14 z-20 rounded-xl border border-secondary/20 bg-[#1a1010]/95 backdrop-blur px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[10px] uppercase tracking-wider text-secondary w-16 shrink-0">Type</span>
          {KINDS.map((item) => (
            <Chip key={item.id || "all-kinds"} active={kind === item.id} onClick={() => setKind(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[10px] uppercase tracking-wider text-secondary w-16 shrink-0">Photo</span>
          {PHOTOS.map((item) => (
            <Chip key={item.id || "all-photos"} active={photo === item.id} onClick={() => setPhoto(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[10px] uppercase tracking-wider text-secondary w-16 shrink-0">Status</span>
          {STATUSES.map((item) => (
            <Chip
              key={item.id || "all-status"}
              active={status === item.id}
              tone={item.id === "failed" ? "danger" : "default"}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </Chip>
          ))}
          <Chip active={testOnly} tone="test" onClick={() => setTestOnly((v) => !v)}>
            Test number
          </Chip>
          {filtersActive ? (
            <button type="button" className="text-xs text-secondary hover:text-secondary/80 ml-1" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 min-w-[16rem]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary/70" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(q.trim())}
              placeholder="Search teacher, phone, or nomination ID"
              className="pl-9 h-9 bg-[#221616] border-white/15 text-white placeholder:text-zinc-500"
            />
          </div>
          <Button variant="hero-outline" size="sm" onClick={() => setSearch(q.trim())}>Search</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setStatus(card.filter)}
            className={cn("text-left rounded-xl border px-3 py-2.5 transition-colors", cardToneClass(card.tone, status === card.filter))}
          >
            <p className="text-[10px] uppercase tracking-wide text-zinc-300">{card.label}</p>
            <p className={cn("text-xl font-semibold mt-0.5", cardValueClass(card.tone))}>{card.value.toLocaleString("en-IN")}</p>
          </button>
        ))}
      </div>

      {showCampaign && campaign && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Campaign progress</p>
            <button type="button" className="text-white/40 hover:text-white" onClick={() => { setEventIds([]); setCampaignId(null); setCampaign(null); }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <Progress value={progressPct} className="h-1.5 bg-white/10" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/65">
            <span>Queued {campaign.queued}</span>
            <span>Submitted {campaign.submitted}</span>
            <span>Sent {campaign.sent}</span>
            <span>Delivered {campaign.delivered}</span>
            <span>Read {campaign.read}</span>
            <span className={campaign.failed ? "text-red-200" : undefined}>Failed {campaign.failed}</span>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2">
          <p className="text-sm text-secondary mr-auto">
            {selected.size.toLocaleString("en-IN")} selected
            {allMatchingSelected ? " · every matching page" : total > pageIds.length ? ` of ${total.toLocaleString("en-IN")} matching` : ""}
            {selectedReady.size ? ` · ${selectedReady.size.toLocaleString("en-IN")} ready to send` : ""}
          </p>
          {!allMatchingSelected && total > pageIds.length ? (
            <Button variant="hero-outline" size="sm" disabled={selectingAll} onClick={() => void selectAllMatching()}>
              {selectingAll ? "Selecting…" : `Select all ${total.toLocaleString("en-IN")} matching`}
            </Button>
          ) : null}
          <Button variant="hero-outline" size="sm" disabled={busy || !selectedReady.size} onClick={() => void openQueue()}>
            Queue ready ({selectedReady.size.toLocaleString("en-IN")})
          </Button>
          <Button variant="hero-outline" size="sm" disabled={!failedSelectedCount || busy} onClick={() => setRetryOpen(true)}>
            Retry failed ({failedSelectedCount})
          </Button>
          <Button
            variant="hero-outline"
            size="sm"
            disabled={selectingAll}
            onClick={() => void selectAllMatching("failed")}
          >
            Select all failed
          </Button>
          <Button variant="ghost" size="sm" className="text-white/60" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {loadError && items.length === 0 ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-8 text-center">
          <p className="text-sm text-red-100">Could not load generated videos.</p>
          <p className="text-xs text-red-100/60 mt-1">{loadError}</p>
          <Button variant="hero-outline" size="sm" className="mt-3" onClick={() => void load(page)}>Try again</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/12 overflow-hidden bg-[#171111]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#241818] text-[11px] uppercase tracking-wide text-amber-100/70">
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <Checkbox
                      checked={headerState}
                      disabled={selectingAll || loading}
                      title={total > pageIds.length ? "Select all matching rows across pages" : "Select all rows"}
                      onCheckedChange={() => void toggleHeader()}
                    />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">Teacher</th>
                  <th className="text-left px-3 py-2.5 font-medium">Phone</th>
                  <th className="text-left px-3 py-2.5 font-medium">Type</th>
                  <th className="text-left px-3 py-2.5 font-medium">Photo</th>
                  <th className="text-left px-3 py-2.5 font-medium">Nominator</th>
                  <th className="text-left px-3 py-2.5 font-medium">Nomination</th>
                  <th className="text-left px-3 py-2.5 font-medium">Video</th>
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium">Updated</th>
                  <th className="text-right px-3 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t border-white/6">
                      {Array.from({ length: 11 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3.5 rounded bg-white/8 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-14 text-center text-white/40">
                      No videos match these filters.
                      {filtersActive ? (
                        <button type="button" className="block mx-auto mt-2 text-xs text-white/60 underline" onClick={clearFilters}>
                          Clear filters
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ) : items.map((row) => (
                  <tr
                    key={row.nominationVideoId}
                    className={cn(
                      "border-t border-white/8 hover:bg-white/[0.04]",
                      row.isTest && "bg-amber-400/10",
                      row.messageStatus === "failed" && "bg-rose-500/10"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <Checkbox checked={selected.has(row.nominationVideoId)} onCheckedChange={() => toggle(row)} />
                    </td>
                    <td className="px-3 py-2.5 text-white">
                      <div className="flex items-center gap-2 min-w-[8rem]">
                        <span className="truncate max-w-[9rem] font-medium" title={row.teacherName}>{row.teacherName}</span>
                        {row.isTest ? (
                          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-50 border border-amber-300/40">
                            TEST
                          </span>
                        ) : null}
                      </div>
                      {row.videoCount > 1 ? (
                        <p className="text-[10px] text-zinc-400 mt-0.5">1 of {row.videoCount} videos</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-200">{row.isTest ? "9347763131" : row.teacherPhone || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" title={row.nominationTypeLabel}>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-md border", typeClass(row.nominationKind))}>
                        {shortType(row.nominationKind)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-md border",
                        row.photoState === "with_photo"
                          ? "bg-teal-500/20 text-teal-100 border-teal-300/30"
                          : "bg-zinc-500/20 text-zinc-200 border-zinc-400/25"
                      )}>
                        {row.photoState === "with_photo" ? "Photo" : "No photo"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-200 truncate max-w-[8rem]">{row.nominatorName || "—"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="font-mono text-[11px] text-sky-200 hover:text-sky-100 inline-flex items-center gap-1"
                        title={row.nominationId}
                        onClick={() => void copyId(row.nominationId)}
                      >
                        {row.nominationId.slice(0, 8)}…
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.videoUrl ? (
                        <button type="button" className="text-secondary hover:text-secondary/80 text-xs inline-flex items-center gap-1" onClick={() => setPreviewing(row)}>
                          <Video className="w-3.5 h-3.5" /> Preview
                        </button>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide", statusClass(row.messageStatus))}>
                        {row.messageStatus}
                      </span>
                      {row.failureReason ? (
                        <p className="text-[10px] text-rose-200 mt-1 max-w-[11rem] truncate" title={row.failureReason}>{row.failureReason}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 text-[11px] whitespace-nowrap">{formatWhen(row.updatedAt)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {row.canResume ? (
                        <Button
                          variant="hero-outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={sendingId === row.nominationVideoId}
                          onClick={() => setConfirmRow(row)}
                        >
                          {sendingId === row.nominationVideoId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Resume
                        </Button>
                      ) : row.canRetry ? (
                        <Button
                          variant="hero-outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-rose-300/40 bg-rose-500/15 text-rose-100"
                          disabled={sendingId === row.nominationVideoId}
                          onClick={() => setConfirmRow(row)}
                        >
                          {sendingId === row.nominationVideoId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Retry
                        </Button>
                      ) : row.canSend ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={sendingId === row.nominationVideoId}
                          onClick={() => setConfirmRow(row)}
                        >
                          {sendingId === row.nominationVideoId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          {row.isTest && row.messageStatus !== "ready" ? "Send again" : "Send"}
                        </Button>
                      ) : row.messageStatus === "delivered" || row.messageStatus === "read" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 capitalize">{row.messageStatus}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/10 bg-[#1d1414] text-xs text-zinc-300">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{total ? `${rangeStart}–${rangeEnd} of ${total.toLocaleString("en-IN")}` : "0 videos"}</span>
              {total > pageIds.length ? (
                <button
                  type="button"
                  className="font-semibold text-secondary hover:text-secondary/80 disabled:opacity-50"
                  disabled={selectingAll || allMatchingSelected}
                  onClick={() => void selectAllMatching()}
                >
                  {selectingAll ? "Selecting all…" : `Select all ${total.toLocaleString("en-IN")} matching`}
                </button>
              ) : null}
            </span>
            <div className="flex gap-2">
              <Button variant="hero-outline" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Prev</Button>
              <Button variant="hero-outline" size="sm" disabled={page * 25 >= total || loading} onClick={() => void load(page + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-400 flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-300" />
        <span>
          One message per teacher phone and nomination type. After Session nominations never appear.
          The test number 9347763131 can still be sent again after delivered or read. Production numbers cannot.
        </span>
      </p>

      {previewing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewing(null)}>
          <div className="w-full max-w-md rounded-xl overflow-hidden bg-[#161010] border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{previewing.teacherName}</p>
                <p className="text-[11px] text-white/40">{previewing.nominationTypeLabel}</p>
              </div>
              <button type="button" className="text-white/50 text-xs" onClick={() => setPreviewing(null)}>Close</button>
            </div>
            <video src={previewing.videoUrl} controls className="w-full bg-black aspect-[9/16] max-h-[70vh] object-contain" />
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(confirmRow)} onOpenChange={(open) => !open && setConfirmRow(null)}>
        <AlertDialogContent className="bg-[#161010] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRow?.canResume ? "Resume this queued WhatsApp message?" : confirmRow?.canRetry ? "Retry this WhatsApp message?" : confirmRow?.isTest ? "Send test WhatsApp message?" : "Send this WhatsApp message?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 space-y-1.5">
              <p>{confirmRow?.teacherName} · {confirmRow?.isTest ? "9347763131" : confirmRow?.teacherPhone}</p>
              <p>{confirmRow?.nominationTypeLabel} · {confirmRow?.photoState === "with_photo" ? "With photo" : "Without photo"}</p>
              {confirmRow?.canResume ? (
                <p>This was accepted into the queue but never handed to Gupshup. Resume sends the same video now.</p>
              ) : confirmRow?.isTest ? (
                <p className="text-amber-200/90">Test destination only. Production teacher numbers are not changed.</p>
              ) : (
                <p>This sends the existing Cloudinary video. It will not generate a new one.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || Boolean(sendingId)}
              onClick={(e) => {
                e.preventDefault();
                if (confirmRow) void sendOne(confirmRow, confirmRow.canRetry, confirmRow.canResume);
              }}
            >
              {sendingId ? "Sending…" : confirmRow?.canResume ? "Resume" : confirmRow?.canRetry ? "Retry" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={queueOpen} onOpenChange={setQueueOpen}>
        <AlertDialogContent className="bg-[#161010] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Send {preview?.ready || 0} WhatsApp messages?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-white/60 space-y-2 text-sm">
                <p>
                  Only rows that have not been sent yet are queued. Already delivered, read, or in-flight messages are skipped.
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p>Student nominated: {preview?.byKind.student || 0}</p>
                  <p>Teacher nominated: {preview?.byKind.teacher || 0}</p>
                  <p>Other teacher: {preview?.byKind.colleague || 0}</p>
                  <p>Recipients: {preview?.recipientCount || 0}</p>
                  <p>With photo: {preview?.byPhoto.with_photo || 0}</p>
                  <p>Without photo: {preview?.byPhoto.without_photo || 0}</p>
                  <p>Ready to send: {preview?.ready || 0}</p>
                  <p>Already sent: {preview?.alreadySent || 0}</p>
                  <p>Failed (use Retry): {preview?.failed || 0}</p>
                  <p>Duplicates: {preview?.duplicate || 0}</p>
                </div>
                {(preview?.testCount || 0) > 0 ? (
                  <p className="text-amber-200/90">Includes {preview?.testCount} test row(s) for 9347763131, which can be sent again.</p>
                ) : (
                  <p className="text-amber-200/90">These go to real teacher WhatsApp numbers. This does not generate new videos.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy || !preview?.ready} onClick={(e) => { e.preventDefault(); void confirmQueue(); }}>
              {busy ? "Queuing…" : `Send ${preview?.ready || 0}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={retryOpen} onOpenChange={setRetryOpen}>
        <AlertDialogContent className="bg-[#161010] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Retry {(failedSelectedCount || outstanding).toLocaleString("en-IN")} message{(failedSelectedCount || outstanding) === 1 ? "" : "s"} that are not delivered?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Ready, queued, sent, and failed videos are submitted to Gupshup again. Delivered and read are left alone, except the test number. Opt-outs and numbers that are not on WhatsApp are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy || (!failedSelectedCount && !outstanding)} onClick={(e) => { e.preventDefault(); void confirmRetry(); }}>
              {busy ? "Retrying…" : `Retry ${(failedSelectedCount || outstanding).toLocaleString("en-IN")}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <AlertDialogContent className="bg-[#161010] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Resume {summary.queued.toLocaleString("en-IN")} queued WhatsApp message{summary.queued === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 space-y-2">
              <span className="block">
                These were accepted into the queue but never submitted to Gupshup. Resume submits them to Gupshup in batches and keeps going until this tab finishes the queue.
              </span>
              <span className="block text-amber-200/90">
                Current filters apply. Keep this tab open. Status will change from Queued to Submitted as Gupshup accepts each message.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy || summary.queued === 0} onClick={(e) => { e.preventDefault(); void confirmResumeQueued(); }}>
              {busy ? "Resuming…" : `Resume ${summary.queued.toLocaleString("en-IN")}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherVideoMessagingPanel;
