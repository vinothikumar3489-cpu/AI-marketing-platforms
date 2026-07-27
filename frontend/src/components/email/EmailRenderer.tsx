import { useState } from 'react';
import { Eye, Code, FileText, Smartphone, Monitor, Moon, Copy, Check, Download, ThumbsUp, RefreshCw } from 'lucide-react';

interface EmailRendererProps {
  html: string;
  plainText: string;
  subject: string;
  previewText?: string;
  previewMode?: 'desktop' | 'mobile' | 'dark';
  onApprove?: () => void;
  onRegenerate?: () => void;
  approved?: boolean;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

export function EmailRenderer({
  html, plainText, subject, previewText = '',
  previewMode = 'desktop',
  onApprove, onRegenerate, approved = false,
}: EmailRendererProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'html' | 'plain' | 'mobile'>('visual');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (content: string, field?: string) => {
    await navigator.clipboard.writeText(content);
    if (field) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPreviewStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      minHeight: '400px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #293245',
    };

    if (previewMode === 'mobile') {
      return {
        ...baseStyle,
        maxWidth: '375px',
        margin: '0 auto',
      };
    }

    return baseStyle;
  };

  const getContainerStyle = () => {
    if (previewMode === 'dark') {
      return {
        background: '#0f1729',
        padding: '20px',
        borderRadius: '8px',
      };
    }
    return {
      background: '#f4f4f4',
      padding: '20px',
      borderRadius: '8px',
    };
  };

  const renderCopyButton = (content: string, label: string, field: string) => (
    <button
      onClick={() => handleCopy(content, field)}
      style={{
        padding: '4px 10px',
        background: copiedField === field ? '#10b981' : '#818cf8',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '11px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'background 0.2s',
      }}
    >
      {copiedField === field ? <Check size={12} /> : <Copy size={12} />}
      {copiedField === field ? 'Copied' : `Copy ${label}`}
    </button>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Subject & Preview Text Header */}
      <div style={{
        marginBottom: '12px',
        padding: '12px 16px',
        background: '#151d2b',
        borderRadius: '8px',
        border: '1px solid #293245',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '2px' }}>Subject Line</div>
            <div style={{ fontSize: '14px', color: '#e5e7eb', fontWeight: 600 }}>{subject}</div>
          </div>
          {renderCopyButton(subject, 'Subject', 'subject')}
        </div>
        {previewText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '2px' }}>Preview Text</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>{previewText}</div>
            </div>
            {renderCopyButton(previewText, 'Preview', 'preview')}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid #293245',
        marginBottom: '16px',
      }}>
        <TabButton
          active={activeTab === 'visual'}
          onClick={() => setActiveTab('visual')}
          icon={<Monitor size={16} />}
          label="Visual"
        />
        <TabButton
          active={activeTab === 'mobile'}
          onClick={() => setActiveTab('mobile')}
          icon={<Smartphone size={16} />}
          label="Mobile"
        />
        <TabButton
          active={activeTab === 'html'}
          onClick={() => setActiveTab('html')}
          icon={<Code size={16} />}
          label="HTML"
        />
        <TabButton
          active={activeTab === 'plain'}
          onClick={() => setActiveTab('plain')}
          icon={<FileText size={16} />}
          label="Plain Text"
        />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        <ActionButton
          onClick={() => downloadFile(html, `${subject || 'email'}.html`, 'text/html')}
          icon={<Download size={14} />}
          label="Download HTML"
          disabled={!html}
        />
        <ActionButton
          onClick={() => downloadFile(plainText, `${subject || 'email'}.txt`, 'text/plain')}
          icon={<FileText size={14} />}
          label="Download Plain Text"
          disabled={!plainText}
        />
        <ActionButton
          onClick={() => handleCopy(html, 'html')}
          icon={copiedField === 'html' ? <Check size={14} /> : <Copy size={14} />}
          label={copiedField === 'html' ? 'Copied HTML' : 'Copy HTML'}
          disabled={!html}
        />
        <ActionButton
          onClick={() => handleCopy(plainText, 'plain')}
          icon={copiedField === 'plain' ? <Check size={14} /> : <Copy size={14} />}
          label={copiedField === 'plain' ? 'Copied Text' : 'Copy Plain Text'}
          disabled={!plainText}
        />
        {onApprove && (
          <ActionButton
            onClick={onApprove}
            icon={<ThumbsUp size={14} />}
            label={approved ? 'Approved' : 'Approve'}
            style={approved ? { background: '#10b981', color: '#fff' } : undefined}
            disabled={approved}
          />
        )}
        {onRegenerate && (
          <ActionButton
            onClick={onRegenerate}
            icon={<RefreshCw size={14} />}
            label="Regenerate"
          />
        )}
      </div>

      {/* Preview Content */}
      <div style={getContainerStyle()}>
        {activeTab === 'visual' && (
          <div style={getPreviewStyle()}>
            <iframe
              srcDoc={html}
              title="Email Preview"
              style={{
                width: '100%',
                height: '500px',
                border: 'none',
                borderRadius: '8px',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        )}

        {activeTab === 'mobile' && (
          <div style={getPreviewStyle()}>
            <iframe
              srcDoc={html}
              title="Mobile Email Preview"
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
                borderRadius: '8px',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        )}

        {activeTab === 'html' && (
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: '#0f1729',
              color: '#e5e7eb',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '500px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {html}
            </pre>
          </div>
        )}

        {activeTab === 'plain' && (
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: '#0f1729',
              color: '#e5e7eb',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: 1.6,
              overflow: 'auto',
              maxHeight: '500px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {plainText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        background: active ? '#151d2b' : 'transparent',
        border: active ? '1px solid #293245' : '1px solid transparent',
        borderBottom: active ? '2px solid #53a7ff' : '2px solid transparent',
        borderRadius: '6px 6px 0 0',
        color: active ? '#e5e7eb' : '#9aa7bd',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

function ActionButton({ onClick, icon, label, disabled, style }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        background: disabled ? '#1e293b' : '#1e293b',
        border: '1px solid #293245',
        borderRadius: '6px',
        color: disabled ? '#475569' : '#e5e7eb',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
