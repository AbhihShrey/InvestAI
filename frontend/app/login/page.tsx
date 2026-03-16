"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login as apiLogin } from "@/lib/api";
import { AUTH_KEY } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiLogin(username.trim(), password);
      localStorage.setItem(AUTH_KEY, data.access_token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-auth-page">
      <div className="theme-auth-card">
        <h1
          className="text-center text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          InvestAI
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Sign in to your dashboard
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="theme-input w-full"
              placeholder="Username"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="theme-input w-full"
              placeholder="Password"
            />
          </div>
          {error && (
            <p className="text-center text-xs text-red" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="theme-btn-primary w-full py-2.5"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium"
            style={{ color: "var(--blue)" }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
