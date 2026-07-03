import { Link } from 'react-router-dom';
import { ArrowRight, Globe, LineChart, Sparkles, Users } from 'lucide-react';

export default function LandingPage() {
  return <div className="landing">
    <header className="landing-nav"><div className="brand"><span className="brand-icon"><Sparkles size={18}/></span> AI Marketform Platform</div><nav><a>Platform</a><a>Solutions</a><a>Pricing</a><a>Customers</a></nav><Link className="primary-btn small" to="/login">Launch App <ArrowRight size={15}/></Link></header>
    <section className="hero">
      <div className="pill">⚡ Powered by 12 specialized AI modules</div>
      <h1>Turn Any Product Into a <span>Winning Customer Acquisition</span> Strategy in 10 Minutes.</h1>
      <p>Upload your product and let AI discover your ideal market, audience, positioning, SEO, campaigns, and automation plan.</p>
      <div className="hero-actions"><Link to="/login" className="primary-btn">Start Analysis <ArrowRight size={16}/></Link><Link to="/login" className="secondary-btn">View Live Demo</Link></div>
      <div className="hero-grid"><div><LineChart/> Growth Strategy</div><div><Globe/> SEO + GEO</div><div><Users/> Audience Intel</div><div><Sparkles/> AI Automation</div></div>
    </section>
  </div>;
}
