import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, CheckCircle2, Clock, User, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { Card, Badge } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { listCRMTasks, createCRMTask, completeCRMTask } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';
import { CRMEmptyState } from './CRMEmptyState';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ff4757',
  medium: '#ffb347',
  low: '#53a7ff',
};

const PRIORITIES = ['high', 'medium', 'low'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245',
  borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export function CRMTasksPage() {
  const { selectedChatId } = useProject();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '', dueAt: '' });
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChatId) { setLoading(false); return; }
    loadTasks();
  }, [selectedChatId]);

  async function loadTasks() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const result = await listCRMTasks(selectedChatId, params);
      setTasks(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedChatId) loadTasks();
  }, [statusFilter, priorityFilter]);

  async function handleCreate() {
    if (!selectedChatId || !form.title.trim()) return;
    setSaving(true);
    try {
      await createCRMTask(selectedChatId, form);
      toast.success('Task created');
      setForm({ title: '', description: '', priority: 'medium', assignedTo: '', dueAt: '' });
      setShowForm(false);
      await loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(taskId: string) {
    if (!selectedChatId) return;
    setCompletingId(taskId);
    try {
      await completeCRMTask(selectedChatId, taskId);
      toast.success('Task completed');
      await loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete task');
    } finally {
      setCompletingId(null);
    }
  }

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    return t.title?.toLowerCase().includes(q) || t.assignedTo?.toLowerCase().includes(q);
  });

  if (loading) return <CRMLoadingState message="Loading tasks..." />;
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px', background: '#0f1729', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.2)' }}>
        <AlertTriangle size={36} style={{ color: '#ff4757' }} />
        <div style={{ color: '#ff8a8a', fontSize: '14px' }}>{error}</div>
        <button onClick={loadTasks} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: '#ffb347' }} /> Tasks
          </div>
          <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>{filtered.length} tasks</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff',
          background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {showForm && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={selectStyle}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Assigned To</label>
                <input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Person or team" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Due Date</label>
                <input type="date" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={handleCreate} disabled={saving || !form.title.trim()} style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid #10e18b',
                background: 'rgba(16,225,139,0.15)', color: '#10e18b', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {saving ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
                Create Task
              </button>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7a93' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ ...inputStyle, paddingLeft: '30px' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '130px' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '130px' }}>
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {filtered.length === 0 && !loading ? (
        <CRMEmptyState title="No Tasks Found" message={search ? 'Try a different search term.' : 'Create your first task to get started.'} action={!search ? { label: 'Add Task', onClick: () => setShowForm(true) } : undefined} />
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map(task => {
            const isCompleted = task.status === 'completed';
            return (
              <Card key={task.id} style={{ opacity: isCompleted ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => handleComplete(task.id)} disabled={isCompleted || completingId === task.id} style={{
                    width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${isCompleted ? '#10e18b' : '#293245'}`,
                    background: isCompleted ? '#10e18b' : 'transparent', cursor: isCompleted ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {completingId === task.id ? <Loader2 size={12} className="spin" style={{ color: '#fff' }} /> : isCompleted ? <CheckCircle2 size={12} style={{ color: '#fff' }} /> : null}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, textDecoration: isCompleted ? 'line-through' : 'none' }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7a93', marginTop: '2px', flexWrap: 'wrap' }}>
                      {task.description && <span style={{ color: '#9aa7bd' }}>{task.description}</span>}
                      {task.assignedTo && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {task.assignedTo}</span>}
                      {task.dueAt && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {new Date(task.dueAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'blue'}>
                      {task.priority}
                    </Badge>
                    {task.status === 'completed' && <CheckCircle2 size={14} style={{ color: '#10e18b' }} />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
