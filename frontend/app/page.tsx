import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-5 border-b border-gray-800">
        <h1 className="text-2xl font-bold">AI Wealth Planner</h1>

        <Link
  href="/login"
  className="px-6 py-3 rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300 transition-all duration-300 shadow-lg hover:shadow-cyan-500/30"
>
  Get Started →
</Link>
      </nav>

      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <h1 className="text-6xl font-bold max-w-4xl">
          Build Wealth With AI-Powered Financial Planning
        </h1>

        <p className="mt-6 text-xl text-gray-400 max-w-2xl">
          Get personalized investment recommendations,
          risk analysis, wealth forecasting and step-by-step
          action plans powered by Agentic AI.
        </p>
<br />
        <Link
  href="/login"
  className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-xl"
>
  Start Planning 🚀
</Link>
      </section>
    </main>
  );
}