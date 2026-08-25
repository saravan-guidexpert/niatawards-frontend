import { motion, useInView } from "framer-motion";
import { Trophy, Newspaper, Award, GraduationCap } from "lucide-react";
import { useRef } from "react";

const prizes = [
  { icon: Trophy, title: "National Trophy & Certificate", desc: "Official recognition from NIAT", color: "text-amber-400", bg: "bg-amber-400/10", value: "🏆" },
  { icon: Newspaper, title: "Media Coverage", desc: "Featured in national education publications", color: "text-blue-400", bg: "bg-blue-400/10", value: "📰" },
  { icon: Award, title: "₹50,000 Cash Prize", desc: "Monetary award for personal development", color: "text-emerald-400", bg: "bg-emerald-400/10", value: "💰" },
  { icon: GraduationCap, title: "Professional Development", desc: "Exclusive workshops and networking", color: "text-purple-400", bg: "bg-purple-400/10", value: "🎓" },
];

const WinnersReceiveSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-12 sm:py-16 bg-[#060606]" id="prizes" ref={ref}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10">
          <motion.span initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.1 }}
            className="inline-block text-xs font-semibold text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-4 py-1.5 rounded-full mb-5">
            Winner Benefits
          </motion.span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white">What Winners Receive</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {prizes.map((p, i) => (
            <motion.div key={p.title}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 150 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 text-center overflow-hidden cursor-default">
              <div className={`absolute inset-0 ${p.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <motion.div whileHover={{ scale: 1.3, rotate: 15 }} transition={{ type: "spring", stiffness: 300 }}
                className="text-4xl mb-4 relative z-10">{p.value}
              </motion.div>
              <div className="relative z-10">
                <h3 className="font-heading font-semibold text-white mb-2 text-sm sm:text-base">{p.title}</h3>
                <p className={`${p.color} text-xs sm:text-sm font-medium`}>{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WinnersReceiveSection;
