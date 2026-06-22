import { Navbar } from '@/apps/portal/components/Navbar';
import { HeroSection } from '@/apps/portal/components/HeroSection';
import { AppCardsSection } from '@/apps/portal/components/AppCardsSection';
import { WorkflowSection } from '@/apps/portal/components/WorkflowSection';
import { FeaturesSection } from '@/apps/portal/components/FeaturesSection';
import { StatsSection } from '@/apps/portal/components/StatsSection';
import { CtaSection } from '@/apps/portal/components/CtaSection';
import { Footer } from '@/apps/portal/components/Footer';

export function PortalPage() {
  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ background: 'var(--portal-bg)' }}
    >
      <Navbar />
      <HeroSection />
      <AppCardsSection />
      <WorkflowSection />
      <FeaturesSection />
      <StatsSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
