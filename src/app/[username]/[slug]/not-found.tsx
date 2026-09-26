import Link from "next/link";

export default function PublicShareNotFound() {
  return (
    <div className="min-h-screen bg-paper text-text flex items-center justify-center p-6 font-sans selection:bg-accent selection:text-white">
      <div className="max-w-md w-full text-center border border-line bg-panel/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-44 h-44 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Branding */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl font-bold tracking-tight brand-gradient">
            MOCHEX
          </span>
          <span className="text-muted font-mono">/</span>
          <span className="text-xs text-muted font-mono font-bold">404</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-panel-soft border border-line flex items-center justify-center text-3xl shadow-inner">
          🔒
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight text-text">
            Public Page Not Found
          </h1>
          <p className="text-xs text-muted leading-relaxed max-w-xs">
            The public setup URL you requested does not exist, has been archived/soft-deleted, or was paused by the trader.
          </p>
        </div>

        <div className="pt-3 w-full flex flex-col gap-2 border-t border-line">
          <Link
            href="/"
            className="accent-btn w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span>🚀 Go to MOCHEX Home</span>
          </Link>
          <Link
            href="/shares"
            className="w-full py-2 rounded-xl bg-panel hover:bg-panel-soft border border-line text-muted hover:text-text font-semibold text-xs transition-colors text-center"
          >
            Manage Your Share Pages
          </Link>
        </div>
      </div>
    </div>
  );
}
