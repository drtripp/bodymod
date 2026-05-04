import { buildFrontSilhouette } from "../lib/silhouette";
import { measurementFields } from "../lib/measurements";

const measurementLabels = Object.fromEntries(
  measurementFields.map((field) => [field.name, field.label])
);

function formatMeasurementValue(name, measurements) {
  if (name === "sex") {
    return measurements.sex;
  }

  const value = measurements[name];
  const unit = name === "weight" ? "kg" : "cm";

  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) {
    return "not entered";
  }

  return `${Number(value).toFixed(1).replace(/\.0$/, "")} ${unit}`;
}

export default function SilhouetteView({
  measurements,
  label,
  hoveredMeasurement,
  onMeasurementHover
}) {
  const silhouette = buildFrontSilhouette(measurements);
  const highlightedAnchor = silhouette.anchors[hoveredMeasurement];
  const titleId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-silhouette-title`;
  const descriptionId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-silhouette-description`;

  return (
    <figure className="silhouette-figure">
      <svg
        className="silhouette-svg"
        viewBox="0 0 240 360"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{label} silhouette</title>
        <desc id={descriptionId}>
          Front-view body outline generated from entered measurements. Focus a
          measurement anchor to highlight the corresponding body span.
        </desc>
        <line x1="120" y1="10" x2="120" y2="345" className="silhouette-axis" />
        <circle
          cx={silhouette.head.cx}
          cy={silhouette.head.cy}
          r={silhouette.head.r}
          className="silhouette-head"
        />
        <path d={silhouette.path} className="silhouette-body" />

        {highlightedAnchor ? (
          <line
            x1={highlightedAnchor.left.x}
            y1={highlightedAnchor.left.y}
            x2={highlightedAnchor.right.x}
            y2={highlightedAnchor.right.y}
            className="silhouette-anchor-band"
          />
        ) : null}

        {Object.entries(silhouette.anchors).map(([name, anchor]) => {
          const isHighlighted = hoveredMeasurement === name;
          const anchorLabel = measurementLabels[name] || name;
          const anchorValue = formatMeasurementValue(name, measurements);

          return (
            <g
              key={name}
              className={`silhouette-anchor ${
                isHighlighted ? "is-highlighted" : ""
              }`}
              onMouseEnter={() => onMeasurementHover?.(name)}
              onMouseLeave={() => onMeasurementHover?.(null)}
              onFocus={() => onMeasurementHover?.(name)}
              onBlur={() => onMeasurementHover?.(null)}
              tabIndex="0"
              role="button"
              aria-label={`${anchorLabel}: ${anchorValue}`}
            >
              <line
                x1={anchor.left.x}
                y1={anchor.left.y}
                x2={anchor.right.x}
                y2={anchor.right.y}
                className="silhouette-anchor-hit"
              />
              <line
                x1={anchor.left.x}
                y1={anchor.left.y}
                x2={anchor.right.x}
                y2={anchor.right.y}
                className="silhouette-anchor-line"
              />
              {[anchor.left, anchor.right].map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={isHighlighted ? 5.2 : 3.2}
                  className="silhouette-anchor-point"
                />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
