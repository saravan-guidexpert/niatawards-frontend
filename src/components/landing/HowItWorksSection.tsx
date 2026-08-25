import { motion, useInView } from "framer-motion";
import { FileText, Search, Vote, Trophy } from "lucide-react";
import { useRef } from "react";

const steps = [
  { icon: FileText, title: "Nominate", desc: "Students or teachers submit nominations with stories of impact.", color: "text-secondary", bg: "bg-secondary/10", num: "01" },
  { icon: Search, title: "Review & Shortlist", desc: "Expert panel reviews nominations for authenticity and impact.", color: "text-blue-400", bg: "bg-blue-400/10", num: "02" },
  { icon: Vote, title: "People's Choice", desc: "Public voting to support shortlisted teachers.", color: "text-purple-400", bg: "bg-purple-400/10", num: "03" },
  { icon: Trophy, title: "Winners Announced", desc: "National recognition ceremony with awards and media coverage.", color: "text-amber-400", bg: "bg-amber-400/10", num: "04" },
];

const HowItWorksSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-12 sm:py-16 bg-[#0a0a0a]" id="how-it-works" ref={ref}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10">
          <motion.span initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.1 }}
            className="inline-block text-xs font-semibold text-blue-400 uppercase tracking-widest bg-blue-400/10 border border-blue-400/20 px-4 py-1.5 rounded-full mb-5">
            How It Works
          </motion.span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">How Selection Works</h2>
          <p className="text-white/55 max-w-xl mx-auto text-base sm:text-lg">A transparent, multi-stage process ensuring only the most deserving educators are recognized.</p>
        </motion.div>

        {/* Desktop: horizontal connected steps */}
        <div className="hidden md:grid grid-cols-4 gap-4 relative">
          {/* Connector line */}
          <motion.div initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
            transition={{ delay: 0.5, duration: 1.2, ease: "easeInOut" }}
            style={{ originX: 0 }}
            className="absolute top-10 left-[12.5%] right-[12.5%] h-[1px] bg-gradient-to-r from-secondary/50 via-blue-400/30 to-amber-400/50" />

          {steps.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
              whileHover={{ y: -6 }}
              className="text-center relative group">
              <div className="relative inline-block mb-6">
                <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}
                  className={`w-20 h-20 rounded-2xl ${s.bg} border border-white/10 flex items-center justify-center mx-auto relative z-10`}>
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                </motion.div>
                <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0a0a0a] border-2 border-white/10 flex items-center justify-center z-20`}>
                  <span className={`text-xs font-bold ${s.color}`}>{i + 1}</span>
                </div>
              </div>
              <h3 className="font-heading text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Mobile: vertical steps */}
        <div className="md:hidden space-y-4">
          {steps.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.12 }}
              className="flex gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                  <span className={`text-[10px] font-bold ${s.color}`}>{i + 1}</span>
                </div>
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
