import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  message?: string;
  onRetry?: () => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '12px', padding: '60px 20px', background: '#0f1729',
  borderRadius: '12px', border: '1px solid rgba(255,71,87,0.2)',
};

const iconStyle: React.CSSProperties = { color: '#ff4757', flexShrink: 0 };

const msgStyle: React.CSSProperties = {
  color: '#ff8a8a', fontSize: '14px', fontWeight: 500, textAlign: 'center', maxWidth: '400px',
};

const detailStyle: React.CSSProperties = {
  color: '#6b7a93', fontSize: '12px', textAlign: 'center', maxWidth: '400px',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '6px', border: '1px solid #53a7ff',
  background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer',
  fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
  transition: 'background 0.15s',
};

export function CRMErrorState({ message, onRetry }: Props) {
  return (
    <div style={containerStyle}>
      <AlertTriangle size={36} style={iconStyle} />
      <div style={msgStyle}>{message || 'An unexpected error occurred'}</div>
      <div style={detailStyle}>Please try again or contact support if the issue persists.</div>
      {onRetry && (
        <button
          style={btnStyle}
          onClick={onRetry}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(83,167,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(83,167,255,0.15)'}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
