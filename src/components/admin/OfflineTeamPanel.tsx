import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  GraduationCap,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import UniqueTeachersPanel from "@/components/admin/UniqueTeachersPanel";
import { copyTextWithFallback } from "@/lib/copyText";
import {
  OFFLINE_REGIONS,
  REGION_LABELS,
  scoreOfflineTeam,
  uniqueTeachersFrom,
  type OfflineMemberStats,
  type OfflineRegion,
} from "@/lib/offlineTeamRoster";

type RegionFilter = "All" | OfflineRegion;

const REGION_CHIP: Record<OfflineRegion, string> = {
  KA: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  TS: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  AP: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Kerala: "bg-pink-500/15 text-pink-300 border-pink-500/25",
  North: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
};

const flattenCell = (value: unknown) => String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");

const sourceLabel = (source: string) =>
  source === "whatsapp" ? "WhatsApp" : source === "instagram" ? "Instagram" : source;

const COPY_HEADERS = [
  "Name",
  "Region",
  "Source",
  "UTM medium",
  "Campaign",
  "Destination",
  "Link",
  "Nominations",
  "Unique teachers",
  "Teacher names",
  "Teacher phones",
];

const memberCells = (row: OfflineMemberStats) => [
  row.name,
  REGION_LABELS[row.region],
  sourceLabel(row.utm_source),
  row.utm_medium,
  row.utm_campaign,
  row.destination,
  row.url,
  row.nominations.length,
  row.teachers.length,
  row.teachers.map((t) => t.name).join(" | "),
  row.teachers.map((t) => t.phone).join(" | "),
];

type Props = {
  nominations: any[];
  onView: (nominations: any[], title: string) => void;
};

