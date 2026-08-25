import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Calendar, CheckCircle, Clock, Trophy } from "lucide-react";

const timeline = [
  { icon: Calendar, title: "Nominations Open", date: "March 15, 2026", status: "active", desc: "Submit your nominations for deserving teachers." },
  { icon: Clock, title: "Shortlist Announcement", date: "May 1, 2026", status: "upcoming", desc: "Top nominees from each category will be announced." },
  { icon: CheckCircle, title: "People's Choice Voting", date: "May 1–31, 2026", status: "upcoming", desc: "Public voting opens for shortlisted teachers." },
  { icon: Trophy, title: "Winners Announced", date: "June 1st Week, 2026", status: "upcoming", desc: "National ceremony with award presentations." },
];

const AnnouncementsPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Announcements & Timeline
          </h1>
          <p className="text-muted-foreground text-lg">Stay updated with the awards journey</p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          {timeline.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="relative pl-16 pb-10 last:pb-0"
            >
              <div className={`absolute left-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                t.status === "active" ? "bg-gradient-accent animate-pulse-glow" : "bg-muted"
              }`}>
                <t.icon className={`w-5 h-5 ${t.status === "active" ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </div>
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-semibold text-foreground">{t.title}</h3>
                  {t.status === "active" && (
                    <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-secondary font-medium mb-1">{t.date}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default AnnouncementsPage;
