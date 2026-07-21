import { useState, useEffect, useRef } from 'react';
import { Eye, Code, FileText, X, AlertCircle } from 'lucide-react';

interface EmailContent {
  subject?: string;
  previewText?: string;
  greeting?: string;
  opening?: string;
  painPoint?: string;
  solution?: string;
  benefits?: string[];
  evidence?: string[];
  cta?: { label: string; url: string | null };
  closing?: string;
  signature?: string;
  footer?: string;
  postscript?: string;
  bodyParagraphs?: string[];
  html?: string;
  plainText?: string;
  emailType?: string;
  _fallback?: boolean;
  _fallbackReason?: string;
}

interface EmailRendererProps {
  content: EmailContent;
  onCopy?: () => void;
  selectedChatId?: string;
  onAddToCampaign?: () => void;
}

type ViewMode = 'html' | 'plain' | 'structured';

export default function EmailRenderer({ content, onCopy, selectedChatId, onAddToCampaign }: EmailRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('html');
  const [copySuccess, setCopySuccess] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (viewMode === 'html' && iframeRef.current && content.html) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(content.html);
        doc.close();
      }
    }
  }, [viewMode, content.html]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      if (onCopy) onCopy();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderStructuredView = () => {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', lineHeight: 1.6 }}>
        {content._fallback && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ color: '#dc2626' }} />
            <span style={{ color: '#dc2626', fontSize: '13px' }}>
              Fallback content: {content._fallbackReason || 'AI generation failed'}
            </span>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <strong>Subject:</strong> {content.subject || '(No subject)'}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Preview Text:</strong> {content.previewText || '(No preview)'}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Email Type:</strong> {content.emailType || 'promotional'}
        </div>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

        <div style={{ marginBottom: '16px' }}>
          <strong>Greeting:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>{content.greeting || '(No greeting)'}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Opening:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>{content.opening || '(No opening)'}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Pain Point:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>{content.painPoint || '(No pain point)'}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Solution:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>{content.solution || '(No solution)'}</p>
        </div>

        {content.benefits && content.benefits.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <strong>Benefits:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#374151' }}>
              {content.benefits.map((benefit, i) => (
                <li key={i}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}

        {content.evidence && content.evidence.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <strong>Evidence:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#374151' }}>
              {content.evidence.map((evidence, i) => (
                <li key={i}>{evidence}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <strong>CTA:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>
            {content.cta?.label || '(No CTA)'} {content.cta?.url && `→ ${content.cta.url}`}
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Closing:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>{content.closing || '(No closing)'}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Signature:</strong>
          <p style={{ margin: '4px 0', color: '#374151' }}>{content.signature || '(No signature)'}</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <strong>Footer:</strong>
          <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '12px' }}>{content.footer || '(No footer)'}</p>
        </div>

        {content.postscript && (
          <div style={{ marginBottom: '16px' }}>
            <strong>P.S.:</strong>
            <p style={{ margin: '4px 0', color: '#374151' }}>{content.postscript}</p>
          </div>
        )}

        {content.bodyParagraphs && content.bodyParagraphs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <strong>Body Paragraphs:</strong>
            {content.bodyParagraphs.map((para, i) => (
              <p key={i} style={{ margin: '4px 0', color: '#374151' }}>{para}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPlainTextView = () => {
    const text = content.plainText || 'No plain text available';
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {text}
      </div>
    );
  };

  const renderHtmlView = () => {
    const html = content.html || '<div style="padding: 20px; font-family: Arial, sans-serif;">No HTML content available</div>';
    return (
      <iframe
        ref={iframeRef}
        title="Email Preview"
        style={{
          width: '100%',
          height: '500px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: 'white'
        }}
        sandbox="allow-same-origin"
        srcDoc={html}
      />
    );
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header with view mode toggle */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('html')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: viewMode === 'html' ? '1px solid #3b82f6' : '1px solid #d1d5db',
              backgroundColor: viewMode === 'html' ? '#eff6ff' : 'white',
              color: viewMode === 'html' ? '#1d4ed8' : '#374151',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Eye size={14} />
            HTML Preview
          </button>
          <button
            onClick={() => setViewMode('plain')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: viewMode === 'plain' ? '1px solid #3b82f6' : '1px solid #d1d5db',
              backgroundColor: viewMode === 'plain' ? '#eff6ff' : 'white',
              color: viewMode === 'plain' ? '#1d4ed8' : '#374151',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileText size={14} />
            Plain Text
          </button>
          <button
            onClick={() => setViewMode('structured')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: viewMode === 'structured' ? '1px solid #3b82f6' : '1px solid #d1d5db',
              backgroundColor: viewMode === 'structured' ? '#eff6ff' : 'white',
              color: viewMode === 'structured' ? '#1d4ed8' : '#374151',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Code size={14} />
            Structured
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onAddToCampaign && (
            <button
              onClick={onAddToCampaign}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #10b981',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Add to Campaign
            </button>
          )}
          <button
            onClick={() => {
              const text = viewMode === 'html' ? content.html || '' :
                          viewMode === 'plain' ? content.plainText || '' :
                          JSON.stringify(content, null, 2);
              handleCopy(text);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ minHeight: '500px', backgroundColor: 'white' }}>
        {viewMode === 'html' && renderHtmlView()}
        {viewMode === 'plain' && renderPlainTextView()}
        {viewMode === 'structured' && renderStructuredView()}
      </div>
    </div>
  );
}
