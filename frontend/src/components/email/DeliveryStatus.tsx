import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertTriangle, Clock, RefreshCw, Mail, Eye, MousePointer2, XCircle } from 'lucide-react';

interface DeliveryStatusProps {
  templateId?: string;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

interface DeliveryRecord {
  id: string;
  recipientEmail: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'SPAM' | 'BLOCKED' | 'FAILED' | 'CANCELLED';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  errorMessage?: string;
}

export function DeliveryStatus({ templateId, onRefresh, isLoading = false }: DeliveryStatusProps) {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (templateId) {
      loadDeliveryStatus();
    }
  }, [templateId]);

  const loadDeliveryStatus = async () => {
    if (!templateId || !onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 size={16} color="#10e18b" />;
      case 'OPENED':
        return <Eye size={16} color="#53a7ff" />;
      case 'CLICKED':
        return <MousePointer2 size={16} color="#818cf8" />;
      case 'BOUNCED':
      case 'SPAM':
      case 'BLOCKED':
      case 'FAILED':
        return <XCircle size={16} color="#ff4757" />;
      case 'CANCELLED':
        return <XCircle size={16} color="#ffb347" />;
      case 'SENT':
        return <Mail size={16} color="#53a7ff" />;
      default:
        return <Clock size={16} color="#9aa7bd" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '#10e18b';
      case 'OPENED':
        return '#53a7ff';
      case 'CLICKED':
        return '#818cf8';
      case 'BOUNCED':
      case 'SPAM':
      case 'BLOCKED':
      case 'FAILED':
        return '#ff4757';
      case 'CANCELLED':
        return '#ffb347';
      case 'SENT':
        return '#53a7ff';
      default:
        return '#9aa7bd';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ');
  };

  const calculateStats = () => {
    if (deliveries.length === 0) return null;

    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'DELIVERED' || d.status === 'OPENED' || d.status === 'CLICKED').length;
    const opened = deliveries.filter(d => d.status === 'OPENED' || d.status === 'CLICKED').length;
    const clicked = deliveries.filter(d => d.status === 'CLICKED').length;
    const bounced = deliveries.filter(d => d.status === 'BOUNCED' || d.status === 'SPAM' || d.status === 'BLOCKED' || d.status === 'FAILED').length;
    const pending = deliveries.filter(d => d.status === 'QUEUED' || d.status === 'SENT').length;

    return {
      total,
      delivered,
      opened,
      clicked,
      bounced,
      pending,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: total > 0 ? Math.round((clicked / total) * 100) : 0,
      bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0,
    };
  };

  const stats = calculateStats();

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
          <Activity size={16} />
          Delivery Status
        </h3>
        <button
          onClick={loadDeliveryStatus}
          disabled={refreshing || isLoading}
          style={{
            padding: '6px 12px',
            background: '#293245',
            border: '1px solid #3b4d61',
            borderRadius: '6px',
            color: '#e5e7eb',
            cursor: refreshing || isLoading ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: refreshing || isLoading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {!templateId ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#9aa7bd',
          fontSize: '13px',
        }}>
          Select an email template to view delivery status
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <StatCard label="Total" value={stats.total} color="#9aa7bd" />
            <StatCard label="Delivered" value={stats.delivered} color="#10e18b" percentage={stats.deliveryRate} />
            <StatCard label="Opened" value={stats.opened} color="#53a7ff" percentage={stats.openRate} />
            <StatCard label="Clicked" value={stats.clicked} color="#818cf8" percentage={stats.clickRate} />
          </div>

          {/* Additional Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <StatCard label="Bounced" value={stats.bounced} color="#ff4757" percentage={stats.bounceRate} />
            <StatCard label="Pending" value={stats.pending} color="#ffb347" />
          </div>

          {/* Delivery List */}
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
              Delivery Details
            </div>
            {deliveries.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9aa7bd',
                fontSize: '12px',
              }}>
                No delivery records found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deliveries.map((delivery) => (
                  <DeliveryItem
                    key={delivery.id}
                    delivery={delivery}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#9aa7bd',
          fontSize: '13px',
        }}>
          <Activity size={24} style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
          Loading delivery status...
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

function StatCard({ label, value, color, percentage }: StatCardProps) {
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
      <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: percentage !== undefined ? '4px' : '0' }}>
        {label}
      </div>
      {percentage !== undefined && (
        <div style={{ fontSize: '10px', color, fontWeight: 600 }}>
          {percentage}%
        </div>
      )}
    </div>
  );
}

interface DeliveryItemProps {
  delivery: DeliveryRecord;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

function DeliveryItem({ delivery, getStatusIcon, getStatusColor, getStatusLabel }: DeliveryItemProps) {
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={{
      padding: '10px 12px',
      background: '#151d2b',
      borderRadius: '4px',
      border: `1px solid ${getStatusColor(delivery.status)}30`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getStatusIcon(delivery.status)}
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: getStatusColor(delivery.status),
          }}>
            {getStatusLabel(delivery.status)}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: '#9aa7bd' }}>
          {delivery.recipientEmail}
        </span>
      </div>
      
      <div style={{ fontSize: '11px', color: '#9aa7bd', lineHeight: 1.6 }}>
        <div>Sent: {formatTimestamp(delivery.sentAt)}</div>
        {delivery.deliveredAt && <div>Delivered: {formatTimestamp(delivery.deliveredAt)}</div>}
        {delivery.openedAt && <div>Opened: {formatTimestamp(delivery.openedAt)}</div>}
        {delivery.clickedAt && <div>Clicked: {formatTimestamp(delivery.clickedAt)}</div>}
        {delivery.bouncedAt && <div>Bounced: {formatTimestamp(delivery.bouncedAt)}</div>}
        {delivery.errorMessage && (
          <div style={{ color: '#ff4757', marginTop: '4px' }}>
            Error: {delivery.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
