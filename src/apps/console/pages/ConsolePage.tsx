import { ConsoleLayout } from '@console/components/console-layout/ConsoleLayout';
import { ProfileSection } from '@console/components/profile/ProfileSection';
import { SecuritySection } from '@console/components/security/SecuritySection';
import { PreferencesSection } from '@console/components/preferences/PreferencesSection';
import { IntegrationsSection } from '@console/components/integrations/IntegrationsSection';
import { useConsoleStore } from '@console/stores/consoleStore';
import type { ConsoleTab } from '@console/types';

const sectionMap: Record<ConsoleTab, React.ReactNode> = {
  profile: <ProfileSection />,
  security: <SecuritySection />,
  preferences: <PreferencesSection />,
  integrations: <IntegrationsSection />,
};

export function ConsolePage() {
  const activeTab = useConsoleStore((s) => s.activeTab);
  const setActiveTab = useConsoleStore((s) => s.setActiveTab);

  return (
    <ConsoleLayout activeTab={activeTab} onChangeTab={setActiveTab}>
      {sectionMap[activeTab]}
    </ConsoleLayout>
  );
}
