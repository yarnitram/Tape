"use client";

import { LandingNav } from "./landing-nav";
import { LandingTicker } from "./landing-ticker";
import { LandingHero } from "./landing-hero";
import { LandingFeaturesBento } from "./landing-features-bento";
import { LandingWorkflow } from "./landing-workflow";
import { LandingFAQ } from "./landing-faq";
import { LandingCTA } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

interface Props {
  user: { email: string } | null;
}

export function LandingPage({ user }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-text selection:bg-accent/30 selection:text-white">
      {/* Top Navigation */}
      <LandingNav user={user} />

      {/* Ticker Bar */}
      <LandingTicker />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section with Interactive Terminal Mockup */}
        <LandingHero user={user} />

        {/* Bento Grid Feature Showcase */}
        <LandingFeaturesBento />

        {/* 4-Step Discipline Execution Workflow */}
        <LandingWorkflow />

        {/* Interactive FAQ Accordion */}
        <LandingFAQ />

        {/* Bottom High-Converting Call to Action Banner */}
        <LandingCTA user={user} />
      </main>

      {/* Landing Footer */}
      <LandingFooter />
    </div>
  );
}
