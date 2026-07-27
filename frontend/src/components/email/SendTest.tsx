import { useState } from 'react';
import { Send, Mail, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface SendTestProps {
  recipientEmail?: string;
  onSendTest: (email: string) => Promise<void>;
  isLoading?: boolean;
  canSend?: boolean;
}

export function SendTest({ recipientEmail, onSendTest, isLoading = false, canSend = false }: SendTestProps) {
  const [email, setEmail] = useState(recipientEmail || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!email.trim() || !onSendTest) return;
    
    setSending(true);
    setResult(null);
    
    try {
      await onSendTest(email);
      setResult({ success: true, message: 'Test email sent successfully!' });
    } catch (error) {
      setResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setSending(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidEmail = validateEmail(email);

  return (
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
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Mail size={16} />
        Send Test Email
      </h3>

      {/* Email Input */}
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
          Test Recipient Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#0f1729',
            border: `1px solid ${email && !isValidEmail ? '#ff4757' : '#293245'}`,
            borderRadius: '6px',
            color: '#e5e7eb',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        {email && !isValidEmail && (
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

      {/* Send Button */}
      <button
        onClick={handleSendTest}
        disabled={!isValidEmail || sending || isLoading || !canSend}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: canSend && isValidEmail ? '#53a7ff' : '#293245',
          border: canSend && isValidEmail ? '1px solid #53a7ff' : '1px solid #3b4d61',
          borderRadius: '6px',
          color: canSend && isValidEmail ? 'white' : '#9aa7bd',
          cursor: (!isValidEmail || sending || isLoading || !canSend) ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          opacity: (!isValidEmail || sending || isLoading || !canSend) ? 0.5 : 1,
        }}
      >
        {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        {sending ? 'Sending...' : 'Send Test Email'}
      </button>

      {/* Result Message */}
      {result && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: result.success ? 'rgba(16, 225, 139, 0.1)' : 'rgba(255, 71, 87, 0.1)',
          borderRadius: '6px',
          border: `1px solid ${result.success ? '#10e18b' : '#ff4757'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {result.success ? (
            <CheckCircle2 size={16} color="#10e18b" />
          ) : (
            <AlertTriangle size={16} color="#ff4757" />
          )}
          <span style={{
            fontSize: '12px',
            color: result.success ? '#10e18b' : '#ff4757',
          }}>
            {result.message}
          </span>
        </div>
      )}

      {/* Info Message */}
      {!canSend && (
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
          Approve the email before sending test
        </div>
      )}

      {/* Test Email Info */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f1729',
        borderRadius: '6px',
        border: '1px solid #293245',
      }}>
        <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '8px' }}>
          Test emails are marked with [TEST] prefix and do not count toward your sending limits.
        </div>
        <div style={{ fontSize: '11px', color: '#9aa7bd' }}>
          Use this to preview how your email will appear in the recipient's inbox before sending to the actual audience.
        </div>
      </div>
    </div>
  );
}
