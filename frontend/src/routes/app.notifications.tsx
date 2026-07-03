import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Section } from "@/components/ui-kit";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/notifications");
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Unable to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    try {
      await api.delete("/api/notifications/clear");
      loadNotifications();
    } catch (error) {
      console.error("Unable to clear notifications", error);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Notifications" description="View recent activity, analysis updates, and product alerts." />
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="text-sm text-muted-foreground">{notifications.length} notifications</div>
        <button onClick={clearAll} disabled={loading} className="px-4 h-10 rounded-xl glass text-sm font-semibold hover:border-white/20 disabled:opacity-60">
          Clear all
        </button>
      </div>
      <Section title="Recent Activity">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className={`rounded-3xl border p-5 ${notification.read ? "bg-background" : "bg-white/5 border-brand-blue/30"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{notification.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{notification.message}</div>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{notification.type}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
