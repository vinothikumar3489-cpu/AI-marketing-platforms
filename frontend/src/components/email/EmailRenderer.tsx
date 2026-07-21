import { useState } from 'react';
import { Eye, Code, FileText, Smartphone, Monitor, Moon, Copy, Check } from 'lucide-react';

interface EmailRendererProps {
  html: string;
  plainText: string;
  subject: string;
  previewMode?: 'desktop' | 'mobile' | 'dark';
}

export function EmailRenderer({ html, plainText, subject, previewMode = 'desktop' }: EmailRendererProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'html' | 'plain' | 'mobile'>('visual');
  const [copied, setCopied] = useState(false);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPreviewStyle = () => {
    const baseStyle = {
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

  return (
    <div style={{ width: '100%' }}>
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
            <button
              onClick={() => handleCopy(html)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '6px 12px',
                background: '#818cf8',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 10,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
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
            <button
              onClick={() => handleCopy(plainText)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '6px 12px',
                background: '#818cf8',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 10,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
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

      {/* Subject Line Display */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: '#151d2b',
        borderRadius: '8px',
        border: '1px solid #293245',
      }}>
        <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Subject Line</div>
        <div style={{ fontSize: '14px', color: '#e5e7eb', fontWeight: 500 }}>{subject}</div>
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
