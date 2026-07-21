import { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X, Save, RotateCcw } from 'lucide-react';

interface EmailEditorProps {
  emailData: any;
  onChange: (field: string, value: any) => void;
  onSave?: () => void;
  onReset?: () => void;
  readOnly?: boolean;
}

export function EmailEditor({ emailData, onChange, onSave, onReset, readOnly = false }: EmailEditorProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editingField]);

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = () => {
    if (editingField) {
      onChange(editingField, editValue);
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const renderEditableField = (
    label: string,
    field: string,
    value: string,
    multiline = false,
    maxLength?: number
  ) => {
    const isEditing = editingField === field;
    const charCount = value?.length || 0;
    const isNearLimit = maxLength && charCount > maxLength * 0.9;
    const isOverLimit = maxLength && charCount > maxLength;

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}>
          <label style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#9aa7bd',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {label}
          </label>
          {maxLength && (
            <span style={{
              fontSize: '11px',
              color: isOverLimit ? '#ff4757' : isNearLimit ? '#ffb347' : '#6b7280',
            }}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>

        {isEditing && !readOnly ? (
          <div style={{ position: 'relative' }}>
            {multiline ? (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px 12px',
                  background: '#0f1729',
                  border: `1px solid ${isOverLimit ? '#ff4757' : '#293245'}`,
                  borderRadius: '6px',
                  color: '#e5e7eb',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0f1729',
                  border: `1px solid ${isOverLimit ? '#ff4757' : '#293245'}`,
                  borderRadius: '6px',
                  color: '#e5e7eb',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            )}
            <div style={{
              position: 'absolute',
              right: '8px',
              top: multiline ? '8px' : '6px',
              display: 'flex',
              gap: '4px',
            }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '4px',
                  background: '#10e18b',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Check size={14} color="#0f1729" />
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '4px',
                  background: '#ff4757',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} color="white" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !readOnly && handleEdit(field, value)}
            style={{
              padding: '10px 12px',
              background: '#0f1729',
              border: `1px solid ${isOverLimit ? '#ff4757' : '#293245'}`,
              borderRadius: '6px',
              color: '#e5e7eb',
              fontSize: '13px',
              lineHeight: 1.5,
              cursor: readOnly ? 'default' : 'pointer',
              position: 'relative',
              minHeight: multiline ? '60px' : 'auto',
              wordBreak: 'break-word',
            }}
          >
            {value || <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Click to edit...</span>}
            {!readOnly && (
              <Edit3
                size={14}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  color: '#9aa7bd',
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEditableArray = (
    label: string,
    field: string,
    items: string[],
    placeholder = 'Add item...'
  ) => {
    const isEditing = editingField === field;
    const itemsArray = Array.isArray(items) ? items : [];

    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#9aa7bd',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '6px',
          display: 'block',
        }}>
          {label}
        </label>

        {isEditing && !readOnly ? (
          <div>
            {itemsArray.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...itemsArray];
                    newItems[index] = e.target.value;
                    setEditValue(JSON.stringify(newItems));
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#0f1729',
                    border: '1px solid #293245',
                    borderRadius: '6px',
                    color: '#e5e7eb',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => {
                    const newItems = itemsArray.filter((_, i) => i !== index);
                    onChange(field, newItems);
                  }}
                  style={{
                    padding: '8px',
                    background: '#ff4757',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} color="white" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newItems = [...itemsArray, ''];
                onChange(field, newItems);
              }}
              style={{
                padding: '8px 16px',
                background: '#53a7ff',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              + Add Item
            </button>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  onChange(field, JSON.parse(editValue));
                  setEditingField(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#10e18b',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#0f1729',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  background: '#ff4757',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !readOnly && handleEdit(field, JSON.stringify(itemsArray))}
            style={{
              padding: '10px 12px',
              background: '#0f1729',
              border: '1px solid #293245',
              borderRadius: '6px',
              cursor: readOnly ? 'default' : 'pointer',
              position: 'relative',
            }}
          >
            {itemsArray.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#e5e7eb', fontSize: '13px' }}>
                {itemsArray.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Click to add items...</span>
            )}
            {!readOnly && (
              <Edit3
                size={14}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  color: '#9aa7bd',
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginBottom: '16px',
      }}>
        {onReset && (
          <button
            onClick={onReset}
            style={{
              padding: '8px 16px',
              background: '#ff4757',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
        {onSave && (
          <button
            onClick={onSave}
            style={{
              padding: '8px 16px',
              background: '#10e18b',
              border: 'none',
              borderRadius: '6px',
              color: '#0f1729',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Save size={14} />
            Save Draft
          </button>
        )}
      </div>

      {/* Email Configuration */}
      <div style={{
        background: '#151d2b',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #293245',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#e5e7eb',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #293245',
        }}>
          Email Content
        </h3>

        {/* Subject Line */}
        {renderEditableField('Subject Line', 'subject', emailData?.subject || '', false, 70)}

        {/* Preview Text */}
        {renderEditableField('Preview Text', 'previewText', emailData?.previewText || '', false, 150)}

        {/* Greeting */}
        {renderEditableField('Greeting', 'greeting', emailData?.greeting || '', true)}

        {/* Headline */}
        {renderEditableField('Headline', 'headline', emailData?.headline || '', true)}

        {/* Opening */}
        {renderEditableField('Opening', 'opening', emailData?.opening || '', true)}

        {/* Pain Point */}
        {renderEditableField('Pain Point', 'painPoint', emailData?.painPoint || '', true)}

        {/* Solution */}
        {renderEditableField('Solution', 'solution', emailData?.solution || '', true)}

        {/* Benefits */}
        {renderEditableArray('Benefits', 'benefits', emailData?.benefits || [])}

        {/* Body Paragraphs */}
        {renderEditableArray('Body Paragraphs', 'bodyParagraphs', emailData?.bodyParagraphs || [])}

        {/* Social Proof */}
        {renderEditableField('Social Proof', 'socialProof', emailData?.socialProof || '', true)}

        {/* CTA Label */}
        {renderEditableField('CTA Label', 'ctaLabel', emailData?.primaryCta?.label || '', false)}

        {/* CTA URL */}
        {renderEditableField('CTA URL', 'ctaUrl', emailData?.primaryCta?.url || '', false)}

        {/* Closing */}
        {renderEditableField('Closing', 'closing', emailData?.closing || '', true)}

        {/* Signature */}
        {renderEditableField('Signature', 'signature', emailData?.signature || '', true)}

        {/* Postscript */}
        {renderEditableField('Postscript', 'postscript', emailData?.postscript || '', true)}

        {/* Compliance Footer */}
        {renderEditableField('Compliance Footer', 'complianceFooter', emailData?.complianceFooter || '', true)}

        {/* Unsubscribe Text */}
        {renderEditableField('Unsubscribe Text', 'unsubscribeText', emailData?.unsubscribeText || '', false)}
      </div>
    </div>
  );
}
