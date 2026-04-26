import { buildFrontSilhouette } from "../lib/silhouette";

export default function SilhouetteView({
  measurements,
  label,
  hoveredMeasurement,
  onMeasurementHover
}) {
  const silhouette = buildFrontSilhouette(measurements);
  const highlightedAnchor = silhouette.anchors[hoveredMeasurement];

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
              aria-label={`${name} measurement point`}
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
