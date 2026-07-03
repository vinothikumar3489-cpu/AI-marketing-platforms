import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loginUser, setAuthData, isAuthenticated, getAuthUser } from "@/lib/auth";
import { AxiosError } from "axios";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated() && getAuthUser()) {
      navigate({ to: "/app" });
    }
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { token, user } = await loginUser({ email, password });
      setAuthData(token, user);
      const redirectUrl = new URLSearchParams(window.location.search).get("redirect") || "/app";
      navigate({ to: redirectUrl });
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      setError(axiosError.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass rounded-[32px] border border-white/10 p-10 shadow-2xl">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.35em] text-brand-cyan mb-3">AI Marketing Platform</div>
          <h1 className="text-3xl font-display font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-3">Login to access your saved analysis chats and AI dashboards.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />

          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />

          {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">{error}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60">
            {loading ? "Signing inΓÇª" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-muted-foreground mt-6 text-center">
          New here? <Link to="/register" className="text-white underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
