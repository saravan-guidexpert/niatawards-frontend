import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, CheckCircle2, ClipboardList, Filter, Image as ImageIcon, Loader2,
  Phone, ShieldCheck, Trophy, Users,
} from "lucide-react";
import { adminGetFunnel, type FunnelStage, type FunnelStats } from "@/lib/apiAdmin";

const STAGE_ICONS = {
  otp_requested: Phone,
  otp_verified: ShieldCheck,
  form_step1: ClipboardList,
  submitted: Users,
  shortlisted: CheckCircle2,
  winners: Trophy,
} as const;

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

const FunnelAnalytics = ({
  dateKey,
  onStageClick,
}: {
  dateKey?: string;
  onStageClick?: (stageId: FunnelStage["id"]) => void;
}) => {
  const [data, setData] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGetFunnel(dateKey)
      .then((stats) => {
        if (!cancelled) setData(stats);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dateKey]);

  const stages = data?.stages ?? [];
  const extras = data?.extras;
  const maxCount = stages[0]?.count || 1;

  const conversions = useMemo(() => {
    if (stages.length < 2) return [];
    const cards = [];
    for (let i = 1; i < stages.length; i += 1) {
      const from = stages[i - 1];
      const to = stages[i];
      cards.push({
        id: `${from.id}-${to.id}`,
        title: `${to.label} rate`,
        ratio: `${to.label} / ${from.label}`,
        value: pct(to.count, from.count),
      });
    }
    return cards;
  }, [stages]);

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 py-16 flex items-center justify-center mb-6">
        <Loader2 className="w-5 h-5 text-secondary animate-spin" />
        <span className="ml-2 text-sm text-primary-foreground/50">Loading funnel…</span>
      </div>
    );
  }

  if (!data || stages.length === 0) return null;

  return (
    <div className="space-y-5 mb-6 sm:mb-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2">
            <Filter className="w-4 h-4 text-secondary" />
            Nomination funnel
          </h2>
          <p className="text-xs text-primary-foreground/40 mt-0.5">
            {dateKey ? `Journey for ${dateKey} (IST)` : "OTP → details → submit → shortlist → winner"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {stages.map((stage, i) => {
          const Icon = STAGE_ICONS[stage.id];
          const prev = i === 0 ? stage.count : stages[i - 1].count;
          const rate = i === 0 ? 100 : pct(stage.count, prev);
          return (
            <motion.button
              key={stage.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onStageClick?.(stage.id)}
              className="text-left rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-3 sm:p-4 hover:border-secondary/30 hover:bg-primary-foreground/[0.07] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-[10px] font-semibold text-secondary/90 bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded-full">
                  {i === 0 ? "Base" : `${rate}%`}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-white leading-none">{stage.count.toLocaleString("en-IN")}</div>
              <p className="text-xs font-semibold text-primary-foreground/80 mt-2">{stage.label}</p>
              <p className="text-[10px] text-primary-foreground/40 mt-0.5">
                {i === 0 ? "Starting stage · 100%" : `${rate}% from previous`}
              </p>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="font-heading text-sm sm:text-base font-bold text-primary-foreground">Funnel visualization</h3>
            <p className="text-[11px] text-primary-foreground/40 mt-0.5">Advanced vs dropped at each step. Bar width = people at that stage.</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-primary-foreground/45">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-secondary" /> Advanced</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white/15" /> Dropped</span>
          </div>
        </div>
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const next = stages[i + 1];
            const dropped = next ? Math.max(0, stage.count - next.count) : 0;
            const widthPct = Math.max(8, Math.round((stage.count / maxCount) * 100));
            const advancedPct = stage.count > 0 && next ? Math.round((next.count / stage.count) * 100) : 100;
            return (
              <div key={stage.id} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] sm:grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-2 sm:gap-3">
                <p className="text-[11px] sm:text-xs text-primary-foreground/65 truncate">{stage.label}</p>
                <div className="h-8 sm:h-9 rounded-md bg-white/[0.04] overflow-hidden">
                  <div className="h-full flex" style={{ width: `${widthPct}%` }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${next ? advancedPct : 100}%` }}
                      transition={{ duration: 0.7, delay: 0.1 + i * 0.06 }}
                      className="h-full bg-gradient-to-r from-[#8B1A1A] to-secondary"
                    />
                    {next && dropped > 0 && (
                      <div className="h-full bg-white/10 flex-1" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-primary-foreground/80 tabular-nums whitespace-nowrap">
                  {stage.count.toLocaleString("en-IN")}
                  {next ? <span className="text-primary-foreground/35 font-normal"> · {dropped} drop</span> : null}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-secondary" />
          <div>
            <h3 className="font-heading text-sm sm:text-base font-bold text-primary-foreground">Conversion analytics</h3>
            <p className="text-[11px] text-primary-foreground/40">Stage-to-stage rates across the nomination journey.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {conversions.slice(0, 4).map((card) => (
            <div key={card.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/45">{card.title}</p>
              <p className="text-3xl font-heading font-bold text-white mt-2">{card.value}%</p>
              <p className="text-[11px] text-primary-foreground/40 mt-1">{card.ratio}</p>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, card.value)}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary/70"
                />
              </div>
            </div>
          ))}
        </div>
        {extras && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            {[
              { label: "Photo attached", value: extras.withPhoto, hint: extras.submitted ? `${pct(extras.withPhoto, extras.submitted)}% of submissions` : "—", icon: ImageIcon },
              { label: "Pending review", value: extras.pending, hint: "Awaiting admin action", icon: ClipboardList },
              { label: "Student nominations", value: extras.students, hint: "Student / parent forms", icon: Users },
              { label: "Teacher self-noms", value: extras.teachers, hint: "Teacher forms", icon: Users },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <item.icon className="w-4 h-4 text-secondary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-none">{item.value.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-primary-foreground/45 mt-1 truncate">{item.label} · {item.hint}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FunnelAnalytics;
