import { useEffect, useMemo, useState } from "react";
import {
  Clapperboard,
  Copy,
  Download,
  Gift,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { copyTextWithFallback } from "@/lib/copyText";
import { adminGetMomentos, type MomentoItem } from "@/lib/apiAdmin";

const STATES = ["Karnataka", "Telangana", "Andhra Pradesh", "Tamil Nadu", "Uttar Pradesh"] as const;
type MomentoState = (typeof STATES)[number];
type RegionFilter = "All" | MomentoState;

const STATE_CHIP: Record<MomentoState, string> = {
  Karnataka: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Telangana: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  "Andhra Pradesh": "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "Tamil Nadu": "bg-pink-500/15 text-pink-300 border-pink-500/25",
  "Uttar Pradesh": "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
};

const STATE_ACCENT: Record<MomentoState, string> = {
  Karnataka: "border-amber-500/30",
  Telangana: "border-sky-500/30",
  "Andhra Pradesh": "border-emerald-500/30",
  "Tamil Nadu": "border-pink-500/30",
  "Uttar Pradesh": "border-indigo-500/30",
};

const STATE_ACTIVE: Record<MomentoState, string> = {
  Karnataka: "border-amber-500/40 bg-amber-500/10",
  Telangana: "border-sky-500/40 bg-sky-500/10",
  "Andhra Pradesh": "border-emerald-500/40 bg-emerald-500/10",
  "Tamil Nadu": "border-pink-500/40 bg-pink-500/10",
  "Uttar Pradesh": "border-indigo-500/40 bg-indigo-500/10",
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const titleCase = (value: string) =>
  value.replace(/\b\w/g, (letter) => letter.toUpperCase());

const MomentoChips = ({ item }: { item: MomentoItem }) => {
  const label = item.momentos[0];
  if (label) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-secondary/15 text-secondary border-secondary/25">
        {titleCase(label)}
      </span>
    );
  }
  if (item.video_count > 0) {
    return <span className="text-xs text-amber-300/80">Not recorded</span>;
  }
  return <span className="text-xs text-primary-foreground/40">Not generated</span>;
};

const StatusBadge = ({ item }: { item: MomentoItem }) => {
  if (!item.matched) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/5 text-white/45 border-white/15">
        Unmatched
      </span>
    );
  }
  if (item.momentos.length > 0) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/25">
        Ready
      </span>
    );
  }
  if (item.video_count > 0) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 text-amber-300 border-amber-500/25">
        No icon
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/5 text-white/50 border-white/15">
      Pending
    </span>
  );
};

