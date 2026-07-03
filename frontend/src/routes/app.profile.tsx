import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { getAuthUser, clearAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const navigate = useNavigate();
  const user = getAuthUser();

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/login" });
  };

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your Account & Workspace"
        description="Manage your profile details, security settings, and workspace preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="User Profile">
          <div className="space-y-3 text-sm">
            <div className="rounded-3xl bg-white/5 p-5 border border-white/10">
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Name</div>
              <div className="text-sm font-medium">{user?.name || "ΓÇö"}</div>
            </div>
            <div className="rounded-3xl bg-white/5 p-5 border border-white/10">
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Email</div>
              <div className="text-sm font-medium">{user?.email || "ΓÇö"}</div>
            </div>
            <div className="rounded-3xl bg-white/5 p-5 border border-white/10">
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Role</div>
              <div className="text-sm font-medium">Member</div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 font-medium hover:bg-red-500/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </Section>

        <Section title="Workspace Preferences">
          <div className="space-y-3 text-sm">
            <div className="rounded-3xl bg-white/5 p-5 border border-white/10">
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Workspace</div>
              <div className="text-sm font-medium">AI Marketing Ops</div>
            </div>
            <div className="rounded-3xl bg-white/5 p-5 border border-white/10">
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Plan</div>
              <div className="text-sm font-medium">Growth ΓÇö 12 seats</div>
            </div>
            <div className="rounded-3xl bg-white/5 p-5 border border-white/10">
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Region</div>
              <div className="text-sm font-medium">US East</div>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
