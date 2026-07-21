import { useState } from 'react';
import { User, Building, Mail, Eye, RefreshCw, Copy, Check } from 'lucide-react';

interface PersonalizationPreviewProps {
  emailContent: {
    greeting?: string;
    opening?: string;
    bodyParagraphs?: string[];
    closing?: string;
    subject?: string;
    previewText?: string;
  };
  recipient: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
  };
  sender?:string;
  productName?: string;
}

export function PersonalizationPreview({ emailContent, recipient, sender, productName }: PersonalizationPreviewProps) {
  const [copied, setCopied] = useState(false);

  const replaceVariables = (text: string): string => {
    if (!text) return '';
    let result = text;
    
    if (recipient.firstName) {
      result = result.replace(/\{\{firstName\}\}/g, recipient.firstName);
    }
    if (recipient.lastName) {
      result = result.replace(/\{\{lastName\}\}/g, recipient.lastName);
    }
    if (recipient.companyName) {
      result = result.replace(/\{\{companyName\}\}/g, recipient.companyName);
    }
    if (sender) {
      result = result.replace(/\{\{senderName\}\}/g, sender);
    }
    if (productName) {
      result = result.replace(/\{\{productName\}\}/g, productName);
    }
    
    return result;
  };

  const hasVariables = (text: string): boolean => {
    if (!text) return false;
    return /\{\{(firstName|lastName|companyName|senderName|productName)\}\}/.test(text);
  };

  const handleCopy = async () => {
    const personalizedContent = {
      subject: replaceVariables(emailContent.subject || ''),
      previewText: replaceVariables(emailContent.previewText || ''),
      greeting: replaceVariables(emailContent.greeting || ''),
      opening: replaceVariables(emailContent.opening || ''),
      bodyParagraphs: (emailContent.bodyParagraphs || []).map(p => replaceVariables(p)),
      closing: replaceVariables(emailContent.closing || ''),
    };
    
    await navigator.clipboard.writeText(JSON.stringify(personalizedContent, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVariableCount = (): number => {
    let count = 0;
    const fields = [
      emailContent.subject,
      emailContent.previewText,
      emailContent.greeting,
      emailContent.opening,
      emailContent.closing,
      ...(emailContent.bodyParagraphs || [])
    ];
    
    fields.forEach(field => {
      if (field) {
        const matches = field.match(/\{\{(firstName|lastName|companyName|senderName|productName)\}\}/g);
        if (matches) count += matches.length;
      }
    });
    
    return count;
  };

  const variableCount = getVariableCount();
  const hasRecipientData = recipient.firstName || recipient.lastName || recipient.companyName;

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
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Eye size={16} />
          Personalization Preview
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '11px',
            color: '#9aa7bd',
            background: '#0f1729',
            padding: '4px 8px',
            borderRadius: '4px',
          }}>
            {variableCount} variable{variableCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 12px',
              background: '#53a7ff',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {!hasRecipientData ? (
        <div style={{
          padding: '16px',
          background: 'rgba(255, 179, 71, 0.1)',
          borderRadius: '6px',
          border: '1px solid #ffb347',
          textAlign: 'center',
        }}>
          <User size={20} style={{ color: '#ffb347', marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: '#ffb347' }}>
            Add recipient information to see personalization preview
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
          {/* Subject */}
          {emailContent.subject && hasVariables(emailContent.subject) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Subject</div>
              <div style={{
                padding: '8px 12px',
                background: '#0f1729',
                borderRadius: '6px',
                color: '#e5e7eb',
              }}>
                {replaceVariables(emailContent.subject)}
              </div>
            </div>
          )}

          {/* Greeting */}
          {emailContent.greeting && hasVariables(emailContent.greeting) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Greeting</div>
              <div style={{
                padding: '8px 12px',
                background: '#0f1729',
                borderRadius: '6px',
                color: '#e5e7eb',
              }}>
                {replaceVariables(emailContent.greeting)}
              </div>
            </div>
          )}

          {/* Opening */}
          {emailContent.opening && hasVariables(emailContent.opening) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Opening</div>
              <div style={{
                padding: '8px 12px',
                background: '#0f1729',
                borderRadius: '6px',
                color: '#e5e7eb',
              }}>
                {replaceVariables(emailContent.opening)}
              </div>
            </div>
          )}

          {/* Body Paragraphs */}
          {emailContent.bodyParagraphs && emailContent.bodyParagraphs.some(p => hasVariables(p)) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Body Paragraphs</div>
              {emailContent.bodyParagraphs.map((paragraph, index) => (
                hasVariables(paragraph) && (
                  <div
                    key={index}
                    style={{
                      padding: '8px 12px',
                      background: '#0f1729',
                      borderRadius: '6px',
                      color: '#e5e7eb',
                      marginBottom: '8px',
                    }}
                  >
                    {replaceVariables(paragraph)}
                  </div>
                )
              ))}
            </div>
          )}

          {/* Closing */}
          {emailContent.closing && hasVariables(emailContent.closing) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Closing</div>
              <div style={{
                padding: '8px 12px',
                background: '#0f1729',
                borderRadius: '6px',
                color: '#e5e7eb',
              }}>
                {replaceVariables(emailContent.closing)}
              </div>
            </div>
          )}

          {/* No Variables Found */}
          {variableCount === 0 && (
            <div style={{
              padding: '16px',
              background: '#0f1729',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#9aa7bd',
              fontSize: '12px',
            }}>
              <RefreshCw size={16} style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
              No personalization variables found in email content
            </div>
          )}
        </div>
      )}

      {/* Variable Reference */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f1729',
        borderRadius: '6px',
        border: '1px solid #293245',
      }}>
        <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '8px' }}>Available Variables:</div>
        <div style={{ fontSize: '12px', color: '#e5e7eb', fontFamily: 'monospace', lineHeight: 1.8 }}>
          <div>{'{{firstName}}'} → {recipient.firstName || 'Not set'}</div>
          <div>{'{{lastName}}'} → {recipient.lastName || 'Not set'}</div>
          <div>{'{{companyName}}'} → {recipient.companyName || 'Not set'}</div>
          <div>{'{{senderName}}'} → {sender || 'Not set'}</div>
          <div>{'{{productName}}'} → {productName || 'Not set'}</div>
        </div>
      </div>
    </div>
  );
}
