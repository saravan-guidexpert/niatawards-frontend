import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ThumbsUp, Share2, Star, Loader2, Trophy, Users, Award, Filter, ChevronDown, CheckCircle2, TrendingUp, BarChart2, Copy } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ApiError, createVote, getNominations, getVotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import LoginDialog from "@/components/auth/LoginDialog";

const CATEGORIES = ["All", "Student Transformation Award", "Teaching Innovation Award", "Beyond Classroom Impact Award", "Future Readiness Award"];

const catStyle: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  "Student Transformation Award":  { bg: "bg-amber-400/10",   text: "text-amber-400",   border: "border-amber-400/30",   bar: "bg-amber-400" },
  "Teaching Innovation Award":     { bg: "bg-blue-400/10",    text: "text-blue-400",    border: "border-blue-400/30",    bar: "bg-blue-400" },
  "Beyond Classroom Impact Award": { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30", bar: "bg-emerald-400" },
  "Future Readiness Award":        { bg: "bg-purple-400/10",  text: "text-purple-400",  border: "border-purple-400/30",  bar: "bg-purple-400" },
};

// Generate a unique voter ID — short alphanumeric, easy to read
const generateVoterId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "NIAT-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// Voter confirmation modal
const VoteConfirmModal = ({ voterId, teacherName, onClose }: { voterId: string; teacherName: string; onClose: () => void }) => {
  const { toast } = useToast();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#141414] border border-white/15 rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-secondary" />
        </div>
        <h2 className="font-heading text-xl font-bold text-white mb-1">Vote Recorded! 🎉</h2>
        <p className="text-white/55 text-sm mb-5">You voted for <span className="text-white font-semibold">{teacherName}</span></p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Your Voter ID</p>
          <p className="font-mono font-bold text-lg text-secondary tracking-widest">{voterId}</p>
          <p className="text-[11px] text-white/30 mt-1">Save this as proof of your vote</p>
        </div>

        <div className="flex gap-2">
          <button id="btn-vote-copy-id" onClick={() => {
            navigator.clipboard.writeText(voterId);
            toast({ title: "Voter ID copied!" });
          }} className="flex-1 h-10 rounded-xl border border-white/15 text-white/60 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5 transition-all">
            <Copy className="w-3.5 h-3.5" /> Copy ID
          </button>
          <button id="btn-vote-confirm-done" onClick={onClose} className="flex-1 h-10 rounded-xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg,#9B2020,#7A1515)" }}>
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const VotePage = () => {
  const [nominations, setNominations] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<"votes" | "recent">("votes");
  const [confirmModal, setConfirmModal] = useState<{ voterId: string; teacherName: string } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<{ nominationId: string; teacherName: string } | null>(null);
  // Track if this user has voted for ANY teacher (one-vote-per-user)
  const [hasVotedAnywhere, setHasVotedAnywhere] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      const noms = await getNominations("shortlisted,winner");
      setLoadError(false);
      setNominations(noms);

      const votes = await getVotes();
      const counts: Record<string, number> = {};
      votes.forEach(v => { counts[v.nomination_id] = (counts[v.nomination_id] || 0) + 1; });
      setVoteCounts(counts);

      if (user?.phone) {
        const userVotes = await getVotes(user.phone);
        setMyVotes(new Set(userVotes.map(v => v.nomination_id)));
        setHasVotedAnywhere(userVotes.length > 0);
      }
    } catch {
      setLoadError(true);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user?.phone]);

  // Auto-refresh every 30s so newly shortlisted teachers appear without manual reload
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user?.phone]);

  const castVote = async (nominationId: string, teacherName: string) => {
    if (!user?.phone) return;

    // ONE VOTE PER USER — check if already voted anywhere
    if (hasVotedAnywhere || myVotes.size > 0) {
      toast({
        title: "You have already voted.",
        description: "Only one vote is allowed per person across all teachers.",
        variant: "destructive",
      });
      return;
    }

    setVoting(nominationId);
    const voterId = generateVoterId();

    try {
      await createVote(nominationId, user.phone);
    } catch (err) {
      setVoting(null);
      if (err instanceof ApiError && err.code === "23505") {
        setHasVotedAnywhere(true);
        setMyVotes(prev => new Set([...prev, nominationId]));
        toast({ title: "You have already voted.", description: "Only one vote is allowed per person.", variant: "destructive" });
      } else {
        toast({ title: "Vote failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
      }
      return;
    }
    setVoting(null);

    // Success
    setHasVotedAnywhere(true);
    setMyVotes(prev => new Set([...prev, nominationId]));
    setVoteCounts(prev => ({ ...prev, [nominationId]: (prev[nominationId] || 0) + 1 }));
    setConfirmModal({ voterId, teacherName });
  };

  const handleVote = (nominationId: string, teacherName: string) => {
    // Not logged in → open login modal, remember which teacher they wanted to vote for
    if (!isAuthenticated || !user?.phone) {
      setPendingVote({ nominationId, teacherName });
      setLoginOpen(true);
      return;
    }
    castVote(nominationId, teacherName);
  };

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...Object.values(voteCounts), 1);

  const filtered = nominations
    .filter(n => {
      const name = (n.teacher_name || n.full_name || "").toLowerCase();
      const school = (n.school_name || "").toLowerCase();
      return (name.includes(search.toLowerCase()) || school.includes(search.toLowerCase())) &&
             (category === "All" || n.award_category === category);
    })
    .sort((a, b) => sortBy === "votes"
      ? (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const ranked = [...nominations].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));
  const rankMap: Record<string, number> = {};
  ranked.forEach((n, i) => { rankMap[n.id] = i + 1; });

  return (
    <div className="min-h-screen bg-gradient-dark" id="main-content" role="main">
      <Navbar />

      {/* Login modal — opens when unauthenticated user clicks Vote */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={(open) => { setLoginOpen(open); if (!open) setPendingVote(null); }}
        voteMode={true}
        pendingVote={pendingVote}
        onVoteAfterLogin={(nominationId, teacherName) => {
          setPendingVote(null);
          castVote(nominationId, teacherName);
        }}
      />

      {confirmModal && (
        <VoteConfirmModal
          voterId={confirmModal.voterId}
          teacherName={confirmModal.teacherName}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Hero */}
      <div className="pt-[56px] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 7, repeat: Infinity }}
            className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary rounded-full blur-[150px]" />
          <motion.div animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 9, repeat: Infinity }}
            className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-secondary rounded-full blur-[130px]" />
        </div>
        <div className="container relative z-10 px-4 pt-12 pb-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-1.5 text-xs font-semibold text-secondary uppercase tracking-widest mb-5">
              <Star className="w-3 h-3 fill-secondary" /> People's Choice Voting · May 1–31
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Vote for Your Favourite Teacher
            </h1>
            <p className="text-white/55 text-base sm:text-lg max-w-xl mx-auto mb-10">
              Every vote is recorded and counts toward the People's Choice Award. One vote per person.
            </p>
            <div className="flex items-center justify-center gap-8 sm:gap-16">
              {[
                { icon: Users, label: "Shortlisted", value: nominations.length },
                { icon: ThumbsUp, label: "Total Votes", value: totalVotes },
                { icon: Trophy, label: "Winners", value: nominations.filter(n => n.status === "winner").length },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white font-heading">{s.value}</div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sticky bar */}
      <div className="sticky top-[56px] z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="container px-4 py-3 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher or school..."
              className="w-full pl-10 pr-4 h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/20 transition-all" />
          </div>
          <button onClick={() => fetchData()} title="Refresh"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          </button>
          <button id="btn-vote-sort-toggle" onClick={() => setSortBy(s => s === "votes" ? "recent" : "votes")}
            className={`flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 ${
              sortBy === "votes" ? "bg-secondary/15 border-secondary/30 text-secondary" : "bg-white/5 border-white/10 text-white/50 hover:text-white"
            }`}>
            {sortBy === "votes" ? <BarChart2 className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{sortBy === "votes" ? "By Votes" : "Recent"}</span>
          </button>
          <div className="relative flex-shrink-0" ref={filterRef}>
            <button id="btn-vote-filter-toggle" onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:text-white transition-all">
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[100px] truncate">{category === "All" ? "Category" : category.replace(" Award", "")}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilter ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showFilter && (
                <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-64 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setCategory(c); setShowFilter(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/[0.04] last:border-0 ${
                        category === c ? "text-secondary bg-secondary/5 font-semibold" : "text-white/55 hover:text-white hover:bg-white/5"
                      }`}>
                      {c === "All" ? "All Categories" : c}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>


      </div>

      {/* Cards */}
      <div className="container px-4 py-8 sm:py-10">
        {loadError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-24 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-2">
              <Users className="w-8 h-8 text-red-400/60" />
            </div>
            <p className="text-white font-semibold text-lg">Failed to load</p>
            <p className="text-white/35 text-sm max-w-xs">Could not fetch shortlisted teachers. Please check your connection and try again.</p>
            <button onClick={fetchData} className="mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/15 hover:bg-white/5 transition-all">
              ↺ Retry
            </button>
          </motion.div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-secondary animate-spin" />
            <p className="text-white/40 text-sm">Loading shortlisted teachers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-24 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
              <Users className="w-8 h-8 text-white/20" />
            </div>
            {nominations.length === 0 ? (
              <>
                <p className="text-white font-semibold text-lg">No shortlisted teachers yet</p>
                <p className="text-white/40 text-sm max-w-sm leading-relaxed">
                  Nominations are being reviewed by the panel. Teachers will appear here once they are shortlisted by the admin.
                </p>
                <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary/10 border border-secondary/20">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span className="text-xs text-secondary font-semibold">Review in progress — check back soon</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-white font-semibold text-lg">No results found</p>
                <p className="text-white/35 text-sm">Try adjusting your search or filter.</p>
              </>
            )}
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/40 text-sm">
                <span className="text-white font-semibold">{filtered.length}</span> teacher{filtered.length !== 1 ? "s" : ""}
                {category !== "All" && <span className="text-secondary"> · {category.replace(" Award", "")}</span>}
              </p>
              {!isAuthenticated && <p className="text-xs text-white/30 italic">Login to cast your vote</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((n, i) => {
                const voteCount = voteCounts[n.id] || 0;
                const votePercent = maxVotes > 0 ? Math.round((voteCount / maxVotes) * 100) : 0;
                const hasVotedThis = myVotes.has(n.id);
                const rank = rankMap[n.id];
                const name = n.teacher_name || n.full_name || "—";
                const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const colors = catStyle[n.award_category] || { bg: "bg-white/5", text: "text-white/60", border: "border-white/10", bar: "bg-white/40" };

                return (
                  <motion.div key={n.id}
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`relative rounded-2xl border overflow-hidden bg-white/[0.03] transition-all duration-300 ${
                      hasVotedThis ? "border-secondary/40 shadow-xl shadow-secondary/10" : "border-white/10 hover:border-white/20"
                    }`}>
                    {rank <= 3 && voteCount > 0 && (
                      <div className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] border ${
                        rank === 1 ? "bg-amber-400/20 border-amber-400/40 text-amber-400" :
                        rank === 2 ? "bg-slate-400/20 border-slate-400/40 text-slate-300" :
                                     "bg-orange-700/20 border-orange-700/40 text-orange-500"
                      }`}>#{rank}</div>
                    )}
                    <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                      {n.status === "winner" && (
                        <span className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/30 rounded-full px-2 py-0.5">
                          <Trophy className="w-2.5 h-2.5 text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-400">Winner</span>
                        </span>
                      )}
                      {hasVotedThis && (
                        <span className="flex items-center gap-1 bg-secondary/15 border border-secondary/30 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-secondary" />
                          <span className="text-[10px] font-bold text-secondary">Your Vote</span>
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4 mt-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1A1A] to-[#6B1212] flex items-center justify-center font-heading font-bold text-base text-white shadow-md flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <h3 className="font-heading font-bold text-white text-sm sm:text-base leading-tight truncate">{name}</h3>
                          <p className="text-white/45 text-xs truncate mt-0.5">{n.school_name || "—"}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border mb-4 ${colors.bg} ${colors.text} ${colors.border}`}>
                        <Award className="w-2.5 h-2.5" />
                        {n.award_category?.replace(" Award", "") || "—"}
                      </span>
                      {(n.special_thing || n.impact_story) && (
                        <p className="text-white/50 text-xs leading-relaxed mb-4 line-clamp-2 italic">
                          "{n.special_thing || n.impact_story}"
                        </p>
                      )}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-white/40 font-medium">{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>
                          <span className={`text-[11px] font-semibold ${colors.text}`}>{totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${votePercent}%` }}
                            transition={{ duration: 1, delay: i * 0.05 + 0.3, ease: "easeOut" }}
                            className={`h-full rounded-full ${colors.bar}`} />
                        </div>
                      </div>
                      <div className="border-t border-white/[0.06] mb-4" />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: hasVotedThis ? 1 : 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          id={`btn-vote-cast-${n.id}`}
                          onClick={() => handleVote(n.id, name)}
                          disabled={voting === n.id || hasVotedThis || (hasVotedAnywhere && !hasVotedThis)}
                          className={`flex-1 h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
                            hasVotedThis
                              ? "bg-secondary/10 border border-secondary/25 text-secondary cursor-default"
                              : (hasVotedAnywhere && !hasVotedThis)
                              ? "bg-white/5 border border-white/10 text-white/25 cursor-not-allowed"
                              : "bg-gradient-to-r from-[#9B2020] to-[#7A1515] text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-60"
                          }`}>
                          {!hasVotedThis && !hasVotedAnywhere && (
                            <motion.div animate={{ x: [-200, 300] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
                              className="absolute inset-0 w-16 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                          )}
                          {voting === n.id ? <Loader2 className="w-4 h-4 animate-spin" />
                            : hasVotedThis ? <><CheckCircle2 className="w-4 h-4" /> Your Vote</>
                            : (hasVotedAnywhere && !hasVotedThis) ? "Already Voted"
                            : <><ThumbsUp className="w-4 h-4" /> Vote</>}
                        </motion.button>
                        <motion.button
                          id={`btn-vote-share-${n.id}`}
                          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            const text = `I voted for ${name} in the NIAT Future-Ready Educator Awards 2026! 🏆\nYou can vote too: ${window.location.href}`;
                            if (navigator.share) navigator.share({ title: "Vote for this teacher!", text, url: window.location.href });
                            else { navigator.clipboard.writeText(text); toast({ title: "Link copied!" }); }
                          }}
                          className="w-10 h-10 rounded-xl border border-white/12 flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all flex-shrink-0">
                          <Share2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default VotePage;
