import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";

// Lazy load below-fold sections — they're not visible on first paint
const WhySection          = lazy(() => import("@/components/landing/WhySection"));
const HowItWorksSection   = lazy(() => import("@/components/landing/HowItWorksSection"));
const WinnersReceiveSection = lazy(() => import("@/components/landing/WinnersReceiveSection"));
const FinalCTASection     = lazy(() => import("@/components/landing/FinalCTASection"));

const SectionLoader = () => <div className="h-48 bg-[#0a0a0a]" aria-hidden="true" />;

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <main id="main-content" role="main">
      <HeroSection />
      <Suspense fallback={<SectionLoader />}>
        <WhySection />
        <HowItWorksSection />
        <WinnersReceiveSection />
        <FinalCTASection />
      </Suspense>
    </main>
    <Footer />
  </div>
);

export default Index;
