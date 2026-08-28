import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-[#0a0a0a] border-t border-white/[0.05]">
    <div className="px-4 sm:px-6 py-10 sm:py-12 max-w-6xl mx-auto">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        {/* Brand */}
        <div className="max-w-xs">
          <Link to="/" className="mb-4 inline-flex items-center no-underline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img
              src="/niat-lockup.svg?v=2"
              alt="NIAT - NxtWave of Innovation in Advanced Technologies"
              width={237}
              height={56}
              className="h-8 w-auto sm:h-10"
              style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
              loading="lazy"
              decoding="async"
            />
          </Link>
          <p className="text-[13px] text-white/50 leading-relaxed">
            Celebrating India's most impactful teachers. Nominating the educators who build futures, not just scores.
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-10 sm:gap-14 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-3">Navigate</p>
            <div className="flex flex-col gap-3">
              {[{ label: "Home", to: "/" }, { label: "Student nomination", to: "/nominate-student" }, { label: "Teacher nomination", to: "/nominate-teacher" }].map(l => (
                <Link key={l.to} to={l.to} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-[14px] text-white/60 hover:text-white/80 transition-colors min-h-[44px] flex items-center">{l.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-3">Awards</p>
            <div className="flex flex-col gap-2">
              {["Student Transformation", "Teaching Innovation", "Beyond Classroom", "Future Readiness"].map(l => (
                <span key={l} className="text-[13px] text-white/50 leading-relaxed">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="border-t border-white/[0.04]">
      <div className="px-4 sm:px-6 py-4 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-white/50 text-center sm:text-left">
          © 2026 Nxtwave of Innovation in Advanced Technologies. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="https://www.ccbp.in/privacy-policy" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-white/50 hover:text-white/80 transition-colors min-h-[44px] inline-flex items-center px-1">
            Privacy Policy
          </a>
          <a href="https://www.ccbp.in/terms-and-conditions" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-white/50 hover:text-white/80 transition-colors min-h-[44px] inline-flex items-center px-1">
            Terms of Use
          </a>
          <a href="https://www.ccbp.in/grievance-redressal" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-white/50 hover:text-white/80 transition-colors min-h-[44px] inline-flex items-center px-1">
            Grievance
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
