import { FileText } from 'lucide-react';
import { EmptyState } from '../../components/UI';

interface CRMEmptyStateProps {
  title: string;
  message: string;
  icon?: any;
  action?: { label: string; onClick: () => void };
}

export function CRMEmptyState({ title, message, icon: Icon = FileText, action }: CRMEmptyStateProps) {
  return (
    <div style={{ position: 'relative' }}>
      <EmptyState title={title} text={message} />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-12px' }}>
        <Icon size={48} style={{ color: '#293245' }} />
      </div>
      {action && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={action.onClick} style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid #53a7ff',
            background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
          }}>
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
