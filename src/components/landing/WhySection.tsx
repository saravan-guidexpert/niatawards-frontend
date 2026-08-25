import { motion, useInView } from "framer-motion";
import { Heart, Users, Lightbulb } from "lucide-react";
import { useRef } from "react";

const reasons = [
  { icon: Heart, title: "Every Teacher Matters", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20",
    desc: "Millions of teachers work tirelessly, yet remain unrecognized. This initiative changes that, giving voice to students who want to say thank you." },
  { icon: Users, title: "Student-Powered Recognition", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20",
    desc: "Students nominate their favourite teachers. No bureaucracy, no committees, just honest gratitude from those who matter most." },
  { icon: Lightbulb, title: "Celebrating Innovation", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20",
    desc: "We honour educators who think differently, using technology, creativity, and compassion to prepare students for a rapidly changing world." },
];

const WhySection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-12 sm:py-16 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary rounded-full blur-[150px]" />
      </div>

      <div className="container relative z-10" ref={ref}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }} className="text-center mb-10">
          <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.1 }}
            className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest bg-secondary/10 border border-secondary/20 px-4 py-1.5 rounded-full mb-5">
            Our Purpose
          </motion.span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8">Why This Exists</h2>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="max-w-3xl mx-auto">
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-white/80 font-medium italic">
              Every student who walked into NxtWave carried something with them: the belief that they were capable of more.
              They did not arrive with that belief on their own. A teacher gave it to them.
              We are here because of that teacher. It is time they knew.
            </p>
          </motion.div>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
          {reasons.map((r, i) => (
            <motion.div key={r.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`group bg-white/[0.03] border ${r.border} rounded-2xl p-7 relative overflow-hidden cursor-default`}>
              {/* Hover glow */}
              <div className={`absolute inset-0 ${r.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <motion.div whileHover={{ scale: 1.15, rotate: 10 }} transition={{ type: "spring", stiffness: 400 }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${r.bg} border ${r.border} flex items-center justify-center mb-5`}>
                  <r.icon className={`w-6 h-6 ${r.color}`} />
                </motion.div>
                <h3 className="font-heading text-lg sm:text-xl font-semibold text-white mb-3">{r.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm sm:text-base">{r.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
