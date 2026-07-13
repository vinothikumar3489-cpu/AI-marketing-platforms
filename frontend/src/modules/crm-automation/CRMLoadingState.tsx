import { Loader2 } from 'lucide-react';

export function CRMLoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', gap: '16px',
      background: '#0f1729', borderRadius: '12px', border: '1px solid #293245',
    }}>
      <Loader2 size={32} style={{ color: '#53a7ff', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#9aa7bd', fontSize: '14px' }}>{message}</div>
    </div>
  );
}