const OfflineTeamPanel = ({ nominations, onView }: Props) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("All");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sort, setSort] = useState("teachers");
  const [openId, setOpenId] = useState<string | null>(null);
  const [teacherView, setTeacherView] = useState<{ nominations: any[]; title: string } | null>(null);

  useEffect(() => {
    if (!teacherView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTeacherView(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [teacherView]);

  const scored = useMemo(() => scoreOfflineTeam(nominations), [nominations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scored.filter((row) => {
      if (regionFilter !== "All" && row.region !== regionFilter) return false;
      if (activityFilter === "with" && row.teachers.length === 0) return false;
      if (activityFilter === "without" && row.teachers.length > 0) return false;
      if (!q) return true;
      return [row.name, row.utm_medium, row.utm_content, row.utm_source, REGION_LABELS[row.region]].some((value) =>
        value.toLowerCase().includes(q),
      );
    });
  }, [scored, search, regionFilter, activityFilter]);

  const visible = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "nominations") return b.nominations.length - a.nominations.length || a.name.localeCompare(b.name);
      return b.teachers.length - a.teachers.length || b.nominations.length - a.nominations.length || a.name.localeCompare(b.name);
    });
  }, [filtered, sort]);

  const regionStats = useMemo(
    () =>
      OFFLINE_REGIONS.map((region) => {
        const rows = scored.filter((row) => row.region === region);
        return {
          region,
          members: rows.length,
          nominations: rows.reduce((sum, row) => sum + row.nominations.length, 0),
          uniqueTeachers: uniqueTeachersFrom(rows).length,
          withLeads: rows.filter((row) => row.teachers.length > 0).length,
        };
      }),
    [scored],
  );

  const scoped = regionFilter === "All" ? scored : scored.filter((row) => row.region === regionFilter);
  const totals = {
    members: visible.length,
    nominations: visible.reduce((sum, row) => sum + row.nominations.length, 0),
    uniqueTeachers: uniqueTeachersFrom(visible).length,
    withLeads: visible.filter((row) => row.teachers.length > 0).length,
  };

  const copyAll = async () => {
    if (visible.length === 0) {
      toast({ title: "Nothing to copy", description: "No team members match the current filters.", variant: "destructive" });
      return;
    }
    const tsv = [COPY_HEADERS, ...visible.map(memberCells)].map((row) => row.map(flattenCell).join("\t")).join("\n");
    try {
      const result = await copyTextWithFallback(tsv, "offline-team.tsv");
      if (result === "copied") {
        toast({ title: `Copied ${visible.length} team member${visible.length !== 1 ? "s" : ""}` });
      } else {
        toast({
          title: `Downloaded ${visible.length} team member${visible.length !== 1 ? "s" : ""}`,
          description: "Clipboard was too large or blocked, so a TSV file was saved instead.",
        });
      }
    } catch {
      toast({ title: "Copy failed", description: "Could not copy or download the list.", variant: "destructive" });
    }
  };

  const copyLink = async (url: string, name: string) => {
    try {
      const result = await copyTextWithFallback(url, `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-utm.txt`);
      toast({
        title: result === "copied" ? "Link copied" : "Link downloaded",
        description: result === "copied" ? name : "Clipboard was blocked, so the link was saved as a file.",
      });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy this UTM link.", variant: "destructive" });
    }
  };

  const exportCSV = () => {
    if (visible.length === 0) {
      toast({ title: "Nothing to export", description: "No team members match the current filters.", variant: "destructive" });
      return;
    }
    const csv = [COPY_HEADERS, ...visible.map(memberCells)]
      .map((row) => row.map((cell) => `"${flattenCell(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "offline-team.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openUniqueTeachers = (noms: any[], title: string) => {
    if (noms.length === 0) {
      toast({ title: "No teachers yet", description: `${title} has no attributed nominations.`, variant: "destructive" });
      return;
    }
    setTeacherView({ nominations: noms, title });
  };

  const openTeachers = (row: OfflineMemberStats) =>
    openUniqueTeachers(row.nominations, row.name);

  const openRegionTeachers = (region: OfflineRegion) => {
    const rows = scored.filter((row) => row.region === region);
    openUniqueTeachers(rows.flatMap((row) => row.nominations), REGION_LABELS[region]);
  };

  const openFilteredTeachers = () =>
    openUniqueTeachers(
      visible.flatMap((row) => row.nominations),
      regionFilter === "All" ? "Offline team" : REGION_LABELS[regionFilter],
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: regionFilter === "All" ? "Team members" : "Members in region", value: totals.members, icon: Users, color: "bg-primary" },
          { label: "Unique teachers", value: totals.uniqueTeachers, icon: GraduationCap, color: "bg-secondary" },
          { label: "Nominations", value: totals.nominations, icon: Users, color: "bg-blue-600" },
          { label: "Members with teachers", value: totals.withLeads, icon: MapPin, color: "bg-emerald-700" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-primary-foreground font-heading">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {regionStats.map((stat) => {
          const active = regionFilter === stat.region;
          return (
            <div
              key={stat.region}
              className={`text-left rounded-xl border p-4 transition-colors ${
                active
                  ? "border-secondary/40 bg-secondary/10"
                  : "border-primary-foreground/10 bg-primary-foreground/5"
              }`}
            >
              <button
                type="button"
                onClick={() => setRegionFilter(active ? "All" : stat.region)}
                className="w-full text-left"
              >
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${REGION_CHIP[stat.region]}`}>
                  {REGION_LABELS[stat.region]}
                </span>
                <p className="text-2xl font-heading font-bold text-primary-foreground mt-3">{stat.uniqueTeachers}</p>
                <p className="text-[11px] text-primary-foreground/45 mt-1">
                  {stat.nominations} nomination{stat.nominations !== 1 ? "s" : ""} · {stat.withLeads}/{stat.members} members
                </p>
              </button>
              <button
                type="button"
                className="mt-2 text-[11px] font-semibold text-secondary hover:text-secondary/80 disabled:text-primary-foreground/25"
                disabled={stat.nominations === 0}
                onClick={() => openRegionTeachers(stat.region)}
              >
                View unique teachers
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                Offline team
              </h2>
              <p className="text-xs text-primary-foreground/40 mt-1">
                Field-team UTM links for Guru Ratna 2026. Unique teachers are matched on teacher phone,
                the same way as the Unique Teachers tab.
                {regionFilter !== "All" ? ` Showing ${REGION_LABELS[regionFilter]}.` : ""}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="hero-outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={totals.nominations === 0}
                onClick={openFilteredTeachers}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View unique teachers</span>
                <span className="sm:hidden">Unique</span>
                {totals.uniqueTeachers > 0 ? ` (${totals.uniqueTeachers.toLocaleString("en-IN")})` : ""}
              </Button>
              <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={() => void copyAll()}>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
              <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
            <Input
              placeholder="Search name, UTM, region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
            />
          </div>
          <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
            <Select value={regionFilter} onValueChange={(value) => setRegionFilter(value as RegionFilter)}>
              <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[180px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All regions</SelectItem>
                {OFFLINE_REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>{REGION_LABELS[region]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[180px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                <SelectItem value="with">Has teachers</SelectItem>
                <SelectItem value="without">No teachers yet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full min-w-0 lg:w-auto lg:min-w-[190px] bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teachers">Most unique teachers</SelectItem>
                <SelectItem value="nominations">Most nominations</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y divide-primary-foreground/5">
          {visible.map((row) => {
            const open = openId === row.id;
            return (
              <div key={row.id} className="px-3 sm:px-5 py-3">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-bold text-primary-foreground text-sm sm:text-base">{row.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${REGION_CHIP[row.region]}`}>
                        {REGION_LABELS[row.region]}
                      </span>
                      <span className="text-[10px] font-semibold text-primary-foreground/45">{sourceLabel(row.utm_source)}</span>
                    </div>
                    <p className="text-[11px] text-primary-foreground/35 truncate mt-0.5" title={row.url}>
                      {row.utm_medium} · {row.destination === "/" ? "Home" : row.destination}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                    <div className="text-right min-w-[72px]">
                      <p className="text-lg font-heading font-bold text-primary-foreground leading-none">{row.teachers.length}</p>
                      <p className="text-[10px] text-primary-foreground/40 mt-0.5">unique</p>
                    </div>
                    <div className="text-right min-w-[72px]">
                      <p className="text-lg font-heading font-bold text-primary-foreground leading-none">{row.nominations.length}</p>
                      <p className="text-[10px] text-primary-foreground/40 mt-0.5">noms</p>
                    </div>
                    <Button
                      variant="hero-outline"
                      size="sm"
                      className="h-8 text-[11px] gap-1"
                      onClick={() => setOpenId(open ? null : row.id)}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                      Teachers
                    </Button>
                    <Button
                      variant="hero-outline"
                      size="sm"
                      className="h-8 text-[11px] gap-1"
                      disabled={row.teachers.length === 0}
                      onClick={() => openTeachers(row)}
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span className="hidden xl:inline">View unique teachers</span>
                      <span className="xl:hidden">Unique</span>
                    </Button>
                    <Button
                      type="button"
                      variant="hero-outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Copy UTM link"
                      onClick={() => void copyLink(row.url, row.name)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-primary-foreground/15 text-primary-foreground/60 hover:text-primary-foreground"
                      title="Open UTM link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                {open && (
                  <div className="mt-3 rounded-lg border border-primary-foreground/10 bg-black/20 overflow-hidden">
                    {row.teachers.length === 0 ? (
                      <p className="text-xs text-primary-foreground/40 px-3 py-4">No unique teachers from this link yet.</p>
                    ) : (
                      <div className="divide-y divide-primary-foreground/5">
                        {row.teachers.map((teacher) => (
                          <div key={teacher.phone} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-primary-foreground truncate">{teacher.name}</p>
                              <p className="text-[11px] text-primary-foreground/45 truncate">
                                {teacher.phone} · {teacher.school || "No school"} · {teacher.nominations.length} nomination{teacher.nominations.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Button
                              variant="hero-outline"
                              size="sm"
                              className="h-8 text-[11px] gap-1"
                              onClick={() =>
                                onView(teacher.nominations, `${teacher.name} · via ${row.name}`)
                              }
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div className="py-16 text-center text-primary-foreground/40">
            {scoped.length === 0 ? "No offline team members in this region." : "No team members match your filters."}
          </div>
        )}
      </div>

      {teacherView && (
        <div className="fixed inset-0 z-[80] bg-[#0f0505]/95 overflow-auto" style={{ background: "hsl(0,0%,8%)" }}>
          <div className="sticky top-0 z-20 border-b border-primary-foreground/10 bg-[#6B1212]/95 backdrop-blur-lg">
            <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1840px] px-3 sm:px-4 2xl:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/45">Unique teachers</p>
                <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground truncate">
                  {teacherView.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTeacherView(null)}
                className="text-primary-foreground/50 hover:text-primary-foreground p-1.5 rounded-lg hover:bg-white/5"
                aria-label="Close unique teachers"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1840px] px-3 sm:px-4 2xl:px-8 py-6 sm:py-8">
            <UniqueTeachersPanel
              nominations={teacherView.nominations}
              onView={onView}
              title={`Unique teachers · ${teacherView.title}`}
              subtitle="Same unique-teacher list as the Unique Teachers tab, limited to this offline-team UTM."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineTeamPanel;
