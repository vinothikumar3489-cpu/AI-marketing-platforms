import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Archive, ChevronDown, ChevronUp, Mail, Phone, Building, User, Loader2, AlertTriangle } from 'lucide-react';
import { Card, Badge } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { listCRMContacts, createCRMContact, updateCRMContact, archiveCRMContact } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';
import { CRMEmptyState } from './CRMEmptyState';

const LIFECYCLE_STAGES = ['lead', 'mql', 'sql', 'opportunity', 'customer', 'churned'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245',
  borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export function CRMContactsPage() {
  const { selectedChatId } = useProject();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ firstName: '', lastName: '', email: '', phone: '', companyName: '', jobTitle: '', lifecycleStage: 'lead' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedChatId) { setLoading(false); return; }
    loadContacts();
  }, [selectedChatId]);

  async function loadContacts() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const result = await listCRMContacts(selectedChatId);
      setContacts(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!selectedChatId || !form.firstName.trim()) return;
    setSaving(true);
    try {
      await createCRMContact(selectedChatId, form);
      toast.success('Contact created');
      setForm({ firstName: '', lastName: '', email: '', phone: '', companyName: '', jobTitle: '', lifecycleStage: 'lead' });
      setShowForm(false);
      await loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(contact: any) {
    if (!selectedChatId) return;
    setSaving(true);
    try {
      await updateCRMContact(selectedChatId, contact.id, contact);
      toast.success('Contact updated');
      setEditingId(null);
      await loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(contactId: string) {
    if (!selectedChatId) return;
    try {
      await archiveCRMContact(selectedChatId, contactId);
      toast.success('Contact archived');
      await loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive');
    }
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const nameMatch = c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const lifecycleMatch = !lifecycleFilter || c.lifecycleStage === lifecycleFilter;
    const statusMatch = !statusFilter || c.status === statusFilter;
    return nameMatch && lifecycleMatch && statusMatch;
  });

  if (loading) return <CRMLoadingState message="Loading contacts..." />;
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px', background: '#0f1729', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.2)' }}>
        <AlertTriangle size={36} style={{ color: '#ff4757' }} />
        <div style={{ color: '#ff8a8a', fontSize: '14px' }}>{error}</div>
        <button onClick={loadContacts} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: '#53a7ff' }} /> Contacts
          </div>
          <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>{filtered.length} contacts</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff',
          background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {showForm && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>First Name *</label>
              <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First Name" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Last Name</label>
              <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last Name" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company</label>
              <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Company Name" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Job Title</label>
              <input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder="Job Title" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Lifecycle Stage</label>
              <select value={form.lifecycleStage} onChange={e => setForm({ ...form, lifecycleStage: e.target.value })} style={selectStyle}>
                {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button onClick={handleCreate} disabled={saving || !form.firstName.trim()} style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #10e18b',
              background: 'rgba(16,225,139,0.15)', color: '#10e18b', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {saving ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
              Create Contact
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7a93' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ ...inputStyle, paddingLeft: '30px' }} />
          </div>
        </div>
        <select value={lifecycleFilter} onChange={e => setLifecycleFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '140px' }}>
          <option value="">All Stages</option>
          {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '120px' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {filtered.length === 0 && !loading ? (
        <CRMEmptyState title="No Contacts Found" message={search ? 'Try a different search term.' : 'Add your first contact to get started.'} action={!search ? { label: 'Add Contact', onClick: () => setShowForm(true) } : undefined} />
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map(contact => {
            const isExpanded = expandedId === contact.id;
            const isEditing = editingId === contact.id;
            return (
              <Card key={contact.id} style={{ cursor: 'pointer' }}>
                <div onClick={() => setExpandedId(isExpanded ? null : contact.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7a93', flexWrap: 'wrap' }}>
                      {contact.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {contact.email}</span>}
                      {contact.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {contact.phone}</span>}
                      {contact.company?.name && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={12} /> {contact.company.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge tone={contact.lifecycleStage === 'customer' ? 'green' : contact.lifecycleStage === 'lead' ? 'blue' : 'yellow'}>
                      {contact.lifecycleStage}
                    </Badge>
                    {isExpanded ? <ChevronUp size={16} style={{ color: '#6b7a93' }} /> : <ChevronDown size={16} style={{ color: '#6b7a93' }} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1d2738' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input defaultValue={contact.firstName} onChange={e => contact.firstName = e.target.value} style={inputStyle} placeholder="First Name" />
                          <input defaultValue={contact.lastName || ''} onChange={e => contact.lastName = e.target.value} style={inputStyle} placeholder="Last Name" />
                          <input defaultValue={contact.email || ''} onChange={e => contact.email = e.target.value} style={inputStyle} placeholder="Email" />
                          <input defaultValue={contact.phone || ''} onChange={e => contact.phone = e.target.value} style={inputStyle} placeholder="Phone" />
                          <input defaultValue={contact.jobTitle || ''} onChange={e => contact.jobTitle = e.target.value} style={inputStyle} placeholder="Job Title" />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245', background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                          <button onClick={() => handleUpdate(contact)} disabled={saving} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                          {contact.jobTitle && <div><span style={{ color: '#6b7a93' }}>Title:</span> <span style={{ color: '#e5e7eb' }}>{contact.jobTitle}</span></div>}
                          {contact.company?.name && <div><span style={{ color: '#6b7a93' }}>Company:</span> <span style={{ color: '#e5e7eb' }}>{contact.company.name}</span></div>}
                          <div><span style={{ color: '#6b7a93' }}>Status:</span> <span style={{ color: '#e5e7eb' }}>{contact.status || 'active'}</span></div>
                          <div><span style={{ color: '#6b7a93' }}>Created:</span> <span style={{ color: '#e5e7eb' }}>{new Date(contact.createdAt).toLocaleDateString()}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingId(contact.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245', background: '#101622', color: '#53a7ff', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                          <button onClick={() => handleArchive(contact.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ff4757', background: 'rgba(255,71,87,0.1)', color: '#ff4757', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Archive size={12} /> Archive
                          </button>
                        </div>
                      </div>
                    )}
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
