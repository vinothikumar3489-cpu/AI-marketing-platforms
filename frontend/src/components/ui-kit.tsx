import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        {eyebrow && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full glass text-[11px] uppercase tracking-wider text-brand-cyan mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = "blue", icon }: {
  label: string; value: ReactNode; sub?: string;
  accent?: "blue" | "green" | "purple" | "cyan"; icon?: ReactNode;
}) {
  const colors = {
    blue: "from-brand-blue/20 to-transparent text-brand-blue",
    green: "from-brand-green/20 to-transparent text-brand-green",
    purple: "from-brand-purple/20 to-transparent text-brand-purple",
    cyan: "from-brand-cyan/20 to-transparent text-brand-cyan",
  }[accent];
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-white/20 transition-all">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", colors)} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          {icon && <div className={cn("opacity-80", colors.split(" ").pop())}>{icon}</div>}
        </div>
        <div className="text-3xl font-display font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>}
      </div>
    </div>
  );
}

export function Section({ title, description, children, actions }: {
  title: string; description?: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function ScoreBar({ value, max = 100, color = "blue" }: {
  value: number; max?: number; color?: "blue" | "green" | "purple" | "cyan";
}) {
  const pct = Math.min(100, (value / max) * 100);
  const grad = {
    blue: "from-brand-blue to-brand-cyan",
    green: "from-brand-green to-brand-cyan",
    purple: "from-brand-purple to-brand-blue",
    cyan: "from-brand-cyan to-brand-blue",
  }[color];
  return (
    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
      <div className={cn("h-full bg-gradient-to-r rounded-full transition-all", grad)} style={{ width: `${pct}%` }} />
    </div>
  );
}
