import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Square,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  adminCancelVideoGenerationJob,
  adminGetVideoGenerationJob,
  adminRetryFailedVideoGeneration,
  type VideoGenerationJobItem,
  type VideoGenerationJobView,
} from "@/lib/apiAdmin";

const KIND_LABEL: Record<string, string> = {
  student: "Student Nominated Teacher",
  teacher: "Teacher Nominated Teacher",
  colleague: "Teacher Nominated Other Teacher",
};

const formatEta = (seconds: number | null | undefined) => {
  if (seconds == null) return "Calculating ETA...";
  if (seconds <= 0) return "Finishing…";
  if (seconds < 60) return `~${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `~${hours}h ${rem}m` : `~${hours}h`;
};

const formatDuration = (ms: number | null | undefined) => {
  if (!ms || ms < 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const statusDot = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-400";
  if (status === "PROCESSING") return "bg-sky-400 animate-pulse";
  if (status === "FAILED") return "bg-red-400";
  if (status === "CANCELLED") return "bg-white/30";
  return "bg-amber-300";
};

type Props = {
  job: VideoGenerationJobView;
  onJobChange: (job: VideoGenerationJobView) => void;
  onClose?: () => void;
};

const VideoGenerationJobPanel = ({ job, onJobChange, onClose }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<VideoGenerationJobItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const onJobChangeRef = useRef(onJobChange);
  onJobChangeRef.current = onJobChange;
  const running = job.status === "running";

  useEffect(() => {
    if (!job.job_id || !running) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await adminGetVideoGenerationJob(job.job_id, {
          items: showAll,
          status: showAll ? "FAILED" : undefined,
        });
        if (!cancelled) {
          onJobChangeRef.current(data.job);
          if (showAll) setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        /* keep last snapshot */
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [job.job_id, running, showAll]);

  useEffect(() => {
    if (!showAll || running) return;
    void adminGetVideoGenerationJob(job.job_id, { items: true, status: "FAILED" })
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => undefined);
  }, [job.job_id, showAll, running]);

  const cancelQueued = async () => {
    setBusy(true);
    try {
      const data = await adminCancelVideoGenerationJob(job.job_id);
      onJobChange(data.job);
      toast({ title: "Queued work cancelled" });
    } catch (err: unknown) {
      toast({
        title: "Could not cancel",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const retryFailed = async () => {
    setBusy(true);
    try {
      const data = await adminRetryFailedVideoGeneration(job.job_id);
      onJobChange(data.job);
      toast({ title: `Retry job #${data.job.job_number} started` });
    } catch (err: unknown) {
      toast({
        title: "Could not retry",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const categoryLabel = `${KIND_LABEL[String(job.kind || "")] || job.kind || "Nominations"} — ${
    job.photo === "without_photo" ? "Without Photo" : "With Photo"
  }`;
  const title =
    job.status === "cancelled"
      ? "JOB CANCELLED"
      : running
        ? "VIDEO GENERATION IN PROGRESS"
        : "VIDEO GENERATION";

  return (
    <div className="rounded-2xl border border-secondary/30 bg-secondary/10 overflow-hidden">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-heading font-bold text-white flex items-center gap-2">
              {running ? <Loader2 className="w-4 h-4 animate-spin text-secondary" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {title}
            </p>
            <p className="text-sm text-white/60 mt-1">
              Job #{job.job_number} · {job.total.toLocaleString("en-IN")} videos · {categoryLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button variant="hero-outline" size="sm" className="text-xs h-9" disabled={busy} onClick={() => void cancelQueued()}>
                <Square className="w-3.5 h-3.5" />
                Cancel queued
              </Button>
            ) : null}
            {!running && job.failed > 0 ? (
              <Button size="sm" className="h-9 bg-secondary text-[#1a0505] font-semibold" disabled={busy} onClick={() => void retryFailed()}>
                Retry failed ({job.failed})
              </Button>
            ) : null}
            {onClose ? (
              <button type="button" className="text-xs text-white/45 hover:text-white" onClick={onClose}>
                Dismiss
              </button>
            ) : null}
          </div>
        </div>

        <div className="h-2 rounded-full bg-black/30 overflow-hidden">
          <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${job.progress_pct}%` }} />
        </div>
        <p className="text-sm text-white/70">
          {job.completed.toLocaleString("en-IN")} completed
          {job.failed ? ` · ${job.failed.toLocaleString("en-IN")} failed` : ""}
          {` · ${job.progress_pct}% processed`}
          {running ? ` · ${formatEta(job.eta_seconds)}` : job.duration_ms ? ` · ${formatDuration(job.duration_ms)}` : ""}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Total", value: job.total, icon: Clock, tone: "text-white/80" },
            { label: "Queued", value: job.queued, icon: Clock, tone: "text-white/80" },
            { label: "Processing", value: job.processing, icon: Loader2, tone: "text-sky-300", spin: running && job.processing > 0 },
            { label: "Completed", value: job.completed, icon: CheckCircle2, tone: "text-emerald-300" },
            { label: "Failed", value: job.failed, icon: XCircle, tone: "text-red-300" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                <stat.icon className={`w-3.5 h-3.5 ${stat.tone} ${stat.spin ? "animate-spin" : ""}`} />
                {stat.label}
              </div>
              <p className={`text-2xl font-heading font-bold tabular-nums mt-1 ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {job.cancelled > 0 ? (
          <p className="text-xs text-white/50">Cancelled: {job.cancelled.toLocaleString("en-IN")}</p>
        ) : null}

        {job.current && running ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/80 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Current</p>
            <p className="font-semibold text-white">{job.current.teacher_name || "Generating…"}</p>
            <p className="text-xs text-white/50 font-mono">Nomination {job.current.nomination_id}</p>
            <p className="text-xs text-white/45">{categoryLabel} · Audio attached</p>
          </div>
        ) : null}

        {job.avg_ms > 0 ? (
          <p className="text-xs text-white/45">Average {(job.avg_ms / 1000).toFixed(1)} sec/video</p>
        ) : null}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Recent</p>
            <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Hide failures" : "View all failures"}
            </button>
          </div>
          <div className="max-h-56 overflow-auto rounded-xl border border-white/10 divide-y divide-white/5">
            {(showAll ? items : job.recent).map((row) => {
              const id = "id" in row && row.id ? String(row.id) : row.nomination_id;
              const open = expanded.has(id);
              return (
                <div key={id} className="px-3 py-2 bg-black/10">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(row.status)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{row.teacher_name}</p>
                      <p className="text-[11px] text-white/40 font-mono truncate">{row.nomination_id}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] font-semibold text-white/80">{row.status}</p>
                      {row.failure_stage ? <p className="text-[10px] text-red-300">Stage: {row.failure_stage}</p> : null}
                    </div>
                  </div>
                  {row.error && !open ? (
                    <p className="mt-1 text-[11px] text-red-200/80 truncate">{row.error}</p>
                  ) : null}
                  {row.error ? (
                    <button
                      type="button"
                      className="mt-1 text-[11px] text-white/50 hover:text-white"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                    >
                      {open ? "Hide details" : "View details"}
                    </button>
                  ) : null}
                  {open && row.error ? <p className="mt-1 text-[11px] text-red-200/90 whitespace-pre-wrap">{row.error}</p> : null}
                </div>
              );
            })}
            {(showAll ? items : job.recent).length === 0 ? (
              <p className="px-3 py-4 text-xs text-white/40">Waiting for the first video…</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerationJobPanel;
