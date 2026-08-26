import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/HeroSection";

const NominatePage = ({ role }: { role: "student" | "teacher" }) => (
  <div className="min-h-screen">
    <Navbar />
    <main id="main-content" role="main">
      <HeroSection key={role} lockedRole={role} />
    </main>
    <Footer />
  </div>
);

export default NominatePage;
