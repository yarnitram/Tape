"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  SCRIPT_TEMPLATES,
  executeChartScript,
  ScriptPlot,
  ExecutionResult,
} from "@/lib/chart-script-engine";
import { CandleData } from "@/app/api/mexc/kline/route";
import { cleanSymbol } from "@/lib/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candles: CandleData[];
  symbol: string;
  currentScript: string;
  onApplyScript: (code: string, plots: ScriptPlot[]) => void;
  onClearScript: () => void;
  hasActiveScript: boolean;
}

const CHEAT_SHEET_ITEMS = [
  { name: "close", type: "var", desc: "Array of bar closing prices" },
  { name: "open", type: "var", desc: "Array of bar opening prices" },
  { name: "high", type: "var", desc: "Array of bar highest prices" },
  { name: "low", type: "var", desc: "Array of bar lowest prices" },
  { name: "volume", type: "var", desc: "Array of bar volumes" },
  { name: "time", type: "var", desc: "Array of bar UNIX timestamps" },
  { name: "sma(source, period)", type: "fn", desc: "Simple Moving Average" },
  { name: "ema(source, period)", type: "fn", desc: "Exponential Moving Average" },
  { name: "stddev(source, period)", type: "fn", desc: "Standard Deviation over period" },
  { name: "highest(source, period)", type: "fn", desc: "Highest value over period" },
  { name: "lowest(source, period)", type: "fn", desc: "Lowest value over period" },
  { name: "rsi(source, period=14)", type: "fn", desc: "Relative Strength Index" },
  { name: "crossover(s1, s2)", type: "fn", desc: "Detects series crossover (s1 > s2)" },
  { name: "crossunder(s1, s2)", type: "fn", desc: "Detects series crossunder (s1 < s2)" },
  {
    name: "plot(series, options)",
    type: "fn",
    desc: 'plot(data, { title: "EMA", color: "#8b5cf6", lineWidth: 2 })',
  },
];

