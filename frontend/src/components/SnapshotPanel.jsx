export default function SnapshotPanel() {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Snapshots</h2>
        <p>Local history is not wired yet. This panel is the reserved retention layer.</p>
      </div>

      <div className="snapshot-placeholder">
        <p>
          Planned next: save current measurements locally, restore them on load,
          and compare against earlier snapshots.
        </p>
      </div>
    </section>
  );
}
