import { TopNav } from "@/components/marketing/TopNav";
import { Ticker } from "@/components/marketing/Ticker";
import { Hero } from "@/components/marketing/Hero";
import { LiveDemo } from "@/components/marketing/LiveDemo";
import { Features } from "@/components/marketing/Features";
import { SocialProof } from "@/components/marketing/SocialProof";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { Footer } from "@/components/marketing/Footer";
import { AdRail } from "@/components/marketing/AdRail";

export default function HomePage() {
  return (
    <main className="relative">
      <TopNav />
      <Ticker />
      <AdRail paid={false} />
      <div className="lg:pl-[200px]">
        <Hero />
        <LiveDemo />
        <Features />
        <SocialProof />
        <Pricing />
        <FAQ />
        <Footer />
      </div>
    </main>
  );
}
