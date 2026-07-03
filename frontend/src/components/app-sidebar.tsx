import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Users,
  Swords,
  Megaphone,
  Settings,
  Brain,
  History,
  SearchCheck,
  Bell,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/chat-history", label: "Chat History", icon: History },
  { to: "/app/growth-workspace", label: "Growth Workspace", icon: Upload },
  { to: "/app/seo", label: "SEO Intelligence", icon: SearchCheck },
  { to: "/app/agents", label: "AI Workflow Agents", icon: Bot },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/profile", label: "Profile", icon: Users },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      <div className="p-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl gradient-brand grid place-items-center glow-purple">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-display font-bold text-sm leading-tight">AI Marketform Platform</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Market Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                active
                  ? "bg-gradient-to-r from-primary/20 to-brand-purple/10 text-foreground border border-primary/30"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active && "text-brand-cyan")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-xl glass">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-xs font-medium">AI Engine Active</span>
        </div>
        <div className="text-[11px] text-muted-foreground">12 models running ┬╖ 96% confidence</div>
      </div>
    </aside>
  );
}
