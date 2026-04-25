function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatMeasurements(measurements) {
  return [
    `${measurements.height} cm`,
    `${measurements.weight} kg`,
    measurements.sex,
    `waist ${measurements.waist}`
  ].join(" / ");
}

export default function SnapshotPanel({
  snapshots,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Snapshots</h2>
        <p>Save the current measurements locally and restore earlier entries later.</p>
      </div>

      <div className="snapshot-actions">
        <button className="button" type="button" onClick={onSaveSnapshot}>
          Save current snapshot
        </button>
      </div>

      {snapshots.length ? (
        <ul className="snapshot-list">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id} className="snapshot-row">
              <div className="snapshot-copy">
                <strong>{formatTimestamp(snapshot.createdAt)}</strong>
                <span>{formatMeasurements(snapshot.measurements)}</span>
              </div>
              <div className="button-row">
                <button
                  className="button"
                  type="button"
                  onClick={() => onLoadSnapshot(snapshot.id)}
                >
                  Load
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => onDeleteSnapshot(snapshot.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">No saved snapshots yet.</p>
      )}
    </section>
  );
}
