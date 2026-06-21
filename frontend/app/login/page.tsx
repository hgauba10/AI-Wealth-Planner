"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/login`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }
);

      const data = await response.json();

      if (data.message === "Login successful") {
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        router.push("/planner");
      } else {
        setError(data.message || "Couldn't sign you in. Try again.");
      }
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <main className="relative min-h-screen bg-[#020303] text-[#D8DCE0] flex items-center justify-center p-6 font-sans overflow-hidden">
      {/* Ambient vignette glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 600px 500px at 50% 18%, rgba(45,212,191,0.07), transparent 70%)",
        }}
      />
      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6 text-[#3FB8A6] text-xs font-mono tracking-wider">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FB8A6] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3FB8A6]" />
          </span>
          WELCOME BACK
        </div>

        <h1 className="text-3xl font-semibold tracking-tight mb-1 text-[#EDEFF1]">Sign in</h1>
        <p className="text-[#5C636E] text-sm mb-8">Pick up right where you left off.</p>

        <div
          className="bg-[#0A0B0C] border border-[#1A1C1E] rounded-xl p-6 space-y-5"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 20px 60px -20px rgba(0,0,0,0.8)" }}
        >
          {/* Email */}
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass(false)}
              autoComplete="email"
            />
          </Field>

          {/* Password */}
          <Field
            label="Password"
            htmlFor="password"
            action={
              <a href="#" className="text-xs text-[#6B7280] hover:text-[#D8DCE0] transition-colors">
                Forgot password?
              </a>
            }
          >
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass(false)}
              autoComplete="current-password"
            />
          </Field>

          {/* Error feedback */}
          {error && (
            <div className="text-sm rounded-lg px-3 py-2 border bg-[#1A0E0C] border-[#3A1F1A] text-[#D9695E]">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#3FB8A6] text-[#020303] font-medium text-sm
                       hover:bg-[#52CCB9] active:bg-[#359F8F] transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-[#3FB8A6] focus:ring-offset-2 focus:ring-offset-[#0A0B0C]"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="relative text-center text-[#3A3F45] text-xs mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-[#6B7280] hover:text-[#D8DCE0] underline underline-offset-2">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string;
  htmlFor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={htmlFor} className="text-xs font-medium text-[#6B7280] tracking-wide">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3.5 py-2.5 rounded-lg bg-[#020303] border text-[#D8DCE0] placeholder-[#3A3F45]
          font-mono text-sm transition-colors
          focus:outline-none focus:ring-1
          ${
            hasError
              ? "border-[#7A332C] focus:border-[#D9695E] focus:ring-[#D9695E]"
              : "border-[#1A1C1E] focus:border-[#3FB8A6] focus:ring-[#3FB8A6]/40"
          }`;
}