const StateTable = ({
  region,
  rows,
  onCopyPhone,
}: {
  region: MomentoState;
  rows: MomentoItem[];
  onCopyPhone: (phone: string) => void;
}) => (
  <div className={`rounded-xl border ${STATE_ACCENT[region]} bg-primary-foreground/[0.03] overflow-hidden`}>
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-primary-foreground/10">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATE_CHIP[region]}`}>
          {region}
        </span>
        <p className="text-sm font-heading font-bold text-primary-foreground truncate">
          {rows.length} teacher{rows.length !== 1 ? "s" : ""}
        </p>
      </div>
      <p className="text-[11px] text-primary-foreground/40 shrink-0">
        {rows.filter((row) => row.momentos.length > 0).length} with momento
      </p>
    </div>

    <div className="lg:hidden p-3 space-y-3">
      {rows.map((item, index) => (
        <div
          key={item.id}
          className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-primary-foreground/35 font-semibold">#{index + 1}</p>
              <h3 className="font-heading font-bold text-white text-base leading-tight" title={item.name}>
                {item.name}
              </h3>
              <button
                type="button"
                className="text-sm text-primary-foreground/70 hover:text-secondary"
                onClick={() => item.phone && onCopyPhone(item.phone)}
              >
                {item.phone || "No phone"}
              </button>
            </div>
            <StatusBadge item={item} />
          </div>
          <MomentoChips item={item} />
          <p className="text-xs text-primary-foreground/40">
            {item.video_count} video{item.video_count !== 1 ? "s" : ""}
          </p>
        </div>
      ))}
    </div>

    <div className="hidden lg:block">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[56px]" />
          <col />
          <col className="w-[140px]" />
          <col />
          <col className="w-[100px]" />
          <col className="w-[88px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-primary-foreground/10">
            {["#", "Teacher", "Phone", "Momento", "Status", "Videos"].map((header, i) => (
              <th
                key={header}
                className={`text-[10px] font-semibold text-primary-foreground/40 uppercase tracking-wider px-3 py-3 whitespace-nowrap ${
                  i === 0 || i >= 4 ? "text-center" : "text-left"
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr
              key={item.id}
              className="border-b border-primary-foreground/5 hover:bg-primary-foreground/[0.04] transition-colors"
            >
              <td className="px-3 py-3 text-center text-[11px] text-primary-foreground/35">{index + 1}</td>
              <td className="px-3 py-3 align-middle min-w-0">
                <p className="truncate text-sm font-medium text-primary-foreground" title={item.name}>
                  {item.name}
                </p>
              </td>
              <td className="px-3 py-3 align-middle">
                {item.phone ? (
                  <button
                    type="button"
                    className="text-xs text-primary-foreground/75 hover:text-secondary whitespace-nowrap"
                    onClick={() => onCopyPhone(item.phone)}
                    title="Copy phone"
                  >
                    {item.phone}
                  </button>
                ) : (
                  <span className="text-xs text-primary-foreground/35">—</span>
                )}
              </td>
              <td className="px-3 py-3 align-middle">
                <MomentoChips item={item} />
              </td>
              <td className="px-3 py-3 align-middle text-center">
                <StatusBadge item={item} />
              </td>
              <td className="px-3 py-3 align-middle text-center text-xs font-semibold text-primary-foreground/80">
                {item.video_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {rows.length === 0 && (
      <div className="py-10 text-center text-sm text-primary-foreground/40">No teachers in this state match the search.</div>
    )}
  </div>
);

const MomentosPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<MomentoItem[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<RegionFilter>("All");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetMomentos();
      setItems(data.items);
    } catch (error) {
      toast({
        title: "Failed to load momentos",
        description: error instanceof Error ? error.message : "Could not fetch teacher momentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.phone, item.region, ...item.momentos].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const byState = Object.fromEntries(STATES.map((state) => [state, [] as MomentoItem[]])) as Record<
      MomentoState,
      MomentoItem[]
    >;
    for (const item of searched) {
      if (STATES.includes(item.region as MomentoState)) {
        byState[item.region as MomentoState].push(item);
      }
    }
    for (const state of STATES) {
      byState[state].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    }
    return byState;
  }, [searched]);

  const visibleStates = region === "All" ? [...STATES] : [region];
  const visible = visibleStates.flatMap((state) => grouped[state]);

  const stats = useMemo(
    () => ({
      total: visible.length,
      matched: visible.filter((item) => item.matched).length,
      with_momento: visible.filter((item) => item.momentos.length > 0).length,
      not_generated: visible.filter((item) => item.video_count === 0).length,
    }),
    [visible]
  );

  const stateSummaries = STATES.map((state) => {
    const rows = grouped[state];
    return {
      state,
      total: rows.length,
      withMomento: rows.filter((row) => row.momentos.length > 0).length,
      pending: rows.filter((row) => row.video_count === 0).length,
    };
  });

  const exportCSV = () => {
    if (visible.length === 0) {
      toast({ title: "Nothing to export", description: "No teachers match the current view.", variant: "destructive" });
      return;
    }
    const headers = ["State", "#", "Teacher", "Phone", "Status", "Videos", "Momento"];
    const rows: string[][] = [];
    for (const state of visibleStates) {
      grouped[state].forEach((item, index) => {
        rows.push([
          state,
          String(index + 1),
          item.name,
          item.phone || "",
          !item.matched ? "Unmatched" : item.momentos.length > 0 ? "Ready" : item.video_count > 0 ? "No icon" : "Pending",
          String(item.video_count),
          item.momentos[0] ? titleCase(item.momentos[0]) : item.video_count > 0 ? "Not recorded" : "Not generated",
        ]);
      });
    }
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = region === "All" ? "momentos-all-states.csv" : `momentos-${region.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyPhones = async () => {
    const phones = [...new Set(visible.map((item) => item.phone).filter(Boolean))];
    if (phones.length === 0) {
      toast({ title: "Nothing to copy", description: "No valid phones in this view.", variant: "destructive" });
      return;
    }
    try {
      await copyTextWithFallback(phones.join("\n"), "momentos-phones.txt");
      toast({ title: `Copied ${phones.length} phone${phones.length !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const copyPhone = async (phone: string) => {
    try {
      await copyTextWithFallback(phone, "phone.txt");
      toast({ title: "Phone copied", description: phone });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const statCards = [
    { label: region === "All" ? "Teachers" : `${region} teachers`, value: stats.total, icon: Users, color: "bg-primary" },
    { label: "Matched", value: stats.matched, icon: UserCheck, color: "bg-blue-600" },
    { label: "With momento", value: stats.with_momento, icon: Gift, color: "bg-secondary" },
    { label: "Pending video", value: stats.not_generated, icon: Clapperboard, color: "bg-white/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/25 via-secondary/10 to-transparent border border-secondary/30 flex items-center justify-center text-secondary shadow-lg shadow-secondary/10 shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading">Momentos</h1>
            <p className="text-xs text-white/50 mt-1 max-w-2xl leading-relaxed">
              State-wise teacher roster with the exact category icon used on each generated video.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={() => void load()}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={() => void copyPhones()}>
            <Copy className="w-3.5 h-3.5" />
            Copy phones
          </Button>
          <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-primary-foreground font-heading">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setRegion("All")}
          className={`text-left rounded-xl border p-4 transition-colors ${
            region === "All"
              ? "border-secondary/40 bg-secondary/10"
              : "border-primary-foreground/10 bg-primary-foreground/5 hover:border-primary-foreground/20"
          }`}
        >
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/5 text-white/70 border-white/15">
            <MapPin className="w-3 h-3" />
            All states
          </span>
          <p className="text-2xl font-heading font-bold text-primary-foreground mt-3">{searched.length}</p>
          <p className="text-[11px] text-primary-foreground/45 mt-1">Full roster</p>
        </button>
        {stateSummaries.map((summary) => {
          const active = region === summary.state;
          return (
            <button
              key={summary.state}
              type="button"
              onClick={() => setRegion(summary.state)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                active
                  ? STATE_ACTIVE[summary.state]
                  : "border-primary-foreground/10 bg-primary-foreground/5 hover:border-primary-foreground/20"
              }`}
            >
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATE_CHIP[summary.state]}`}>
                {summary.state}
              </span>
              <p className="text-2xl font-heading font-bold text-primary-foreground mt-3">{summary.total}</p>
              <p className="text-[11px] text-primary-foreground/45 mt-1">
                {summary.withMomento} ready · {summary.pending} pending
              </p>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
        <Input
          placeholder="Search teacher, phone, or momento across the selected states..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9 w-full bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-10"
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="py-16 flex items-center justify-center text-primary-foreground/40 gap-2 rounded-xl border border-primary-foreground/10">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading momentos…
        </div>
      ) : (
        <div className="space-y-5">
          {visibleStates.map((state) => {
            if (region === "All" && grouped[state].length === 0) return null;
            return (
              <StateTable key={state} region={state} rows={grouped[state]} onCopyPhone={(phone) => void copyPhone(phone)} />
            );
          })}
          {visible.length === 0 && (
            <div className="py-16 text-center text-primary-foreground/40 rounded-xl border border-primary-foreground/10">
              {items.length === 0 ? "No momento teachers configured." : "No teachers match your search."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MomentosPanel;
