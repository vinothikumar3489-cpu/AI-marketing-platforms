import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building, Globe, MapPin, Briefcase, Users, DollarSign, ChevronLeft, Loader2, AlertTriangle, Edit3, Save, X } from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { getCRMCompany, updateCRMCompany, listCRMContacts, listCRMDeals } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';

interface Props {
  companyId: string;
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245',
  borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: '#6b7a93', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px',
};

export function CRMCompanyDetail({ companyId, onBack }: Props) {
  const { selectedChatId } = useProject();
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!selectedChatId || !companyId) { setLoading(false); return; }
    loadCompany();
  }, [selectedChatId, companyId]);

  async function loadCompany() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const result = await getCRMCompany(selectedChatId, companyId);
      setCompany(result);
      setEditForm({
        name: result.name || '',
        industry: result.industry || '',
        website: result.website || '',
        location: result.location || '',
        description: result.description || '',
      });
      const [c, d] = await Promise.all([
        listCRMContacts(selectedChatId, { companyId }).catch(() => []),
        listCRMDeals(selectedChatId, { companyId }).catch(() => []),
      ]);
      setContacts(Array.isArray(c) ? c : []);
      setDeals(Array.isArray(d) ? d : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedChatId) return;
    setSaving(true);
    try {
      const result = await updateCRMCompany(selectedChatId, companyId, editForm);
      setCompany((prev: any) => ({ ...prev, ...result }));
      setEditing(false);
      toast.success('Company updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  const container: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px',
    maxWidth: '1000px', margin: '0 auto',
  };

  const headerBtn: React.CSSProperties = {
    padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
    background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '12px',
    display: 'flex', alignItems: 'center', gap: '4px',
  };

  if (loading) return <div style={container}><CRMLoadingState message="Loading company details..." /></div>;
  if (error) {
    return (
      <div style={container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,71,87,0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,71,87,0.2)' }}>
          <AlertTriangle size={16} style={{ color: '#ff4757', flexShrink: 0 }} />
          <span style={{ color: '#ff8a8a', fontSize: '13px' }}>{error}</span>
        </div>
        <button onClick={loadCompany} style={headerBtn}>Retry</button>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={headerBtn}>
            <ChevronLeft size={14} /> Back
          </button>
          <span style={{ color: '#6b7a93', fontSize: '12px' }}>/</span>
          <span style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 700 }}>{company?.name || 'Company'}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{
              ...headerBtn, borderColor: '#53a7ff', color: '#53a7ff',
            }}>
              <Edit3 size={12} /> Edit
            </button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} style={{
                ...headerBtn, borderColor: '#10e18b', color: '#10e18b',
              }}>
                {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />} Save
              </button>
              <button onClick={() => { setEditing(false); setEditForm({ name: company?.name || '', industry: company?.industry || '', website: company?.website || '', location: company?.location || '', description: company?.description || '' }); }} style={headerBtn}>
                <X size={12} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} style={{ color: '#53a7ff' }} /> Company Information
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Name</label>
              {editing ? (
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
              ) : (
                <div style={{ color: '#e5e7eb', fontSize: '13px' }}>{company?.name || 'Not available'}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              {editing ? (
                <input value={editForm.industry} onChange={e => setEditForm({ ...editForm, industry: e.target.value })} style={inputStyle} placeholder="e.g. Technology, Healthcare" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e5e7eb', fontSize: '13px' }}>
                  {company?.industry ? <><Briefcase size={12} style={{ color: '#6b7a93' }} />{company.industry}</> : <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>Not specified</span>}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              {editing ? (
                <input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} style={inputStyle} placeholder="https://example.com" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#53a7ff', fontSize: '13px' }}>
                  {company?.website ? <><Globe size={12} />{company.website}</> : <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>Not specified</span>}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              {editing ? (
                <input value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} style={inputStyle} placeholder="City, Country" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e5e7eb', fontSize: '13px' }}>
                  {company?.location ? <><MapPin size={12} style={{ color: '#6b7a93' }} />{company.location}</> : <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>Not specified</span>}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              {editing ? (
                <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Company description" />
              ) : (
                <div style={{ color: '#9aa7bd', fontSize: '13px', lineHeight: 1.5 }}>
                  {company?.description || <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>No description</span>}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} style={{ color: '#a855f7' }} /> Associated Contacts ({contacts.length})
          </h4>
          {contacts.length === 0 ? (
            <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '12px' }}>No contacts associated with this company</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflow: 'auto' }}>
              {contacts.map((c: any) => (
                <div key={c.id} style={{
                  padding: '8px 10px', background: '#101622', borderRadius: '6px',
                  border: '1px solid #1d2738', fontSize: '12px',
                }}>
                  <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{c.firstName} {c.lastName}</div>
                  {c.email && <div style={{ color: '#6b7a93' }}>{c.email}</div>}
                  {c.jobTitle && <div style={{ color: '#6b7a93' }}>{c.jobTitle}</div>}
                </div>
              ))}
            </div>
          )}

          <h4 style={{ margin: '16px 0 12px 0', color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} style={{ color: '#10e18b' }} /> Deals ({deals.length})
          </h4>
          {deals.length === 0 ? (
            <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '12px' }}>No deals for this company</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflow: 'auto' }}>
              {deals.map((d: any) => (
                <div key={d.id} style={{
                  padding: '8px 10px', background: '#101622', borderRadius: '6px',
                  border: '1px solid #1d2738', fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{d.name}</span>
                    <Badge tone={d.status === 'OPEN' ? 'blue' : d.status === 'WON' ? 'green' : d.status === 'LOST' ? 'red' : 'gray'}>{d.status}</Badge>
                  </div>
                  <div style={{ color: '#6b7a93', marginTop: '2px' }}>
                    {d.value != null ? `${d.currency || 'USD'} ${d.value.toLocaleString()}` : 'Value not measured'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
