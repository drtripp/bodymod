export default function SiteHeader({
  activeSection,
  theme,
  onSectionChange,
  onThemeChange,
  onOpenAccount,
  onOpenStrategies,
  onShare,
  shareStatus
}) {
  return (
    <header className="site-header">
      <div>
        <h1>bodymod</h1>
      </div>
      <div className="section-switcher" role="tablist" aria-label="Body or diet section">
        <button
          className={`button ${activeSection === "body" ? "is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeSection === "body"}
          onClick={() => onSectionChange("body")}
        >
          Body
        </button>
        <button
          className={`button ${activeSection === "diet" ? "is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeSection === "diet"}
          onClick={() => onSectionChange("diet")}
        >
          Diet
        </button>
      </div>
      <nav className="site-nav header-actions" aria-label="Account and planning actions">
        <select
          className="theme-select"
          aria-label="Theme"
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
        >
          <option value="cafe">Cafe</option>
          <option value="graphite">Graphite</option>
        </select>
        <button className="icon-button user-icon" type="button" aria-label="User profile" onClick={onOpenAccount}>
          <span aria-hidden="true" />
        </button>
        <button className="icon-button share-icon" type="button" aria-label="Share current measurements" onClick={onShare}>
          <span aria-hidden="true">↗</span>
        </button>
        <button className="button build-plan-button" type="button" onClick={onOpenStrategies}>
          Build Plan
        </button>
        {shareStatus ? (
          <span className="header-status" role="status" aria-live="polite">
            {shareStatus}
          </span>
        ) : null}
      </nav>
    </header>
  );
}
