import { useEffect, useState } from "react";
import { clearEvents, loadEvents } from "../lib/analytics";

export default function InfoFootnote() {
  const [eventCount, setEventCount] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setEventCount(loadEvents().length);
  }, []);

  function handleClearEvents() {
    clearEvents();
    setEventCount(0);
    setStatus("Local usage events cleared from this browser.");
  }

  return (
    <footer className="info-footnote">
      <button className="info-footnote-trigger" type="button">
        Method / privacy
      </button>
      <div className="info-footnote-popover" role="note">
        <div>
          <h2>Method</h2>
          <p>
            Matches use normalized measurement distance plus shoulder-to-waist and
            waist-to-hip ratio distance. Percentiles and population comparisons
            are approximate until vetted reference data is wired in. Similarity is
            mapped as 100 * exp(-(distance ^ 1.5)).
          </p>
          <a className="button methodology-link" href="/methodology.html">
            Open methodology
          </a>
        </div>
        <div>
          <h2>Privacy</h2>
          <p>
            Local accounts, snapshots, goals, and lightweight usage events stay
            in this browser. Share links encode measurement values in the URL.
          </p>
          <div className="privacy-actions">
            <p className="muted-text">Local usage events stored: {eventCount}</p>
            <button className="button" type="button" onClick={handleClearEvents}>
              Clear local events
            </button>
          </div>
          <nav className="legal-links" aria-label="Legal drafts">
            <a href="/legal/privacy.html">Privacy</a>
            <a href="/legal/terms.html">Terms</a>
            <a href="/legal/medical-disclaimer.html">Medical disclaimer</a>
          </nav>
          {status ? <p className="muted-text">{status}</p> : null}
        </div>
      </div>
    </footer>
  );
}
