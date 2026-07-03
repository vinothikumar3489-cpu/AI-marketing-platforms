import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export function PageHeader({ eyebrow, title, subtitle }: any) {
  return <div className="page-header"><div className="eyebrow">• {eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>;
}
export function Card({ children, className = '' }: any) { return <div className={`card ${className}`}>{children}</div>; }
export function Badge({ children, tone = 'blue' }: any) { return <span className={`badge ${tone}`}>{children}</span>; }
export function ScoreCard({ label, value, tone = 'purple', source, evidence }: any) { 
  return (
    <Card className={`score-card ${tone}`}>
      <div className="score-value">{value !== null && value !== undefined ? value : 'N/A'}</div>
      <div>{label}</div>
      {source && <div className="score-source" style={{ fontSize: '11px', color: '#9aa7bd', marginTop: '4px' }}>Source: {source}</div>}
      {evidence && <div className="score-evidence" style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{evidence}</div>}
      <div className="bar"><span style={{ width: `${Math.min(Number(value)||0,100)}%` }} /></div>
    </Card>
  );
}
export function EmptyState({ title='No data yet', text='Run analysis to generate results.' }: any) { return <Card className="empty"><AlertTriangle size={40}/><h3>{title}</h3><p>{text}</p></Card>; }
export function Loading({ text='Loading...' }: any) { return <div className="inline-loader"><Loader2 className="spin" size={18}/>{text}</div>; }
export function SectionTitle({ title, subtitle }: any) { return <div className="section-title"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>; }
export function Status({ ok, label }: any) { return <span className={`status ${ok ? 'ok':'pending'}`}>{ok ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>} {label}</span>; }
export * from './IntelligenceCards';
