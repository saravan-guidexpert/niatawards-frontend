import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Share2, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { trackThankYouPixel } from "@/lib/thirdPartyTracking";

const SITE_URL = "https://www.niatawards.in";

const ThankYouPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isTeacher = params.get("type") === "teacher";

  useEffect(() => {
    trackThankYouPixel();
  }, []);

  const caption = isTeacher
    ? `I just nominated myself for NIAT Guru Ratna Awards 2026! Nominate yours too: ${SITE_URL}`
    : `I just nominated my favourite teacher for NIAT Guru Ratna Awards 2026! Nominate yours too: ${SITE_URL}`;

  // A plain anchor keeps the navigation inside the click gesture. Opening WhatsApp
  // after an await loses that gesture and browsers block it as a popup.
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(caption)}`;

  return (
    <div className="min-h-screen bg-background flex flex-col" id="main-content" role="main">
      <noscript>
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=618460890635684&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12 pt-[56px]">
        <div className="w-full max-w-md text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-secondary" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {isTeacher ? "Nomination Submitted! 🎉" : "🎉 Congratulations!"}
            </h1>
            <p className="text-foreground/65 text-base mb-2">Your nomination has been submitted successfully.</p>
            <p className="text-foreground/50 text-sm mb-8">
              {isTeacher
                ? "Updates will be sent via WhatsApp to the phone number you provided."
                : "🏆 Results will be announced on September 5th, on the occasion of Teachers’ Day."}
            </p>

            <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-6">
              <p className="font-heading font-semibold text-foreground mb-1">
                {isTeacher ? "Help more teachers get recognized! 🙏" : "Help your teacher get more recognition! 🙏"}
              </p>
              <p className="text-foreground/55 text-sm mb-4">Share with your friends and spread the word.</p>
              {!isTeacher && (
                <img
                  src="/share-poster-480.jpg"
                  width={480}
                  height={600}
                  alt="NIAT Guru Ratna Awards poster"
                  className="w-full max-w-[240px] mx-auto mb-4 rounded-xl border border-border/50"
                  decoding="async"
                />
              )}
              <a
                id="btn-thankyou-whatsapp-share"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#9B2020] to-[#7A1515] text-white font-bold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </a>
            </div>

            <button id="btn-thankyou-nominate-another" onClick={() => navigate(isTeacher ? "/nominate-teacher" : "/nominate-student")}
              className="w-full h-12 rounded-xl border border-border/50 text-foreground/65 font-medium flex items-center justify-center gap-2 hover:bg-muted transition-all">
              {isTeacher ? "Submit Another Nomination" : "Nominate Another Teacher"} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ThankYouPage;
