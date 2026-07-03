import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState('');
  async function submit(e:any){ e.preventDefault(); setError(''); try{ await login(email,password); nav('/app/dashboard'); }catch(err:any){ setError(err.message || 'Login failed'); }}
  return <div className="auth-page"><form onSubmit={submit} className="auth-card"><div className="eyebrow">AI MARKETING PLATFORM</div><h1>Welcome back</h1><p>Login to access saved analysis chats and AI dashboards.</p>{error && <div className="error">{error}</div>}<label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary-btn full">Sign in</button><div className="auth-divider">or</div><Link to="/register" className="ghost-btn full">Create new account</Link></form></div>;
}
