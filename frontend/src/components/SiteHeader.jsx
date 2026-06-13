export default function SiteHeader({
  activeSection,
  copy,
  locale,
  localeOptions = [],
  theme,
  themeOptions = [],
  onLocaleChange,
  onSectionChange,
  onThemeChange,
  onOpenAccount,
  onOpenStrategies,
  onShare,
  onShareSnapshot,
  shareStatus
}) {
  return (
    <header className="site-header">
      <div>
        <h1>bodymod</h1>
      </div>
      <div className="section-switcher" role="tablist" aria-label={copy.sectionAria}>
        <button
          className={`button ${activeSection === "body" ? "is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeSection === "body"}
          onClick={() => onSectionChange("body")}
        >
          {copy.body}
        </button>
        <button
          className={`button ${activeSection === "diet" ? "is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeSection === "diet"}
          onClick={() => onSectionChange("diet")}
        >
          {copy.diet}
        </button>
      </div>
      <nav className="site-nav header-actions" aria-label={copy.actionsAria}>
        <select
          className="header-select"
          aria-label={copy.themeAria}
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
        >
          {themeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="header-select"
          aria-label={copy.localeAria}
          value={locale}
          onChange={(event) => onLocaleChange(event.target.value)}
        >
          {localeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="icon-button user-icon" type="button" aria-label={copy.accountAria} onClick={onOpenAccount}>
          <span aria-hidden="true" />
        </button>
        <button className="icon-button share-icon" type="button" aria-label={copy.shareAria} onClick={onShare}>
          <span aria-hidden="true">{"\u2197"}</span>
        </button>
        <button
          className="icon-button snapshot-share-icon"
          type="button"
          aria-label={copy.snapshotShareAria}
          onClick={onShareSnapshot}
        >
          <span aria-hidden="true">ID</span>
        </button>
        <button className="button build-plan-button" type="button" onClick={onOpenStrategies}>
          {copy.buildPlan}
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
