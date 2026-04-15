import { Component, type ErrorInfo, type ReactNode } from "react";

interface ToolErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface ToolErrorBoundaryState {
  hasError: boolean;
}

export class ToolErrorBoundary extends Component<ToolErrorBoundaryProps, ToolErrorBoundaryState> {
  state: ToolErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ToolErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Tool runtime error", { error, info });
  }

  componentDidUpdate(prevProps: ToolErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--color-border-primary)]
                     bg-[var(--color-bg-card)] p-8 text-center"
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            This tool hit an unexpected error.
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--color-text-muted)]">
            Your files are still local to this browser session. Reload this tool to continue.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
