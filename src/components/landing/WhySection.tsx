import { Heart, Users, Lightbulb } from "lucide-react";
import { useRef } from "react";
import { useInViewOnce } from "@/hooks/use-in-view";

const reasons = [
  { icon: Heart, title: "Every Teacher Matters", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20",
    desc: "Millions of teachers work tirelessly, yet remain unrecognized. This initiative changes that, giving voice to students who want to say thank you." },
  { icon: Users, title: "Student-Powered Recognition", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20",
    desc: "Students nominate their favourite teachers. No bureaucracy, no committees, just honest gratitude from those who matter most." },
  { icon: Lightbulb, title: "Celebrating Innovation", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20",
    desc: "We honour educators who think differently, using technology, creativity, and compassion to prepare students for a rapidly changing world." },
];

const WhySection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(ref, "-100px");
  const vis = inView ? "niat-reveal-on" : "niat-reveal";

  return (
    <section className="py-12 sm:py-16 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="niat-why-orb absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-secondary rounded-full blur-[150px]" />
      </div>

      <div className="container relative z-10" ref={ref}>
        <div className={`text-center mb-10 ${vis}`}>
          <span
            className={`inline-block text-xs font-semibold text-secondary uppercase tracking-widest bg-secondary/10 border border-secondary/20 px-4 py-1.5 rounded-full mb-5 ${vis}`}
            style={{ animationDelay: inView ? "0.1s" : undefined }}
          >
            Our Purpose
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8">Why This Exists</h2>
          <div
            className={`max-w-3xl mx-auto ${vis}`}
            style={{ animationDelay: inView ? "0.3s" : undefined }}
          >
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-white/80 font-medium italic">
              Every student who walked into NxtWave carried something with them: the belief that they were capable of more.
              They did not arrive with that belief on their own. A teacher gave it to them.
              We are here because of that teacher. It is time they knew.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`group niat-card-lift bg-white/[0.03] border ${r.border} rounded-2xl p-7 relative overflow-hidden cursor-default ${vis}`}
              style={{ animationDelay: inView ? `${0.4 + i * 0.15}s` : undefined }}
            >
              <div className={`absolute inset-0 ${r.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className={`niat-icon-pop w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${r.bg} border ${r.border} flex items-center justify-center mb-5`}>
                  <r.icon className={`w-6 h-6 ${r.color}`} />
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-semibold text-white mb-3">{r.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm sm:text-base">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
