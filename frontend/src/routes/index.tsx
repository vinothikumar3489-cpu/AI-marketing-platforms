import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { ArrowRight, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Marketform Platform ΓÇö Market Intelligence & Customer Acquisition Platform" },
      { name: "description", content: "Upload your product and let AI discover your ideal market, audience, positioning, channels and campaign strategy in 10 minutes." },
      { property: "og:title", content: "AI Marketform Platform ΓÇö Turn Any Product Into a Winning Acquisition Strategy" },
      { property: "og:description", content: "Discover your market, audience, and channels with AI." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-brand-purple/20 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-blue/15 blur-3xl pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-brand grid place-items-center glow-purple">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg">AI Marketform Platform</span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a className="hover:text-foreground">Platform</a>
          <a className="hover:text-foreground">Solutions</a>
          <a className="hover:text-foreground">Pricing</a>
          <a className="hover:text-foreground">Customers</a>
        </nav>
        <Link to={isLoggedIn ? "/app" : "/login"} className="px-4 h-9 rounded-lg gradient-brand text-white text-sm font-medium flex items-center gap-1.5 glow-blue">
          Launch App <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs mb-6">
          <span className="text-muted-foreground">Powered by 12 specialized AI models</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.05] max-w-5xl mx-auto">
          Turn Any Product Into a <span className="gradient-text">Winning Customer Acquisition</span> Strategy in 10 Minutes.
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
          Upload your product and let AI discover your ideal market, audience, positioning, channels and campaign strategy ΓÇö automatically.
        </p>
        <div className="flex items-center justify-center gap-3 mt-9">
          <Link to={isLoggedIn ? "/app/product-intelligence" : "/login?redirect=/app/product-intelligence"} className="px-6 h-12 rounded-xl gradient-brand text-white font-medium flex items-center gap-2 glow-blue hover:scale-105 transition-transform">
            Start Analysis <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/app" className="px-6 h-12 rounded-xl glass text-foreground font-medium flex items-center gap-2 hover:border-white/20">
            View Live Demo
          </Link>
        </div>
      </section>

      {/* Pipeline preview */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-24">
        <div className="glass-strong rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-blue/10" />
          <div className="relative">
            <h2 className="text-3xl font-display font-bold mb-2">The complete AI acquisition pipeline</h2>
            <p className="text-muted-foreground mb-8">From product upload to ROI optimization ΓÇö fully automated.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Product","Market","Audience","Intent","Competitors","Positioning","Channels","Campaigns","Content","Analytics","ROI"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg glass text-xs font-medium">{s}</div>
                  {i < 10 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        ┬⌐ 2026 AI Marketform Platform ┬╖ Built for investor-grade demos
      </footer>
    </div>
  );
}
