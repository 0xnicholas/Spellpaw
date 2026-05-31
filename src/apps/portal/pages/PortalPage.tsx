import { Navbar } from '@/apps/portal/components/Navbar';
import { HeroSection } from '@/apps/portal/components/HeroSection';
import { AppCardsSection } from '@/apps/portal/components/AppCardsSection';
import { FeaturesSection } from '@/apps/portal/components/FeaturesSection';
import { Footer } from '@/apps/portal/components/Footer';

export function PortalPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Navbar />
      <HeroSection />
      <AppCardsSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
}
