import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Calendar as CalendarIcon, Copy, ExternalLink, Link2, Loader2, Megaphone, MousePointerClick, Search, Target, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import type { DateRange as DayRange } from "react-day-picker";
import {
  adminCreateDigitalCampaignLink,
  adminGetDigitalCampaignLinks,
  type DigitalCampaignLink,
} from "@/lib/apiAdmin";
import {
  DIGITAL_CHANNELS,
  DIGITAL_CREATIVE_TYPES,
  DIGITAL_LANDING_PAGES,
  DIGITAL_LANGUAGES,
  DIGITAL_MEDIUMS,
  DIGITAL_STANDARD,
  DIGITAL_STATES,
  buildDigitalCampaignUrl,
  buildFinalUtmCampaign,
  channelToUtmSource,
  destLabel,
  landingTokenToDestination,
  tokenLabel,
} from "@/lib/digitalCampaign";
import SearchableSelect from "@/components/admin/SearchableSelect";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

type DateRange = "7d" | "30d" | "month" | "all";

const RANGE_OPTIONS: { id: DateRange; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

const istDayKey = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatDayIn = (value: Date) => value.toLocaleDateString("en-IN");

const calendarLabel = (window: DayRange | undefined) => {
  if (!window?.from) return "Pick dates";
  if (!window.to || istDayKey(window.from) === istDayKey(window.to)) return formatDayIn(window.from);
  return `${formatDayIn(window.from)} – ${formatDayIn(window.to)}`;
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

const formatDateIn = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
};

const matchesLink = (
  n: { utm_source?: string; utm_medium?: string; utm_campaign?: string },
  link: DigitalCampaignLink
) =>
  String(n.utm_source || "").trim().toLowerCase() === String(link.utm_source || "").trim().toLowerCase() &&
  String(n.utm_medium || "").trim().toLowerCase() === String(link.utm_medium || "").trim().toLowerCase() &&
  String(n.utm_campaign || "").trim().toLowerCase() === String(link.utm_campaign || "").trim().toLowerCase();

type Props = {
  nominations: any[];
  onView: (noms: any[], title: string) => void;
};

const fieldClass =
  "bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 text-sm h-9";

const channelOptions = DIGITAL_CHANNELS.map((c) => ({ value: c, label: c }));
const stateOptions = DIGITAL_STATES.map((s) => ({ value: s, label: s }));
const languageOptions = DIGITAL_LANGUAGES.map((l) => ({ value: l, label: l }));
const creativeTypeOptions = DIGITAL_CREATIVE_TYPES.map((t) => ({ value: t, label: t }));
const mediumOptions = DIGITAL_MEDIUMS.map((m) => ({ value: m, label: m }));
const landingOptions = DIGITAL_LANDING_PAGES.map((p) => ({ value: p.token, label: p.label }));
const destFilterOptions = [
  { value: "all", label: "All landing pages" },
  ...DIGITAL_LANDING_PAGES.map((p) => ({ value: p.destination, label: p.label })),
];
const withAll = (allLabel: string, options: { value: string; label: string }[]) => [
  { value: "all", label: allLabel },
  ...options,
];

const uniqueNoms = (noms: any[]) => {
  const seen = new Set<string>();
  return noms.filter((n) => {
    const id = String(n?.id || n?._id || "");
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const BreakdownList = ({
  rows,
  max,
  empty,
  onView,
}: {
  rows: { key: string; clicks: number; noms: any[] }[];
  max: number;
  empty: string;
  onView: (noms: any[], title: string) => void;
}) =>
  rows.length === 0 ? (
    <p className="text-sm text-primary-foreground/40 py-8 text-center">{empty}</p>
  ) : (
    <div className="space-y-3">
      {rows.slice(0, 8).map((row, i) => {
        const pct = Math.round((row.noms.length / max) * 100);
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => onView(row.noms, tokenLabel(row.key))}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-xs sm:text-sm text-primary-foreground/70 truncate">{tokenLabel(row.key)}</span>
              <span className="text-xs font-semibold text-primary-foreground flex-shrink-0">
                {row.noms.length} nom · {row.clicks} clicks
              </span>
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
  );

const DigitalMarketingPanel = ({ nominations, onView }: Props) => {
  const { toast } = useToast();
  const [links, setLinks] = useState<DigitalCampaignLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [channel, setChannel] = useState<string>(DIGITAL_CHANNELS[0]);
  const [state, setState] = useState<string>(DIGITAL_STATES[0]);
  const [language, setLanguage] = useState<string>(DIGITAL_LANGUAGES[0]);
  const [creativeType, setCreativeType] = useState<string>(DIGITAL_CREATIVE_TYPES[0]);
  const [utmMedium, setUtmMedium] = useState<string>(DIGITAL_MEDIUMS[0]);
  const [landingDiff, setLandingDiff] = useState<string>("student");
  const [audience, setAudience] = useState("");
  const [creative, setCreative] = useState("");

  const [q, setQ] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");
  const [range, setRange] = useState<DateRange>("all");
  const [calendarRange, setCalendarRange] = useState<DayRange | undefined>(undefined);

  const loadLinks = async (silent = false) => {
    if (!silent) setLoadingLinks(true);
    try {
      setLinks(await adminGetDigitalCampaignLinks());
    } catch (err) {
      if (!silent) {
        toast({
          title: "Could not load digital campaign links",
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

  const previewCampaign = buildFinalUtmCampaign({
    channel,
    state,
    language,
    audience,
    landingDiff,
    creativeType,
    creative,
  });
  const previewSource = channelToUtmSource(channel);
  const destination = landingTokenToDestination(landingDiff);
  const previewUrl = buildDigitalCampaignUrl({
    utm_source: previewSource,
    utm_medium: utmMedium,
    utm_campaign: previewCampaign,
    destination,
  });

  const inSelectedWindow = (value: string | Date | null | undefined) =>
    calendarRange?.from ? inCalendarWindow(value, calendarRange) : inRange(value, range);

  const rangedNoms = useMemo(
    () => nominations.filter((n) => inSelectedWindow(n.created_at)),
    [nominations, range, calendarRange]
  );

  const nomsForLink = (link: DigitalCampaignLink) => rangedNoms.filter((n) => matchesLink(n, link));

  const attributedNoms = useMemo(
    () => rangedNoms.filter((n) => links.some((link) => matchesLink(n, link))),
    [rangedNoms, links]
  );

  const totalClicks = links.reduce((sum, l) => sum + (l.views || 0), 0);
  const conversion = totalClicks > 0 ? Math.round((attributedNoms.length / totalClicks) * 100) : 0;
  const rangeSub = calendarRange?.from
    ? calendarLabel(calendarRange)
    : range === "all"
      ? "All time"
      : RANGE_OPTIONS.find((r) => r.id === range)?.label;

  const channelRows = useMemo(() => {
    const byKey: Record<string, { key: string; clicks: number; noms: any[] }> = {};
    for (const link of links) {
      const key = link.channel;
      if (!byKey[key]) byKey[key] = { key, clicks: 0, noms: [] };
      byKey[key].clicks += link.views || 0;
      byKey[key].noms.push(...nomsForLink(link));
    }
    return Object.values(byKey)
      .map((row) => ({ ...row, noms: uniqueNoms(row.noms) }))
      .sort((a, b) => b.noms.length - a.noms.length || b.clicks - a.clicks);
  }, [links, rangedNoms]);

  const stateRows = useMemo(() => {
    const byKey: Record<string, { key: string; clicks: number; noms: any[] }> = {};
    for (const link of links) {
      const key = link.state;
      if (!byKey[key]) byKey[key] = { key, clicks: 0, noms: [] };
      byKey[key].clicks += link.views || 0;
      byKey[key].noms.push(...nomsForLink(link));
    }
    return Object.values(byKey)
      .map((row) => ({ ...row, noms: uniqueNoms(row.noms) }))
      .sort((a, b) => b.noms.length - a.noms.length || b.clicks - a.clicks);
  }, [links, rangedNoms]);

  const maxChannelBar = Math.max(...channelRows.map((r) => r.noms.length), 1);
  const maxStateBar = Math.max(...stateRows.map((r) => r.noms.length), 1);

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

  const linksFiltersActive =
    q.trim() !== "" ||
    channelFilter !== "all" ||
    mediumFilter !== "all" ||
    stateFilter !== "all" ||
    languageFilter !== "all" ||
    typeFilter !== "all" ||
    destFilter !== "all";

  const filteredLinks = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return links.filter((link) => {
      if (channelFilter !== "all" && link.channel !== channelFilter) return false;
      if (mediumFilter !== "all" && link.utm_medium !== mediumFilter) return false;
      if (stateFilter !== "all" && link.state !== stateFilter) return false;
      if (languageFilter !== "all" && link.language !== languageFilter) return false;
      if (typeFilter !== "all" && link.creative_type !== typeFilter) return false;
      if (destFilter !== "all" && link.destination !== destFilter) return false;
      if (!needle) return true;
      const hay = [
        link.channel,
        link.state,
        link.language,
        link.creative_type,
        link.audience,
        link.landing_diff,
        link.creative,
        link.utm_campaign,
        link.utm_source,
        link.utm_medium,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [links, q, channelFilter, mediumFilter, stateFilter, languageFilter, typeFilter, destFilter]);

  const copyText = async (url: string, id: string, silent = false) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
      if (!silent) toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const payload = () => ({
    channel,
    state,
    language,
    audience,
    landing_diff: landingDiff,
    creative_type: creativeType,
    creative,
    utm_medium: utmMedium,
  });

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const link = await adminCreateDigitalCampaignLink(payload());
      setLinks((prev) => {
        const without = prev.filter((l) => l.id !== link.id);
        return [link, ...without];
      });
      const url = buildDigitalCampaignUrl(link);
      await copyText(url, link.id, true);
      toast({ title: "Digital campaign link ready", description: "Copied to clipboard." });
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
    setSaving(true);
    try {
      const existing = links.find(
        (l) =>
          l.utm_source === previewSource &&
          l.utm_medium === utmMedium &&
          l.utm_campaign === previewCampaign &&
          l.destination === destination
      );
      let url = previewUrl;
      if (!existing) {
        const link = await adminCreateDigitalCampaignLink(payload());
        setLinks((prev) => {
          const without = prev.filter((l) => l.id !== link.id);
          return [link, ...without];
        });
        url = buildDigitalCampaignUrl(link);
      } else {
        url = buildDigitalCampaignUrl(existing);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">Digital marketing campaigns</h2>
          <p className="text-sm text-white/45 mt-1">
            Generate UTM links from the paid-ads naming convention, then track clicks and nominations.
          </p>
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
          { label: "Links created", value: links.length, sub: "Saved digital campaign URLs", icon: Link2, color: "bg-secondary" },
          { label: "Link clicks", value: totalClicks, sub: "Landing views across all links", icon: MousePointerClick, color: "bg-white/20" },
          { label: "Attributed nominations", value: attributedNoms.length, sub: rangeSub, icon: Users, color: "bg-blue-600" },
          { label: "Conversion", value: `${conversion}%`, sub: totalClicks ? `${attributedNoms.length} / ${totalClicks} clicks` : "No clicks yet", icon: TrendingUp, color: "bg-amber-500" },
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
            <div className="font-bold text-primary-foreground font-heading text-2xl sm:text-3xl">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
            <div className="text-[10px] text-primary-foreground/30 mt-0.5 truncate">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6">
          <h3 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-secondary" /> Nominations by source
          </h3>
          <BreakdownList rows={channelRows.filter((r) => r.noms.length > 0 || r.clicks > 0)} max={maxChannelBar} empty="No attributed nominations in this range." onView={onView} />
        </div>
        <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6">
          <h3 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-secondary" /> Nominations over time
          </h3>
          <TimeSeriesChart points={timeline} />
        </div>
      </div>

      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6">
        <h3 className="font-heading font-bold text-primary-foreground mb-5 flex items-center gap-2">
          <Target className="w-4 h-4 text-secondary" /> Nominations by state
        </h3>
        <BreakdownList rows={stateRows.filter((r) => r.noms.length > 0 || r.clicks > 0)} max={maxStateBar} empty="No attributed nominations in this range." onView={onView} />
      </div>

      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6 space-y-4"
      >
        <div>
          <h3 className="font-heading font-bold text-primary-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-secondary" /> Generate UTM link
          </h3>
          <p className="text-xs text-white/40 mt-1">
            utm_source and utm_medium come from the dropdowns; utm_campaign is the concatenated naming string.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-white/40">Standard</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-secondary/15 text-secondary border-secondary/25">
            {DIGITAL_STANDARD}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">UTM Source</Label>
            <SearchableSelect value={channel} onChange={setChannel} options={channelOptions} searchPlaceholder="Search source…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">UTM Medium</Label>
            <SearchableSelect value={utmMedium} onChange={setUtmMedium} options={mediumOptions} searchPlaceholder="Search medium…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">State</Label>
            <SearchableSelect value={state} onChange={setState} options={stateOptions} searchPlaceholder="Search state…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Creative language</Label>
            <SearchableSelect value={language} onChange={setLanguage} options={languageOptions} searchPlaceholder="Search language…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Creative type</Label>
            <SearchableSelect value={creativeType} onChange={setCreativeType} options={creativeTypeOptions} searchPlaceholder="Search type…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Landing page differentiation</Label>
            <SearchableSelect value={landingDiff} onChange={setLandingDiff} options={landingOptions} searchPlaceholder="Search landing page…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Audience</Label>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. parents" className={fieldClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-white/50">Creative</Label>
            <Input value={creative} onChange={(e) => setCreative(e.target.value)} placeholder="e.g. hook1" className={fieldClass} />
          </div>
        </div>

        <div className="rounded-md bg-black/30 border border-white/10 px-3 py-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-white/35">Final UTM campaign</p>
          <p className="text-xs text-secondary break-all">{previewCampaign || "—"}</p>
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
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setChannelFilter("all");
                  setMediumFilter("all");
                  setStateFilter("all");
                  setLanguageFilter("all");
                  setTypeFilter("all");
                  setDestFilter("all");
                }}
                className="text-[11px] font-semibold text-secondary hover:text-secondary/80 self-start"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/30" />
            <Input
              placeholder="Search channel, campaign, audience…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`pl-9 ${fieldClass}`}
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
            <SearchableSelect value={channelFilter} onChange={setChannelFilter} options={withAll("All sources", channelOptions)} searchPlaceholder="Search source…" className="text-xs" />
            <SearchableSelect value={mediumFilter} onChange={setMediumFilter} options={withAll("All mediums", mediumOptions)} searchPlaceholder="Search medium…" className="text-xs" />
            <SearchableSelect value={stateFilter} onChange={setStateFilter} options={withAll("All states", stateOptions)} searchPlaceholder="Search state…" className="text-xs" />
            <SearchableSelect value={languageFilter} onChange={setLanguageFilter} options={withAll("All languages", languageOptions)} searchPlaceholder="Search language…" className="text-xs" />
            <SearchableSelect value={typeFilter} onChange={setTypeFilter} options={withAll("All types", creativeTypeOptions)} searchPlaceholder="Search type…" className="text-xs" />
            <SearchableSelect value={destFilter} onChange={setDestFilter} options={destFilterOptions} searchPlaceholder="Search landing page…" className="text-xs" />
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
            <p className="text-primary-foreground/30 text-xs mt-1">{linksFiltersActive ? "Try another channel, state, or search." : "Generate a link above to start counting clicks and nominations."}</p>
          </div>
        ) : (
          <>
            <div className="lg:hidden p-3 space-y-3">
              {filteredLinks.map((link) => {
                const noms = nomsForLink(link);
                const url = buildDigitalCampaignUrl(link);
                return (
                  <div key={link.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{tokenLabel(link.channel)} · {link.utm_medium} · {tokenLabel(link.state)}</p>
                        <p className="text-xs text-white/50 mt-0.5 break-all">{link.utm_campaign}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-secondary/15 text-secondary border-secondary/25 flex-shrink-0">
                        {destLabel(link.destination)}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/35">{link.views || 0} clicks · {noms.length} nominations</p>
                    <p className="text-[10px] text-white/30">Last click {formatDateIn(link.last_click_at)}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="hero-outline" size="sm" className="h-8 text-[11px] gap-1 flex-1" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </Button>
                      <Button type="button" variant="hero-outline" size="sm" className="h-8 text-[11px] gap-1 flex-1" onClick={() => copyText(url, link.id)}>
                        <Copy className="w-3 h-3" /> {copiedId === link.id ? "Copied" : "Copy"}
                      </Button>
                      <Button type="button" variant="hero-outline" size="sm" className="h-8 text-[11px] flex-1" onClick={() => onView(noms, tokenLabel(link.channel))}>
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-primary-foreground/10">
                    {["Created", "Source", "Medium", "State", "Language", "Type", "Audience", "Landing", "Creative", "Campaign", "Clicks", "Noms", "Last click", ""].map((h) => (
                      <th key={h} className="text-left text-[10px] font-semibold text-primary-foreground/40 uppercase tracking-wider px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => {
                    const noms = nomsForLink(link);
                    const url = buildDigitalCampaignUrl(link);
                    return (
                      <tr key={link.id} className="border-b border-primary-foreground/5 hover:bg-primary-foreground/5">
                        <td className="px-3 py-3 text-[11px] text-white/40 whitespace-nowrap">{link.created_at ? new Date(link.created_at).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-3 py-3 text-xs text-primary-foreground whitespace-nowrap">{tokenLabel(link.channel)}</td>
                        <td className="px-3 py-3 text-xs text-primary-foreground/70 whitespace-nowrap">{link.utm_medium}</td>
                        <td className="px-3 py-3 text-xs text-primary-foreground/70 whitespace-nowrap">{tokenLabel(link.state)}</td>
                        <td className="px-3 py-3 text-xs text-primary-foreground/70 whitespace-nowrap">{tokenLabel(link.language)}</td>
                        <td className="px-3 py-3 text-xs text-primary-foreground/70 whitespace-nowrap">{tokenLabel(link.creative_type)}</td>
                        <td className="px-3 py-3 text-xs text-primary-foreground/70 max-w-[90px] truncate">{link.audience || "—"}</td>
                        <td className="px-3 py-3">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-secondary hover:text-secondary/80 whitespace-nowrap">
                            {destLabel(link.landing_diff || link.destination)}
                          </a>
                        </td>
                        <td className="px-3 py-3 text-xs text-primary-foreground/70 max-w-[90px] truncate">{link.creative || "—"}</td>
                        <td className="px-3 py-3 max-w-[180px]">
                          <span className="text-[11px] text-white/50 truncate block" title={link.utm_campaign}>{link.utm_campaign}</span>
                          <button type="button" onClick={() => copyText(url, link.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:text-secondary/80 mt-0.5">
                            <Copy className="w-3 h-3" /> {copiedId === link.id ? "Copied" : "Copy"}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-primary-foreground">{link.views || 0}</td>
                        <td className="px-3 py-3 text-sm font-bold text-primary-foreground">{noms.length}</td>
                        <td className="px-3 py-3 text-[11px] text-white/40 whitespace-nowrap">{formatDateIn(link.last_click_at)}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => onView(noms, `${tokenLabel(link.channel)} · ${tokenLabel(link.state)}`)}
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
          <linearGradient id="digitalNomArea" x1="0" y1="0" x2="0" y2="1">
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
        <path d={area} fill="url(#digitalNomArea)" />
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

export default DigitalMarketingPanel;
