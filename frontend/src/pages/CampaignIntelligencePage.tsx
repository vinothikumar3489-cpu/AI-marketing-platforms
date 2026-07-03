import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asText } from '../lib/normalizers';
import { Card, EmptyState, PageHeader } from '../components/UI';
const tabs=['Campaign','Content Studio','Analytics','ROI Optimizer'];
export default function CampaignIntelligencePage(){ const {selectedChatId}=useProject(); const [active,setActive]=useState(tabs[0]); const [data,setData]=useState<any>({}); useEffect(()=>{ if(selectedChatId) api.get(`/chats/${selectedChatId}/campaign-intelligence`).then(setData).catch((e)=>console.warn('Campaign intelligence load failed:', e)); },[selectedChatId]); return <div><PageHeader eyebrow="Campaign Intelligence" title="Campaign Command Center" subtitle="Generate campaigns, content, forecasts, and ROI plans from saved analysis."/><Card><div className="tab-row">{tabs.map(t=><button key={t} className={active===t?'active':''} onClick={()=>setActive(t)}>{t}</button>)}</div><Module title={active} data={data[active.toLowerCase().replaceAll(' ','')] || data}/></Card></div>}
function Module({title,data}:any){ const arr=asArray(data); return <div><h2>{title}</h2>{!arr.length?<EmptyState title={`No ${title} data`} text="Run Growth Workspace or campaign generation first."/>:<div className="result-grid">{arr.slice(0,20).map((x:any,i:number)=><Card key={i}>{typeof x==='object'?Object.entries(x).slice(0,8).map(([k,v]:any)=><p key={k}><b>{k}:</b> {asText(v)}</p>):<p>{asText(x)}</p>}</Card>)}</div>}</div>}
