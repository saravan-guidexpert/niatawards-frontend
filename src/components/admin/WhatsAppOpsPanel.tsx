import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon, BarChart3, Calendar as CalendarIcon, CheckCircle2, ChevronDown,
  Download, KeyRound, Loader2, MessageCircle, Radio, RefreshCw, Send, Settings,
  XCircle,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isSuperAdmin } from "@/lib/adminSession";
import {
  adminGetWhatsAppMessages,
  adminGetWhatsAppMeta,
  adminGetWhatsAppOverview,
  adminGetWhatsAppRetryGroups,
  adminGetWhatsAppWebhooks,
  adminWhatsAppResend,
  adminWhatsAppTestSend,
  type WhatsAppDayTotals,
  type WhatsAppOpsMessage,
  type WhatsAppOpsMeta,
  type WhatsAppOpsOverview,
  type WhatsAppRetryGroupRow,
  type WhatsAppWebhookRow,
} from "@/lib/api";

type OpsTab = "overview" | "messages" | "retries" | "webhooks" | "failures" | "logs" | "settings";

const TABS: { id: OpsTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "retries", label: "Retries", icon: RefreshCw },
  { id: "webhooks", label: "Webhooks", icon: Radio },
  { id: "failures", label: "Failures", icon: AlertOctagon },
  { id: "logs", label: "Logs / export", icon: Download },
  { id: "settings", label: "Settings", icon: Settings },
];

const EMPTY_TOTALS: WhatsAppDayTotals = {
  recipients: 0, accepted: 0, delivered: 0, read: 0, permanentFailed: 0,
  transientFailed: 0, excluded: 0, undelivered: 0, exhausted: 0, inFlight: 0,
};

const STATUS_OPTIONS = ["", "queued", "submitted", "sent", "delivered", "read", "failed", "retry_exhausted"];

const DARK_CALENDAR_CLASSNAMES = {
  caption_label: "text-sm font-medium text-white",
  nav_button:
    "h-7 w-7 bg-white/5 border border-white/20 text-white p-0 opacity-90 hover:opacity-100 hover:bg-white/10 rounded-md",
  head_cell: "text-white/60 rounded-md w-9 font-normal text-[0.8rem]",
  cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
  day: "h-9 w-9 p-0 font-normal text-white hover:bg-white/15 hover:text-white rounded-md aria-selected:opacity-100",
  day_selected:
    "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
  day_today: "bg-white/15 text-white",
  day_outside: "text-white/30 opacity-100 aria-selected:text-white/50",
  day_disabled: "text-white/25 opacity-50",
};

const DarkCalendar = (props: ComponentProps<typeof Calendar>) => (
  <Calendar
    {...props}
    className={cn("text-white", props.className)}
    classNames={{ ...DARK_CALENDAR_CLASSNAMES, ...props.classNames }}
  />
);

const istDayKey = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatDayIn = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });

const formatWhen = (value: string | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

const countdownLabel = (due: string | null | undefined, now: number) => {
  if (!due) return "No retry scheduled";
  const ms = new Date(due).getTime() - now;
  if (ms <= 0) return "Promotion due now";
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) return `Next promotion in ${Math.floor(m / 60)}h ${m % 60}m`;
  return `Next promotion in ${m}m ${s}s`;
};

const statusClass = (status: string) => {
  if (status === "delivered" || status === "read") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (status === "failed" || status === "retry_exhausted" || status === "exhausted") return "bg-red-500/15 text-red-300 border-red-500/25";
  if (status === "submitted" || status === "sent" || status === "open") return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  return "bg-white/10 text-white/70 border-white/15";
};

