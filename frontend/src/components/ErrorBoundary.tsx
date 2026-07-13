import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary] Caught error:', error.message, errorInfo.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          margin: '16px 0',
          background: '#151d2b',
          borderRadius: '12px',
          border: '1px solid #ff4757',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#ff4757', fontWeight: 600, marginBottom: '8px' }}>
            {this.props.fallbackTitle || 'Unable to display this section'}
          </div>
          <div style={{ fontSize: '13px', color: '#9aa7bd' }}>
            {this.props.fallbackMessage || 'Please refresh or rerun analysis.'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
