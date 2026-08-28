import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Calendar as CalendarIcon, Copy, Download, ExternalLink, Link2, Loader2, Megaphone, MousePointerClick,
  Search, Trophy, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { adminCreatePromoLink, adminGetPromoLinks, type PromoLink } from "@/lib/apiAdmin";
import type { DateRange as DayRange } from "react-day-picker";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X / Twitter" },
  { id: "other", label: "Other" },
] as const;

const DESTINATIONS = [
  { id: "/", label: "Home" },
  { id: "/nominate-student", label: "Student nomination" },
  { id: "/nominate-teacher", label: "Teacher nomination" },
] as const;

const DEFAULT_CAMPAIGN = "guru_ratna_2026";
const PUBLIC_ORIGIN = "https://www.niatawards.in";

type DateRange = "7d" | "30d" | "month" | "all";

const RANGE_OPTIONS: { id: DateRange; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

const platformLabel = (id: string) => PLATFORMS.find((p) => p.id === id)?.label || id;
const destLabel = (id: string) => DESTINATIONS.find((d) => d.id === id)?.label || id;

const slugifyInfluencer = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "influencer";

const istDayKey = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatDateIn = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
};

const flattenCell = (value: unknown) => String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");

const publicOrigin = () => {
  if (typeof window === "undefined") return PUBLIC_ORIGIN;
  return window.location.origin;
};

const buildPromoUrl = (link: {
  influencer_name: string;
  influencer_slug: string;
  platform: string;
  campaign: string;
  destination: string;
}) => {
  const q = new URLSearchParams({
    utm_source: link.platform,
    utm_medium: link.influencer_slug,
    utm_campaign: link.campaign,
    utm_content: link.influencer_name,
  });
  return `${publicOrigin()}${link.destination}?${q.toString()}`;
};

const rangeStart = (range: DateRange): Date | null => {
  if (range === "all") return null;
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "30d") return new Date(now.getTime() - 30 * 86400000);
  const [y, m] = istDayKey(now).split("-");
  return new Date(`${y}-${m}-01T00:00:00+05:30`);
};

const inRange = (value: string | Date | null | undefined, range: DateRange) => {
  if (!value) return false;
  const start = rangeStart(range);
  if (!start) return true;
  return new Date(value) >= start;
};

const inCalendarWindow = (
  value: string | Date | null | undefined,
  window: DayRange | undefined,
) => {
  if (!value || !window?.from) return false;
  const key = istDayKey(value);
  const from = istDayKey(window.from);
  const to = istDayKey(window.to ?? window.from);
  return key >= from && key <= to;
};

const formatDayIn = (value: Date) => value.toLocaleDateString("en-IN");

const calendarLabel = (window: DayRange | undefined) => {
  if (!window?.from) return "Pick dates";
  if (!window.to || istDayKey(window.from) === istDayKey(window.to)) return formatDayIn(window.from);
  return `${formatDayIn(window.from)} – ${formatDayIn(window.to)}`;
};

const matchesLink = (n: { utm_source?: string; utm_medium?: string; utm_campaign?: string }, link: PromoLink) =>
  String(n.utm_source || "").trim().toLowerCase() === link.platform &&
  String(n.utm_medium || "").trim().toLowerCase() === link.influencer_slug &&
  String(n.utm_campaign || "").trim().toLowerCase() === String(link.campaign || "").trim().toLowerCase();

const platformChip = (platform: string) => {
  const k = platform.toLowerCase();
  if (k === "instagram") return "bg-pink-500/15 text-pink-300 border-pink-500/25";
  if (k === "youtube") return "bg-red-500/15 text-red-300 border-red-500/25";
  if (k === "whatsapp") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (k === "telegram") return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  if (k === "linkedin") return "bg-blue-500/15 text-blue-300 border-blue-500/25";
  if (k === "facebook") return "bg-indigo-500/15 text-indigo-300 border-indigo-500/25";
  if (k === "twitter") return "bg-white/10 text-white/70 border-white/15";
  return "bg-secondary/15 text-secondary border-secondary/25";
};

type Props = {
  nominations: any[];
  onView: (noms: any[], title: string) => void;
};