const escapeCsv = (value: unknown) => {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusClass(status)}`}>{status}</span>
);

const MetricCard = ({
  label, value, hint, onClick,
}: { label: string; value: number; hint?: string; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-3 sm:p-4 hover:border-secondary/30 transition-colors"
  >
    <p className="text-[10px] uppercase tracking-wide text-primary-foreground/40">{label}</p>
    <p className="text-2xl sm:text-3xl font-heading font-bold text-white mt-1 leading-none">{value.toLocaleString("en-IN")}</p>
    {hint ? <p className="text-[10px] text-primary-foreground/40 mt-2">{hint}</p> : null}
  </button>
);

const WhatsAppOpsPanel = () => {
  const { toast } = useToast();
  const superAdmin = isSuperAdmin();
  const [tab, setTab] = useState<OpsTab>("overview");
  const [date, setDate] = useState<Date>(() => new Date());
  const dateKey = istDayKey(date);
  const [live, setLive] = useState(true);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [attemptNumber, setAttemptNumber] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [meta, setMeta] = useState<WhatsAppOpsMeta | null>(null);
  const [overview, setOverview] = useState<WhatsAppOpsOverview | null>(null);
  const [messages, setMessages] = useState<WhatsAppOpsMessage[]>([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [retryGroups, setRetryGroups] = useState<WhatsAppRetryGroupRow[]>([]);
  const [retryTotal, setRetryTotal] = useState(0);
  const [webhooks, setWebhooks] = useState<WhatsAppWebhookRow[]>([]);
  const [webhookTotal, setWebhookTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [testPhone, setTestPhone] = useState("");
  const [testKind, setTestKind] = useState("test");
  const [testParams, setTestParams] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async (nextPage = 1) => {
    setLoading(true);
    try {
      const failedTab = tab === "failures";
      const messageTab = tab === "messages" || tab === "logs" || failedTab;
      const [metaRes, overviewRes, list, groups, hooks] = await Promise.all([
        adminGetWhatsAppMeta(),
        adminGetWhatsAppOverview(dateKey, kind || undefined),
        messageTab
          ? adminGetWhatsAppMessages({
              date: dateKey,
              page: nextPage,
              limit: tab === "logs" ? 200 : 50,
              status: status || undefined,
              kind: kind || undefined,
              attemptNumber: attemptNumber || undefined,
              phone: phoneFilter || undefined,
              failed: failedTab,
            })
          : Promise.resolve({ items: [] as WhatsAppOpsMessage[], total: 0, page: 1 }),
        tab === "retries" ? adminGetWhatsAppRetryGroups({ date: dateKey, page: nextPage }) : Promise.resolve({ items: [], total: 0, page: 1 }),
        tab === "webhooks" ? adminGetWhatsAppWebhooks({ date: dateKey, page: nextPage }) : Promise.resolve({ items: [], total: 0, page: 1 }),
      ]);
      setMeta(metaRes);
      setOverview(overviewRes);
      setMessages(list.items);
      setMessageTotal(list.total);
      setRetryGroups(groups.items);
      setRetryTotal(groups.total);
      setWebhooks(hooks.items);
      setWebhookTotal(hooks.total);
      setPage(list.page || groups.page || 1);
    } catch (err: unknown) {
      toast({
        title: "Failed to load WhatsApp ops",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, kind, status, attemptNumber, tab]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => void load(page), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, dateKey, kind, status, attemptNumber, tab, page, phoneFilter]);

  const totals = overview?.totals || EMPTY_TOTALS;
  const stages = overview?.byAttempt || [];
  const kinds = overview?.kinds || [];
  const nextDue = overview?.nextPromotionDueAt || null;

  const handleTestSend = async () => {
    const phone = testPhone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) {
      toast({ title: "Enter a 10-digit phone number", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const params = testParams.split(",").map((p) => p.trim()).filter(Boolean);
      const result = await adminWhatsAppTestSend({ phone, kind: testKind || "test", params });
      toast({
        title: result.success ? "Submitted to Gupshup" : "Send recorded as failed",
        description: result.error || `status=${result.status}`,
        variant: result.success ? "default" : "destructive",
      });
      await load(1);
    } catch (err: unknown) {
      toast({ title: "Test send failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      const result = await adminWhatsAppResend(id);
      toast({
        title: result.success ? "Resent" : "Resend recorded as failed",
        description: result.error || `status=${result.status}`,
        variant: result.success ? "default" : "destructive",
      });
      await load(page);
    } catch (err: unknown) {
      toast({ title: "Resend failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["time", "phone", "kind", "attempt", "status", "source", "error", "exclusion", "gupshupId"].join(","),
      ...messages.map((row) =>
        [row.createdAt, row.phone, row.messageKind, row.attemptNumber, row.status, row.source, row.errorMessage, row.retryExclusionReason, row.gupshupMessageId]
          .map(escapeCsv)
          .join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-${dateKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canResend = (row: WhatsAppOpsMessage) =>
    superAdmin && !["queued", "submitted", "sent", "delivered", "read"].includes(row.status);

  const openMessages = (opts: { status?: string; attempt?: string }) => {
    setStatus(opts.status || "");
    setAttemptNumber(opts.attempt || "");
    setTab("messages");
  };

  const volumeCards = useMemo(() => ([
    { label: "Recipients", value: totals.recipients, hint: "Distinct phones today", onClick: () => openMessages({}) },
    { label: "Accepted", value: totals.accepted, hint: "Provider accepted", onClick: () => openMessages({ status: "submitted" }) },
    { label: "Delivered", value: totals.delivered, hint: "Handset DLR", onClick: () => openMessages({ status: "delivered" }) },
    { label: "Read", value: totals.read, hint: "Read receipts", onClick: () => openMessages({ status: "read" }) },
    { label: "Permanent failed", value: totals.permanentFailed, hint: "Will not retry", onClick: () => setTab("failures") },
    { label: "Excluded", value: totals.excluded, hint: "Policy / opt-out / delivered", onClick: () => setTab("failures") },
  ]), [totals]);

  const pipelineCards = useMemo(() => ([
    { label: "All · Accepted", value: totals.accepted },
    { label: "All · Delivered", value: totals.delivered },
    { label: "All · Read", value: totals.read },
    { label: "All · Undelivered", value: totals.undelivered },
    { label: "All · Permanent / Exhausted", value: totals.permanentFailed + totals.exhausted },
  ]), [totals]);

  return (
    <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.03] overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#8B1A1A] via-secondary to-sky-500" />
      <div className="px-4 sm:px-6 pt-6 pb-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/60">
                Operations console
              </span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" />
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-heading font-bold text-primary-foreground">WhatsApp messaging</h2>
            <p className="mt-1.5 text-sm text-primary-foreground/50 max-w-2xl">
              Monitor delivery telemetry, inbound webhooks, and exports — sends go out immediately when a flow fires.
            </p>
            <p className="mt-2 text-xs text-primary-foreground/40">
              Send-day IST · {countdownLabel(nextDue, now)}
              {overview?.syncedAt ? ` · Last sync: ${formatWhen(overview.syncedAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-primary-foreground/60 px-2">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="accent-[#d4a017]" />
              Live (IST)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {formatDayIn(date)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#141414] border-white/10" align="end">
                <DarkCalendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </PopoverContent>
            </Popover>
            <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={() => void load(page)}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        <nav className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1.5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                tab === item.id
                  ? "bg-secondary/20 text-secondary ring-1 ring-secondary/30"
                  : "text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {meta?.envHints?.length ? (
        <div className="px-4 sm:px-6 mt-4">
          <details className="group rounded-xl border border-white/10 bg-white/[0.03]">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <KeyRound className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/45">Environment keys</span>
                <span className="mt-0.5 block text-sm text-primary-foreground/60">
                  {meta.envHints.length} related variable name{meta.envHints.length === 1 ? "" : "s"} (expand to view)
                </span>
              </span>
              <ChevronDown className="w-5 h-5 text-primary-foreground/35 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="border-t border-white/10 px-4 pb-4 pt-2">
              <p className="text-xs text-primary-foreground/40">Names only — values are never shown in the browser.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {meta.envHints.map((hint) => (
                  <code
                    key={hint.key}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-mono ${
                      hint.configured
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/5 text-primary-foreground/45"
                    }`}
                  >
                    {hint.key}
                  </code>
                ))}
              </div>
            </div>
          </details>
        </div>
      ) : null}

      <div className="p-4 sm:p-6 space-y-5">
        {tab === "overview" && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setKind("")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${kind === "" ? "border-secondary/40 bg-secondary/15 text-secondary" : "border-white/10 text-primary-foreground/50"}`}
              >
                All templates
              </button>
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${kind === k ? "border-secondary/40 bg-secondary/15 text-secondary" : "border-white/10 text-primary-foreground/50"}`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-4">
              <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3 w-fit">
                <DarkCalendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/40 mb-2">Selected day · {formatDayIn(date)}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {volumeCards.map((card) => (
                      <MetricCard key={card.label} {...card} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/40 mb-2">Pipeline & reliability</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                    {pipelineCards.map((card) => (
                      <MetricCard key={card.label} label={card.label} value={card.value} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {loading && stages.length === 0 ? (
              <div className="rounded-xl border border-white/10 py-16 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                <span className="ml-2 text-sm text-primary-foreground/50">Loading funnel…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {stages.map((stage, i) => (
                  <motion.button
                    key={stage.attemptNumber}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => openMessages({ attempt: String(stage.attemptNumber) })}
                    className="text-left rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-secondary/40 text-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{stage.title}</p>
                        <p className="text-xs text-white/55">{stage.subtitle}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        stage.inFlight > 0 ? "bg-secondary/20 text-secondary animate-pulse" : stage.targeted === 0 ? "bg-white/10 text-white/60" : "bg-emerald-500/15 text-emerald-300"
                      }`}>
                        {stage.inFlight > 0 ? "Running" : stage.targeted === 0 ? "Pending" : "Completed"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(["targeted", "submitted", "delivered", "read", "failed", "inFlight"] as const).map((key) => (
                        <div key={key} className="rounded-lg bg-white/10 px-2 py-1.5">
                          <p className="text-[10px] uppercase tracking-wide text-white/60">{key === "inFlight" ? "In-flight" : key}</p>
                          <p className="text-sm font-semibold text-white">{stage[key]}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-xs">
                      <span className="text-white/55">Excluded {stage.excluded}</span>
                      <span className="font-semibold text-secondary">{stage.successRate}% success</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-primary-foreground mb-3">14-day trend (IST)</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview?.trend || []}>
                      <XAxis dataKey="date" tick={{ fill: "#ffffff66", fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                      <YAxis tick={{ fill: "#ffffff66", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#141414", border: "1px solid #333", borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#34d399" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="permanent" name="Permanent" stroke="#f87171" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="transient" name="Transient" stroke="#fb923c" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="recipients" name="Recipients" stroke="#94a3b8" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-primary-foreground/40 mt-2">
                  Range: {(overview?.trend || []).reduce((s, d) => s + d.recipients, 0)} recipients ·{" "}
                  {(overview?.trend || []).reduce((s, d) => s + d.delivered, 0)} delivered ·{" "}
                  {(overview?.trend || []).reduce((s, d) => s + d.permanent, 0)} permanent ·{" "}
                  {(overview?.trend || []).reduce((s, d) => s + d.transient, 0)} transient
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-primary-foreground mb-3">Failure reason buckets</p>
                {(overview?.failureBuckets || []).length === 0 ? (
                  <p className="text-sm text-primary-foreground/40 py-10 text-center">No exclusions recorded for this day.</p>
                ) : (
                  <div className="space-y-2">
                    {(overview?.failureBuckets || []).map((b) => {
                      const max = Math.max(1, ...(overview?.failureBuckets || []).map((x) => x.count));
                      return (
                        <div key={b.reason}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-primary-foreground/70">{b.reason.replace(/_/g, " ")}</span>
                            <span className="text-primary-foreground/50">{b.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-red-400/80" style={{ width: `${Math.round((b.count / max) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        )}

        {(tab === "messages" || tab === "failures" || tab === "logs") && (
          <>
            {tab !== "failures" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Label className="text-xs text-primary-foreground/60">Status</Label>
                  <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s || "all"} value={s || "all"}>{s || "All statuses"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Label className="text-xs text-primary-foreground/60">Attempt</Label>
                  <Select value={attemptNumber || "all"} onValueChange={(v) => setAttemptNumber(v === "all" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">1 · Initial</SelectItem>
                      <SelectItem value="2">2 · Retry 1</SelectItem>
                      <SelectItem value="3">3 · Retry 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Label className="text-xs text-primary-foreground/60">Phone</Label>
                  <Input value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} onBlur={() => void load(1)} placeholder="Filter phone" />
                </div>
                {tab === "logs" && (
                  <Button variant="hero-outline" size="sm" className="gap-1.5" onClick={exportCsv}>
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                )}
              </div>
            )}
            <MessageTable
              rows={messages}
              total={messageTotal}
              page={page}
              loading={loading}
              canResend={canResend}
              resendingId={resendingId}
              onResend={handleResend}
              onPage={(p) => void load(p)}
            />
          </>
        )}

        {tab === "retries" && (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-primary-foreground/45">
                <tr>
                  <th className="text-left px-3 py-2">Created</th>
                  <th className="text-left px-3 py-2">Kind</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Trigger</th>
                  <th className="text-left px-3 py-2">Next promotion</th>
                </tr>
              </thead>
              <tbody>
                {retryGroups.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-primary-foreground/40">No retry groups this day.</td></tr>
                ) : retryGroups.map((row) => (
                  <tr key={row.id} className="border-t border-white/8">
                    <td className="px-3 py-2 text-primary-foreground/70">{formatWhen(row.createdAt)}</td>
                    <td className="px-3 py-2">{row.messageKind}</td>
                    <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2 text-primary-foreground/60">{row.trigger}</td>
                    <td className="px-3 py-2 text-primary-foreground/60">{formatWhen(row.nextPromotionDueAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {retryTotal > 50 && (
              <div className="flex justify-between px-3 py-2 border-t border-white/10 text-xs text-primary-foreground/50">
                <span>{retryTotal} groups</span>
                <div className="flex gap-2">
                  <Button variant="hero-outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>Prev</Button>
                  <Button variant="hero-outline" size="sm" disabled={page * 50 >= retryTotal} onClick={() => void load(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "webhooks" && (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-primary-foreground/45">
                <tr>
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Stage</th>
                  <th className="text-left px-3 py-2">From / dest</th>
                  <th className="text-left px-3 py-2">Text / gsId</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-primary-foreground/40">No webhook events this day.</td></tr>
                ) : webhooks.map((row) => (
                  <tr key={row.id} className="border-t border-white/8">
                    <td className="px-3 py-2 text-primary-foreground/70 whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                    <td className="px-3 py-2"><StatusBadge status={row.type} /></td>
                    <td className="px-3 py-2 text-primary-foreground/60">{row.eventStage || "—"}</td>
                    <td className="px-3 py-2">{row.sourcePhone || row.destination || "—"}</td>
                    <td className="px-3 py-2 text-primary-foreground/50 max-w-xs truncate">{row.inboundText || row.gsId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {webhookTotal > 50 && (
              <div className="flex justify-between px-3 py-2 border-t border-white/10 text-xs text-primary-foreground/50">
                <span>{webhookTotal} events</span>
                <div className="flex gap-2">
                  <Button variant="hero-outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>Prev</Button>
                  <Button variant="hero-outline" size="sm" disabled={page * 50 >= webhookTotal} onClick={() => void load(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <MetricCard label="WhatsApp" value={meta?.enabled ? 1 : 0} hint={meta?.enabled ? "ENABLE_WHATSAPP on" : "Disabled"} />
              <MetricCard label="API key" value={meta?.apiKeyConfigured ? 1 : 0} />
              <MetricCard label="Source" value={meta?.sourceConfigured ? 1 : 0} />
              <MetricCard label="Opt-outs" value={meta?.optOuts || 0} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="font-semibold text-primary-foreground mb-1">Callback URL</p>
              <code className="text-secondary text-xs break-all">{meta?.webhookUrl}</code>
              <p className="text-primary-foreground/40 text-xs mt-2">Paste this on Gupshup. Add <code>?secret=</code> only after the env is set on both sides.</p>
            </div>
            {superAdmin && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <p className="text-sm font-semibold text-primary-foreground">Test send</p>
                <p className="text-xs text-primary-foreground/45">
                  Looks up <code className="text-secondary">GUPSHUP_TEMPLATE_{"{KIND}"}</code>. Kind <code className="text-secondary">test</code> uses <code className="text-secondary">GUPSHUP_TEMPLATE_TEST</code>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-primary-foreground/60">Phone</Label>
                    <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="10-digit number" />
                  </div>
                  <div>
                    <Label className="text-xs text-primary-foreground/60">Kind</Label>
                    <Input value={testKind} onChange={(e) => setTestKind(e.target.value)} placeholder="test" />
                  </div>
                  <div>
                    <Label className="text-xs text-primary-foreground/60">Params (comma-separated)</Label>
                    <Input value={testParams} onChange={(e) => setTestParams(e.target.value)} placeholder="{{1}}, {{2}}" />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full gap-1.5" onClick={() => void handleTestSend()} disabled={sending}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MessageTable = ({
  rows, total, page, loading, canResend, resendingId, onResend, onPage,
}: {
  rows: WhatsAppOpsMessage[];
  total: number;
  page: number;
  loading: boolean;
  canResend: (row: WhatsAppOpsMessage) => boolean;
  resendingId: string | null;
  onResend: (id: string) => void;
  onPage: (page: number) => void;
}) => (
  <div className="rounded-xl border border-white/10 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-primary-foreground/45">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Time</th>
            <th className="text-left px-3 py-2 font-semibold">Phone</th>
            <th className="text-left px-3 py-2 font-semibold">Kind</th>
            <th className="text-left px-3 py-2 font-semibold">Attempt</th>
            <th className="text-left px-3 py-2 font-semibold">Status</th>
            <th className="text-left px-3 py-2 font-semibold">Error / exclusion</th>
            <th className="text-left px-3 py-2 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr><td colSpan={7} className="px-3 py-10 text-center text-primary-foreground/40">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={7} className="px-3 py-10 text-center text-primary-foreground/40">No WhatsApp attempts for this day.</td></tr>
          ) : rows.map((row) => (
            <tr key={row.id} className="border-t border-white/8">
              <td className="px-3 py-2 text-primary-foreground/70 whitespace-nowrap">{formatWhen(row.createdAt)}</td>
              <td className="px-3 py-2">{row.phone}</td>
              <td className="px-3 py-2 text-primary-foreground/70">{row.messageKind}</td>
              <td className="px-3 py-2 text-primary-foreground/70">{row.attemptNumber}</td>
              <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
              <td className="px-3 py-2 text-primary-foreground/50 max-w-xs truncate" title={row.errorMessage || row.retryExclusionReason || ""}>
                {row.errorMessage || row.retryExclusionReason || "—"}
              </td>
              <td className="px-3 py-2 text-right">
                {canResend(row) ? (
                  <Button variant="hero-outline" size="sm" className="text-xs" disabled={resendingId === row.id} onClick={() => onResend(row.id)}>
                    {resendingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Resend"}
                  </Button>
                ) : row.status === "delivered" || row.status === "read" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                ) : row.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-400 inline" />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {total > 50 && (
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 text-xs text-primary-foreground/50">
        <span>{total} messages</span>
        <div className="flex gap-2">
          <Button variant="hero-outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
          <Button variant="hero-outline" size="sm" disabled={page * 50 >= total} onClick={() => onPage(page + 1)}>Next</Button>
        </div>
      </div>
    )}
  </div>
);

export default WhatsAppOpsPanel;
