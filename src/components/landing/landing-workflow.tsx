"use client";

const STEPS = [
  {
    step: "01",
    title: "Chart & Plan the Setup",
    description:
      "Open any MEXC Perpetual Futures pair on live klines. Use the Drawing Suite to drop Fibonacci retracements, support zones, or run custom PineScript indicator scripts.",
    icon: "📐",
    tag: "Analysis",
  },
  {
    step: "02",
    title: "Lock In the Trigger & R:R",
    description:
      "Enter your Trigger Price, Target (TP), and Invalidation (SL). MOCHEX calculates your exact Risk-to-Reward ratio and percentage distances automatically.",
    icon: "⚖️",
    tag: "Risk Protocol",
  },
  {
    step: "03",
    title: "Audio Proximity Radar Takes Over",
    description:
      "Close the chart and focus on deep work. As price enters the proximity zone, synthesized audio alarms notify you with escalating frequencies before the trigger hits.",
    icon: "🔊",
    tag: "Execution Alert",
  },
  {
    step: "04",
    title: "Execute & Journal with Discipline",
    description:
      "Place your order on your exchange with zero emotional panic. Automatically log outcomes, review setup revision histories, and analyze your win-rate metrics.",
    icon: "📖",
    tag: "Discipline Loop",
  },
];

export function LandingWorkflow() {
  return (
    <section id="workflow" className="py-20 sm:py-28 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-semibold mb-3">
            <span>🧭 THE DISCIPLINE LOOP</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text">
            How Top Traders Execute with{" "}
            <span className="brand-gradient font-black">Zero Emotional Friction.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted">
            Transform chaotic impulse trading into a structured, automated 4-step execution
            protocol.
          </p>
        </div>

        {/* 4 Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((s, idx) => (
            <div
              key={s.step}
              className="relative rounded-2xl bg-panel border border-line p-6 flex flex-col justify-between hover:border-accent/40 transition-colors shadow-sm group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/25 px-2.5 py-1 rounded-md">
                    {s.step}
                  </span>
                  <span className="text-2xl">{s.icon}</span>
                </div>

                <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-bold">
                  {s.tag}
                </span>

                <h3 className="text-lg font-bold text-text mt-1 group-hover:text-accent transition-colors">
                  {s.title}
                </h3>

                <p className="text-muted mt-2 text-xs leading-relaxed">
                  {s.description}
                </p>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-muted font-mono text-sm">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
