import { Trophy, Newspaper, GraduationCap } from "lucide-react";
import { useRef } from "react";
import { useInViewOnce } from "@/hooks/use-in-view";

const prizes = [
  { icon: Trophy, title: "National Trophy & Certificate", desc: "Official recognition from NIAT", color: "text-amber-400", bg: "bg-amber-400/10", value: "🏆" },
  { icon: Newspaper, title: "Media Coverage", desc: "Featured in national education publications", color: "text-blue-400", bg: "bg-blue-400/10", value: "📰" },
  { icon: GraduationCap, title: "Professional Development", desc: "Exclusive workshops and networking", color: "text-purple-400", bg: "bg-purple-400/10", value: "🎓" },
];

const WinnersReceiveSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewOnce(ref, "-80px");
  const vis = inView ? "niat-reveal-on" : "niat-reveal";

  return (
    <section className="py-12 sm:py-16 bg-[#060606]" ref={ref}>
      <div className="container">
        <div className={`text-center mb-10 ${vis}`}>
          <span
            className={`inline-block text-xs font-semibold text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-4 py-1.5 rounded-full mb-5 ${vis}`}
            style={{ animationDelay: inView ? "0.1s" : undefined }}
          >
            Winner Benefits
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white">What Winners Receive</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {prizes.map((p, i) => (
            <div
              key={p.title}
              className={`group niat-prize-lift relative bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 text-center overflow-hidden cursor-default ${vis}`}
              style={{ animationDelay: inView ? `${0.2 + i * 0.1}s` : undefined }}
            >
              <div className={`absolute inset-0 ${p.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="niat-emoji-pop text-4xl mb-4 relative z-10">{p.value}</div>
              <div className="relative z-10">
                <h3 className="font-heading font-semibold text-white mb-2 text-sm sm:text-base">{p.title}</h3>
                <p className={`${p.color} text-xs sm:text-sm font-medium`}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WinnersReceiveSection;
