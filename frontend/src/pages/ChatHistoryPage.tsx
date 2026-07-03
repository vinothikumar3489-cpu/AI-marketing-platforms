import { Link } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { PageHeader } from '../components/UI';
import { Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useState } from 'react';

export default function ChatHistoryPage() { 
  const { chats, selectChat, refreshChats, deleteChat, clearHistory } = useProject(); 
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };
  
  const handleDelete = async (id: string, projectName: string) => {
    if (!confirm(`Delete "${projectName}" forever? This action cannot be undone.`)) {
      return;
    }
    
    setDeleting(id);
    
    try {
      await deleteChat(id);
      showToast('success', `Project "${projectName}" deleted successfully`);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete project';
      showToast('error', errorMessage);
      console.error('Delete failed:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL projects and analysis data forever? This action cannot be undone and will permanently remove all your saved work.')) {
      return;
    }
    
    setClearingAll(true);
    
    try {
      await clearHistory();
      showToast('success', 'All project history cleared successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to clear history';
      showToast('error', errorMessage);
      console.error('Clear history failed:', error);
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <PageHeader eyebrow="Saved Projects" title="Project History" subtitle="Manage all generated business intelligence analyses."/>
        {chats.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="ghost-btn"
            style={{ 
              color: '#ff6b6b', 
              borderColor: '#ff6b6b',
              opacity: clearingAll ? 0.5 : 1,
              cursor: clearingAll ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={clearingAll}
          >
            {clearingAll ? (
              <div style={{ width: '16px', height: '16px', border: '2px solid #ff6b6b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {clearingAll ? 'Clearing...' : 'Clear All History'}
          </button>
        )}
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}
      
      <div style={{ display: 'grid', gap: '15px' }}>
        {chats.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#101622', padding: '20px', borderRadius: '12px', border: '1px solid #293245' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '18px' }}>{c.productName || c.title}</h3>
              <div style={{ display: 'flex', gap: '15px', color: '#9aa7bd', fontSize: '13px' }}>
                <span>{c.companyName || 'No Company Details'}</span>
                <span>•</span>
                <span>{new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link to="/app/growth-workspace" onClick={() => selectChat(c.id)} className="secondary-btn">Open Workspace</Link>
              <button 
                onClick={() => handleDelete(c.id, c.productName || c.title)} 
                className="ghost-btn" 
                style={{ padding: '8px', color: '#ff6b6b', opacity: deleting === c.id ? 0.5 : 1, cursor: deleting === c.id ? 'not-allowed' : 'pointer' }} 
                title="Delete Project"
                disabled={deleting === c.id}
              >
                {deleting === c.id ? (
                  <div style={{ width: '18px', height: '18px', border: '2px solid #ff6b6b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            </div>
          </div>
        ))}
        {chats.length === 0 && <p style={{ color: '#9aa7bd' }}>No projects saved yet.</p>}
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
