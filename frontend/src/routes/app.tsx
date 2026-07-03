import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, fetchNotifications, isAuthenticated, getAuthUser, clearAuth } from "@/lib/auth";
import { ChatProvider } from "@/lib/chat-context";

type User = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!isAuthenticated()) {
        navigate({ to: "/login" });
        setAuthLoading(false);
        return;
      }

      const cachedUser = getAuthUser();
      if (cachedUser) {
        setCurrentUser(cachedUser);
      }

      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Unable to fetch current user, clearing auth", error);
        clearAuth();
        navigate({ to: "/login" });
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    const loadNotifications = async () => {
      try {
        const notifications = await fetchNotifications();
        setUnreadCount(notifications.filter((notification: Notification) => !notification.read).length);
      } catch (error) {
        console.error("Unable to fetch notifications", error);
      }
    };
    loadNotifications();
  }, [authLoading, currentUser]);

  const initials = useMemo(() => {
    if (!currentUser?.name) return "ME";
    return currentUser.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }, [currentUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-purple/10 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-blue/10 blur-3xl pointer-events-none" />

      <AppSidebar />

      <div className="flex-1 min-w-0 relative">
        <header className="h-16 border-b border-border/50 bg-background/60 backdrop-blur-xl sticky top-0 z-30 flex items-center px-6 gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Ask AI: 'What market should I target next?'"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 px-3 rounded-lg glass text-xs flex items-center gap-1.5 hover:border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan" /> AI Copilot
            </button>
            <button
              onClick={() => navigate({ to: "/app/notifications" })}
              className="relative h-9 w-9 rounded-lg glass grid place-items-center"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="h-9 min-w-[2.25rem] rounded-full gradient-brand grid place-items-center text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        <main className="p-8 max-w-[1600px] mx-auto">
          <ChatProvider>
            <Outlet />
          </ChatProvider>
        </main>
      </div>
    </div>
  );
}
