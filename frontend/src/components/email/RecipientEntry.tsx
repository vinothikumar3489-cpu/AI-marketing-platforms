import { useState } from 'react';
import { Mail, User, Building, Check, X, AlertTriangle } from 'lucide-react';

interface RecipientEntryProps {
  recipient: {
    email?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  onChange: (recipient: any) => void;
  onValidate?: (recipient: any) => { valid: boolean; errors: string[] };
  readOnly?: boolean;
}

export function RecipientEntry({ recipient, onChange, onValidate, readOnly = false }: RecipientEntryProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (field: string, value: string) => {
    const newRecipient = { ...recipient, [field]: value };
    onChange(newRecipient);

    if (touched && onValidate) {
      const validation = onValidate(newRecipient);
      setErrors(validation.errors);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (onValidate) {
      const validation = onValidate(recipient);
      setErrors(validation.errors);
    }
  };

  const emailValid = recipient.email ? validateEmail(recipient.email) : false;
  const hasErrors = errors.length > 0;

  return (
    <div style={{
      background: '#151d2b',
      padding: '20px',
      borderRadius: '8px',
      border: `1px solid ${hasErrors ? '#ff4757' : '#293245'}`,
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#e5e7eb',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #293245',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Mail size={16} />
        Recipient Information
      </h3>

      {/* Email */}
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
          Email Address *
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="email"
            value={recipient.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={handleBlur}
            disabled={readOnly}
            placeholder="recipient@example.com"
            style={{
              width: '100%',
              padding: '8px 12px',
              paddingRight: '36px',
              background: '#0f1729',
              border: `1px solid ${touched && recipient.email && !emailValid ? '#ff4757' : '#293245'}`,
              borderRadius: '6px',
              color: '#e5e7eb',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          {touched && recipient.email && (
            <div style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}>
              {emailValid ? (
                <Check size={16} color="#10e18b" />
              ) : (
                <X size={16} color="#ff4757" />
              )}
            </div>
          )}
        </div>
        {touched && recipient.email && !emailValid && (
          <div style={{
            marginTop: '4px',
            fontSize: '11px',
            color: '#ff4757',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <AlertTriangle size={12} />
            Please enter a valid email address
          </div>
        )}
      </div>

      {/* First Name */}
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
          <User size={12} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
          First Name
        </label>
        <input
          type="text"
          value={recipient.firstName || ''}
          onChange={(e) => handleChange('firstName', e.target.value)}
          disabled={readOnly}
          placeholder="John"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Last Name */}
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
          Last Name
        </label>
        <input
          type="text"
          value={recipient.lastName || ''}
          onChange={(e) => handleChange('lastName', e.target.value)}
          disabled={readOnly}
          placeholder="Smith"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Company Name */}
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
          <Building size={12} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
          Company Name
        </label>
        <input
          type="text"
          value={recipient.companyName || ''}
          onChange={(e) => handleChange('companyName', e.target.value)}
          disabled={readOnly}
          placeholder="Acme Inc."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Validation Errors */}
      {hasErrors && (
        <div style={{
          marginTop: '16px',
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
            <AlertTriangle size={14} />
            Validation Errors
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '11px',
            color: '#ff4757',
          }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Personalization Preview */}
      {recipient.firstName && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#0f1729',
          borderRadius: '6px',
          border: '1px solid #293245',
        }}>
          <div style={{
            fontSize: '11px',
            color: '#9aa7bd',
            marginBottom: '8px',
          }}>
            Available Personalization Variables:
          </div>
          <div style={{
            fontSize: '12px',
            color: '#e5e7eb',
            fontFamily: 'monospace',
            lineHeight: 1.8,
          }}>
            <div>{'{{firstName}}'} → {recipient.firstName}</div>
            {recipient.lastName && <div>{'{{lastName}}'} → {recipient.lastName}</div>}
            {recipient.companyName && <div>{'{{companyName}}'} → {recipient.companyName}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
