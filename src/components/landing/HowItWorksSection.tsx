import { FileText, Search, Trophy } from "lucide-react";
import { useRef } from "react";
import { useInViewOnce } from "@/hooks/use-in-view";

const steps = [
  {
    icon: FileText,
    label: "Nomination",
    title: "Submit a Nomination",
    desc: "Students and teachers share the story of a teacher whose work made a lasting difference.",
  },
  {
    icon: Search,
    label: "Evaluation",
    title: "Independent Review",
    desc: "A panel assesses each nomination for authenticity, depth of impact, and supporting evidence.",
  },
  {
    icon: Trophy,
    label: "Recognition",
    title: "Winners Announced",
    desc: "Selected teachers are honoured at a national ceremony, with awards and media coverage.",
  },
];

const HowItWorksSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewOnce(ref, "-80px");
  const vis = inView ? "niat-reveal-on" : "niat-reveal";
  const visLeft = inView ? "niat-reveal-left-on" : "niat-reveal-left";

  return (
    <section className="py-16 sm:py-24 bg-[#0a0a0a]" ref={ref}>
      <div className="container">
        <div className={`text-center mb-12 sm:mb-16 ${vis}`}>
          <span className="inline-block text-[11px] font-semibold text-secondary uppercase tracking-[0.22em] bg-secondary/10 border border-secondary/20 px-4 py-1.5 rounded-full mb-5">
            Selection Process
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            How Teachers Are Selected
          </h2>
          <p className="text-white/55 max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
            A measured, transparent process — so recognition reaches teachers whose impact is genuine and lasting.
          </p>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <article
              key={s.title}
              className={`group relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 overflow-hidden hover:border-secondary/25 hover:bg-white/[0.04] transition-colors duration-300 ${vis}`}
              style={{ animationDelay: inView ? `${0.15 + i * 0.12}s` : undefined }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent opacity-70" />
              <span
                aria-hidden
                className="pointer-events-none absolute top-5 right-6 font-heading text-6xl font-bold text-white/[0.045] select-none leading-none"
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-secondary mb-6">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </p>
                <div className="w-11 h-11 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-6">
                  <s.icon className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-white mb-3">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="md:hidden relative pl-8">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-secondary/50 via-white/10 to-secondary/40" />
          <div className="space-y-4">
            {steps.map((s, i) => (
              <article
                key={s.title}
                className={`relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 ${visLeft}`}
                style={{ animationDelay: inView ? `${0.12 + i * 0.1}s` : undefined }}
              >
                <div className="absolute -left-8 top-6 w-[23px] h-[23px] rounded-full bg-[#0a0a0a] border border-secondary/40 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-secondary mb-2">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </p>
                <h3 className="font-heading text-base font-semibold text-white mb-1.5">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
