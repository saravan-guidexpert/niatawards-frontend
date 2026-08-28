import { Star, Lightbulb, Globe, Rocket } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInViewOnce } from "@/hooks/use-in-view";

const categories = [
  { icon: Star, title: "Student Transformation Award", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", hoverGlow: "hover:shadow-2xl hover:shadow-amber-400/20",
    desc: "For teachers who have truly changed the trajectory of a student's life through mentorship and care." },
  { icon: Lightbulb, title: "Teaching Innovation Award", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", hoverGlow: "hover:shadow-2xl hover:shadow-blue-400/20",
    desc: "For educators who bring creativity, technology, and fresh methods into the classroom." },
  { icon: Globe, title: "Beyond Classroom Impact Award", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", hoverGlow: "hover:shadow-2xl hover:shadow-emerald-400/20",
    desc: "For those who go beyond syllabus, community work, life skills, emotional support." },
  { icon: Rocket, title: "Future Readiness Award", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", hoverGlow: "hover:shadow-2xl hover:shadow-purple-400/20",
    desc: "For teachers preparing students for careers of tomorrow with practical, future-focused education." },
];

const CategoryCard = ({ cat, i, inView, onSelect }: any) => (
  <div
    onClick={() => onSelect(cat.title)}
    className={`group niat-prize-lift relative bg-white/[0.03] border ${cat.border} rounded-2xl p-7 cursor-pointer overflow-hidden transition-shadow duration-300 ${cat.hoverGlow} ${inView ? "niat-reveal-on" : "niat-reveal"}`}
    style={{ animationDelay: inView ? `${i * 0.12}s` : undefined }}
  >
    <div className={`niat-cat-bg absolute inset-0 ${cat.bg}`} />
    <div className={`niat-cat-accent absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${cat.color.replace("text-", "from-")} to-transparent`} />

    <div className="relative z-10">
      <div className={`niat-icon-pop w-14 h-14 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center mb-5`}>
        <cat.icon className={`w-7 h-7 ${cat.color}`} />
      </div>
      <h3 className="font-heading text-lg sm:text-xl font-semibold text-white mb-3">{cat.title}</h3>
      <p className="text-white/60 leading-relaxed text-sm sm:text-base mb-5">{cat.desc}</p>
      <div className={`niat-cat-arrow flex items-center gap-2 text-xs font-semibold ${cat.color}`}>
        Nominate for this category
        <span>→</span>
      </div>
    </div>
  </div>
);

const CategoriesSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewOnce(ref, "-80px");
  const vis = inView ? "niat-reveal-on" : "niat-reveal";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSelect = (cat: string) => {
    if (isAuthenticated) navigate(`/nominate?category=${encodeURIComponent(cat)}`);
    else navigate("/nominate");
  };

  return (
    <section className="py-12 sm:py-16 bg-[#060606]" id="categories" ref={ref}>
      <div className="container">
        <div className={`text-center mb-10 ${vis}`}>
          <span
            className={`inline-block text-xs font-semibold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-5 ${vis}`}
            style={{ animationDelay: inView ? "0.1s" : undefined }}
          >
            Award Categories
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Four Ways to Honour Excellence</h2>
          <p className="text-white/55 max-w-xl mx-auto text-base sm:text-lg">Click a category to nominate your teacher for that award</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.title} cat={cat} i={i} inView={inView} onSelect={handleSelect} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
