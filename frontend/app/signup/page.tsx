"use client";

import { useState, useMemo } from "react";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const usernameValid = username.length >= 3;

  const passwordChecks = useMemo(
    () => [
      { label: "8+ characters", pass: password.length >= 8 },
      { label: "contains a number", pass: /\d/.test(password) },
      { label: "contains a letter", pass: /[a-zA-Z]/.test(password) },
    ],
    [password]
  );
  const passwordValid = passwordChecks.every((c) => c.pass);
  const formValid = usernameValid && emailValid && passwordValid;

  const handleSignup = async () => {
    setTouched({ username: true, email: true, password: true });
    setServerMessage(null);
    if (!formValid) return;

    setSubmitting(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerMessage({ type: "error", text: data.message || "Something went wrong. Try again." });
      } else {
        setServerMessage({ type: "success", text: data.message || "Account created." });
      }
    } catch {
      setServerMessage({ type: "error", text: "Can't reach the server. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0D0E] text-[#E8EAED] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px]">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6 text-[#5EEAD4] text-xs font-mono tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5EEAD4] animate-pulse" />
          NEW ACCOUNT
        </div>

        <h1 className="text-3xl font-semibold tracking-tight mb-1">Create your account</h1>
        <p className="text-[#8B92A8] text-sm mb-8">Takes about a minute. No credit card needed.</p>

        <div className="bg-[#15181A] border border-[#262A2D] rounded-xl p-6 space-y-5">
          {/* Username */}
          <Field
            label="Username"
            htmlFor="username"
            hint={touched.username && !usernameValid ? "Must be at least 3 characters" : undefined}
          >
            <input
              id="username"
              placeholder="jane_doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              className={inputClass(touched.username && !usernameValid)}
              autoComplete="username"
            />
          </Field>

          {/* Email */}
          <Field
            label="Email"
            htmlFor="email"
            hint={touched.email && !emailValid ? "Enter a valid email address" : undefined}
          >
            <input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={inputClass(touched.email && !emailValid)}
              autoComplete="email"
            />
          </Field>

          {/* Password */}
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className={inputClass(touched.password && !passwordValid)}
              autoComplete="new-password"
            />
            {/* Build-log style requirement checklist */}
            <div className="mt-2.5 space-y-1 font-mono text-xs">
              {passwordChecks.map((check) => (
                <div
                  key={check.label}
                  className={`flex items-center gap-1.5 transition-colors ${
                    check.pass ? "text-[#5EEAD4]" : password.length > 0 ? "text-[#5C636E]" : "text-[#3D4248]"
                  }`}
                >
                  <span className="w-3 inline-block">{check.pass ? "✓" : "·"}</span>
                  {check.label}
                </div>
              ))}
            </div>
          </Field>

          {/* Server feedback */}
          {serverMessage && (
            <div
              className={`text-sm rounded-lg px-3 py-2 border ${
                serverMessage.type === "error"
                  ? "bg-[#2A1614] border-[#4A2420] text-[#F2675A]"
                  : "bg-[#102420] border-[#1F4A3F] text-[#5EEAD4]"
              }`}
            >
              {serverMessage.text}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[#5EEAD4] text-[#0B0D0E] font-medium text-sm
                       hover:bg-[#7FF1E0] active:bg-[#4DD8C2] transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-[#5EEAD4] focus:ring-offset-2 focus:ring-offset-[#15181A]"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </div>

        <p className="text-center text-[#5C636E] text-xs mt-6">
          Already have an account?{" "}
          <a href="#" className="text-[#8B92A8] hover:text-[#E8EAED] underline underline-offset-2">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={htmlFor} className="text-xs font-medium text-[#8B92A8] tracking-wide">
          {label}
        </label>
        {hint && <span className="text-xs text-[#F2675A] font-mono">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3.5 py-2.5 rounded-lg bg-[#0B0D0E] border text-[#E8EAED] placeholder-[#4A5058]
          font-mono text-sm transition-colors
          focus:outline-none focus:ring-1
          ${
            hasError
              ? "border-[#F2675A] focus:border-[#F2675A] focus:ring-[#F2675A]"
              : "border-[#262A2D] focus:border-[#5EEAD4] focus:ring-[#5EEAD4]"
          }`;
}