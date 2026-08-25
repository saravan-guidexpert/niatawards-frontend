import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Share2, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const ThankYouPage = () => {
  const navigate = useNavigate();
  const shareText = encodeURIComponent("I just nominated my favourite teacher for NIAT Future-Ready Educator Awards 2026! 🏆 Nominate yours too: ");
  const shareUrl = encodeURIComponent("https://www.niatawards.in");

  return (
    <div className="min-h-screen bg-background flex flex-col" id="main-content" role="main">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12 pt-[56px]">
        <div className="w-full max-w-md text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-secondary" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">Nomination Submitted! 🎉</h1>
            <p className="text-foreground/65 text-base mb-2">Your nomination has been submitted successfully.</p>
            <p className="text-foreground/50 text-sm mb-8">Updates will be sent via WhatsApp to the phone number you provided.</p>

            <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-6">
              <p className="font-heading font-semibold text-foreground mb-4">Help your teacher get recognized! 🙏</p>
              <a href={`https://wa.me/?text=${shareText}${shareUrl}`} target="_blank" rel="noopener noreferrer">
                <button id="btn-thankyou-whatsapp-share" className="w-full h-12 rounded-xl bg-gradient-to-r from-[#9B2020] to-[#7A1515] text-white font-bold flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </button>
              </a>
            </div>

            <button id="btn-thankyou-nominate-another" onClick={() => navigate("/nominate")}
              className="w-full h-12 rounded-xl border border-border/50 text-foreground/65 font-medium flex items-center justify-center gap-2 hover:bg-muted transition-all">
              Nominate Another Teacher <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ThankYouPage;
