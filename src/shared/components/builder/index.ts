// Auto-register components
import './components/init';

export { BuilderPanel } from './BuilderPanel';
export { BuilderErrorBoundary } from './BuilderErrorBoundary';
export { registerBuilderComponent, getBuilderComponent } from './registry';
export type { BuilderComponentProps } from './registry';
