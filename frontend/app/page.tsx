export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-5 border-b border-gray-800">
        <h1 className="text-2xl font-bold">AI Wealth Planner</h1>

        <button className="bg-white text-black px-4 py-2 rounded-lg">
          Get Started
        </button>
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

        <button className="mt-10 bg-white text-black px-6 py-3 rounded-xl font-semibold">
          Start Planning
        </button>
      </section>
    </main>
  );
}