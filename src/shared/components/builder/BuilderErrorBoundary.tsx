import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
}

export class BuilderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-sm text-[var(--color-text-secondary)]">
            「{this.props.componentName}」渲染失败
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded border border-[var(--color-border-default)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            >
              重试
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('builder:cancel'))}
              className="rounded border border-[var(--color-border-default)] px-3 py-1 text-xs text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
            >
              跳过
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
