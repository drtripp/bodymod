import { useEffect, useRef, useState } from "react";
import {
  buildFaceMeasurementRecord,
  formatFaceMetricSummary,
  loadFaceLandmarker,
  sideProfileResearchNotes,
  summarizeFaceLandmarkerResult
} from "../lib/faceMeasurements";

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FaceMeasurementPanel({ faceMeasurements, onSaveFaceMeasurement }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const liveRef = useRef(false);
  const [status, setStatus] = useState("Face model idle.");
  const [latestScan, setLatestScan] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [isCameraRunning, setIsCameraRunning] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    liveRef.current = false;
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraRunning(false);
  }

  async function analyzeImage(image, source) {
    setStatus("Warming up local face model...");
    const landmarker = await loadFaceLandmarker({ runningMode: "IMAGE" });
    const result = landmarker.detect(image);
    const scan = summarizeFaceLandmarkerResult(result, source);
    setLatestScan(scan);
    setStatus(`Detected ${scan.landmarkCount} landmarks locally.`);
  }

  async function handleUpload(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose an image file.");
      }

      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);
      const image = await imageFromDataUrl(dataUrl);
      await analyzeImage(image, "photo");
    } catch (error) {
      setStatus(error.message || "Face photo analysis failed.");
    } finally {
      event.target.value = "";
    }
  }

  async function runLiveLoop() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const landmarker = await loadFaceLandmarker({ runningMode: "VIDEO" });
    const detectFrame = () => {
      if (!liveRef.current) {
        return;
      }

      if (video.readyState >= 2) {
        try {
          const result = landmarker.detectForVideo(video, performance.now());
          if (result?.faceLandmarks?.length) {
            const scan = summarizeFaceLandmarkerResult(result, "camera");
            setLatestScan(scan);
            setStatus(`Live local scan: ${scan.landmarkCount} landmarks.`);
          }
        } catch (error) {
          setStatus("Live face scan paused.");
        }
      }

      frameRef.current = window.requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  async function handleStartCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera API unavailable in this browser.");
      return;
    }

    try {
      setStatus("Requesting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      liveRef.current = true;
      setIsCameraRunning(true);
      setPreviewUrl("");
      await runLiveLoop();
    } catch (error) {
      stopCamera();
      setStatus("Camera unavailable.");
    }
  }

  function handleSaveScan() {
    try {
      const record = buildFaceMeasurementRecord(latestScan, scanNote);
      onSaveFaceMeasurement(record);
      setScanNote("");
      setStatus("Face metrics saved to this local account.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="face-measurement-section" aria-label="Face measurement logger">
      <div className="panel-header">
        <h3>Face measurement logger</h3>
        <p>Browser-local landmark scan for dated face metric logs. No image is saved with the metric record.</p>
      </div>

      <div className="face-scan-grid">
        <div className="face-scan-controls">
          <div className="button-row">
            <label className="button file-button">
              Upload face photo
              <input
                aria-label="Upload face photo for measurement"
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleUpload}
              />
            </label>
            <button
              className="button"
              type="button"
              onClick={isCameraRunning ? stopCamera : handleStartCamera}
            >
              {isCameraRunning ? "Stop camera" : "Start camera scan"}
            </button>
          </div>

          <label className="field">
            <span className="field-label">Scan note</span>
            <textarea
              aria-label="Face scan note"
              value={scanNote}
              onChange={(event) => setScanNote(event.target.value)}
              placeholder="Neutral expression, daylight."
            />
          </label>

          <button
            className="button"
            type="button"
            onClick={handleSaveScan}
            disabled={!latestScan?.metrics?.length}
          >
            Save face metrics
          </button>
          <p className="muted-text" role="status" aria-live="polite">
            {status}
          </p>
        </div>

        <div className="face-preview-panel" aria-label="Face scan preview">
          <video
            ref={videoRef}
            className={isCameraRunning ? "" : "is-hidden"}
            muted
            playsInline
          />
          {previewUrl ? <img src={previewUrl} alt="Uploaded face preview" /> : null}
          {!isCameraRunning && !previewUrl ? (
            <div className="face-preview-placeholder">Face scan</div>
          ) : null}
        </div>
      </div>

      {latestScan?.metrics?.length ? (
        <div className="face-metric-grid" aria-label="Latest face metrics">
          {latestScan.metrics.map((metric) => (
            <article key={metric.id} className="face-metric-card">
              <strong>{metric.label}</strong>
              <span>{metric.displayValue}</span>
              <small>{metric.confidence} confidence</small>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="side-profile-note" aria-label="Side profile research notes">
        <h4>Side-profile spike</h4>
        <ul>
          {sideProfileResearchNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <div aria-label="Saved face measurements">
        <h4>Saved face measurements</h4>
        {faceMeasurements.length ? (
          <ul className="face-measurement-list">
            {faceMeasurements.slice(0, 5).map((scan) => (
              <li key={scan.id}>
                <strong>{formatFaceMetricSummary(scan)}</strong>
                <span>{formatDate(scan.createdAt || scan.measuredAt)} / {scan.source}</span>
                {scan.note ? <p>{scan.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No saved face measurements yet.</p>
        )}
      </div>
    </section>
  );
}
