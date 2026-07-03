import { Card, PageHeader } from '../components/UI';
export default function SettingsPage(){ return <div><PageHeader eyebrow="Settings" title="Settings" subtitle="Provider keys are managed only in backend environment variables."/><Card><h2>Platform Settings</h2><p>Dark SaaS UI enabled. Backend API URL is configured using VITE_API_URL.</p></Card></div>}
