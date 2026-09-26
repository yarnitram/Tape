"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "Is MOCHEX free to use?",
    answer:
      "Yes! MOCHEX is completely free and open. You can run it locally or deploy it to Vercel and Supabase with zero subscription fees.",
  },
  {
    question: "Do I need to input my exchange API keys?",
    answer:
      "Never! MOCHEX never requests your exchange API keys, withdrawal permissions, or passwords. Your funds remain 100% safe on your exchange. MOCHEX operates strictly as a technical analysis, setup planning, and alert station.",
  },
  {
    question: "How do the synthesized audio proximity alarms work?",
    answer:
      "MOCHEX leverages the browser's native Web Audio API to synthesize acoustic radar tones. As the live MEXC perpetual mark price nears your planned trigger price (within your configured proximity threshold), an audible chime sounds so you can prepare your order without staring at the chart for hours.",
  },
  {
    question: "Can I write custom formulas and indicators like PineScript?",
    answer:
      "Yes! The integrated Formula & Script Studio allows you to write custom formulas using familiar PineScript math: sma, ema, stddev, highest, lowest, rsi, crossover, crossunder, and plot(). Pre-built templates for EMA Ribbons, Bollinger Bands, and Donchian Channels are included out of the box.",
  },
  {
    question: "How do TradingView webhooks integrate with MOCHEX?",
    answer:
      "MOCHEX includes a dedicated endpoint at /api/webhooks/tradingview protected by your unique HMAC secret token. Any alert triggered on TradingView can send a JSON payload to automatically add tokens to your active watchlist or fire triggers in real time.",
  },
  {
    question: "Is MOCHEX mobile and tablet friendly?",
    answer:
      "Yes! Every table, chart modal, and drawing tool has been optimized with responsive viewports, touch-friendly handles, and horizontal scrolling for mobile phones and iPad/tablet devices.",
  },
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-panel-soft/30 hairline-y relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-semibold mb-3">
            <span>❓ FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text">
            Everything You Need to Know
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted">
            Have questions about how MOCHEX works? Find quick answers below.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.question}
                className="rounded-xl bg-panel border border-line overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-text text-sm sm:text-base hover:text-accent transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span className="text-muted text-lg font-mono shrink-0">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-muted leading-relaxed border-t border-line/60 pt-3 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
