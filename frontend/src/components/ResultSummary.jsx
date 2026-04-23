import SilhouetteView from "./SilhouetteView";

export default function ResultSummary({ measurements, result, apiStatus }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Result</h2>
        <p>
          {apiStatus === "online"
            ? "Backend connected."
            : "Backend unavailable. Results are limited."}
        </p>
      </div>

      <div className="result-grid">
        <SilhouetteView label="Current profile" measurements={measurements} />

        <div className="result-copy">
          <div className="stat-block">
            <h3>Top match</h3>
            <p>{result?.top_match?.label || "No match yet"}</p>
          </div>

          <div className="stat-block">
            <h3>Percentiles</h3>
            <ul className="plain-list">
              <li>Height: {result?.percentiles?.height ?? "--"}%</li>
              <li>Waist: {result?.percentiles?.waist ?? "--"}%</li>
              <li>Shoulders: {result?.percentiles?.shoulders ?? "--"}%</li>
            </ul>
          </div>

          <div className="stat-block">
            <h3>Note</h3>
            <p>
              Early scaffold output. Silhouette and percentile logic are placeholders
              pending the full model and reference dataset.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
