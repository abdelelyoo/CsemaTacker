import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Dashboard Error Boundary Caught:', error);
    console.error('📋 Error Info:', errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl m-4">
          <h2 className="text-xl font-bold text-rose-800 mb-2">⚠️ Dashboard Error</h2>
          <p className="text-rose-700 mb-4">{this.props.fallbackMessage || 'Something went wrong in the dashboard.'}</p>
          <details className="text-sm text-rose-600">
            <summary className="cursor-pointer font-semibold">Error Details</summary>
            <pre className="mt-2 p-2 bg-rose-100 rounded overflow-auto">
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo?.componentStack && (
              <pre className="mt-2 p-2 bg-rose-100 rounded overflow-auto text-xs">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}