import { cn } from '@/lib/utils';

interface TabPanelProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function TabPanel({ children, isActive, className }: TabPanelProps) {
  if (!isActive) return null;
  return <div className={cn('h-full overflow-auto', className)}>{children}</div>;
}
