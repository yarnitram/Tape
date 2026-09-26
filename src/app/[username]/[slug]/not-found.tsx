import Link from "next/link";

export default function PublicShareNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <div className="max-w-md w-full text-center border border-zinc-800 bg-zinc-900/60 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Branding */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Tape
          </span>
          <span className="text-zinc-600 font-mono">/</span>
          <span className="text-xs text-zinc-400 font-mono font-bold">404</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-3xl shadow-inner">
          🔒
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Public Page Not Found
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
            The public setup URL you requested does not exist, has been archived/soft-deleted, or was paused by the trader.
          </p>
        </div>

        <div className="pt-3 w-full flex flex-col gap-2 border-t border-zinc-800/80">
          <Link
            href="/"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <span>🚀 Go to Tape Home</span>
          </Link>
          <Link
            href="/shares"
            className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs transition-colors text-center cursor-pointer"
          >
            Manage Your Share Pages
          </Link>
        </div>
      </div>
    </div>
  );
}
