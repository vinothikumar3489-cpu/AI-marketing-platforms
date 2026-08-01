import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  resetKey?: string;
  componentName?: string;
}

interface ErrorDetails {
  componentName: string;
  errorMessage: string;
  errorStack: string | undefined;
  componentStack: string;
  timestamp: string;
  failedField?: string;
  expectedType?: string;
  receivedType?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName,
    });

    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private extractErrorDetails(error: Error, errorInfo: ErrorInfo | null): ErrorDetails {
    const details: ErrorDetails = {
      componentName: this.props.componentName || 'Unknown Component',
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo?.componentStack || 'No component stack available',
      timestamp: new Date().toISOString(),
    };

    // Try to extract field/type information from error message
    const fieldMatch = error.message.match(/(?:field|property|key)\s+["']?([^"'\s]+)["']?/i);
    if (fieldMatch) {
      details.failedField = fieldMatch[1];
    }

    const typeMatch = error.message.match(/(?:expected|wanted)\s+([^,\s]+)/i);
    if (typeMatch) {
      details.expectedType = typeMatch[1];
    }

    const receivedMatch = error.message.match(/(?:received|got)\s+([^,\s]+)/i);
    if (receivedMatch) {
      details.receivedType = receivedMatch[1];
    }

    return details;
  }

  private getRecoveryAction(error: Error): string {
    if (error.message.includes('object')) {
      return 'Check if an object is being rendered directly in JSX. Use primitive values instead.';
    }
    if (error.message.includes('undefined')) {
      return 'Check for undefined values being accessed. Add optional chaining or null checks.';
    }
    if (error.message.includes('null')) {
      return 'Check for null values being accessed. Add null checks or default values.';
    }
    if (error.message.includes('map')) {
      return 'Check if map() is being called on a non-array value. Add array check.';
    }
    if (error.message.includes('Cannot read')) {
      return 'Check for nested property access on undefined/null objects.';
    }
    return 'Refresh the page or contact support if the issue persists.';
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const details = this.extractErrorDetails(this.state.error, this.state.errorInfo);
      const recoveryAction = this.getRecoveryAction(this.state.error);
      const isDevelopment = typeof window !== 'undefined' && (window as any).__DEV__ === true;

      return (
        <div style={{
          padding: '24px',
          margin: '16px 0',
          background: '#151d2b',
          borderRadius: '12px',
          border: '1px solid #ff4757',
          fontFamily: 'monospace',
        }}>
          <div style={{ fontSize: '14px', color: '#ff4757', fontWeight: 600, marginBottom: '12px' }}>
            {this.props.fallbackTitle || 'Component Error'}
          </div>
          
          <div style={{ fontSize: '13px', color: '#e5e7eb', marginBottom: '16px' }}>
            {this.props.fallbackMessage || 'An error occurred while rendering this component.'}
          </div>

          {/* Component Name */}
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600 }}>Component: </span>
            <span style={{ color: '#53a7ff', fontSize: '12px' }}>{details.componentName}</span>
          </div>

          {/* Error Message */}
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600 }}>Error: </span>
            <span style={{ color: '#ff4757', fontSize: '12px' }}>{details.errorMessage}</span>
          </div>

          {/* Failed Field */}
          {details.failedField && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600 }}>Failed Field: </span>
              <span style={{ color: '#ffb347', fontSize: '12px' }}>{details.failedField}</span>
            </div>
          )}

          {/* Expected Type */}
          {details.expectedType && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600 }}>Expected Type: </span>
              <span style={{ color: '#10e18b', fontSize: '12px' }}>{details.expectedType}</span>
            </div>
          )}

          {/* Received Type */}
          {details.receivedType && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600 }}>Received Type: </span>
              <span style={{ color: '#ff4757', fontSize: '12px' }}>{details.receivedType}</span>
            </div>
          )}

          {/* Recovery Action */}
          <div style={{ 
            marginTop: '12px', 
            padding: '12px', 
            background: 'rgba(83,167,255,0.1)', 
            borderRadius: '6px',
            border: '1px solid rgba(83,167,255,0.2)'
          }}>
            <span style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600 }}>Recovery Action: </span>
            <span style={{ color: '#53a7ff', fontSize: '12px' }}>{recoveryAction}</span>
          </div>

          {/* Development Stack */}
          {isDevelopment && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ 
                cursor: 'pointer', 
                color: '#9aa7bd', 
                fontSize: '11px', 
                fontWeight: 600,
                marginBottom: '8px'
              }}>
                Development Stack (click to expand)
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '12px', 
                background: '#0a0f1a', 
                borderRadius: '6px',
                fontSize: '10px',
                color: '#6b7280',
                maxHeight: '200px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                <div style={{ marginBottom: '8px', color: '#a855f7' }}>Component Stack:</div>
                {details.componentStack}
                <div style={{ marginTop: '12px', marginBottom: '8px', color: '#a855f7' }}>Error Stack:</div>
                {details.errorStack}
                <div style={{ marginTop: '12px', color: '#6b7280' }}>Timestamp: {details.timestamp}</div>
              </div>
            </details>
          )}

          {/* Retry Button */}
          <button 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#53a7ff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
