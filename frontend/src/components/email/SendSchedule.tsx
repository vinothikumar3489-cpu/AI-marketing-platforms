import { useState } from 'react';
import { Send, Calendar, Clock, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface SendScheduleProps {
  recipientEmail?: string;
  onSendNow: (email: string) => Promise<void>;
  onSchedule: (email: string, scheduledAt: string) => Promise<void>;
  onCancelSchedule?: (scheduledId: string) => Promise<void>;
  isLoading?: boolean;
  canSend?: boolean;
  scheduledInfo?: {
    scheduledId: string;
    scheduledAt: string;
  };
}

export function SendSchedule({
  recipientEmail,
  onSendNow,
  onSchedule,
  onCancelSchedule,
  isLoading = false,
  canSend = false,
  scheduledInfo,
}: SendScheduleProps) {
  const [email, setEmail] = useState(recipientEmail || '');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendNow = async () => {
    if (!email.trim() || !onSendNow) return;
    
    setSending(true);
    setResult(null);
    
    try {
      await onSendNow(email);
      setResult({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
      setResult({ success: false, message: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!email.trim() || !scheduledDate || !scheduledTime || !onSchedule) return;
    
    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    
    setSending(true);
    setResult(null);
    
    try {
      await onSchedule(email, scheduledAt);
      setResult({ success: true, message: `Email scheduled for ${scheduledAt}` });
    } catch (error) {
      setResult({ success: false, message: 'Failed to schedule email' });
    } finally {
      setSending(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!scheduledInfo?.scheduledId || !onCancelSchedule) return;
    
    setSending(true);
    setResult(null);
    
    try {
      await onCancelSchedule(scheduledInfo.scheduledId);
      setResult({ success: true, message: 'Scheduled email cancelled' });
    } catch (error) {
      setResult({ success: false, message: 'Failed to cancel scheduled email' });
    } finally {
      setSending(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidEmail = validateEmail(email);
  const isValidSchedule = scheduledDate && scheduledTime && new Date(`${scheduledDate}T${scheduledTime}`) > new Date();

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
        <Send size={16} />
        Send Email
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
          Recipient Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
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

      {/* Mode Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          background: '#0f1729',
          padding: '4px',
          borderRadius: '6px',
        }}>
          <button
            onClick={() => setMode('now')}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: mode === 'now' ? '#53a7ff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: mode === 'now' ? 'white' : '#9aa7bd',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Send size={14} />
            Send Now
          </button>
          <button
            onClick={() => setMode('schedule')}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: mode === 'schedule' ? '#53a7ff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: mode === 'schedule' ? 'white' : '#9aa7bd',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calendar size={14} />
            Schedule
          </button>
        </div>
      </div>

      {/* Schedule Inputs */}
      {mode === 'schedule' && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#0f1729',
          borderRadius: '6px',
          border: '1px solid #293245',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9aa7bd',
              marginBottom: '4px',
              display: 'block',
            }}>
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#151d2b',
                border: '1px solid #293245',
                borderRadius: '4px',
                color: '#e5e7eb',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9aa7bd',
              marginBottom: '4px',
              display: 'block',
            }}>
              Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#151d2b',
                border: '1px solid #293245',
                borderRadius: '4px',
                color: '#e5e7eb',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          {scheduledDate && scheduledTime && !isValidSchedule && (
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#ff4757',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <AlertTriangle size={12} />
              Schedule time must be in the future
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {mode === 'now' ? (
          <button
            onClick={handleSendNow}
            disabled={!isValidEmail || sending || isLoading || !canSend}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: canSend && isValidEmail ? '#10e18b' : '#293245',
              border: canSend && isValidEmail ? '1px solid #10e18b' : '1px solid #3b4d61',
              borderRadius: '6px',
              color: canSend && isValidEmail ? '#0f1729' : '#9aa7bd',
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
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        ) : (
          <button
            onClick={handleSchedule}
            disabled={!isValidEmail || !isValidSchedule || sending || isLoading || !canSend}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: canSend && isValidEmail && isValidSchedule ? '#53a7ff' : '#293245',
              border: canSend && isValidEmail && isValidSchedule ? '1px solid #53a7ff' : '1px solid #3b4d61',
              borderRadius: '6px',
              color: canSend && isValidEmail && isValidSchedule ? 'white' : '#9aa7bd',
              cursor: (!isValidEmail || !isValidSchedule || sending || isLoading || !canSend) ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (!isValidEmail || !isValidSchedule || sending || isLoading || !canSend) ? 0.5 : 1,
            }}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Calendar size={16} />}
            {sending ? 'Scheduling...' : 'Schedule Email'}
          </button>
        )}

        {/* Cancel Schedule Button */}
        {scheduledInfo && onCancelSchedule && (
          <button
            onClick={handleCancelSchedule}
            disabled={sending || isLoading}
            style={{
              padding: '10px 16px',
              background: '#ff4757',
              border: '1px solid #ff4757',
              borderRadius: '6px',
              color: 'white',
              cursor: sending || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: sending || isLoading ? 0.5 : 1,
            }}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <X size={16} />}
            Cancel
          </button>
        )}
      </div>

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

      {/* Scheduled Info */}
      {scheduledInfo && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(16, 225, 139, 0.1)',
          borderRadius: '6px',
          border: '1px solid #10e18b',
        }}>
          <div style={{
            fontSize: '12px',
            color: '#10e18b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
          }}>
            <Clock size={14} />
            Scheduled for {new Date(scheduledInfo.scheduledAt).toLocaleString()}
          </div>
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
          Approve the email before sending
        </div>
      )}
    </div>
  );
}
