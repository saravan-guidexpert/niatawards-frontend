import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useInViewOnce } from "@/hooks/use-in-view";

const CTA_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: `${10 + i * 11}%`,
  top: `${20 + (i % 3) * 25}%`,
  delay: `${i * 0.4}s`,
}));

const FinalCTASection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewOnce(ref, "-80px");
  const vis = inView ? "niat-reveal-on" : "niat-reveal";

  return (
    <section className="py-12 sm:py-16 bg-gradient-dark relative overflow-hidden" ref={ref}>
      <div className="niat-cta-orb-a absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-[120px] pointer-events-none" />
      <div className="niat-cta-orb-b absolute bottom-0 left-0 w-80 h-80 bg-secondary rounded-full blur-[120px] pointer-events-none" />

      {CTA_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="niat-cta-particle absolute w-1 h-1 rounded-full bg-secondary/40"
          style={{ left: p.left, top: p.top, ["--niat-delay" as string]: p.delay }}
        />
      ))}

      <div className="container relative z-10 text-center">
        <div className={vis}>
          <div
            className={`inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 mb-8 ${vis}`}
            style={{ animationDelay: inView ? "0.2s" : undefined }}
          >
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Nominations are open</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 max-w-3xl mx-auto leading-[1.1]">
            Every G.O.A.T teacher deserves to be celebrated
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Nominate a teacher today and help them get the recognition they truly deserve.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              id="btn-cta-nominate"
              to="/nominate-student"
              className="niat-cta-press group relative inline-flex items-center gap-3 bg-gradient-to-br from-primary to-primary/80 text-white font-semibold text-base sm:text-lg px-10 py-5 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow overflow-hidden"
            >
              <span className="relative z-10">Nominate Now</span>
              <span className="niat-arrow-nudge relative z-10">
                <ArrowRight className="w-5 h-5" />
              </span>
              <div className="niat-cta-shine absolute inset-0 w-24 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-5">
            Are you a teacher? <Link to="/nominate-teacher" className="text-secondary hover:text-secondary/80 font-medium">Nominate yourself</Link>
          </p>

          <p
            className={`text-white/30 text-xs mt-6 ${vis}`}
            style={{ animationDelay: inView ? "0.8s" : undefined }}
          >
            Free · Takes 3 minutes · Open to all Indian students
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
