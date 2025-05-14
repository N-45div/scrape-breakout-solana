import type { Metadata } from "next"

import { HeroSection } from './components/HeroSection';
import { HandbookOverview } from './components/HandbookOverview';
import { TargetAudienceAndFAQ } from './components/TargetAudienceAndFAQ';
import { CommunityJoin } from './components/CommunityJoin';
import { Footer } from './components/Footer';

export const metadata: Metadata = {
  title: "Scrape - Power AI, Share the Rewards | DePIN x AI"
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black relative">
      <div className="relative z-10">
        <HeroSection />
        <HandbookOverview />
        <TargetAudienceAndFAQ />
        <CommunityJoin />
        <Footer />
      </div>
    </div>
  )
}
