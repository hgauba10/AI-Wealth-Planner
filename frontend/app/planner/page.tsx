"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "recharts";
import jsPDF from "jspdf";
import Link from "next/link";

// ── 3D Pie Chart (canvas-based) ──────────────────────────────────────────────
const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"];

function PieChart3D({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 - 10;
    const rx = W * 0.36;
    const ry = rx * 0.38;
    const depth = 28;
    const total = data.reduce((s, d) => s + d.value, 0);

    progressRef.current = 0;
    const start = performance.now();
    const duration = 900;

    function draw(prog: number) {
      ctx.clearRect(0, 0, W, H);
      let startAngle = -Math.PI / 2;

      const slices = data.map((d, i) => {
        const sweep = (d.value / total) * Math.PI * 2 * prog;
        const mid = startAngle + sweep / 2;
        const s = { startAngle, sweep, mid, i };
        startAngle += sweep;
        return s;
      });

      // Draw side faces (back to front)
      const sorted = [...slices].sort(
        (a, b) =>
          Math.sin(b.mid + Math.PI / 2) - Math.sin(a.mid + Math.PI / 2)
      );

      for (const sl of sorted) {
        if (sl.sweep === 0) continue;
        const col = COLORS[sl.i % COLORS.length];
        const isHov = hovered === sl.i;
        const ox = isHov ? Math.cos(sl.mid) * 8 : 0;
        const oy = isHov ? Math.sin(sl.mid) * 5 : 0;

        // side fill
        const grad = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy + depth);
        grad.addColorStop(0, col + "aa");
        grad.addColorStop(1, col + "44");
        ctx.beginPath();
        ctx.ellipse(cx + ox, cy + depth + oy, rx, ry, 0, sl.startAngle, sl.startAngle + sl.sweep);
        ctx.lineTo(
          cx + ox + Math.cos(sl.startAngle + sl.sweep) * rx,
          cy + oy + Math.sin(sl.startAngle + sl.sweep) * ry
        );
        ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, sl.startAngle + sl.sweep, sl.startAngle, true);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw top faces
      for (const sl of slices) {
        if (sl.sweep === 0) continue;
        const col = COLORS[sl.i % COLORS.length];
        const isHov = hovered === sl.i;
        const ox = isHov ? Math.cos(sl.mid) * 8 : 0;
        const oy = isHov ? Math.sin(sl.mid) * 5 : 0;

        ctx.beginPath();
        ctx.moveTo(cx + ox, cy + oy);
        ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, sl.startAngle, sl.startAngle + sl.sweep);
        ctx.closePath();
        const grad = ctx.createRadialGradient(cx + ox - rx * 0.2, cy + oy - ry * 0.2, 0, cx + ox, cy + oy, rx);
        grad.addColorStop(0, col + "ff");
        grad.addColorStop(1, col + "bb");
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Labels
      if (prog > 0.8) {
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const sl of slices) {
          if (sl.sweep < 0.25) continue;
          const lx = cx + Math.cos(sl.mid) * rx * 0.62;
          const ly = cy + Math.sin(sl.mid) * ry * 0.62;
          ctx.fillStyle = "#fff";
          ctx.fillText(`${data[sl.i].value}%`, lx, ly);
        }
      }
    }

    function animate(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      draw(ease);
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, hovered]);

  function getSliceAt(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width) - canvas.width / 2;
    const my = (e.clientY - rect.top) * (canvas.height / rect.height) - (canvas.height / 2 - 10);
    const rx = canvas.width * 0.36;
    const ry = rx * 0.38;
    if ((mx / rx) ** 2 + (my / ry) ** 2 > 1) return null;
    const angle = Math.atan2(my / ry, mx / rx);
    const total = data.reduce((s, d) => s + d.value, 0);
    let start = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const sweep = (data[i].value / total) * Math.PI * 2;
      let end = start + sweep;
      let a = angle;
      if (a < start) a += Math.PI * 2;
      if (a >= start && a < end) return i;
      start = end;
    }
    return null;
  }

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={220}
        className="cursor-pointer"
        onMouseMove={(e) => setHovered(getSliceAt(e))}
        onMouseLeave={() => setHovered(null)}
      />
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: hovered === i ? "#fff" : "#94a3b8" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {d.name} ({d.value}%)
          </div>
        ))}
      </div>
      {hovered !== null && data[hovered] && (
        <div className="absolute top-2 right-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white pointer-events-none">
          <span style={{ color: COLORS[hovered % COLORS.length] }}>●</span>{" "}
          {data[hovered].name}: <strong>{data[hovered].value}%</strong>
        </div>
      )}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label?: string;
}) {
  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 100%)" }}
        />
      </div>
      {label && (
        <p className="mt-1.5 text-sm" style={{ color: "#64748b" }}>
          {label}
        </p>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: "#0f172a", border: "1px solid #1e293b" }}
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: "#475569" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: accent || "#f1f5f9" }}>
        {value}
      </p>
      {sub && <p className="text-sm" style={{ color: "#64748b" }}>{sub}</p>}
    </div>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-widest" style={{ color: "#475569" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2";
