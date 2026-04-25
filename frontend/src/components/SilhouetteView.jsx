import { buildFrontSilhouette } from "../lib/silhouette";

export default function SilhouetteView({ measurements, label }) {
  const silhouette = buildFrontSilhouette(measurements);

  return (
    <figure className="silhouette-figure">
      <svg
        className="silhouette-svg"
        viewBox="0 0 240 360"
        role="img"
        aria-label={`${label} silhouette`}
      >
        <line x1="120" y1="10" x2="120" y2="345" className="silhouette-axis" />
        <circle
          cx={silhouette.head.cx}
          cy={silhouette.head.cy}
          r={silhouette.head.r}
          className="silhouette-head"
        />
        <path d={silhouette.path} className="silhouette-body" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
