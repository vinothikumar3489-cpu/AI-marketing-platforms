import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Globe, MapPin, Briefcase, Loader2, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { listCRMCompanies, createCRMCompany, updateCRMCompany } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';
import { CRMEmptyState } from './CRMEmptyState';

interface Props {
  onViewCompany?: (companyId: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245',
  borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
};

export function CRMCompaniesPage({ onViewCompany }: Props) {
  const { selectedChatId } = useProject();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', industry: '', website: '', location: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedChatId) { setLoading(false); return; }
    loadCompanies();
  }, [selectedChatId]);

  async function loadCompanies() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const result = await listCRMCompanies(selectedChatId);
      setCompanies(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!selectedChatId || !form.name.trim()) return;
    setSaving(true);
    try {
      await createCRMCompany(selectedChatId, form);
      toast.success('Company created');
      setForm({ name: '', industry: '', website: '', location: '' });
      setShowForm(false);
      await loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(company: any) {
    if (!selectedChatId) return;
    setSaving(true);
    try {
      await updateCRMCompany(selectedChatId, company.id, company);
      toast.success('Company updated');
      setExpandedId(null);
      await loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.website?.toLowerCase().includes(q);
  });

  if (loading) return <CRMLoadingState message="Loading companies..." />;
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px', background: '#0f1729', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.2)' }}>
        <AlertTriangle size={36} style={{ color: '#ff4757' }} />
        <div style={{ color: '#ff8a8a', fontSize: '14px' }}>{error}</div>
        <button onClick={loadCompanies} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} style={{ color: '#a855f7' }} /> Companies
          </div>
          <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>{filtered.length} companies</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff',
          background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add Company'}
        </button>
      </div>

      {showForm && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company Name" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Industry</label>
              <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Industry" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Website</label>
              <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, Country" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button onClick={handleCreate} disabled={saving || !form.name.trim()} style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #10e18b',
              background: 'rgba(16,225,139,0.15)', color: '#10e18b', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {saving ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
              Create Company
            </button>
          </div>
        </Card>
      )}

      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7a93' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..." style={{ ...inputStyle, paddingLeft: '30px' }} />
      </div>

      {filtered.length === 0 && !loading ? (
        <CRMEmptyState title="No Companies Found" message={search ? 'Try a different search term.' : 'Add your first company to get started.'} action={!search ? { label: 'Add Company', onClick: () => setShowForm(true) } : undefined} />
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map(company => {
            const isExpanded = expandedId === company.id;
            return (
              <Card key={company.id}>
                <div onClick={() => setExpandedId(isExpanded ? null : company.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>{company.name}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7a93', flexWrap: 'wrap' }}>
                      {company.industry && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={12} /> {company.industry}</span>}
                      {company.website && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> {company.website}</span>}
                      {company.location && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {company.location}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: '#6b7a93' }} /> : <ChevronDown size={16} style={{ color: '#6b7a93' }} />}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1d2738' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Name</label>
                        <input defaultValue={company.name} onChange={e => company.name = e.target.value} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Industry</label>
                        <input defaultValue={company.industry || ''} onChange={e => company.industry = e.target.value} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Website</label>
                        <input defaultValue={company.website || ''} onChange={e => company.website = e.target.value} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Location</label>
                        <input defaultValue={company.location || ''} onChange={e => company.location = e.target.value} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      {onViewCompany && (
                        <button onClick={() => onViewCompany(company.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #a855f7', background: 'rgba(168,85,247,0.1)', color: '#a855f7', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={12} /> View Details
                        </button>
                      )}
                      <button onClick={() => setExpandedId(null)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245', background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                      <button onClick={() => handleUpdate(company)} disabled={saving} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
