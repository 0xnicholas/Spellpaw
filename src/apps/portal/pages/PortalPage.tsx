/**
 * PortalPage — Portal landing page.
 *
 * 用 IntersectionObserver 监听 Hero 区域可见性：Hero 在视口内时隐藏
 * 浮动输入框，hero 滚出视口后浮动输入框才出现（scroll-reveal）。
 */
import { useEffect, useRef, useState } from 'react';
import { Navbar } from '@/apps/portal/components/Navbar';
import { HeroSection } from '@/apps/portal/components/HeroSection';
import { AppCardsSection } from '@/apps/portal/components/AppCardsSection';
import { WorkflowSection } from '@/apps/portal/components/WorkflowSection';
import { FeaturesSection } from '@/apps/portal/components/FeaturesSection';
import { StatsSection } from '@/apps/portal/components/StatsSection';
import { CtaSection } from '@/apps/portal/components/CtaSection';
import { Footer } from '@/apps/portal/components/Footer';
import { DynamicIslandInput } from '@/apps/portal/components/DynamicIslandInput';

export function PortalPage() {
  // 浮动输入框是否显示：hero 滚出视口后才出现
  const [showFloating, setShowFloating] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = heroRef.current;
    if (!target) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // isIntersecting=true 表示 hero 在视口内 → 隐藏 floating
        // isIntersecting=false 表示 hero 滚出 → 显示 floating
        setShowFloating(!entry?.isIntersecting);
      },
      { threshold: 0.05, rootMargin: '-80px 0px 0px 0px' },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="h-screen overflow-y-auto pb-24"
      style={{ background: 'var(--portal-bg)' }}
    >
      <Navbar />
      <div ref={heroRef}>
        <HeroSection />
      </div>
      <AppCardsSection />
      <WorkflowSection />
      <FeaturesSection />
      <StatsSection />
      <CtaSection />
      <Footer />
      <DynamicIslandInput visible={showFloating} />
    </div>
  );
}