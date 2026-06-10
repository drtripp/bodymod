import SilhouetteView from "./SilhouetteView";

function formatDate(timestamp) {
  if (!timestamp) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function metricCards(measurements = {}) {
  return [
    ["Height", measurements.height, "cm"],
    ["Weight", measurements.weight, "kg"],
    ["Waist", measurements.waistCircumference, "cm"],
    ["Hip", measurements.hipCircumference, "cm"],
    ["Shoulder circ", measurements.bideltoidCircumference, "cm"],
    ["Sex profile", measurements.sex, ""]
  ].map(([label, value, unit]) => ({
    label,
    value: value === undefined || value === null || value === "" ? "--" : `${value}${unit ? ` ${unit}` : ""}`
  }));
}

export default function PublicShareDashboard({ record, status = "" }) {
  const dashboard = record?.dashboard || null;

  if (!dashboard) {
    return (
      <main className="public-share-shell" aria-label="Shared dashboard">
        <section className="panel public-share-panel">
          <h1>Shared dashboard unavailable</h1>
          <p>{status || "This share link is missing, revoked, or unavailable."}</p>
        </section>
      </main>
    );
  }

  const measurements = dashboard.measurements || {};
  const stats = dashboard.stats || {};
  const publicStats = [
    ["Snapshots", stats.snapshotCount || 0],
    ["Check-ins", stats.checkInCount || 0],
    ["Goals", stats.goalCount || 0],
    ["Protocols", stats.protocolCount || 0],
    ["Workouts", stats.workoutCount || 0],
    ["Face scans", stats.faceScanCount || 0]
  ];

  return (
    <main className="public-share-shell" aria-label="Shared dashboard">
      <section className="panel public-share-panel">
        <div className="public-share-header">
          <div>
            <span className="eyebrow">Read-only bodymod share</span>
            <h1>{dashboard.title || "Shared bodymod dashboard"}</h1>
            <p>
              Published {formatDate(dashboard.publishedAt || record.updatedAt)}.
              Updated {formatDate(record.updatedAt)}.
            </p>
          </div>
          <strong>{dashboard.displayName || "bodymod user"}</strong>
        </div>

        <div className="public-share-grid">
          <div className="public-share-silhouette">
            <SilhouetteView
              label="Shared current profile silhouette"
              measurements={measurements}
              view="front"
            />
          </div>

          <div className="public-share-copy">
            <div className="metric-block-grid" aria-label="Shared current measurements">
              {metricCards(measurements).map((metric) => (
                <article key={metric.label} className="metric-block">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </div>

            <div className="public-share-stats" aria-label="Shared account summary">
              {publicStats.map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="public-share-sections">
          <section aria-label="Shared goals">
            <h2>Goals</h2>
            {dashboard.goals?.length ? (
              <ul className="public-share-list">
                {dashboard.goals.map((goal) => (
                  <li key={goal.id}>
                    <strong>{goal.label}</strong>
                    <span>
                      {goal.progressPercent === null || goal.progressPercent === undefined
                        ? "Progress not available"
                        : `${goal.progressPercent}% progress`}
                    </span>
                    {goal.targetSource ? <small>{goal.targetSource}</small> : null}
                    {goal.targetDistances?.length ? (
                      <p>{goal.targetDistances.join(" / ")}</p>
                    ) : null}
                    {goal.pausedReason ? <p>{goal.pausedReason}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No shared goals.</p>
            )}
          </section>

          <section aria-label="Shared protocols">
            <h2>Protocols</h2>
            {dashboard.protocols?.length ? (
              <ul className="public-share-list">
                {dashboard.protocols.map((protocol) => (
                  <li key={protocol.id}>
                    <strong>{protocol.label}</strong>
                    <span>
                      {protocol.status} / {protocol.adherenceCount} adherence check-in(s)
                    </span>
                    {protocol.averageScore !== null && protocol.averageScore !== undefined ? (
                      <small>{protocol.averageScore}/5 average adherence</small>
                    ) : null}
                    {protocol.projectionSummary ? <p>{protocol.projectionSummary}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No shared active protocols.</p>
            )}
          </section>

          <section aria-label="Shared snapshots">
            <h2>Recent snapshots</h2>
            {dashboard.snapshots?.length ? (
              <ul className="public-share-list">
                {dashboard.snapshots.map((snapshot) => (
                  <li key={snapshot.id}>
                    <strong>{snapshot.label}</strong>
                    <span>{formatDate(snapshot.createdAt)}</span>
                    <small>
                      Weight {snapshot.measurements?.weight ?? "--"} kg / waist{" "}
                      {snapshot.measurements?.waistCircumference ?? "--"} cm
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No shared snapshots.</p>
            )}
          </section>
        </div>

        <p className="muted-text public-share-privacy">
          {dashboard.privacyNote ||
            "This read-only share omits account email, private notes, and photo files."}
        </p>
      </section>
    </main>
  );
}
