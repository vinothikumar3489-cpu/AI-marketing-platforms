import { useState } from 'react';
import { Save, CheckCircle2, XCircle, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

interface ApprovalFlowProps {
  emailData: any;
  approvalStatus?: 'DRAFT' | 'APPROVED' | 'REJECTED';
  onSaveDraft?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onRegenerate?: () => Promise<void>;
  canApprove?: boolean;
  isLoading?: boolean;
}

export function ApprovalFlow({
  emailData,
  approvalStatus = 'DRAFT',
  onSaveDraft,
  onApprove,
  onReject,
  onRegenerate,
  canApprove = false,
  isLoading = false,
}: ApprovalFlowProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setActionLoading('save');
    try {
      await onSaveDraft();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setActionLoading('approve');
    try {
      await onApprove();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!onReject || !rejectReason.trim()) return;
    setActionLoading('reject');
    try {
      await onReject(rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setActionLoading('regenerate');
    try {
      await onRegenerate();
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = () => {
    switch (approvalStatus) {
      case 'APPROVED':
        return (
          <div style={{
            padding: '6px 12px',
            background: 'rgba(16, 225, 139, 0.1)',
            borderRadius: '6px',
            border: '1px solid #10e18b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <CheckCircle2 size={14} color="#10e18b" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10e18b' }}>Approved</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div style={{
            padding: '6px 12px',
            background: 'rgba(255, 71, 87, 0.1)',
            borderRadius: '6px',
            border: '1px solid #ff4757',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <XCircle size={14} color="#ff4757" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ff4757' }}>Rejected</span>
          </div>
        );
      default:
        return (
          <div style={{
            padding: '6px 12px',
            background: 'rgba(255, 179, 71, 0.1)',
            borderRadius: '6px',
            border: '1px solid #ffb347',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <AlertTriangle size={14} color="#ffb347" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffb347' }}>Draft</span>
          </div>
        );
    }
  };

  return (
    <div style={{
      background: '#151d2b',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #293245',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #293245',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#e5e7eb',
          margin: 0,
        }}>
          Approval Flow
        </h3>
        {getStatusBadge()}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        {/* Save Draft */}
        <button
          onClick={handleSaveDraft}
          disabled={!onSaveDraft || actionLoading !== null || isLoading}
          style={{
            padding: '8px 16px',
            background: '#293245',
            border: '1px solid #3b4d61',
            borderRadius: '6px',
            color: '#e5e7eb',
            cursor: (!onSaveDraft || actionLoading !== null || isLoading) ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: (!onSaveDraft || actionLoading !== null || isLoading) ? 0.5 : 1,
          }}
        >
          {actionLoading === 'save' ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
          Save Draft
        </button>

        {/* Regenerate */}
        {onRegenerate && approvalStatus !== 'APPROVED' && (
          <button
            onClick={handleRegenerate}
            disabled={actionLoading !== null || isLoading}
            style={{
              padding: '8px 16px',
              background: '#818cf8',
              border: '1px solid #818cf8',
              borderRadius: '6px',
              color: 'white',
              cursor: actionLoading !== null || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: actionLoading !== null || isLoading ? 0.5 : 1,
            }}
          >
            {actionLoading === 'regenerate' ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
            Regenerate
          </button>
        )}

        {/* Approve */}
        {onApprove && approvalStatus !== 'APPROVED' && (
          <button
            onClick={handleApprove}
            disabled={!canApprove || actionLoading !== null || isLoading}
            style={{
              padding: '8px 16px',
              background: canApprove ? '#10e18b' : '#293245',
              border: canApprove ? '1px solid #10e18b' : '1px solid #3b4d61',
              borderRadius: '6px',
              color: canApprove ? '#0f1729' : '#e5e7eb',
              cursor: (!canApprove || actionLoading !== null || isLoading) ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: (!canApprove || actionLoading !== null || isLoading) ? 0.5 : 1,
            }}
          >
            {actionLoading === 'approve' ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
            Approve
          </button>
        )}

        {/* Reject */}
        {onReject && approvalStatus !== 'APPROVED' && (
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={actionLoading !== null || isLoading}
            style={{
              padding: '8px 16px',
              background: '#ff4757',
              border: '1px solid #ff4757',
              borderRadius: '6px',
              color: 'white',
              cursor: actionLoading !== null || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: actionLoading !== null || isLoading ? 0.5 : 1,
            }}
          >
            <XCircle size={14} />
            Reject
          </button>
        )}
      </div>

      {/* Validation Warning */}
      {!canApprove && approvalStatus === 'DRAFT' && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: 'rgba(255, 179, 71, 0.1)',
          borderRadius: '6px',
          border: '1px solid #ffb347',
          fontSize: '12px',
          color: '#ffb347',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <AlertTriangle size={14} />
          Fix validation issues before approving
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#151d2b',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #293245',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#e5e7eb',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <XCircle size={20} color="#ff4757" />
              Reject Email
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#9aa7bd',
              marginBottom: '16px',
            }}>
              Please provide a reason for rejecting this email. This will help improve future generations.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px 12px',
                background: '#0f1729',
                border: '1px solid #293245',
                borderRadius: '6px',
                color: '#e5e7eb',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#293245',
                  border: '1px solid #3b4d61',
                  borderRadius: '6px',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === 'reject'}
                style={{
                  padding: '8px 16px',
                  background: '#ff4757',
                  border: '1px solid #ff4757',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: !rejectReason.trim() || actionLoading === 'reject' ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !rejectReason.trim() || actionLoading === 'reject' ? 0.5 : 1,
                }}
              >
                {actionLoading === 'reject' ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
