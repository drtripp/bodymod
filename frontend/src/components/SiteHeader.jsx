export default function SiteHeader({ onOpenStrategies, onShare, shareStatus }) {
  return (
    <header className="site-header">
      <div>
        <h1>bodymod</h1>
      </div>
      <nav className="site-nav header-actions" aria-label="Account and planning actions">
        <button className="icon-button user-icon" type="button" aria-label="User profile">
          <span aria-hidden="true" />
        </button>
        <button className="icon-button share-icon" type="button" aria-label="Share current measurements" onClick={onShare}>
          <span aria-hidden="true">↗</span>
        </button>
        <button className="button build-plan-button" type="button" onClick={onOpenStrategies}>
          Build Plan
        </button>
        {shareStatus ? <span className="header-status">{shareStatus}</span> : null}
      </nav>
    </header>
  );
}
