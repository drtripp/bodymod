import { buildSilhouette, silhouetteViewOptions } from "../lib/silhouette";
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

function formatPoint(point) {
  return `${Number(point.x.toFixed(2))} ${Number(point.y.toFixed(2))}`;
}

function centerOf(anchor) {
  if (!anchor) {
    return null;
  }

  return {
    x: (anchor.left.x + anchor.right.x) / 2,
    y: (anchor.left.y + anchor.right.y) / 2
  };
}

function insetPoint(anchor, side, fraction = 0.18) {
  if (!anchor) {
    return null;
  }

  const start = side === "left" ? anchor.left : anchor.right;
  const end = side === "left" ? anchor.right : anchor.left;

  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction
  };
}

function smoothLine(points) {
  const validPoints = points.filter(Boolean);

  if (validPoints.length < 2) {
    return "";
  }

  const [firstPoint] = validPoints;
  let path = `M ${formatPoint(firstPoint)}`;

  for (let index = 1; index < validPoints.length; index += 1) {
    const currentPoint = validPoints[index];
    const nextPoint = validPoints[index + 1];

    if (!nextPoint) {
      path += ` L ${formatPoint(currentPoint)}`;
      continue;
    }

    const midpoint = {
      x: (currentPoint.x + nextPoint.x) / 2,
      y: (currentPoint.y + nextPoint.y) / 2
    };

    path += ` Q ${formatPoint(currentPoint)} ${formatPoint(midpoint)}`;
  }

  return path;
}

function guideFrom(anchor, fraction = 0.2) {
  if (!anchor) {
    return null;
  }

  return {
    left: insetPoint(anchor, "left", fraction),
    right: insetPoint(anchor, "right", fraction)
  };
}

function buildSilhouetteLineArt(silhouette, viewId) {
  const { anchors } = silhouette;
  const centerPath = smoothLine([
    centerOf(anchors.neckCircumference),
    centerOf(anchors.nippleCircumference),
    centerOf(anchors.waistCircumference),
    centerOf(anchors.hipCircumference),
    centerOf(anchors.midThighCircumference),
    centerOf(anchors.ankleCircumference)
  ]);
  const contourSource =
    viewId === "side"
      ? [
          "neckCircumference",
          "nippleCircumference",
          "waistCircumference",
          "hipCircumference",
          "midThighCircumference"
        ]
      : [
          "bideltoidWidth",
          "nippleCircumference",
          "waistCircumference",
          "hipCircumference",
          "upperThighCircumference"
        ];
  const guides = [
    "bideltoidWidth",
    "nippleCircumference",
    "waistCircumference",
    "hipCircumference"
  ]
    .map((name) => guideFrom(anchors[name], viewId === "side" ? 0.24 : 0.16))
    .filter(Boolean);
  const paths = [
    {
      d: centerPath,
      className: "silhouette-line-art-path silhouette-line-art-center"
    },
    {
      d: smoothLine(contourSource.map((name) => insetPoint(anchors[name], "left"))),
      className: "silhouette-line-art-path silhouette-line-art-contour"
    },
    {
      d: smoothLine(contourSource.map((name) => insetPoint(anchors[name], "right"))),
      className: "silhouette-line-art-path silhouette-line-art-contour"
    }
  ].filter((path) => path.d);

  return { guides, paths };
}

export default function SilhouetteView({
  measurements,
  label,
  hoveredMeasurement,
  onMeasurementHover,
  view = "front"
}) {
  const viewId = view === "side" ? "side" : "front";
  const silhouette = buildSilhouette(measurements, viewId);
  const lineArt = buildSilhouetteLineArt(silhouette, viewId);
  const highlightedAnchor = silhouette.anchors[hoveredMeasurement];
  const titleId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-silhouette-title`;
  const descriptionId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-silhouette-description`;
  const title = viewId === "side" ? `${label} side silhouette` : `${label} silhouette`;
  const description =
    viewId === "side"
      ? "Side-view body outline generated from entered measurements by estimating profile depth from circumference and width fields. Focus a measurement anchor to highlight the corresponding body span."
      : "Front-view body outline generated from entered measurements. Focus a measurement anchor to highlight the corresponding body span.";

  return (
    <figure className="silhouette-figure">
      <svg
        className="silhouette-svg"
        viewBox="0 0 240 360"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
        <line x1="120" y1="10" x2="120" y2="345" className="silhouette-axis" />
        {silhouette.head.path ? (
          <path d={silhouette.head.path} className="silhouette-head-wash" />
        ) : (
          <circle
            cx={silhouette.head.cx}
            cy={silhouette.head.cy}
            r={silhouette.head.r}
            className="silhouette-head-wash"
          />
        )}
        <path d={silhouette.path} className="silhouette-body-wash" />
        <g
          className={`silhouette-line-art silhouette-line-art-${viewId}`}
          aria-hidden="true"
          focusable="false"
        >
          {lineArt.paths.map((path, index) => (
            <path key={`${path.className}-${index}`} d={path.d} className={path.className} />
          ))}
          {lineArt.guides.map((guide, index) => (
            <line
              key={index}
              x1={guide.left.x}
              y1={guide.left.y}
              x2={guide.right.x}
              y2={guide.right.y}
              className="silhouette-line-art-guide"
            />
          ))}
        </g>
        {silhouette.head.path ? (
          <path d={silhouette.head.path} className="silhouette-head silhouette-head-profile" />
        ) : (
          <circle
            cx={silhouette.head.cx}
            cy={silhouette.head.cy}
            r={silhouette.head.r}
            className="silhouette-head"
          />
        )}
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

export function SilhouetteViewToggle({ view, onViewChange, label = "Silhouette view" }) {
  return (
    <div className="silhouette-view-toggle" role="group" aria-label={label}>
      {silhouetteViewOptions.map((option) => (
        <button
          key={option.id}
          className={`button ${view === option.id ? "is-active" : ""}`}
          type="button"
          onClick={() => onViewChange?.(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
