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
            are approximate until vetted reference data is wired in.
          </p>
        </div>
        <div>
          <h2>Privacy</h2>
          <p>
            No accounts are included. Snapshots and lightweight usage events stay
            in this browser. Share links encode measurement values in the URL.
          </p>
          <div className="privacy-actions">
            <p className="muted-text">Local usage events stored: {eventCount}</p>
            <button className="button" type="button" onClick={handleClearEvents}>
              Clear local events
            </button>
          </div>
          {status ? <p className="muted-text">{status}</p> : null}
        </div>
      </div>
    </footer>
  );
}
