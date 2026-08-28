import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_BG = "#000000";
const NAV_BG_MENU = "#0a0a0a";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
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
      <nav style={{ backgroundColor: NAV_BG }} className="border-b border-white/10 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between px-4 sm:px-6" style={{ height: "56px" }}>

          {/* Logo — 237×56 lockup, height 32px mobile / 40px desktop */}
          <Link to="/" className="flex-shrink min-w-0 max-w-[55vw] sm:max-w-none flex items-center no-underline">
            <img
              src="/niat-lockup.svg?v=2"
              alt="NIAT - NxtWave of Innovation in Advanced Technologies"
              width={237}
              height={56}
              className="h-8 w-auto sm:h-10 max-w-full"
              style={{ display: "block", objectFit: "contain" }}
            />
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
            {isAuthenticated && (
              <div className="flex items-center gap-2 bg-black/20 border border-white/15 rounded-xl px-3 py-1.5 max-w-[200px]">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white">{initials}</span>
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[12px] font-semibold text-white truncate">{user?.name || "Welcome"}</span>
                  <span className="text-[10px] text-white/50 truncate">+91 {user?.phone}</span>
                </div>
              </div>
            )}
            <Link
              id="btn-nav-nominate"
              to="/nominate-student"
              className="inline-flex items-center justify-center text-[13px] font-bold px-4 py-2.5 rounded-lg bg-white text-[#6B1212] hover:bg-white/90 transition-all shadow-sm min-h-[44px] no-underline"
            >
              Nominate
            </Link>
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
            <button
              id="btn-nav-mobile-menu"
              type="button"
              className="p-2.5 text-white/80 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={open}
              aria-controls="nav-mobile-menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          id="nav-mobile-menu"
          className={`md:hidden niat-nav-menu border-t border-white/10 ${open ? "niat-nav-menu-open" : ""}`}
          style={{ backgroundColor: NAV_BG_MENU }}
          inert={!open ? true : undefined}
        >
          <div className="niat-nav-menu-inner">
            <div className="px-4 py-2 flex flex-col">
              {links.map((l) => (
                <a key={l.hash} href={l.hash} onClick={(e) => handleNavClick(e, l.hash)}
                  className="text-[15px] font-medium text-white/80 hover:text-white py-3.5 border-b border-white/[0.08] last:border-0 transition-colors cursor-pointer min-h-[52px] flex items-center">
                  {l.label}
                </a>
              ))}
              <div className="py-3 flex flex-col gap-2.5">
                <Link
                  id="btn-nav-mobile-nominate"
                  to="/nominate-student"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center text-[15px] font-bold py-3.5 rounded-xl bg-white text-[#6B1212] min-h-[52px] no-underline"
                >
                  Nominate a Teacher
                </Link>
                <Link
                  id="btn-nav-mobile-nominate-teacher"
                  to="/nominate-teacher"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center text-[15px] font-medium py-3.5 rounded-xl border border-white/20 text-white/80 min-h-[52px] no-underline"
                >
                  Teacher Self-Nomination
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
