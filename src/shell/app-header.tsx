export function AppHeader({ title }: { title: string }) {
  return (
    <header className="app-shell__header">
      <div className="app-shell__header-copy">
        <span className="app-shell__eyebrow">Pulseport Workspace</span>
        <h1>{title}</h1>
        <p className="app-shell__subtitle">Cleaner PulseChain portfolio intelligence with cost-basis context.</p>
      </div>
      <div className="app-shell__header-badge">Clean dark operator mode</div>
    </header>
  );
}