const inputStyle = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  color: "#f1f5f9",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    city: "",
    income: "",
    expenses: "",
    savings: "",
    goal: "",
    risk: "",
    horizon: "",
  });
  const [username, setUsername] = useState("");
  useEffect(() => {

  const userId =
    localStorage.getItem("userId");

  if (!userId) {
    router.push("/login");
  }

}, [router]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {

  const userId =
    localStorage.getItem("userId");

  if (!userId) {
    router.push("/login");
  }

}, [router]);

  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [result, setResult] = useState<{
    surplus: number;
    savingsRate: number;
    healthScore: number;
    actionPlan: string[];
    recommendedEmergencyFund: number;
    emergencyProgress: number;
    goalTarget: number;
    estimatedYears: number;
    goalProgress: number;
    growth5: number;
    growth10: number;
    growth20: number;
    advice: string;
    investments: {
      name: string;
      risk: string;
      returns: string;
      allocation: number;
      explanation: string;
      institution?: string;
      steps?: string[];
    }[];
  } | null>(null);

  const set = (k: string, v: string) =>
    setFormData((prev) => ({ ...prev, [k]: v }));

  const chartData =
    result?.investments?.map((inv) => ({
      name: inv.name,
      value: inv.allocation,
    })) || [];

  const healthColor =
    result?.healthScore != null
      ? result.healthScore >= 80
        ? "#10b981"
        : result.healthScore >= 60
        ? "#6366f1"
        : result.healthScore >= 40
        ? "#f59e0b"
        : "#f43f5e"
      : "#6366f1";

  const healthLabel =
    result?.healthScore != null
      ? result.healthScore >= 80
        ? "Excellent"
        : result.healthScore >= 60
        ? "Good"
        : result.healthScore >= 40
        ? "Average"
        : "Needs Work"
      : "";
    const downloadReport = () => {
  if (!result) return;

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("AI Wealth Planner Report", 20, 20);

  doc.setFontSize(12);

  doc.text(
    `Financial Health Score: ${result.healthScore}/100`,
    20,
    40
  );

  doc.text(
  `Monthly Surplus: ₹${result.surplus.toLocaleString()}`,
  20,
  50
);

  doc.text(
    `Savings Rate: ${result.savingsRate.toFixed(2)}%`,
    20,
    60
  );

  doc.text(
  `Goal Target: ₹${result.goalTarget.toLocaleString()}`,
  20,
  70
);

  doc.text(
    `Estimated Time: ${result.estimatedYears} Years`,
    20,
    80
  );

  doc.text("AI Advice:", 20, 100);

  doc.text(
    result.advice,
    20,
    110,
    {
      maxWidth: 160,
    }
  );
let y = 140;

doc.text("Recommended Investments:", 20, y);

y += 10;

result.investments.forEach((investment) => {
  doc.text(
    `${investment.name} (${investment.allocation}%)`,
    25,
    y
  );

  y += 10;
});

y += 10;

doc.text("Action Plan:", 20, y);

y += 10;
console.log(result.actionPlan);
result.actionPlan.forEach((step) => {
  doc.text(`• ${step}`, 25, y);
  y += 10;
});

doc.save("AI-Wealth-Report.pdf");
};

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f1f5f9",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top nav bar */}
      <header
        style={{
          borderBottom: "1px solid #0f172a",
          background: "rgba(2,6,23,0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366f1,#22d3ee)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12 4.5V9.5L7 12.5L2 9.5V4.5L7 1.5Z" stroke="#fff" strokeWidth="1.4" fill="none" />
              <circle cx="7" cy="7" r="2" fill="#fff" />
            </svg>
          </div>
          <div className="flex items-center gap-4">

  {username && (
    <span style={{ color: "#94a3b8" }}>
      Welcome, {username}
    </span>
  )}

  <button
    onClick={() => {

      localStorage.removeItem("userId");
      localStorage.removeItem("username");

      router.push("/login");

    }}
    className="px-3 py-1 rounded-lg"
    style={{
      background: "#ef4444",
      color: "#fff",
    }}
  >
    Logout
  </button>

</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6366f1" }}>
            Personal Finance Intelligence
          </p>
          {username && (
  <p
    className="mb-3"
    style={{ color: "#22d3ee" }}
  >
    Welcome, {username}
  </p>
)}
          <h1
            className="text-5xl font-bold leading-tight"
            style={{
              background: "linear-gradient(135deg,#f1f5f9 30%,#6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}
          >
            Your Money,<br />Planned Precisely.
          </h1>
          <p className="mt-4 text-base max-w-md" style={{ color: "#64748b" }}>
            Enter your financial details below and get a personalised investment plan, goal projections, and actionable next steps.
          </p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-3xl p-8 mb-10"
          style={{ background: "#0a1628", border: "1px solid #1e293b" }}
        >
          <h2 className="text-lg font-semibold mb-7" style={{ color: "#94a3b8" }}>
            Financial Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { key: "name", label: "Full Name", placeholder: "Admin" },
              { key: "age", label: "Age", placeholder: "32" },
              { key: "city", label: "City", placeholder: "Gurgaon" },
              { key: "income", label: "Monthly Income (₹)", placeholder: "80,000" },
              { key: "expenses", label: "Monthly Expenses (₹)", placeholder: "45,000" },
              { key: "savings", label: "Current Savings (₹)", placeholder: "2,00,000" },
            ].map(({ key, label, placeholder }) => (
              <Field key={key} label={label}>
                <input
                  name={key}
                  placeholder={placeholder}
                  value={(formData as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className={inputCls}
                  style={{ ...inputStyle, "--tw-ring-color": "#6366f1" } as any}
                />
              </Field>
            ))}

            <Field label="Financial Goal">
              <select
                value={formData.goal}
                onChange={(e) => set("goal", e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Select goal</option>
                <option value="Wealth Creation">Wealth Creation</option>
                <option value="Retirement">Retirement</option>
                <option value="House">Buy a House</option>
                <option value="Car">Buy a Car</option>
                <option value="Emergency Fund">Emergency Fund</option>
                <option value="Child Education">Child Education</option>
              </select>
            </Field>

            <Field label="Investment Horizon">
              <select
                value={formData.horizon}
                onChange={(e) => set("horizon", e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Select horizon</option>
                <option value="1-3 Years">1–3 Years</option>
                <option value="3-5 Years">3–5 Years</option>
                <option value="5-10 Years">5–10 Years</option>
                <option value="10+ Years">10+ Years</option>
              </select>
            </Field>

            <Field label="Risk Appetite">
              <select
                value={formData.risk}
                onChange={(e) => set("risk", e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Select risk</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </Field>
          </div>

          <button
            onClick={async () => {
              setLoading(true);
              try {
                const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/analyze`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      income: Number(formData.income),
      expenses: Number(formData.expenses),
      savings: Number(formData.savings),
      risk: formData.risk,
      goal: formData.goal,
      city: formData.city,
      age: Number(formData.age),
      horizon: formData.horizon,
    }),
  }
);

                if (!response.ok) {
                  throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json();
                console.log("BACKEND RESPONSE:");
                console.log(data);

                if (!data) {
                  throw new Error("No data returned from server");
                }

                setResult({
                    surplus: data.surplus,
                    savingsRate: data.savingsRate,
                    healthScore: data.healthScore,
                    growth5: data.growth5,
                    growth10: data.growth10,
                    growth20: data.growth20,
                    investments: data.investments || [],
                    actionPlan: data.actionPlan || [],
                    recommendedEmergencyFund:
                      data.recommendedEmergencyFund || 0,
                    emergencyProgress:
                      data.emergencyProgress || 0,
                    goalTarget:
                      data.goalTarget || 0,
                    estimatedYears:
                      data.estimatedYears || 0,
                    goalProgress:
                      data.goalProgress || 0,
                    advice:
                      data.advice || "",
                  });
              } catch (error) {
                console.error("Failed to analyse finances:", error);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="mt-7 flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: loading
                ? "#1e293b"
                : "linear-gradient(135deg,#6366f1,#818cf8)",
              color: loading ? "#475569" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 0 28px #6366f144",
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#475569" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Analysing…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v14M1 8h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Analyse My Finances
              </>
            )}
          </button>
          {loading && (
  <p className="text-yellow-400 mt-3">
    AI is analyzing your finances...
  </p>
)}
          {result && (
  <button
    onClick={downloadReport}
    className="mt-4 ml-4 px-6 py-3 rounded-xl"
    style={{
      background: "#10b981",
      color: "#fff",
    }}
  >
    Download PDF Report
  </button>
)}
{result && (
  <button
    onClick={async () => {
      const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/save-plan`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
          body: JSON.stringify({
            name: formData.name,
            age: Number(formData.age),
            city: formData.city,
            income: Number(formData.income),
            expenses: Number(formData.expenses),
            savings: Number(formData.savings),
            goal: formData.goal,
            risk: formData.risk,
            horizon: formData.horizon,
            advice: result.advice,
            userId: Number(
  localStorage.getItem("userId")
),
          }),
        }
      );

      const data = await response.json();

      alert(data.message);
    }}
    className="mt-4 ml-4 px-6 py-3 rounded-xl"
    style={{
      background: "#6366f1",
      color: "#fff",
    }}
  >
    Save Plan
  </button>
)}
<button
  onClick={async () => {
    const userId = localStorage.getItem("userId");
    const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/plans/${userId}`
);

    const data = await response.json();

    setSavedPlans(data);
  }}
  className="mt-4 ml-4 px-6 py-3 rounded-xl"
  style={{
    background: "#f59e0b",
    color: "#fff",
  }}
>
  View Saved Plans
</button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Monthly Surplus"
                value={`₹${result.surplus.toLocaleString()}`}
                accent="#10b981"
              />
              <StatCard
                label="Savings Rate"
                value={`${result.savingsRate.toFixed(1)}%`}
                accent="#22d3ee"
              />
              <StatCard
                label="Health Score"
                value={`${result.healthScore}/100`}
                accent={healthColor}
                sub={healthLabel}
              />
              <StatCard
                label="Goal Target"
                value={`₹${(result.goalTarget / 100000).toFixed(1)}L`}
                accent="#f59e0b"
                sub={`${result.estimatedYears} yrs estimated`}
              />
            </div>

            {/* Two-column row: Emergency + Goal */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div
                className="rounded-3xl p-6"
                style={{ background: "#0a1628", border: "1px solid #1e293b" }}
              >
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#475569" }}>
                  Emergency Fund
                </p>
                <h3 className="text-lg font-bold mb-4">Fund Tracker</h3>
                <div className="flex justify-between text-sm mb-1" style={{ color: "#64748b" }}>
                  <span>Current ₹{Number(formData.savings).toLocaleString()}</span>
                  <span>Target ₹{result.recommendedEmergencyFund.toLocaleString()}</span>
                </div>
                <ProgressBar
                  value={result.emergencyProgress}
                  color="linear-gradient(90deg,#10b981,#22d3ee)"
                  label={`${result.emergencyProgress.toFixed(0)}% of recommended fund built`}
                />
              </div>

              <div
                className="rounded-3xl p-6"
                style={{ background: "#0a1628", border: "1px solid #1e293b" }}
              >
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#475569" }}>
                  Goal Progress
                </p>
                {result && (
  <div className="mt-8 border border-gray-700 rounded p-4">
    <h2 className="text-2xl font-bold mb-4">
      Portfolio Growth Simulator
    </h2>

    <div className="space-y-3">

      <div>
        <p className="font-semibold">
          After 5 Years
        </p>

        <p className="text-green-400 text-xl">
          ₹{result.growth5.toLocaleString()}
        </p>
      </div>

      <div>
        <p className="font-semibold">
          After 10 Years
        </p>

        <p className="text-green-400 text-xl">
          ₹{result.growth10.toLocaleString()}
        </p>
      </div>

      <div>
        <p className="font-semibold">
          After 20 Years
        </p>

        <p className="text-green-400 text-xl">
          ₹{result.growth20.toLocaleString()}
        </p>
      </div>

    </div>
  </div>
)}
                <div className="mt-6 border border-gray-700 rounded p-4">
  <h2 className="text-2xl font-bold mb-4">
    AI Financial Advisor
  </h2>

  <p className="text-gray-300">
    {result.advice}
  </p>
</div>
                <h3 className="text-lg font-bold mb-4">{formData.goal || "Your Goal"}</h3>
                <div className="flex justify-between text-sm mb-1" style={{ color: "#64748b" }}>
                  <span>Saved ₹{Number(formData.savings).toLocaleString()}</span>
                  <span>Need ₹{result.goalTarget.toLocaleString()}</span>
                </div>
                <ProgressBar
                  value={result.goalProgress}
                  color="linear-gradient(90deg,#6366f1,#a78bfa)"
                  label={`${result.goalProgress.toFixed(1)}% of goal reached — ${result.estimatedYears} yrs to close the gap`}
                />
              </div>
            </div>

            {/* 3D Pie + Allocation table */}
            <div
              className="rounded-3xl p-6"
              style={{ background: "#0a1628", border: "1px solid #1e293b" }}
            >
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#475569" }}>
                Portfolio
              </p>
              <h3 className="text-lg font-bold mb-6">Allocation Breakdown</h3>
              <div className="flex flex-col lg:flex-row items-center gap-10">
                <div className="flex-shrink-0">
                  <PieChart3D data={chartData} />
                </div>
                <div className="flex-1 w-full">
                  <div className="space-y-3">
                    {result.investments.map((inv, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: COLORS[i % COLORS.length] }}>
                            {inv.name}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            {inv.allocation}% · ₹
                            {Math.round(
                              (result.surplus * inv.allocation) / 100
                            ).toLocaleString()}
                            /mo
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: "#1e293b" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${inv.allocation}%`,
                              background: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div
                      className="flex justify-between pt-3 mt-3 font-semibold text-sm"
                      style={{ borderTop: "1px solid #1e293b" }}
                    >
                      <span>Total monthly</span>
                      <span style={{ color: "#10b981" }}>
                        ₹{result.surplus.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Plan */}
            <div
              className="rounded-3xl p-6"
              style={{ background: "#0a1628", border: "1px solid #1e293b" }}
            >
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#475569" }}>
                Next Steps
              </p>
              <h3 className="text-lg font-bold mb-5">Personalised Action Plan</h3>
              <div className="space-y-3">
                {result.actionPlan.map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{
                        background: "linear-gradient(135deg,#6366f1,#818cf8)",
                        color: "#fff",
                      }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Cards */}
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#475569" }}>
                Deep Dive
              </p>
              <h3 className="text-lg font-bold mb-5">Recommended Investments</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                {result.investments.map((inv, i) => (
                  <div
                    key={i}
                    className="rounded-3xl p-6 flex flex-col gap-3"
                    style={{
                      background: "#0a1628",
                      border: `1px solid ${COLORS[i % COLORS.length]}33`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className="w-2 h-2 rounded-full mb-2"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <h4 className="font-semibold text-base">{inv.name}</h4>
                        {inv.institution && (
                          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                            via {inv.institution}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-xl font-bold"
                          style={{ color: COLORS[i % COLORS.length] }}
                        >
                          {inv.allocation}%
                        </p>
                        <p className="text-xs" style={{ color: "#64748b" }}>
                          ₹
                          {Math.round(
                            (result.surplus * inv.allocation) / 100
                          ).toLocaleString()}
                          /mo
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs">
                      <span
                        className="px-2.5 py-1 rounded-lg"
                        style={{
                          background:
                            inv.risk === "High"
                              ? "#f43f5e22"
                              : inv.risk === "Moderate"
                              ? "#f59e0b22"
                              : "#10b98122",
                          color:
                            inv.risk === "High"
                              ? "#f43f5e"
                              : inv.risk === "Moderate"
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      >
                        {inv.risk} Risk
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-lg"
                        style={{ background: "#1e293b", color: "#94a3b8" }}
                      >
                        {inv.returns} returns
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                      {inv.explanation}
                    </p>

                    {inv.steps && inv.steps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#475569" }}>
                          HOW TO START
                        </p>
                        <ol className="space-y-1">
                          {inv.steps.map((s, j) => (
                            <li key={j} className="flex gap-2 text-xs" style={{ color: "#64748b" }}>
                              <span style={{ color: COLORS[i % COLORS.length] }}>
                                {j + 1}.
                              </span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                  
                ))}
                {savedPlans.length > 0 && (
  <div className="mt-8 border border-gray-700 rounded p-4">
    <h2 className="text-2xl font-bold mb-4">
      Saved Plans
    </h2>

    {savedPlans.map((plan) => (
      <div
        key={plan.id}
        className="border border-gray-600 rounded p-3 mb-3"
      >
        <p><strong>Name:</strong> {plan.name}</p>
        <p><strong>Goal:</strong> {plan.goal}</p>
        <p><strong>Risk:</strong> {plan.risk}</p>
        <p><strong>Income:</strong> ₹{plan.income}</p>
        <p><strong>City:</strong> {plan.city}</p>
      </div>
    ))}
  </div>
)}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