export function ChartScriptEditorModal({
  isOpen,
  onClose,
  candles,
  symbol,
  currentScript,
  onApplyScript,
  onClearScript,
  hasActiveScript,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState<string>(currentScript || SCRIPT_TEMPLATES[0].code);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (currentScript && currentScript.trim().length > 0) {
        setCode(currentScript);
      } else {
        setCode(SCRIPT_TEMPLATES[0].code);
        setSelectedTemplateName(SCRIPT_TEMPLATES[0].name);
      }
      setResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen, currentScript]);

  if (!isOpen || !mounted) return null;

  const cleanSym = cleanSymbol(symbol);

  const handleRun = () => {
    setSaveSuccess(false);
    const execResult = executeChartScript(code, candles);
    setResult(execResult);

    if (execResult.success && execResult.plots.length > 0) {
      onApplyScript(code, execResult.plots);
    }
  };

  const handleSaveAndRun = () => {
    handleRun();
    try {
      localStorage.setItem(`mochex_custom_script_${cleanSym}`, code);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error("Failed to save custom script:", e);
    }
  };

  const handleClear = () => {
    onClearScript();
    setResult(null);
  };

  const handleTemplateSelect = (tmplName: string) => {
    setSelectedTemplateName(tmplName);
    const found = SCRIPT_TEMPLATES.find((t) => t.name === tmplName);
    if (found) {
      setCode(found.code);
      setResult(null);
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = code.substring(0, start);
    const textAfter = code.substring(end);
    const newCode = `${textBefore}${snippet}${textAfter}`;
    setCode(newCode);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
    // Handle tab key indent
    if (e.key === "Tab") {
      e.preventDefault();
      insertSnippet("  ");
    }
  };

  // Line numbers calculation
  const lineCount = Math.max(1, code.split("\n").length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-panel border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-panel-soft/80 border-b border-line flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-base">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text">
                  Formula & Script Studio
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-panel border border-line text-muted">
                  {cleanSym}
                </span>
                {hasActiveScript && (
                  <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                Write PineScript-equivalent formulas & indicators in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                showCheatSheet
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "bg-panel border-line text-muted hover:text-text hover:bg-panel-soft"
              }`}
              title="Show indicator functions reference"
            >
              <span>📖 Reference</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-text bg-panel border border-line hover:bg-panel-soft rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar & Template Selector */}
        <div className="px-5 py-2.5 bg-panel border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Templates:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SCRIPT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => handleTemplateSelect(tmpl.name)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                    selectedTemplateName === tmpl.name
                      ? "bg-accent/15 border-accent/40 text-accent font-semibold"
                      : "bg-panel-soft border-line text-muted hover:text-text hover:bg-panel-soft/80"
                  }`}
                  title={tmpl.description}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <span className="text-[11px] text-muted font-mono hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 bg-panel-soft rounded border border-line text-text">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-panel-soft rounded border border-line text-text">Enter</kbd> to run
          </span>
        </div>

        {/* Quick Reference Cheat Sheet Drawer */}
        {showCheatSheet && (
          <div className="bg-panel-soft/90 border-b border-line px-5 py-3 text-xs max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-text">Available Variables & PineScript Functions:</span>
              <span className="text-[11px] text-muted">Click any item to insert at cursor</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {CHEAT_SHEET_ITEMS.map((item) => (
                <button
                  key={item.name}
                  onClick={() => insertSnippet(item.name)}
                  className="text-left p-2 rounded-lg bg-panel border border-line/60 hover:border-accent/40 hover:bg-accent/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-accent font-mono text-[11px] group-hover:underline">
                      {item.name}
                    </code>
                    <span className="text-[9px] uppercase tracking-wider text-muted font-mono">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5 line-clamp-1">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor Area with Line Numbers */}
        <div className="relative flex-1 flex min-h-[280px] max-h-[500px] overflow-hidden bg-[#0c0a17] font-mono text-sm">
          {/* Line Numbers Gutter */}
          <div className="w-12 bg-[#090812] text-[#4b5563] text-right pr-3 pt-3.5 select-none text-xs border-r border-[#1e1b2e] leading-5">
            {lineNumbers.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="flex-1 bg-transparent text-[#e2e8f0] p-3.5 focus:outline-none resize-none leading-5 text-xs font-mono selection:bg-accent/30"
            placeholder="// Write custom PineScript or JS formula here...&#10;const ma = sma(close, 20);&#10;plot(ma, { title: 'SMA 20', color: '#8b5cf6' });"
          />
        </div>

        {/* Execution Output Console / Status Banner */}
        {result && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-t ${
              result.success
                ? "bg-gain/10 border-gain/30 text-gain"
                : "bg-loss/10 border-loss/30 text-loss"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{result.success ? "✓" : "⚠"}</span>
              <div>
                {result.success ? (
                  <span>
                    Successfully compiled and plotted{" "}
                    <strong>{result.plots.length} series</strong> (
                    {result.plots.map((p) => p.title).join(", ")})
                  </span>
                ) : (
                  <span>
                    <strong>Script Error:</strong> {result.error}
                  </span>
                )}
              </div>
            </div>

            {result.success && (
              <span className="text-[11px] opacity-80">
                Applied to chart
              </span>
            )}
          </div>
        )}

        {/* Save success toast */}
        {saveSuccess && (
          <div className="px-5 py-1.5 bg-accent/15 border-t border-accent/30 text-accent text-xs font-medium flex items-center gap-1.5">
            <span>💾</span> Script successfully saved for {cleanSym}!
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="px-5 py-3 bg-panel-soft/80 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasActiveScript && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-medium bg-panel text-loss border border-line hover:border-loss/40 hover:bg-loss/10 rounded-lg transition-colors"
                title="Remove custom script plots from chart"
              >
                ✕ Clear from Chart
              </button>
            )}
            <button
              onClick={() => {
                setCode(SCRIPT_TEMPLATES[0].code);
                setSelectedTemplateName(SCRIPT_TEMPLATES[0].name);
                setResult(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-muted hover:text-text bg-panel border border-line hover:bg-panel-soft rounded-lg transition-colors"
            >
              ↺ Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndRun}
              className="px-3.5 py-1.5 text-xs font-medium bg-panel border border-line hover:bg-panel-soft text-text rounded-lg transition-colors flex items-center gap-1.5"
              title="Save script in local storage for this coin and apply to chart"
            >
              <span>💾</span>
              <span>Save & Run</span>
            </button>

            <button
              onClick={handleRun}
              className="accent-btn px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-accent/20"
            >
              <span>▶</span>
              <span>Run on Chart</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
