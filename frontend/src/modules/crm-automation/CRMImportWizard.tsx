import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { uploadCRMImport, mapCRMImportColumns, validateCRMImport, confirmCRMImport } from '../../lib/api';
import { Card } from '../../components/UI';

const STEP_LABELS = ['Upload', 'Preview', 'Map Columns', 'Validate', 'Confirm'];
const TARGET_FIELDS = [
  { value: 'skip', label: 'Skip column' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'companyName', label: 'Company Name' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'lifecycleStage', label: 'Lifecycle Stage' },
  { value: 'source', label: 'Source' },
  { value: 'consentStatus', label: 'Consent Status' },
  { value: 'website', label: 'Website' },
  { value: 'industry', label: 'Industry' },
  { value: 'location', label: 'Location' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#0f1729', border: '1px solid #293245',
  borderRadius: '8px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '6px', border: '1px solid #293245',
  background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '12px',
  display: 'flex', alignItems: 'center', gap: '6px',
};

const primaryBtnStyle: React.CSSProperties = {
  ...btnStyle, background: 'rgba(83,167,255,0.15)', border: '1px solid #53a7ff', color: '#53a7ff', fontWeight: 600,
};

export function CRMImportWizard() {
  const { selectedChatId } = useProject();
  const [step, setStep] = useState(0);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importId, setImportId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!selectedChatId) { setError('No project selected'); return; }
    if (!csvText.trim()) { setError('Paste CSV data first'); return; }
    setLoading(true); setError(null);
    try {
      const result = await uploadCRMImport(selectedChatId, csvText, fileName || 'import.csv');
      setImportId(result.id || result.importId);
      setPreview(result);
      setStep(1);
      toast.success('CSV data uploaded');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  function handleMappingChange(sourceCol: string, targetField: string) {
    setColumnMapping(prev => ({ ...prev, [sourceCol]: targetField }));
  }

  async function handleMapAndValidate() {
    if (!selectedChatId || !importId) return;
    const usedMappings = Object.fromEntries(
      Object.entries(columnMapping).filter(([, v]) => v && v !== 'skip')
    );
    setLoading(true); setError(null);
    try {
      const mapped = await mapCRMImportColumns(selectedChatId, importId, usedMappings, 'contact');
      const validated = await validateCRMImport(selectedChatId, importId);
      setValidationResult(validated);
      setStep(3);
      toast.success('Columns mapped and validated');
    } catch (err: any) {
      setError(err.message || 'Mapping/validation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!selectedChatId || !importId) return;
    setLoading(true); setError(null);
    try {
      const result = await confirmCRMImport(selectedChatId, importId);
      setImportResult(result);
      setStep(4);
      toast.success('Import completed');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  function resetWizard() {
    setStep(0); setCsvText(''); setFileName(''); setImportId(null);
    setPreview(null); setColumnMapping({}); setValidationResult(null);
    setImportResult(null); setError(null);
  }

  const columns: string[] = preview?.columns || preview?.headers || [];
  const rows: any[] = preview?.rows || preview?.data || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} style={{ color: '#53a7ff' }} /> CSV Import Wizard
        </div>
        <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>
          Import contacts and companies from CSV data
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{
            flex: 1, padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 600,
            borderRadius: '6px', background: i === step ? 'rgba(83,167,255,0.15)' : '#101622',
            color: i === step ? '#53a7ff' : i < step ? '#10e18b' : '#6b7a93',
            border: `1px solid ${i === step ? '#53a7ff' : i < step ? '#10e18b' : '#293245'}`,
          }}>
            {i < step ? <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> : null}
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: '8px', color: '#ff4757', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {step === 0 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>File Name</label>
              <input
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="contacts.csv"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: '#9aa7bd', fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>CSV Data</label>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="firstName,lastName,email,phone,company&#10;John,Doe,john@example.com,555-0123,Acme Inc"
                rows={10}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleUpload} disabled={loading || !csvText.trim()} style={primaryBtnStyle}>
                {loading ? <Loader2 className="spin" size={14} /> : <Upload size={14} />}
                Upload & Preview
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>
              Preview — {rows.length} rows, {columns.length} columns
            </div>
            {columns.length > 0 && rows.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {columns.map((col: string, i: number) => (
                        <th key={i} style={{ padding: '8px 10px', background: '#101622', color: '#9aa7bd', borderBottom: '2px solid #293245', textAlign: 'left', whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row: any, ri: number) => (
                      <tr key={ri}>
                        {columns.map((col: string, ci: number) => (
                          <td key={ci} style={{ padding: '6px 10px', borderBottom: '1px solid #1d2738', color: '#e5e7eb' }}>{row[col] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: '#6b7a93', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No preview data available</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(0)} style={btnStyle}><ArrowLeft size={14} /> Back</button>
              <button onClick={() => setStep(2)} style={primaryBtnStyle}>Map Columns <ArrowRight size={14} /></button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>Map Columns</div>
            <div style={{ color: '#6b7a93', fontSize: '12px' }}>Map each source column to a target CRM field</div>
            {columns.map((col: string) => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{col}</div>
                <div style={{ flex: 1 }}>
                  <select
                    value={columnMapping[col] || 'skip'}
                    onChange={e => handleMappingChange(col, e.target.value)}
                    style={selectStyle}
                  >
                    {TARGET_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={btnStyle}><ArrowLeft size={14} /> Back</button>
              <button onClick={handleMapAndValidate} disabled={loading} style={primaryBtnStyle}>
                {loading ? <Loader2 className="spin" size={14} /> : null}
                Validate
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>Validation Results</div>
            {validationResult && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(16,225,139,0.08)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#10e18b' }}>{validationResult.validRows ?? validationResult.valid ?? 0}</div>
                  <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Valid</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(255,71,87,0.08)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#ff4757' }}>{validationResult.invalidRows ?? validationResult.invalid ?? 0}</div>
                  <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Invalid</div>
                </div>
                <div style={{ padding: '12px 16px', background: '#101622', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#e5e7eb' }}>{validationResult.totalRows ?? validationResult.total ?? 0}</div>
                  <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Total</div>
                </div>
              </div>
            )}
            {validationResult?.errors?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflow: 'auto' }}>
                {validationResult.errors.slice(0, 20).map((err: any, i: number) => (
                  <div key={i} style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,71,87,0.05)', borderRadius: '4px', color: '#ff8a8a' }}>
                    Row {err.row || i + 1}: {err.message || err.error || JSON.stringify(err)}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={btnStyle}><ArrowLeft size={14} /> Back</button>
              <button onClick={handleConfirm} disabled={loading} style={primaryBtnStyle}>
                {loading ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                Confirm Import
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
            <CheckCircle2 size={48} style={{ color: '#10e18b' }} />
            <div style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 600 }}>Import Complete</div>
            {importResult && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div><span style={{ color: '#9aa7bd' }}>Imported:</span> <span style={{ color: '#10e18b', fontWeight: 600 }}>{importResult.importedRows ?? importResult.imported ?? 0}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Valid:</span> <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{importResult.validRows ?? importResult.valid ?? 0}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Duplicates skipped:</span> <span style={{ color: '#ffb347', fontWeight: 600 }}>{importResult.duplicateRows ?? importResult.duplicates ?? 0}</span></div>
              </div>
            )}
            <button onClick={resetWizard} style={primaryBtnStyle}>
              <Upload size={14} /> Import Another File
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
