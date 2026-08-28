import { lazy } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import Footer from "@/components/landing/Footer";
import ViewportLazySection from "@/components/landing/ViewportLazySection";

const WhySection = lazy(() => import("@/components/landing/WhySection"));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const WinnersReceiveSection = lazy(() => import("@/components/landing/WinnersReceiveSection"));
const FinalCTASection = lazy(() => import("@/components/landing/FinalCTASection"));

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <main id="main-content" role="main">
      <HeroSection />
      <ViewportLazySection
        minHeight="36rem"
        className="bg-[#0a0a0a]"
        heading="Why This Exists"
      >
        <WhySection />
      </ViewportLazySection>
      <ViewportLazySection
        id="how-it-works"
        minHeight="40rem"
        className="bg-[#0a0a0a]"
        heading="How Teachers Are Selected"
      >
        <HowItWorksSection />
      </ViewportLazySection>
      <ViewportLazySection
        id="prizes"
        minHeight="24rem"
        className="bg-[#060606]"
        heading="What Winners Receive"
      >
        <WinnersReceiveSection />
      </ViewportLazySection>
      <ViewportLazySection
        minHeight="28rem"
        className="bg-[#0a0a0a]"
        heading="Every G.O.A.T teacher deserves to be celebrated"
      >
        <FinalCTASection />
      </ViewportLazySection>
    </main>
    <Footer />
  </div>
);

export default Index;
