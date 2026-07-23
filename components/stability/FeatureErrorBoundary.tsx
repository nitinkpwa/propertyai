"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/stability";
import { isStaleAssetError, recoverFromStaleAssets } from "@/lib/stability/chunkRecovery";

interface Props {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
  /** Compact inline fallback for dashboard widgets */
  compact?: boolean;
}

interface State {
  error: Error | null;
}

/**
 * Isolates a feature so one failure cannot take down the whole page.
 */
export default class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("boundary", `${this.props.name}: ${error.message}`, {
      stack: error.stack,
      componentStack: info.componentStack,
    });

    if (isStaleAssetError(error)) {
      void recoverFromStaleAssets(`boundary:${this.props.name}:${error.message}`);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    if (this.props.compact) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-semibold">{this.props.name} unavailable</p>
          <p className="mt-1 text-xs text-amber-800">
            This section hit a temporary issue. Everything else still works.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-2 text-xs font-semibold text-amber-900 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm"
      >
        <p className="text-sm font-semibold text-heading-primary">
          Couldn&apos;t load {this.props.name}
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted">
          The rest of AreaIQ is still available. Retry this section or continue browsing.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }
}
