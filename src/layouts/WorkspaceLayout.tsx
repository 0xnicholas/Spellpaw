import { Panel, Group, Separator } from 'react-resizable-panels';
import type { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export function WorkspaceLayout({ leftPanel, centerPanel, rightPanel }: WorkspaceLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-48px)]">
      <Group orientation="horizontal" className="h-full">
        {/* Left Column */}
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="flex h-full flex-col"
        >
          {leftPanel}
        </Panel>

        <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />

        {/* Center Column */}
        <Panel
          defaultSize={30}
          minSize={25}
          maxSize={45}
          className="flex h-full flex-col"
        >
          {centerPanel}
        </Panel>

        <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-accent-500)] transition-colors" />

        {/* Right Column */}
        <Panel defaultSize={50} minSize={30} className="flex h-full flex-col">
          {rightPanel}
        </Panel>
      </Group>
    </div>
  );
}
