import { useEffect, useRef, useState } from "react";
import {
  buildFaceMeasurementRecord,
  buildSideProfileMeasurementRecord,
  formatFaceMetricSummary,
  loadFaceLandmarker,
  sideProfileManualMetricDefinitions,
  sideProfileResearchNotes,
  summarizeFaceLandmarkerResult
} from "../lib/faceMeasurements";
import { createTranslator } from "../lib/i18n";

function formatDate(timestamp, locale = "en") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatFaceError(error, t) {
  const message = error?.message || "";
  const errorKeyByMessage = new Map([
    ["Choose an image file.", "account.face.status.chooseImage"],
    ["Face photo analysis failed.", "account.face.status.photoFailed"],
    ["No face landmarks found.", "account.face.status.noLandmarks"],
    ["No face metrics to save.", "account.face.status.noMetrics"],
    ["A full Face Landmarker mesh is required.", "account.face.status.fullMeshRequired"],
    ["Enter at least one side-profile measurement or note.", "account.face.status.sideProfileRequired"]
  ]);

  return errorKeyByMessage.has(message)
    ? t(errorKeyByMessage.get(message))
    : message || t("account.face.status.failed");
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

export default function FaceMeasurementPanel({
  faceMeasurements,
  locale = "en",
  onSaveFaceMeasurement
}) {
  const t = createTranslator(locale);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const liveRef = useRef(false);
  const [status, setStatus] = useState(() => t("account.face.status.idle"));
  const [latestScan, setLatestScan] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [sideProfileSide, setSideProfileSide] = useState("right");
  const [sideProfileValues, setSideProfileValues] = useState({});
  const [sideProfileNote, setSideProfileNote] = useState("");
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
    setStatus(t("account.face.status.warming"));
    const landmarker = await loadFaceLandmarker({ runningMode: "IMAGE" });
    const result = landmarker.detect(image);
    const scan = summarizeFaceLandmarkerResult(result, source);
    setLatestScan(scan);
    setStatus(t("account.face.status.detected", { count: scan.landmarkCount }));
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
      setStatus(formatFaceError(error, t));
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
            setStatus(t("account.face.status.liveDetected", { count: scan.landmarkCount }));
          }
        } catch (error) {
          setStatus(t("account.face.status.livePaused"));
        }
      }

      frameRef.current = window.requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  async function handleStartCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(t("account.face.status.cameraApiUnavailable"));
      return;
    }

    try {
      setStatus(t("account.face.status.requestingCamera"));
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
      setStatus(t("account.face.status.cameraUnavailable"));
    }
  }

  function handleSaveScan() {
    try {
      const record = buildFaceMeasurementRecord(latestScan, scanNote);
      onSaveFaceMeasurement(record);
      setScanNote("");
      setStatus(t("account.face.status.saved"));
    } catch (error) {
      setStatus(formatFaceError(error, t));
    }
  }

  function handleSideProfileValueChange(metricId, value) {
    setSideProfileValues((current) => ({
      ...current,
      [metricId]: value
    }));
  }

  function handleSaveSideProfileLog() {
    try {
      const record = buildSideProfileMeasurementRecord({
        side: sideProfileSide,
        values: sideProfileValues,
        note: sideProfileNote
      });
      onSaveFaceMeasurement(record);
      setSideProfileValues({});
      setSideProfileNote("");
      setStatus(t("account.face.status.sideProfileSaved"));
    } catch (error) {
      setStatus(formatFaceError(error, t));
    }
  }

  return (
    <section className="face-measurement-section" aria-label={t("account.face.aria")}>
      <div className="panel-header">
        <h3>{t("account.face.title")}</h3>
        <p>{t("account.face.body")}</p>
      </div>

      <div className="face-scan-grid">
        <div className="face-scan-controls">
          <div className="button-row">
            <label className="button file-button">
              {t("account.face.upload")}
              <input
                aria-label={t("account.face.uploadAria")}
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
              {isCameraRunning ? t("account.face.stopCamera") : t("account.face.startCamera")}
            </button>
          </div>

          <label className="field">
            <span className="field-label">{t("account.face.scanNote")}</span>
            <textarea
              aria-label={t("account.face.scanNoteAria")}
              value={scanNote}
              onChange={(event) => setScanNote(event.target.value)}
              placeholder={t("account.face.scanNotePlaceholder")}
            />
          </label>

          <button
            className="button"
            type="button"
            onClick={handleSaveScan}
            disabled={!latestScan?.metrics?.length}
          >
            {t("account.face.saveMetrics")}
          </button>
          <p className="muted-text" role="status" aria-live="polite">
            {status}
          </p>
        </div>

        <div className="face-preview-panel" aria-label={t("account.face.previewAria")}>
          <video
            ref={videoRef}
            className={isCameraRunning ? "" : "is-hidden"}
            muted
            playsInline
          />
          {previewUrl ? <img src={previewUrl} alt={t("account.face.previewAlt")} /> : null}
          {!isCameraRunning && !previewUrl ? (
            <div className="face-preview-placeholder">{t("account.face.previewPlaceholder")}</div>
          ) : null}
        </div>
      </div>

      {latestScan?.metrics?.length ? (
        <div className="face-metric-grid" aria-label={t("account.face.latestAria")}>
          {latestScan.metrics.map((metric) => (
            <article key={metric.id} className="face-metric-card">
              <strong>{metric.label}</strong>
              <span>{metric.displayValue}</span>
              <small>{t("account.face.confidence", { confidence: metric.confidence })}</small>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="side-profile-note" aria-label={t("account.face.sideResearchAria")}>
        <h4>{t("account.face.sideResearchTitle")}</h4>
        <ul>
          {sideProfileResearchNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <div className="side-profile-manual-log" aria-label={t("account.face.manualAria")}>
        <div>
          <h4>{t("account.face.manualTitle")}</h4>
          <p>
            {t("account.face.manualBody")}
          </p>
        </div>
        <label className="field">
          <span className="field-label">{t("account.face.profileSide")}</span>
          <select
            aria-label={t("account.face.profileSideAria")}
            value={sideProfileSide}
            onChange={(event) => setSideProfileSide(event.target.value)}
          >
            <option value="right">{t("account.face.side.right")}</option>
            <option value="left">{t("account.face.side.left")}</option>
            <option value="unspecified">{t("account.face.side.unspecified")}</option>
          </select>
        </label>
        <div className="side-profile-field-grid">
          {sideProfileManualMetricDefinitions.map((metric) => (
            <label className="field" key={metric.id}>
              <span className="field-label">{metric.label}</span>
              <input
                aria-label={metric.label}
                inputMode="decimal"
                value={sideProfileValues[metric.id] || ""}
                onChange={(event) =>
                  handleSideProfileValueChange(metric.id, event.target.value)
                }
                placeholder={metric.unit}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span className="field-label">{t("account.face.sideNote")}</span>
          <textarea
            aria-label={t("account.face.sideNoteAria")}
            value={sideProfileNote}
            onChange={(event) => setSideProfileNote(event.target.value)}
            placeholder={t("account.face.sideNotePlaceholder")}
          />
        </label>
        <button className="button" type="button" onClick={handleSaveSideProfileLog}>
          {t("account.face.saveSideProfile")}
        </button>
      </div>

      <div aria-label={t("account.face.savedAria")}>
        <h4>{t("account.face.savedTitle")}</h4>
        {faceMeasurements.length ? (
          <ul className="face-measurement-list">
            {faceMeasurements.slice(0, 5).map((scan) => (
              <li key={scan.id}>
                <strong>{formatFaceMetricSummary(scan)}</strong>
                <span>{formatDate(scan.createdAt || scan.measuredAt, locale)} / {scan.source}</span>
                {scan.note ? <p>{scan.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">{t("account.face.emptySaved")}</p>
        )}
      </div>
    </section>
  );
}
