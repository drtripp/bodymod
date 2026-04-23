export default function PrivacyBlock() {
  return (
    <section className="panel anchor-panel" id="privacy">
      <div className="panel-header">
        <h2>Privacy</h2>
      </div>
      <p>
        The current scaffold does not include accounts. Planned persistence is
        local-first. Analytics, when added, should remain lightweight and avoid
        collecting more than basic usage events.
      </p>
    </section>
  );
}
