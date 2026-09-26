"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DONATION_CONFIG, DonationAddress } from "@/lib/donation-config";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TipModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("Solana");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentAddress: DonationAddress | undefined = DONATION_CONFIG.addresses.find(
    (a) => a.chain === activeTab
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-panel border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-panel-soft/80 border-b border-line flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-lg font-bold">
              ☕
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Support MOCHEX Hosting
              </h3>
              <p className="text-xs text-muted">
                100% Free & Open · Tips help cover server costs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text bg-panel border border-line hover:bg-panel-soft rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {DONATION_CONFIG.description}
          </p>

          {/* Chain Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-panel-soft p-1 rounded-xl border border-line overflow-x-auto scrollbar-none">
            {DONATION_CONFIG.addresses.map((item) => (
              <button
                key={item.chain}
                onClick={() => {
                  setActiveTab(item.chain);
                  setCopied(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === item.chain
                    ? "bg-panel text-text font-bold shadow-xs border border-line"
                    : "text-muted hover:text-text hover:bg-panel/50"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.chain}</span>
              </button>
            ))}

            {DONATION_CONFIG.affiliate.enabled && (
              <button
                onClick={() => {
                  setActiveTab("free_support");
                  setCopied(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "free_support"
                    ? "bg-panel text-gain font-bold shadow-xs border border-line"
                    : "text-gain/80 hover:text-gain hover:bg-gain/10"
                }`}
              >
                <span>⚡</span>
                <span>$0 Support (MEXC)</span>
              </button>
            )}
          </div>

          {/* Tab Content: Crypto Wallet Details */}
          {activeTab !== "free_support" && currentAddress && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-panel-soft/60 border border-line space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{currentAddress.network}</span>
                    <span className="text-muted text-[11px]">({currentAddress.symbol})</span>
                  </div>
                  {currentAddress.recommendedFor && (
                    <span className="text-[10px] font-mono font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                      {currentAddress.recommendedFor}
                    </span>
                  )}
                </div>

                {/* Wallet Address Monospace Box */}
                <div className="relative">
                  <div className="font-mono text-xs text-text bg-panel p-3 rounded-lg border border-line-strong break-all select-all pr-12">
                    {currentAddress.address}
                  </div>

                  <button
                    onClick={() => handleCopy(currentAddress.address)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity shadow-xs"
                    title="Copy wallet address"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>

                {copied && (
                  <div className="text-[11px] font-medium text-gain flex items-center gap-1 animate-in fade-in duration-150">
                    <span>✓</span> Address copied to clipboard!
                  </div>
                )}
              </div>

              {/* Tip Suggestions */}
              <div>
                <span className="text-xs text-muted font-medium mb-2 block">
                  Suggested Tip Amounts:
                </span>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-panel-soft border border-line hover:border-accent/40 transition-colors">
                    <div className="text-base">☕</div>
                    <div className="font-bold text-text mt-1">$5</div>
                    <div className="text-[10px] text-muted">Coffee Tip</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-panel-soft border border-line hover:border-accent/40 transition-colors">
                    <div className="text-base">🚀</div>
                    <div className="font-bold text-text mt-1">$15</div>
                    <div className="text-[10px] text-muted">Server Fuel</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-panel-soft border border-line hover:border-accent/40 transition-colors">
                    <div className="text-base">🏆</div>
                    <div className="font-bold text-text mt-1">$50</div>
                    <div className="text-[10px] text-muted">Gigachad</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Zero-Cost MEXC Referral Support */}
          {activeTab === "free_support" && (
            <div className="p-4 rounded-xl bg-panel-soft/60 border border-line space-y-4">
              <div className="flex items-center gap-2 text-gain font-bold text-sm">
                <span>⚡</span>
                <span>{DONATION_CONFIG.affiliate.title}</span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                {DONATION_CONFIG.affiliate.description}
              </p>

              <div className="space-y-1.5">
                {DONATION_CONFIG.affiliate.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-text">
                    <span className="text-gain font-bold">✓</span>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href={DONATION_CONFIG.affiliate.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="accent-btn w-full py-2.5 text-center text-xs font-bold block shadow-md hover:scale-[1.01] transition-transform"
                >
                  Sign Up on MEXC with Partner Discount →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-panel-soft/80 border-t border-line flex items-center justify-between text-xs text-muted">
          <span>Thank you for keeping MOCHEX free for everyone! 💜</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-panel border border-line hover:bg-panel-soft text-text font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
