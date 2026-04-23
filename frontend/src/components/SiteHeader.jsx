export default function SiteHeader() {
  return (
    <header className="site-header">
      <div>
        <h1>bodymod</h1>
        <p className="site-subtitle">
          Compare your measurements to curated target physiques and track changes
          over time.
        </p>
      </div>
      <nav className="site-nav" aria-label="Primary">
        <a href="#method">Method</a>
        <a href="#privacy">Privacy</a>
      </nav>
    </header>
  );
}
