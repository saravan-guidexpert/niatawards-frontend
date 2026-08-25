import { motion, useInView } from "framer-motion";
import { Star, Lightbulb, Globe, Rocket } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { icon: Star, title: "Student Transformation Award", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", glow: "shadow-amber-400/20",
    desc: "For teachers who have truly changed the trajectory of a student's life through mentorship and care." },
  { icon: Lightbulb, title: "Teaching Innovation Award", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", glow: "shadow-blue-400/20",
    desc: "For educators who bring creativity, technology, and fresh methods into the classroom." },
  { icon: Globe, title: "Beyond Classroom Impact Award", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", glow: "shadow-emerald-400/20",
    desc: "For those who go beyond syllabus, community work, life skills, emotional support." },
  { icon: Rocket, title: "Future Readiness Award", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", glow: "shadow-purple-400/20",
    desc: "For teachers preparing students for careers of tomorrow with practical, future-focused education." },
];

const CategoryCard = ({ cat, i, inView, onSelect }: any) => {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onSelect(cat.title)}
      className={`group relative bg-white/[0.03] border ${cat.border} rounded-2xl p-7 cursor-pointer overflow-hidden transition-shadow duration-300 ${hovered ? `shadow-2xl ${cat.glow}` : ""}`}
    >
      {/* Animated bg on hover */}
      <motion.div animate={{ opacity: hovered ? 1 : 0 }} className={`absolute inset-0 ${cat.bg}`} />
      {/* Top accent line */}
      <motion.div animate={{ scaleX: hovered ? 1 : 0 }} style={{ originX: 0 }}
        transition={{ duration: 0.3 }}
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${cat.color.replace("text-", "from-")} to-transparent`} />

      <div className="relative z-10">
        <motion.div animate={{ scale: hovered ? 1.2 : 1, rotate: hovered ? 10 : 0 }} transition={{ type: "spring", stiffness: 300 }}
          className={`w-14 h-14 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center mb-5`}>
          <cat.icon className={`w-7 h-7 ${cat.color}`} />
        </motion.div>
        <h3 className="font-heading text-lg sm:text-xl font-semibold text-white mb-3">{cat.title}</h3>
        <p className="text-white/60 leading-relaxed text-sm sm:text-base mb-5">{cat.desc}</p>
        <motion.div animate={{ x: hovered ? 4 : 0 }} className={`flex items-center gap-2 text-xs font-semibold ${cat.color}`}>
          Nominate for this category
          <motion.span animate={{ x: hovered ? 4 : 0 }}>→</motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
};

const CategoriesSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSelect = (cat: string) => {
    if (isAuthenticated) navigate(`/nominate?category=${encodeURIComponent(cat)}`);
    else navigate("/nominate");
  };

  return (
    <section className="py-12 sm:py-16 bg-[#060606]" id="categories" ref={ref}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10">
          <motion.span initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.1 }}
            className="inline-block text-xs font-semibold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-5">
            Award Categories
          </motion.span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Four Ways to Honour Excellence</h2>
          <p className="text-white/55 max-w-xl mx-auto text-base sm:text-lg">Click a category to nominate your teacher for that award</p>
        </motion.div>

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
