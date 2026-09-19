import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Layers,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { copyTextWithFallback } from "@/lib/copyText";
import {
  adminDeleteFdp,
  adminDownloadFdpCsvUrl,
  adminGetFdpRegistration,
  adminGetFdpRegistrations,
  adminGetFdpStats,
  adminUpdateFdp,
  type FdpRegistrationItem,
  type FdpStatsResponse,
} from "@/lib/apiAdmin";
import { API_URL } from "@/lib/apiBase";

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; activeTabClass: string }
> = {
  NEW: {
    label: "New",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    activeTabClass: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10",
  },
  CONTACTED: {
    label: "Contacted",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]",
    activeTabClass: "text-blue-400 border-blue-500/50 bg-blue-500/10",
  },
  CONFIRMED: {
    label: "Confirmed",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    activeTabClass: "text-amber-400 border-amber-500/50 bg-amber-500/10",
  },
  ARCHIVED: {
    label: "Archived",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    dotClass: "bg-zinc-400",
    activeTabClass: "text-zinc-400 border-zinc-500/50 bg-zinc-500/10",
  },
};

const AVATAR_GRADIENTS = [
  "from-amber-500 to-amber-700",
  "from-emerald-500 to-teal-700",
  "from-blue-500 to-indigo-700",
  "from-purple-500 to-pink-700",
  "from-rose-500 to-red-700",
  "from-cyan-500 to-blue-700",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toTitleCase(str?: string | null): string {
  if (!str) return "—";
  return str
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s|-|\/)\S/g, (c) => c.toUpperCase());
}

function formatPhoneDisplay(raw: string): string {
  const clean = raw.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) return raw;
  return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
}

const formatIST = (val?: string | null) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const flattenCell = (value: unknown) =>
  String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");

const FdpRegistrationsPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FdpRegistrationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState<"25" | "50" | "100" | "all">("25");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [experience, setExperience] = useState("all");
  const [receiveUpdates, setReceiveUpdates] = useState("all");
  const [date, setDate] = useState("");

  // Stats
  const [stats, setStats] = useState<FdpStatsResponse | null>(null);

  // Detail Modal & Actions
  const [selected, setSelected] = useState<FdpRegistrationItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const isViewAll = pageSize === "all";

  const fetchStats = async () => {
    try {
      const data = await adminGetFdpStats();
      setStats(data);
    } catch {
      // Best-effort stats
    }
  };

  const load = async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const isAll = nextSize === "all";
      const data = await adminGetFdpRegistrations({
        page: isAll ? 1 : nextPage,
        limit: nextSize,
        search: search.trim(),
        status,
        experience,
        receive_updates: receiveUpdates,
        date: date || undefined,
        lifecycle: "submitted",
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(isAll ? 1 : data.page || 1);
      setPages(isAll ? 1 : data.pages || 1);
    } catch (err: any) {
      toast({
        title: "Failed to load registrations",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1, pageSize);
    void fetchStats();
  }, [status, experience, receiveUpdates, date, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void load(1, pageSize);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setExperience("all");
    setReceiveUpdates("all");
    setDate("");
  };

  const hasActiveFilters = Boolean(
    search || status !== "all" || experience !== "all" || receiveUpdates !== "all" || date
  );

  const handleToggleViewAll = () => {
    const next = isViewAll ? "25" : "all";
    setPageSize(next);
  };

  const handleSetPageSize = (size: "25" | "50" | "100" | "all") => {
    setPageSize(size);
  };

  // Helper to fetch all records matching current filters (used by Copy All actions)
  const getAllMatchingRecords = async (): Promise<FdpRegistrationItem[]> => {
    if (isViewAll && items.length > 0) {
      return items;
    }
    setCopying(true);
    try {
      const res = await adminGetFdpRegistrations({
        page: 1,
        limit: "all",
        search: search.trim(),
        status,
        experience,
        receive_updates: receiveUpdates,
        date: date || undefined,
        lifecycle: "submitted",
      });
      return res.items || items;
    } catch (err: any) {
      toast({
        title: "Could not fetch all records",
        description: err.message,
        variant: "destructive",
      });
      return items;
    } finally {
      setCopying(false);
    }
  };

  // 1. Copy All Table Data for Excel / Google Sheets (TSV format)
  const handleCopyTsv = async () => {
    const records = await getAllMatchingRecords();
    if (records.length === 0) {
      toast({ title: "No records to copy", variant: "destructive" });
      return;
    }

    const headers = [
      "Registration ID",
      "Full Name",
      "Phone",
      "Teaching Subject",
      "College / School",
      "City / Town",
      "Experience Level",
      "Future Updates Opt-in",
      "Admin Review Status",
      "Registration Date (IST)",
      "Internal Notes",
      "Campaign Source",
      "Campaign Medium",
      "Campaign Name",
    ];

    const rows = records.map((r) => [
      r.registration_id || "",
      r.full_name || "",
      r.phone || "",
      r.teaching_subject || "",
      r.institution_name || "",
      r.city || "",
      r.experience_years || "",
      r.receive_updates ? "Yes" : "No",
      r.admin_status || "NEW",
      formatIST(r.created_at),
      r.admin_notes || "",
      r.utm?.source || "",
      r.utm?.medium || "",
      r.utm?.campaign || "",
    ]);

    const tsv = [headers, ...rows].map((row) => row.map(flattenCell).join("\t")).join("\n");
    await copyTextWithFallback(tsv, "fdp-registrations.tsv");
    toast({
      title: `Copied all ${records.length} records!`,
      description: "Tab-separated format copied. You can paste directly into Excel or Google Sheets.",
    });
  };

  // 2. Copy All Phone Numbers (comma-separated or one per line)
  const handleCopyPhones = async (commaSeparated: boolean) => {
    const records = await getAllMatchingRecords();
    if (records.length === 0) {
      toast({ title: "No phone numbers to copy", variant: "destructive" });
      return;
    }

    const phones = records
      .map((r) => r.phone.replace(/\D/g, "").slice(-10))
      .filter((p) => /^\d{10}$/.test(p));

    const text = commaSeparated ? phones.join(", ") : phones.join("\n");
    await copyTextWithFallback(text, "fdp-phones.txt");
    toast({
      title: `Copied ${phones.length} Phone Numbers!`,
      description: commaSeparated
        ? "Comma-separated list ready for bulk SMS broadcasts."
        : "1 number per line copied to clipboard for dialers.",
    });
  };

  // 3. Copy Direct WhatsApp Links
  const handleCopyWhatsAppLinks = async () => {
    const records = await getAllMatchingRecords();
    if (records.length === 0) {
      toast({ title: "No records to copy", variant: "destructive" });
      return;
    }

    const links = records
      .map(
        (r) =>
          `https://wa.me/91${r.phone.replace(/\D/g, "").slice(-10)} (${toTitleCase(r.full_name)})`
      )
      .join("\n");

    await copyTextWithFallback(links, "fdp-whatsapp-links.txt");
    toast({
      title: `Copied ${records.length} WhatsApp Links!`,
      description: "Direct outreach links copied to clipboard.",
    });
  };

  // 4. Copy Formatted Text Summary (Slack / WhatsApp summary)
  const handleCopySummary = async () => {
    const records = await getAllMatchingRecords();
    if (records.length === 0) {
      toast({ title: "No records to copy", variant: "destructive" });
      return;
    }

    const summary = records
      .map(
        (r, i) =>
          `${i + 1}. ${toTitleCase(r.full_name)} (+91 ${r.phone}) — ${r.teaching_subject || "General"}, ${toTitleCase(
            r.institution_name
          )} (${toTitleCase(r.city)}) [${r.experience_years || "—"}] — Status: ${r.admin_status || "NEW"}`
      )
      .join("\n");

    await copyTextWithFallback(summary, "fdp-summary.txt");
    toast({
      title: `Copied ${records.length} Attendee Summaries!`,
      description: "Formatted attendee list copied for messaging.",
    });
  };

  const openDetail = async (item: FdpRegistrationItem) => {
    setSelected(item);
    setAdminNotes(item.admin_notes || "");
    setLoadingDetail(true);
    try {
      const full = await adminGetFdpRegistration(item._id);
      setSelected(full);
      setAdminNotes(full.admin_notes || "");
    } catch {
      // Keep existing item if full fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: string) => {
    setUpdatingStatusId(id);
    try {
      const res = await adminUpdateFdp(id, { admin_status: nextStatus });
      setItems((prev) =>
        prev.map((r) => (r._id === id ? { ...r, admin_status: res.item.admin_status } : r))
      );
      if (selected && selected._id === id) {
        setSelected((prev) => (prev ? { ...prev, admin_status: res.item.admin_status } : null));
      }
      toast({
        title: "Status updated",
        description: `Marked as ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`,
      });
      void fetchStats();
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      const res = await adminUpdateFdp(selected._id, { admin_notes: adminNotes });
      setSelected((prev) => (prev ? { ...prev, admin_notes: res.item.admin_notes } : null));
      setItems((prev) =>
        prev.map((r) => (r._id === selected._id ? { ...r, admin_notes: res.item.admin_notes } : r))
      );
      toast({ title: "Notes saved successfully" });
    } catch (err: any) {
      toast({
        title: "Failed to save notes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FDP registration?")) return;
    try {
      await adminDeleteFdp(id);
      setItems((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (selected && selected._id === id) setSelected(null);
      toast({ title: "Registration deleted" });
      void fetchStats();
    } catch (err: any) {
      toast({
        title: "Failed to delete",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCsv = () => {
    const downloadPath = adminDownloadFdpCsvUrl({
      search: search.trim(),
      status,
      experience,
      receive_updates: receiveUpdates,
      date: date || undefined,
      lifecycle: "submitted",
    });
    window.open(`${API_URL}${downloadPath}`, "_blank");
  };

  const statusCounts = stats?.statusCounts || {
    NEW: 0,
    CONTACTED: 0,
    CONFIRMED: 0,
    ARCHIVED: 0,
  };

  return (
    <div className="space-y-6">
      {/* ================= TOP HEADER BANNER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-500/10 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading">
                FDP Registrations
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Registry
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1 max-w-2xl leading-relaxed">
              Faculty Development Program pipeline. Monitor attendee profiles, filter by academic discipline, manage review statuses, and export reports.
            </p>
          </div>
        </div>

        {/* Action Controls: View All, Copy All, Export CSV, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* VIEW ALL TOGGLE BUTTON */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleViewAll}
            className={`h-10 px-3.5 rounded-xl text-xs font-semibold gap-2 transition-all ${
              isViewAll
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-sm"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:text-white hover:bg-white/[0.08]"
            }`}
            title={isViewAll ? "Switch back to paginated view (25 per page)" : "Load and view all registrations on a single page"}
          >
            <Layers className={`w-4 h-4 ${isViewAll ? "text-emerald-400" : "text-amber-400"}`} />
            <span>{isViewAll ? `Showing All (${items.length})` : `View All (${total})`}</span>
          </Button>

          {/* COPY ALL DROPDOWN MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={copying || total === 0}
                className="h-10 px-3.5 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-semibold gap-2 shadow-sm transition-all"
              >
                {copying ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Copy className="w-4 h-4 text-amber-400" />
                )}
                <span>Copy All</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/40 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 bg-zinc-900 border border-white/15 rounded-2xl p-1.5 shadow-2xl text-white text-xs backdrop-blur-xl"
            >
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-white/40 px-2.5 py-1.5">
                Copy Attendee Data ({total})
              </DropdownMenuLabel>

              <DropdownMenuItem
                onClick={() => void handleCopyTsv()}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Copy for Excel / Sheets</div>
                  <div className="text-[10px] text-white/45">Tab-separated rows with all columns</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => void handleCopyPhones(true)}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Copy All Phone Numbers</div>
                  <div className="text-[10px] text-white/45">Comma-separated (for SMS broadcasts)</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => void handleCopyPhones(false)}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Copy Phones (1 per line)</div>
                  <div className="text-[10px] text-white/45">Line-by-line list for CRM dialers</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => void handleCopyWhatsAppLinks()}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Copy Direct WhatsApp Links</div>
                  <div className="text-[10px] text-white/45">Clickable chat links for quick outreach</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10 my-1" />

              <DropdownMenuItem
                onClick={() => void handleCopySummary()}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <ListChecks className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Copy Formatted Text Summary</div>
                  <div className="text-[10px] text-white/45">Numbered attendee list for Slack/Email</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export CSV Report */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-10 px-4 rounded-xl border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-300 hover:text-amber-200 text-xs font-semibold gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void load(page, pageSize);
              void fetchStats();
            }}
            disabled={loading}
            className="h-10 px-3.5 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ================= EXECUTIVE KPI METRICS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Attendees */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-xl overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Total Registrations
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-heading">
              {stats ? stats.total : total}
            </span>
            <span className="text-xs text-amber-400/80 font-medium">Verified Faculty</span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span>Official program enrollments</span>
          </div>
        </div>

        {/* Today's Signups */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-xl overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Today's Signups
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight font-heading">
              {stats?.today ?? 0}
            </span>
            <span className="text-xs text-emerald-400/80 font-medium">New Today</span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span>Active registration pace</span>
          </div>
        </div>

        {/* Future Updates Opt-in */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-xl overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Future Program Opt-in
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-300 tracking-tight font-heading">
              {stats?.optedInPct ?? 0}%
            </span>
            <span className="text-xs text-white/40">
              ({stats?.optedInUpdates ?? 0} educators)
            </span>
          </div>
          <div className="mt-2.5 w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.optedInPct ?? 0}%` }}
            />
          </div>
        </div>

        {/* Top Discipline */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent p-4 sm:p-5 backdrop-blur-xl overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Leading Discipline
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base sm:text-lg font-bold text-white truncate block font-heading">
              {stats?.topSubjects?.[0]?.subject || "Awaiting data"}
            </span>
            <span className="text-xs text-indigo-300/80 font-medium mt-0.5 block">
              {stats?.topSubjects?.[0]
                ? `${stats.topSubjects[0].count} registrations recorded`
                : "Active submissions pending"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            <span>Highest enrolled teaching domain</span>
          </div>
        </div>
      </div>

      {/* ================= PIPELINE STATUS TABS ================= */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatus("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
            status === "all"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span>All Attendee Pipeline</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-white/80">
            {stats ? stats.total : total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus("NEW")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
            status === "NEW"
              ? STATUS_CONFIG.NEW.activeTabClass + " border shadow-sm font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>New</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-white/80">
            {statusCounts.NEW || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus("CONTACTED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
            status === "CONTACTED"
              ? STATUS_CONFIG.CONTACTED.activeTabClass + " border shadow-sm font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Contacted</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-white/80">
            {statusCounts.CONTACTED || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus("CONFIRMED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
            status === "CONFIRMED"
              ? STATUS_CONFIG.CONFIRMED.activeTabClass + " border shadow-sm font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Confirmed</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-white/80">
            {statusCounts.CONFIRMED || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus("ARCHIVED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
            status === "ARCHIVED"
              ? STATUS_CONFIG.ARCHIVED.activeTabClass + " border shadow-sm font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span>Archived</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-white/80">
            {statusCounts.ARCHIVED || 0}
          </span>
        </button>
      </div>

      {/* ================= SEARCH & ADVANCED FILTERS ================= */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 backdrop-blur-xl p-3.5 sm:p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search educator name, mobile, subject, college, town, or FDP ID..."
              className="pl-10 pr-9 h-10 text-xs bg-white/[0.04] border-white/10 text-white placeholder:text-white/35 rounded-xl focus-visible:ring-amber-500/40 focus-visible:border-amber-500/50 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  void load(1, pageSize);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Experience Filter */}
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger className="w-[140px] h-10 text-xs bg-white/[0.04] border-white/10 text-white/80 rounded-xl focus:ring-amber-500/40">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/15 text-white text-xs rounded-xl shadow-2xl">
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="0-2 Years">0 – 2 Years</SelectItem>
                <SelectItem value="3-5 Years">3 – 5 Years</SelectItem>
                <SelectItem value="6-10 Years">6 – 10 Years</SelectItem>
                <SelectItem value="10+ Years">10+ Years</SelectItem>
              </SelectContent>
            </Select>

            {/* Updates Filter */}
            <Select value={receiveUpdates} onValueChange={setReceiveUpdates}>
              <SelectTrigger className="w-[140px] h-10 text-xs bg-white/[0.04] border-white/10 text-white/80 rounded-xl focus:ring-amber-500/40">
                <SelectValue placeholder="Updates" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/15 text-white text-xs rounded-xl shadow-2xl">
                <SelectItem value="all">All Updates</SelectItem>
                <SelectItem value="yes">Subscribed (Yes)</SelectItem>
                <SelectItem value="no">Declined (No)</SelectItem>
              </SelectContent>
            </Select>

            {/* Date filter */}
            <div className="relative">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-[135px] h-10 text-xs bg-white/[0.04] border-white/10 text-white/80 rounded-xl [color-scheme:dark] focus-visible:ring-amber-500/40"
              />
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 h-10 px-3 rounded-xl transition-all"
              >
                Clear Filters
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10 px-4 text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* ================= DATA TABLE CONTAINER ================= */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-white/40 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-mono">ID / Timestamp</th>
                <th className="py-3.5 px-4">Educator Profile</th>
                <th className="py-3.5 px-4">Discipline / Subject</th>
                <th className="py-3.5 px-4">Institution & City</th>
                <th className="py-3.5 px-4 text-center">Experience</th>
                <th className="py-3.5 px-4 text-center">FDP Updates</th>
                <th className="py-3.5 px-4">Review Stage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-white/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-white/50">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-amber-400" />
                    <span className="text-sm font-medium">Fetching attendee records...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/40">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white/70">No registrations found</p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? "Try adjusting your search criteria or resetting active filters."
                        : "Faculty submissions will appear here automatically when attendees register."}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-4 border-white/15 bg-white/5 text-xs text-amber-300"
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const statusConf = STATUS_CONFIG[row.admin_status] || STATUS_CONFIG.NEW;
                  const gradient = getAvatarGradient(row.full_name);
                  const initials = getInitials(row.full_name);

                  return (
                    <tr
                      key={row._id}
                      className="hover:bg-white/[0.03] transition-colors group relative"
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block">
                          {row.registration_id || "—"}
                        </span>
                        <div className="text-[11px] text-white/40 mt-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-white/30" />
                          <span>{formatIST(row.created_at)}</span>
                        </div>
                      </td>

                      {/* Educator Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div
                              className="font-semibold text-white text-sm tracking-tight hover:text-amber-300 transition-colors cursor-pointer"
                              onClick={() => openDetail(row)}
                            >
                              {toTitleCase(row.full_name)}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-white/50 font-mono">
                                {formatPhoneDisplay(row.phone)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void copyTextWithFallback(row.phone);
                                  toast({ title: "Phone copied to clipboard" });
                                }}
                                title="Copy mobile number"
                                className="text-white/30 hover:text-white p-0.5 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <a
                                href={`https://wa.me/91${row.phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open WhatsApp Chat"
                                className="text-emerald-400/80 hover:text-emerald-300 p-0.5 transition-colors"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject / Discipline */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/90 text-xs font-medium max-w-[200px] truncate">
                          <BookOpen className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="truncate" title={row.teaching_subject}>
                            {row.teaching_subject || "Not specified"}
                          </span>
                        </div>
                      </td>

                      {/* Institution & City */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div
                          className="font-medium text-white/90 truncate flex items-center gap-1.5 text-xs"
                          title={row.institution_name}
                        >
                          <Building className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                          <span className="truncate">{toTitleCase(row.institution_name)}</span>
                        </div>
                        <div className="text-[11px] text-white/50 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-white/30 shrink-0" />
                          <span className="truncate">{toTitleCase(row.city)}</span>
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/80 text-[11px] font-mono">
                          <Clock className="w-3 h-3 text-amber-400/60" />
                          {row.experience_years || "—"}
                        </span>
                      </td>

                      {/* Updates Opt-in */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {row.receive_updates ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <Check className="w-3 h-3 stroke-[3]" />
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/25">
                            <X className="w-3 h-3" />
                            Declined
                          </span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Select
                          value={row.admin_status || "NEW"}
                          onValueChange={(val) => handleStatusChange(row._id, val)}
                          disabled={updatingStatusId === row._id}
                        >
                          <SelectTrigger
                            className={`h-7 px-2.5 text-[11px] font-semibold rounded-lg border transition-all ${statusConf.badgeClass} focus:ring-0`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`} />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/15 text-white text-xs rounded-xl shadow-2xl">
                            <SelectItem value="NEW">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                New
                              </span>
                            </SelectItem>
                            <SelectItem value="CONTACTED">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Contacted
                              </span>
                            </SelectItem>
                            <SelectItem value="CONFIRMED">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Confirmed
                              </span>
                            </SelectItem>
                            <SelectItem value="ARCHIVED">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                Archived
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(row)}
                            className="h-8 w-8 p-0 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                            title="View Attendee Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(row._id)}
                            className="h-8 w-8 p-0 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete Attendee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION & VIEW ALL FOOTER ================= */}
        <div className="py-3.5 px-5 border-t border-white/[0.08] bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <div className="flex items-center gap-3">
            {isViewAll ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  Continuous View
                </span>
                <span className="text-white/70 text-xs">
                  Showing all <strong className="text-white font-bold">{items.length}</strong> registered attendees
                </span>
                <button
                  type="button"
                  onClick={() => handleSetPageSize("25")}
                  className="text-amber-400 hover:text-amber-300 underline font-medium ml-1 cursor-pointer"
                >
                  Switch to 25/page
                </button>
              </div>
            ) : (
              <div>
                Showing <span className="text-white font-semibold">{items.length}</span> of{" "}
                <span className="text-white font-semibold">{total}</span> total attendees
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/40">Rows:</span>
              <Select
                value={pageSize}
                onValueChange={(val) => handleSetPageSize(val as any)}
              >
                <SelectTrigger className="h-8 w-28 text-[11px] bg-white/[0.04] border-white/10 text-white rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/15 text-white text-xs rounded-xl shadow-2xl">
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                  <SelectItem value="all">View All ({total})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagination Controls */}
            {!isViewAll && pages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => void load(page - 1, pageSize)}
                  className="h-8 px-3 text-xs rounded-lg border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.08]"
                >
                  Previous
                </Button>
                <span className="px-2 text-white/70 font-mono text-[11px]">
                  Page {page} of {pages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pages || loading}
                  onClick={() => void load(page + 1, pageSize)}
                  className="h-8 px-3 text-xs rounded-lg border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.08]"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= ATTENDEE DOSSIER MODAL ================= */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-white/[0.04] to-transparent">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                    selected.full_name
                  )} flex items-center justify-center text-white font-bold text-base shadow-lg`}
                >
                  {getInitials(selected.full_name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      {selected.registration_id}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        STATUS_CONFIG[selected.admin_status]?.badgeClass || STATUS_CONFIG.NEW.badgeClass
                      }`}
                    >
                      {STATUS_CONFIG[selected.admin_status]?.label || "New"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-1 font-heading">
                    {toTitleCase(selected.full_name)}
                  </h3>
                  <span className="text-[11px] text-white/40">
                    Registered {formatIST(selected.created_at)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-white/40 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center text-white/50">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                  Loading attendee profile details...
                </div>
              ) : (
                <>
                  {/* Direct Contact Action Strip */}
                  <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40 block">
                        Verified Contact
                      </span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                        {formatPhoneDisplay(selected.phone)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/91${selected.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      <a
                        href={`tel:+91${selected.phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Direct Call
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          void copyTextWithFallback(selected.phone);
                          toast({ title: "Phone copied" });
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="Copy number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Academic Profile Card */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Academic & Institution Details
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-[10px] text-white/40 block">Current Teaching Subject</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">
                          {selected.teaching_subject || "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/40 block">Experience Level</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">
                          {selected.experience_years || "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/40 block">College / School Name</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">
                          {toTitleCase(selected.institution_name)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-white/40 block">City / Town</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">
                          {toTitleCase(selected.city)}
                        </span>
                      </div>

                      <div className="sm:col-span-2 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-white/40 block">Future FDP Programs Opt-in</span>
                        <span className="text-xs font-semibold mt-1 inline-flex items-center gap-1.5">
                          {selected.receive_updates ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Yes — Attendee requested updates for upcoming FDP programs
                            </span>
                          ) : (
                            <span className="text-zinc-400 flex items-center gap-1">
                              <X className="w-3.5 h-3.5" />
                              No — Attendee opted out of future notifications
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Campaign UTM Tracking (if present) */}
                  {(selected.utm?.source || selected.utm?.campaign) && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                        Marketing Attribution (UTM)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                        <div>
                          <span className="text-white/40 block text-[10px]">Source</span>
                          <span className="text-white font-mono">{selected.utm.source || "—"}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block text-[10px]">Medium</span>
                          <span className="text-white font-mono">{selected.utm.medium || "—"}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block text-[10px]">Campaign</span>
                          <span className="text-white font-mono">{selected.utm.campaign || "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Internal Review Stage & Admin Notes */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                        Administrative Notes & Stage
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(["NEW", "CONTACTED", "CONFIRMED", "ARCHIVED"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(selected._id, st)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                              selected.admin_status === st
                                ? STATUS_CONFIG[st].activeTabClass + " border"
                                : "text-white/40 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {STATUS_CONFIG[st].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add follow-up notes, phone call summaries, confirmation status..."
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 text-xs rounded-xl focus-visible:ring-amber-500/40"
                    />

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl h-8 px-3.5"
                      >
                        {savingNotes ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Saving...
                          </>
                        ) : (
                          "Save Internal Notes"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FdpRegistrationsPanel;
