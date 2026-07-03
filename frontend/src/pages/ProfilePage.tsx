import { useAuth } from '../context/AuthContext';
import { Card, PageHeader } from '../components/UI';
export default function ProfilePage(){ const {user}=useAuth(); return <div><PageHeader eyebrow="Account" title="Your Account & Workspace" subtitle="Manage your AI Marketing Platform profile."/><Card><h2>Profile</h2><p><b>Name:</b> {user?.name || 'Not set'}</p><p><b>Email:</b> {user?.email || 'Not set'}</p></Card></div>}
