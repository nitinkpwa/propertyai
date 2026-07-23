"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/stability";
import { isStaleAssetError, recoverFromStaleAssets } from "@/lib/stability/chunkRecovery";
import { recordCrash, traceRender } from "@/lib/stability/crashReport";
import DevCrashOverlay from "./DevCrashOverlay";

interface Props {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
  /** Compact inline fallback for dashboard widgets */
  compact?: boolean;
  /** If true, this boundary is the last line of defense for a route shell */
  critical?: boolean;
}

interface State {
  error: Error | null;
}

/**
 * Isolates a feature so one failure cannot take down the whole page.
 * Records crash + render breadcrumbs for DevCrashOverlay.
 */
export default class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    traceRender(`CRASH:${this.props.name}`);
    recordCrash({
      component: this.props.name,
      message: error.message,
      stack: `${error.stack ?? ""}\n\nComponent stack:${info.componentStack ?? ""}`,
    });

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

    const isDev = process.env.NODE_ENV === "development";

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
          {isDev ? (
            <div className="mt-3">
              <DevCrashOverlay
                error={this.state.error}
                component={this.props.name}
                reset={this.reset}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={this.reset}
              className="mt-2 text-xs font-semibold text-amber-900 underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm"
      >
        <div>
          <p className="text-sm font-semibold text-heading-primary">
            Couldn&apos;t load {this.props.name}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted">
            The rest of AreaIQ is still available. Retry this section or continue browsing.
          </p>
        </div>
        {isDev || this.props.critical ? (
          <DevCrashOverlay
            error={this.state.error}
            component={this.props.name}
            reset={this.reset}
            force={this.props.critical}
          />
        ) : (
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
}
