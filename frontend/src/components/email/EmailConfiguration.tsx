import { useState } from 'react';
import { Settings, Mail, Target, User, Building, Sparkles } from 'lucide-react';

interface EmailConfigurationProps {
  config: {
    emailType?: string;
    goal?: string;
    tone?: string;
    audience?: string;
    language?: string;
    sender?: {
      name?: string;
      email?: string;
      replyTo?: string;
    };
  };
  onChange: (config: any) => void;
  readOnly?: boolean;
}

const EMAIL_TYPES = [
  'Product Announcement',
  'Promotional',
  'Newsletter',
  'Welcome',
  'Re-engagement',
  'Abandoned Cart',
  'Transactional',
  'Nurture',
  'Event Invitation',
  'Survey'
];

const GOALS = [
  'Product Adoption',
  'Lead Generation',
  'Brand Awareness',
  'Customer Retention',
  'Sales Conversion',
  'Event Registration',
  'Feedback Collection',
  'Content Promotion'
];

const TONES = [
  'Professional',
  'Friendly',
  'Formal',
  'Casual',
  'Urgent',
  'Inspirational',
  'Educational',
  'Persuasive'
];

const LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ja',
  'ko',
  'zh'
];

export function EmailConfiguration({ config, onChange, readOnly = false }: EmailConfigurationProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleSenderChange = (field: string, value: string) => {
    onChange({
      ...config,
      sender: { ...config.sender, [field]: value }
    });
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
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Settings size={16} />
          Email Configuration
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            padding: '6px 12px',
            background: showAdvanced ? '#53a7ff' : '#293245',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </button>
      </div>

      {/* Email Type */}
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
          <Mail size={12} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
          Email Type
        </label>
        <select
          value={config.emailType || 'Product Announcement'}
          onChange={(e) => handleChange('emailType', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {EMAIL_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Goal */}
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
          <Target size={12} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
          Goal
        </label>
        <select
          value={config.goal || 'Product Adoption'}
          onChange={(e) => handleChange('goal', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {GOALS.map(goal => (
            <option key={goal} value={goal}>{goal}</option>
          ))}
        </select>
      </div>

      {/* Tone */}
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
          <Sparkles size={12} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
          Tone
        </label>
        <select
          value={config.tone || 'Professional'}
          onChange={(e) => handleChange('tone', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {TONES.map(tone => (
            <option key={tone} value={tone}>{tone}</option>
          ))}
        </select>
      </div>

      {/* Audience */}
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
          Target Audience
        </label>
        <input
          type="text"
          value={config.audience || ''}
          onChange={(e) => handleChange('audience', e.target.value)}
          disabled={readOnly}
          placeholder="e.g., Marketing Managers, CTOs, Small Business Owners"
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

      {/* Language */}
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
          Language
        </label>
        <select
          value={config.language || 'en'}
          onChange={(e) => handleChange('language', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0f1729',
            border: '1px solid #293245',
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #293245',
        }}>
          <h4 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#e5e7eb',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Building size={14} />
            Sender Information
          </h4>

          {/* Sender Name */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9aa7bd',
              marginBottom: '4px',
              display: 'block',
            }}>
              Sender Name
            </label>
            <input
              type="text"
              value={config.sender?.name || ''}
              onChange={(e) => handleSenderChange('name', e.target.value)}
              disabled={readOnly}
              placeholder="e.g., John Smith, Company Name"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#0f1729',
                border: '1px solid #293245',
                borderRadius: '6px',
                color: '#e5e7eb',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Sender Email */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9aa7bd',
              marginBottom: '4px',
              display: 'block',
            }}>
              Sender Email
            </label>
            <input
              type="email"
              value={config.sender?.email || ''}
              onChange={(e) => handleSenderChange('email', e.target.value)}
              disabled={readOnly}
              placeholder="e.g., john@company.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#0f1729',
                border: '1px solid #293245',
                borderRadius: '6px',
                color: '#e5e7eb',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Reply-To Email */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9aa7bd',
              marginBottom: '4px',
              display: 'block',
            }}>
              Reply-To Email
            </label>
            <input
              type="email"
              value={config.sender?.replyTo || ''}
              onChange={(e) => handleSenderChange('replyTo', e.target.value)}
              disabled={readOnly}
              placeholder="e.g., support@company.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#0f1729',
                border: '1px solid #293245',
                borderRadius: '6px',
                color: '#e5e7eb',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
