import { CheckCircle2, AlertTriangle, XCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface QualityCheckProps {
  validation: {
    valid?: boolean;
    score?: number;
    blockingIssues?: string[];
    warnings?: string[];
    checks?: Record<string, {
      status: 'passed' | 'warning' | 'blocked';
      message: string;
    }>;
  };
  onFixIssue?: (issue: string) => void;
}

export function QualityCheck({ validation, onFixIssue }: QualityCheckProps) {
  const [expanded, setExpanded] = useState(true);

  const { valid, score, blockingIssues = [], warnings = [], checks = {} } = validation;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#10e18b';
    if (score >= 0.6) return '#53a7ff';
    if (score >= 0.4) return '#ffb347';
    return '#ff4757';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Needs Improvement';
    return 'Critical Issues';
  };

  const checkCount = Object.keys(checks).length;
  const passedCount = Object.values(checks).filter(c => c.status === 'passed').length;
  const warningCount = Object.values(checks).filter(c => c.status === 'warning').length;
  const blockedCount = Object.values(checks).filter(c => c.status === 'blocked').length;

  return (
    <div style={{
      background: '#151d2b',
      padding: '20px',
      borderRadius: '8px',
      border: `1px solid ${valid ? '#10e18b' : '#ff4757'}`,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: expanded ? '16px' : '0',
        }}
      >
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#e5e7eb',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Shield size={16} color={valid ? '#10e18b' : '#ff4757'} />
          Quality Check
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Score Badge */}
          {score !== undefined && (
            <div style={{
              padding: '4px 10px',
              background: `${getScoreColor(score)}20`,
              borderRadius: '6px',
              border: `1px solid ${getScoreColor(score)}`,
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: getScoreColor(score),
              }}>
                {Math.round(score * 100)}% - {getScoreLabel(score)}
              </span>
            </div>
          )}
          {expanded ? <ChevronUp size={16} color="#9aa7bd" /> : <ChevronDown size={16} color="#9aa7bd" />}
        </div>
      </div>

      {expanded && (
        <div>
          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <StatCard label="Total Checks" value={checkCount} color="#9aa7bd" />
            <StatCard label="Passed" value={passedCount} color="#10e18b" />
            <StatCard label="Warnings" value={warningCount} color="#ffb347" />
            <StatCard label="Blocked" value={blockedCount} color="#ff4757" />
          </div>

          {/* Blocking Issues */}
          {blockingIssues.length > 0 && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(255, 71, 87, 0.1)',
              borderRadius: '6px',
              border: '1px solid #ff4757',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#ff4757',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <XCircle size={14} />
                Blocking Issues ({blockingIssues.length})
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '12px',
                color: '#ff4757',
              }}>
                {blockingIssues.map((issue, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(255, 179, 71, 0.1)',
              borderRadius: '6px',
              border: '1px solid #ffb347',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#ffb347',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <AlertTriangle size={14} />
                Warnings ({warnings.length})
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '12px',
                color: '#ffb347',
              }}>
                {warnings.map((warning, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Checks */}
          {checkCount > 0 && (
            <div style={{
              background: '#0f1729',
              borderRadius: '6px',
              padding: '12px',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#9aa7bd',
                marginBottom: '12px',
              }}>
                Detailed Checks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(checks).map(([key, check]) => (
                  <CheckItem
                    key={key}
                    label={formatCheckLabel(key)}
                    status={check.status}
                    message={check.message}
                    onFix={onFixIssue}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Issues */}
          {blockingIssues.length === 0 && warnings.length === 0 && valid && (
            <div style={{
              padding: '16px',
              background: 'rgba(16, 225, 139, 0.1)',
              borderRadius: '6px',
              border: '1px solid #10e18b',
              textAlign: 'center',
            }}>
              <CheckCircle2 size={24} style={{ color: '#10e18b', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', color: '#10e18b', fontWeight: 600 }}>
                All checks passed!
              </div>
              <div style={{ fontSize: '12px', color: '#9aa7bd', marginTop: '4px' }}>
                Your email is ready to send
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div style={{
      padding: '12px',
      background: '#0f1729',
      borderRadius: '6px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#9aa7bd' }}>{label}</div>
    </div>
  );
}

interface CheckItemProps {
  label: string;
  status: 'passed' | 'warning' | 'blocked';
  message: string;
  onFix?: (issue: string) => void;
}

function CheckItem({ label, status, message, onFix }: CheckItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 size={14} color="#10e18b" />;
      case 'warning':
        return <AlertTriangle size={14} color="#ffb347" />;
      case 'blocked':
        return <XCircle size={14} color="#ff4757" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'passed':
        return '#10e18b';
      case 'warning':
        return '#ffb347';
      case 'blocked':
        return '#ff4757';
    }
  };

  return (
    <div style={{
      padding: '10px 12px',
      background: '#151d2b',
      borderRadius: '4px',
      border: `1px solid ${getStatusColor()}30`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ marginTop: '2px' }}>{getStatusIcon()}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#e5e7eb',
            marginBottom: '2px',
          }}>
            {label}
          </div>
          <div style={{ fontSize: '11px', color: '#9aa7bd' }}>{message}</div>
        </div>
        {status !== 'passed' && onFix && (
          <button
            onClick={() => onFix(message)}
            style={{
              padding: '4px 8px',
              background: '#53a7ff',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            Fix
          </button>
        )}
      </div>
    </div>
  );
}

function formatCheckLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