const CampaignsPanel = ({ nominations, onView }: Props) => {
  const { toast } = useToast();
  const [links, setLinks] = useState<PromoLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("all");
  const [calendarRange, setCalendarRange] = useState<DayRange | undefined>(undefined);
  const [q, setQ] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");
  const [influencerQ, setInfluencerQ] = useState("");
  const [influencerPlatform, setInfluencerPlatform] = useState("all");

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [destination, setDestination] = useState<string>("/nominate-student");

  const loadLinks = async (silent = false) => {
    if (!silent) setLoadingLinks(true);
    try {
      setLinks(await adminGetPromoLinks());
    } catch (err) {
      if (!silent) {
        toast({
          title: "Could not load tracked links",
          description: err instanceof Error ? err.message : "Try refreshing.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    loadLinks();
    const refresh = () => loadLinks(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(refresh, 12000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  const previewSlug = slugifyInfluencer(name || "influencer");
  const previewUrl = buildPromoUrl({
    influencer_name: name.trim() || "Influencer",
    influencer_slug: previewSlug,
    platform,
    campaign: campaign.trim() || DEFAULT_CAMPAIGN,
    destination,
  });

  const inSelectedWindow = (value: string | Date | null | undefined) =>
    calendarRange?.from ? inCalendarWindow(value, calendarRange) : inRange(value, range);

  const rangedNoms = useMemo(
    () => nominations.filter((n) => inSelectedWindow(n.created_at)),
    [nominations, range, calendarRange]
  );

  const attributedNoms = useMemo(
    () =>
      rangedNoms.filter((n) => {
        const medium = String(n.utm_medium || "").trim();
        if (medium) return true;
        return links.some((link) => matchesLink(n, link));
      }),
    [rangedNoms, links]
  );

  const nomsForLink = (link: PromoLink) => {
    const exact = rangedNoms.filter((n) => matchesLink(n, link));
    if (exact.length > 0) return exact;
    return rangedNoms.filter(
      (n) =>
        String(n.utm_medium || "").trim().toLowerCase() === link.influencer_slug &&
        String(n.utm_source || "").trim().toLowerCase() === link.platform
    );
  };

  const influencerStats = useMemo(() => {
    const byKey: Record<string, {
      key: string;
      name: string;
      slug: string;
      platform: string;
      count: number;
      latest: string | null;
      noms: any[];
    }> = {};

    for (const link of links) {
      const key = `${link.influencer_slug}|${link.platform}`;
      if (!byKey[key]) {
        byKey[key] = {
          key,
          name: link.influencer_name,
          slug: link.influencer_slug,
          platform: link.platform,
          count: 0,
          latest: null,
          noms: [],
        };
      }
    }

    for (const n of attributedNoms) {
      const slug = String(n.utm_medium || "").trim().toLowerCase();
      const plat = String(n.utm_source || "").trim().toLowerCase() || "other";
      if (!slug) continue;
      const key = `${slug}|${plat}`;
      if (!byKey[key]) {
        byKey[key] = {
          key,
          name: String(n.utm_content || "").trim() || slug.replace(/_/g, " "),
          slug,
          platform: plat,
          count: 0,
          latest: null,
          noms: [],
        };
      }
      byKey[key].count += 1;
      byKey[key].noms.push(n);
      const created = n.created_at ? String(n.created_at) : null;
      if (created && (!byKey[key].latest || new Date(created) > new Date(byKey[key].latest))) {
        byKey[key].latest = created;
        if (n.utm_content) byKey[key].name = String(n.utm_content);
      }
    }

    return Object.values(byKey).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [links, attributedNoms]);

  const topInfluencer = influencerStats[0];
  const activeInfluencers = new Set(links.map((l) => l.influencer_slug)).size;
  const barRows = influencerStats.filter((r) => r.count > 0).slice(0, 10);
  const maxBar = Math.max(...barRows.map((r) => r.count), 1);

  const timeline = useMemo(() => {
    const todayKey = istDayKey(new Date());
    let firstKey = todayKey;
    let endKey = todayKey;
    if (calendarRange?.from) {
      firstKey = istDayKey(calendarRange.from);
      endKey = istDayKey(calendarRange.to ?? calendarRange.from);
    } else {
      const start = rangeStart(range);
      firstKey = start ? istDayKey(start) : todayKey;
      if (range === "all") {
        if (attributedNoms.length > 0) {
          firstKey = attributedNoms.reduce((min, n) => {
            const k = istDayKey(n.created_at);
            return k < min ? k : min;
          }, todayKey);
        } else {
          firstKey = istDayKey(new Date(Date.now() - 6 * 86400000));
        }
      }
    }
    const counts: Record<string, number> = {};
    for (const n of attributedNoms) {
      const k = istDayKey(n.created_at);
      counts[k] = (counts[k] || 0) + 1;
    }
    const days: { day: string; count: number }[] = [];
    const cursor = new Date(`${firstKey}T00:00:00+05:30`);
    const last = new Date(`${endKey}T00:00:00+05:30`);
    let guard = 0;
    while (cursor <= last && guard < 400) {
      const k = istDayKey(cursor);
      days.push({ day: k, count: counts[k] || 0 });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    return days;
  }, [attributedNoms, range, calendarRange]);

  const campaignOptions = useMemo(
    () => Array.from(new Set(links.map((l) => l.campaign).filter(Boolean))).sort(),
    [links]
  );

  const filteredLinks = links.filter((link) => {
    if (platformFilter !== "all" && link.platform !== platformFilter) return false;
    if (campaignFilter !== "all" && link.campaign !== campaignFilter) return false;
    if (destFilter !== "all" && link.destination !== destFilter) return false;
    if (!q.trim()) return true;
    const hay = `${link.influencer_name} ${link.influencer_slug} ${link.platform} ${link.campaign} ${link.destination}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const filteredInfluencers = influencerStats.filter((row) => {
    if (influencerPlatform !== "all" && row.platform !== influencerPlatform) return false;
    if (!influencerQ.trim()) return true;
    const hay = `${row.name} ${row.slug} ${row.platform}`.toLowerCase();
    return hay.includes(influencerQ.toLowerCase());
  });

  const linksFiltersActive = platformFilter !== "all" || campaignFilter !== "all" || destFilter !== "all" || q.trim().length > 0;
  const influencerFiltersActive = influencerPlatform !== "all" || influencerQ.trim().length > 0;

  const clearLinkFilters = () => {
    setQ("");
    setPlatformFilter("all");
    setCampaignFilter("all");
    setDestFilter("all");
  };

  const clearInfluencerFilters = () => {
    setInfluencerQ("");
    setInfluencerPlatform("all");
  };

  const latestNomAt = (noms: any[]) =>
    noms.reduce<string | null>((latest, n) => {
      if (!n.created_at) return latest;
      if (!latest || new Date(n.created_at) > new Date(latest)) return String(n.created_at);
      return latest;
    }, null);

  const lastActivityOf = (link: PromoLink, noms: any[]) => {
    const click = inSelectedWindow(link.last_click_at) ? link.last_click_at : null;
    const lastNom = latestNomAt(noms);
    return [click, lastNom]
      .filter(Boolean)
      .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] as string | undefined;
  };

  const copyText = async (text: string, id?: string, silent?: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
      }
      if (!silent) toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", description: "Could not access the clipboard.", variant: "destructive" });
    }
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !campaign.trim()) {
      toast({ title: "Missing fields", description: "Influencer name and campaign are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const link = await adminCreatePromoLink({
        influencer_name: name.trim(),
        platform,
        campaign: campaign.trim(),
        destination,
      });
      setLinks((prev) => {
        const without = prev.filter((l) => l.id !== link.id);
        return [link, ...without];
      });
      const url = buildPromoUrl(link);
      await copyText(url, link.id, true);
      toast({ title: "Campaign link ready", description: "Copied to clipboard." });
    } catch (err) {
      toast({
        title: "Could not save link",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreview = async () => {
    if (!name.trim() || !campaign.trim()) {
      toast({ title: "Missing fields", description: "Influencer name and campaign are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const existing = links.find(
        (l) =>
          l.influencer_slug === previewSlug &&
          l.platform === platform &&
          l.campaign === campaign.trim() &&
          l.destination === destination
      );
      let url = previewUrl;
      if (!existing) {
        const link = await adminCreatePromoLink({
          influencer_name: name.trim(),
          platform,
          campaign: campaign.trim(),
          destination,
        });
        setLinks((prev) => {
          const without = prev.filter((l) => l.id !== link.id);
          return [link, ...without];
        });
        url = buildPromoUrl(link);
      } else {
        url = buildPromoUrl(existing);
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Could not open link",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportInfluencersCSV = () => {
    const rows = [
      ["Influencer", "Platform", "Nominations", "Latest nomination"],
      ...filteredInfluencers.map((r) => [r.name, platformLabel(r.platform), r.count, r.latest ? formatDateIn(r.latest) : ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${flattenCell(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "influencers.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Influencer CSV downloaded" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">Influencer tracking</h2>
          <p className="text-sm text-white/45 mt-1">Generate campaign links, count clicks, and rank influencers by nominations.</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-xs font-semibold w-full sm:w-auto ${
                  calendarRange?.from
                    ? "bg-secondary/20 border-secondary text-secondary"
                    : "bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                <span className="truncate">{calendarLabel(calendarRange)}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3 bg-[#141414] border-white/10" align="end">
              <p className="text-[11px] text-white/45 mb-2 px-1">Select a start date, then an end date.</p>
              <Calendar
                mode="range"
                selected={calendarRange}
                onSelect={setCalendarRange}
                numberOfMonths={1}
                defaultMonth={calendarRange?.from}
                className="text-white"
              />
              {calendarRange?.from && (
                <button
                  type="button"
                  onClick={() => setCalendarRange(undefined)}
                  className="mt-2 w-full text-xs text-white/60 hover:text-white py-1.5 rounded-md hover:bg-white/5"
                >
                  Clear dates
                </button>
              )}
            </PopoverContent>
          </Popover>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCalendarRange(undefined);
                  setRange(opt.id);
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                  !calendarRange?.from && range === opt.id
                    ? "bg-secondary/20 border-secondary text-secondary"
                    : "bg-white/5 border-white/10 text-white/55 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Active influencers", value: activeInfluencers, sub: `${links.length} tracked link${links.length === 1 ? "" : "s"}`, icon: Users, color: "bg-secondary" },
          { label: "Attributed nominations", value: attributedNoms.length, sub: calendarRange?.from ? calendarLabel(calendarRange) : range === "all" ? "All time" : RANGE_OPTIONS.find((r) => r.id === range)?.label, icon: Megaphone, color: "bg-blue-600" },
          { label: "Top influencer", value: topInfluencer?.count ? topInfluencer.name : "—", sub: topInfluencer?.count ? `${topInfluencer.count} nominations · ${platformLabel(topInfluencer.platform)}` : "No attributed nominations yet", icon: Trophy, color: "bg-amber-500", text: true },
          { label: "Link clicks", value: links.reduce((sum, l) => sum + (l.views || 0), 0), sub: "Landing views across all links", icon: MousePointerClick, color: "bg-white/20" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className={`font-bold text-primary-foreground font-heading ${stat.text ? "text-lg sm:text-xl truncate" : "text-2xl sm:text-3xl"}`}>
              {stat.value}
            </div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
            <div className="text-[10px] text-primary-foreground/30 mt-0.5 truncate">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6">
          <h3 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-secondary" /> Nominations by influencer
          </h3>
          {barRows.length === 0 ? (
            <p className="text-sm text-primary-foreground/40 py-8 text-center">No attributed nominations in this range.</p>
          ) : (
            <div className="space-y-3">
              {barRows.map((row, i) => {
                const pct = Math.round((row.count / maxBar) * 100);
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => onView(row.noms, `${row.name} · ${platformLabel(row.platform)}`)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs sm:text-sm text-primary-foreground/70 truncate">
                        {row.name} <span className="text-primary-foreground/35">· {platformLabel(row.platform)}</span>
                      </span>
                      <span className="text-xs font-semibold text-primary-foreground flex-shrink-0">{row.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-primary-foreground/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.08 + i * 0.05, duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary/50"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6">
          <h3 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-secondary" /> Nominations over time
          </h3>
          <TimeSeriesChart points={timeline} />
        </div>
      </div>

      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6 space-y-4"
      >
        <div>
          <h3 className="font-heading font-bold text-primary-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-secondary" /> Generate campaign link
          </h3>
          <p className="text-xs text-white/40 mt-1">utm_source = platform, utm_medium = influencer, utm_campaign = campaign name.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Influencer name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Campaign</Label>
            <Input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder={DEFAULT_CAMPAIGN}
              className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Destination</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex-1 text-left text-[11px] sm:text-xs text-secondary/90 hover:text-secondary bg-black/30 border border-white/10 rounded-md px-3 py-2 truncate"
            title="Save if needed, then open this campaign link"
          >
            {previewUrl}
          </button>
          <Button type="button" variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9 flex-shrink-0" onClick={handleOpenPreview} disabled={saving}>
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </Button>
          <Button type="submit" variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9 flex-shrink-0" disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            Save & copy
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="font-heading font-bold text-primary-foreground">
              Tracked links <span className="text-primary-foreground/40 font-normal text-sm">({filteredLinks.length})</span>
            </h3>
            {linksFiltersActive && (
              <button type="button" onClick={clearLinkFilters} className="text-[11px] font-semibold text-secondary hover:text-secondary/80 self-start">
                Clear filters
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
            <Input
              placeholder="Search influencer, campaign, platform…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaignOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={destFilter} onValueChange={setDestFilter}>
              <SelectTrigger className="col-span-2 lg:col-span-1 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue placeholder="All destinations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All destinations</SelectItem>
                {DESTINATIONS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingLinks ? (
          <div className="py-16 flex items-center justify-center text-white/40 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading tracked links…
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="py-16 text-center px-6">
            <Link2 className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-primary-foreground/50 text-sm">{linksFiltersActive ? "No links match these filters." : "No tracked links yet."}</p>
            <p className="text-primary-foreground/30 text-xs mt-1">{linksFiltersActive ? "Try another platform, campaign, or search." : "Generate a link above to start counting clicks and nominations."}</p>
          </div>
        ) : (
          <>
            <div className="lg:hidden p-3 space-y-3">
              {filteredLinks.map((link) => {
                const noms = nomsForLink(link);
                const url = buildPromoUrl(link);
                const lastActivity = lastActivityOf(link, noms);
                return (
                  <div key={link.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{link.influencer_name}</p>
                        <p className="text-xs text-white/50 mt-0.5 truncate">{platformLabel(link.platform)} · {link.campaign}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${platformChip(link.platform)}`}>
                        {destLabel(link.destination)}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/35">{link.views || 0} clicks · {noms.length} nominations</p>
                    <p className="text-[10px] text-white/30">Last activity {formatDateIn(lastActivity as string)}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="hero-outline" size="sm" className="h-8 text-[11px] gap-1 flex-1" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </Button>
                      <Button type="button" variant="hero-outline" size="sm" className="h-8 text-[11px] gap-1 flex-1" onClick={() => copyText(url, link.id)}>
                        <Copy className="w-3 h-3" /> {copiedId === link.id ? "Copied" : "Copy"}
                      </Button>
                      <Button type="button" variant="hero-outline" size="sm" className="h-8 text-[11px] flex-1" onClick={() => onView(noms, link.influencer_name)}>
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-foreground/10">
                    {["Influencer", "Platform", "Campaign", "Link", "Created", "Views", "Nominations", "Last activity", ""].map((h) => (
                      <th key={h} className="text-left text-[10px] font-semibold text-primary-foreground/40 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => {
                    const noms = nomsForLink(link);
                    const url = buildPromoUrl(link);
                    const lastActivity = lastActivityOf(link, noms);
                    return (
                      <tr key={link.id} className="border-b border-primary-foreground/5 hover:bg-primary-foreground/5">
                        <td className="px-5 py-3 text-sm font-medium text-primary-foreground whitespace-nowrap">{link.influencer_name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${platformChip(link.platform)}`}>
                            {platformLabel(link.platform)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-primary-foreground/70 max-w-[140px] truncate">{link.campaign}</td>
                        <td className="px-5 py-3 max-w-[260px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-secondary hover:text-secondary/80 truncate"
                              title={url}
                            >
                              {destLabel(link.destination)}
                            </a>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:text-secondary/80 flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            <button
                              type="button"
                              onClick={() => copyText(url, link.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:text-secondary/80 flex-shrink-0"
                            >
                              <Copy className="w-3 h-3" /> {copiedId === link.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[11px] text-white/40 whitespace-nowrap">{link.created_at ? new Date(link.created_at).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-5 py-3 text-sm font-bold text-primary-foreground">{link.views || 0}</td>
                        <td className="px-5 py-3 text-sm font-bold text-primary-foreground">{noms.length}</td>
                        <td className="px-5 py-3 text-[11px] text-white/40 whitespace-nowrap">{formatDateIn(lastActivity)}</td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => onView(noms, `${link.influencer_name} · ${platformLabel(link.platform)}`)}
                            className="text-[11px] font-semibold text-secondary hover:text-secondary/80"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="font-heading font-bold text-primary-foreground">
              Influencers <span className="text-primary-foreground/40 font-normal text-sm">({filteredInfluencers.length})</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {influencerFiltersActive && (
                <button type="button" onClick={clearInfluencerFilters} className="text-[11px] font-semibold text-secondary hover:text-secondary/80">
                  Clear filters
                </button>
              )}
              <Button variant="hero-outline" size="sm" className="gap-1.5 text-xs h-9" onClick={exportInfluencersCSV}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
              <Input
                placeholder="Search influencer…"
                value={influencerQ}
                onChange={(e) => setInfluencerQ(e.target.value)}
                className="pl-9 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9"
              />
            </div>
            <Select value={influencerPlatform} onValueChange={setInfluencerPlatform}>
              <SelectTrigger className="w-full sm:w-44 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-xs h-9">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredInfluencers.length === 0 ? (
          <p className="text-sm text-primary-foreground/40 py-12 text-center">
            {influencerFiltersActive ? "No influencers match these filters." : "Generate a link to see influencer rankings."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-foreground/10">
                  {["Influencer", "Platform", "Nominations", "Latest nomination", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-primary-foreground/40 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInfluencers.map((row) => (
                  <tr key={row.key} className="border-b border-primary-foreground/5 hover:bg-primary-foreground/5">
                    <td className="px-5 py-3 text-sm font-medium text-primary-foreground">{row.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${platformChip(row.platform)}`}>
                        {platformLabel(row.platform)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-primary-foreground">{row.count}</td>
                    <td className="px-5 py-3 text-[11px] text-white/40">{formatDateIn(row.latest)}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => onView(row.noms, `${row.name} · ${platformLabel(row.platform)}`)}
                        className="text-[11px] font-semibold text-secondary hover:text-secondary/80"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const TimeSeriesChart = ({ points }: { points: { day: string; count: number }[] }) => {
  const series = points.length ? points : [{ day: istDayKey(new Date()), count: 0 }];
  const w = 640;
  const h = 220;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 32;
  const max = Math.max(...series.map((p) => p.count), 4);
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const step = series.length > 1 ? plotW / (series.length - 1) : 0;
  const xy = series.map((p, i) => {
    const x = padL + i * step;
    const y = padT + plotH - (p.count / max) * plotH;
    return { ...p, x, y };
  });
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${xy[xy.length - 1].x.toFixed(1)} ${padT + plotH} L ${xy[0].x.toFixed(1)} ${padT + plotH} Z`;
  const xLabels = [xy[0], xy[Math.floor(xy.length / 2)], xy[xy.length - 1]].filter(
    (p, i, arr) => arr.findIndex((x) => x.day === p.day) === i
  );
  const formatDay = (day: string) => {
    const parts = day.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]" role="img" aria-label="Nominations over time">
        <defs>
          <linearGradient id="nomArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = padT + plotH - t * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10">
                {Math.round(t * max)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#nomArea)" />
        <path d={line} fill="none" stroke="hsl(var(--secondary))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p) => (
          <g key={p.day}>
            <circle cx={p.x} cy={p.y} r={p.count > 0 ? 3.5 : 2} fill="hsl(var(--secondary))" />
            {p.count > 0 && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">
                {p.count}
              </text>
            )}
          </g>
        ))}
        {xLabels.map((p) => (
          <text key={p.day} x={p.x} y={h - 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
            {formatDay(p.day)}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default CampaignsPanel;
