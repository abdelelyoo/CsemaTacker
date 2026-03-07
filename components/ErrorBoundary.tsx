import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <AlertCircle className="mx-auto mb-3 text-rose-500" size={32} />
                    <h3 className="text-lg font-semibold text-rose-800 mb-1">
                        {this.props.fallbackMessage || 'Something went wrong'}
                    </h3>
                    <p className="text-sm text-rose-600 mb-4">
                        {this.state.error?.message || 'An unexpected error occurred in this section.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
                    >
                        <RefreshCw size={14} />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
