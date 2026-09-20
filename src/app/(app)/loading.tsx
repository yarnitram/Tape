export default function AppLoading() {
  return (
    <div className="space-y-6 w-full">
      {/* Page title skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-44 rounded bg-panel animate-pulse" />
        <div className="h-4 w-64 rounded bg-panel animate-pulse" />
      </div>

      {/* Card skeletons */}
      <div className="grid gap-4">
        <div className="h-28 rounded-lg border border-line bg-panel/60 animate-pulse" />
        <div className="h-28 rounded-lg border border-line bg-panel/60 animate-pulse" />
        <div className="h-40 rounded-lg border border-line bg-panel/60 animate-pulse" />
      </div>

      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}