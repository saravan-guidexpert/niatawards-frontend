import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const MAROON = "#6B1212";
const MAROON_DARK = "#550F0F";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === "/") {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      // Navigate to home, then scroll after a brief delay for lazy sections to mount
      navigate("/");
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 600);
    }
  };

  const links = [
    { label: "Categories", hash: "#categories" },
    { label: "How It Works", hash: "#how-it-works" },
    { label: "Prizes", hash: "#prizes" },
  ];

  const initials = (user?.name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav style={{ backgroundColor: MAROON }} className="border-b border-black/20 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between px-4 sm:px-6" style={{ height: "56px" }}>

          {/* Logo */}
          <Link to="/" className="flex-shrink-0" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <picture>
              <source srcSet="/nxtwave-logo.webp" type="image/webp" />
              <img src="/nxtwave-logo.png" alt="NxtWave Institute of Advanced Technologies" width="148" height="36" style={{ width: "148px", height: "36px", objectFit: "contain", display: "block", flexShrink: 0 }} fetchPriority="high" />
            </picture>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) => (
              <a key={l.hash} href={l.hash} onClick={(e) => handleNavClick(e, l.hash)}
                className="text-[13px] font-medium text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/20 border border-white/15 rounded-xl px-3 py-1.5 max-w-[200px]">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-white">{initials}</span>
                  </div>
                  <div className="flex flex-col leading-none min-w-0">
                    <span className="text-[12px] font-semibold text-white truncate">{user?.name || "Welcome"}</span>
                    <span className="text-[10px] text-white/50 truncate">+91 {user?.phone}</span>
                  </div>
                </div>
                <button id="btn-nav-logout" onClick={logout} title="Logout" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link to="/login">
                <button id="btn-nav-login" className="text-[13px] font-medium text-white/70 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-2 min-h-[44px]">
                  <LogIn className="w-3.5 h-3.5" /> Login
                </button>
              </Link>
            )}
            <button id="btn-nav-nominate"
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-[13px] font-bold px-4 py-2.5 rounded-lg bg-white text-[#6B1212] hover:bg-white/90 transition-all shadow-sm min-h-[44px]">
              Nominate
            </button>
          </div>

          {/* Mobile right */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 bg-black/20 border border-white/15 rounded-lg px-2 py-1">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">{initials}</span>
                </div>
                <span className="text-[11px] font-semibold text-white max-w-[70px] truncate">{user?.name || "Hi!"}</span>
              </div>
            )}
            <button id="btn-nav-mobile-menu" className="p-2.5 text-white/80 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-black/20" style={{ backgroundColor: MAROON_DARK }}>
              <div className="px-4 py-2 flex flex-col">
                {links.map((l) => (
                  <a key={l.hash} href={l.hash} onClick={(e) => handleNavClick(e, l.hash)}
                    className="text-[15px] font-medium text-white/80 hover:text-white py-3.5 border-b border-white/[0.08] last:border-0 transition-colors cursor-pointer min-h-[52px] flex items-center">
                    {l.label}
                  </a>
                ))}
                <div className="py-3 flex flex-col gap-2.5">
                  <button id="btn-nav-mobile-nominate"
                    onClick={() => { setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="w-full text-[15px] font-bold py-3.5 rounded-xl bg-white text-[#6B1212] min-h-[52px]">
                    Nominate a Teacher
                  </button>
                  {!isAuthenticated ? (
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <button id="btn-nav-mobile-login" className="w-full text-[15px] font-medium py-3.5 rounded-xl border border-white/20 text-white/80 min-h-[52px]">Login</button>
                    </Link>
                  ) : (
                    <button id="btn-nav-mobile-logout" onClick={() => { logout(); setOpen(false); }}
                      className="w-full text-[15px] font-medium py-3.5 rounded-xl border border-white/20 text-white/80 flex items-center justify-center gap-2 min-h-[52px]">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Navbar;
