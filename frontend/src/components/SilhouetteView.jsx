function widthFromCircumference(value, scale = 0.72) {
  return Math.max(28, value * scale);
}

export default function SilhouetteView({ measurements, label }) {
  const shoulderWidth = widthFromCircumference(measurements.shoulders, 0.58);
  const chestWidth = widthFromCircumference(measurements.underbust, 0.64);
  const waistWidth = widthFromCircumference(measurements.waist, 0.62);
  const hipWidth = widthFromCircumference(measurements.hips, 0.68);
  const heightScale = Math.max(230, measurements.height * 1.35);

  const topY = 32;
  const neckY = 56;
  const chestY = 98;
  const waistY = 170;
  const hipY = 232;
  const bottomY = Math.min(332, heightScale);
  const centerX = 120;

  const path = [
    `M ${centerX - 18} ${topY}`,
    `Q ${centerX - shoulderWidth * 0.14} ${neckY} ${centerX - shoulderWidth / 2} ${chestY}`,
    `Q ${centerX - chestWidth / 2} ${waistY - 26} ${centerX - waistWidth / 2} ${waistY}`,
    `Q ${centerX - hipWidth / 2} ${hipY - 10} ${centerX - hipWidth / 2} ${hipY}`,
    `Q ${centerX - hipWidth * 0.18} ${bottomY - 18} ${centerX - 16} ${bottomY}`,
    `L ${centerX + 16} ${bottomY}`,
    `Q ${centerX + hipWidth * 0.18} ${bottomY - 18} ${centerX + hipWidth / 2} ${hipY}`,
    `Q ${centerX + hipWidth / 2} ${hipY - 10} ${centerX + waistWidth / 2} ${waistY}`,
    `Q ${centerX + chestWidth / 2} ${waistY - 26} ${centerX + shoulderWidth / 2} ${chestY}`,
    `Q ${centerX + shoulderWidth * 0.14} ${neckY} ${centerX + 18} ${topY}`,
    "Z"
  ].join(" ");

  return (
    <figure className="silhouette-figure">
      <svg
        className="silhouette-svg"
        viewBox="0 0 240 360"
        role="img"
        aria-label={`${label} silhouette`}
      >
        <circle cx="120" cy="24" r="18" className="silhouette-head" />
        <path d={path} className="silhouette-body" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
