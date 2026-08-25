import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";

const FinalCTASection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-12 sm:py-16 bg-gradient-dark relative overflow-hidden" ref={ref}>
      {/* Animated glows */}
      <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-[120px] pointer-events-none" />
      <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 8, repeat: Infinity }}
        className="absolute bottom-0 left-0 w-80 h-80 bg-secondary rounded-full blur-[120px] pointer-events-none" />

      {/* Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div key={i}
          className="absolute w-1 h-1 rounded-full bg-secondary/40"
          style={{ left: `${10 + i * 11}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{ y: [-10, -30, -10], opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, delay: i * 0.4, repeat: Infinity }} />
      ))}

      <div className="container relative z-10 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Nominations are open</span>
          </motion.div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 max-w-3xl mx-auto leading-[1.1]">
            Every great teacher deserves to be celebrated
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Nominate a teacher today and help them get the recognition they truly deserve.
          </p>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <button id="btn-cta-nominate"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-br from-primary to-primary/80 text-white font-semibold text-base sm:text-lg px-10 py-5 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow overflow-hidden">
                <span className="relative z-10">Nominate Now</span>
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="relative z-10">
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
                <motion.div animate={{ x: [-100, 300] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                  className="absolute inset-0 w-24 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12" />
              </button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.8 }}
            className="text-white/30 text-xs mt-6">Free · Takes 3 minutes · Open to all Indian students</motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
