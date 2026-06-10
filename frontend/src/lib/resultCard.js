import { calculateRatios } from "./ratios.js";
import { buildFrontSilhouette } from "./silhouette.js";
import { buildMorphFrames } from "./comparison.js";

const cardWidth = 1080;
const cardHeight = 1350;

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function formatScore(similarity) {
  return typeof similarity === "number" ? `${Math.round(similarity)}%` : "--";
}

function ratioValue(ratios, id) {
  return ratios.find((ratio) => ratio.id === id)?.value || "--";
}

export function buildResultCardModel(measurements, result = {}) {
  const ratios = calculateRatios(measurements);
  const topMatch = result.top_match || result.matches?.[0] || null;
  const silhouette = buildFrontSilhouette(measurements);

  return {
    brand: "bodymod",
    title: "Measurement profile",
    topMatch: topMatch?.label || "No match yet",
    similarity: formatScore(topMatch?.similarity),
    stats: [
      ["Height", `${Number(measurements.height).toFixed(0)} cm`],
      ["Weight", `${Number(measurements.weight).toFixed(0)} kg`],
      ["BMI", ratioValue(ratios, "bmi")],
      ["SWR", ratioValue(ratios, "shoulderWaist")],
      ["WHR", ratioValue(ratios, "waistHip")],
      ["WHTR", ratioValue(ratios, "waistHeight")]
    ],
    percentiles: [
      ["Height pct", result.percentiles?.height ?? "--"],
      ["Waist pct", result.percentiles?.waistCircumference ?? "--"],
      ["Shoulder pct", result.percentiles?.bideltoidCircumference ?? "--"]
    ],
    silhouette
  };
}

export function buildResultCardSvg(measurements, result = {}) {
  const model = buildResultCardModel(measurements, result);
  const stats = model.stats
    .map(
      ([label, value], index) => `
        <g transform="translate(${index % 2 === 0 ? 620 : 835} ${458 + Math.floor(index / 2) * 132})">
          <rect width="180" height="92" rx="0" fill="#182430" stroke="#526170" />
          <text x="18" y="32" class="caption">${escapeXml(label)}</text>
          <text x="18" y="68" class="value">${escapeXml(value)}</text>
        </g>`
    )
    .join("");
  const percentiles = model.percentiles
    .map(
      ([label, value], index) => `
        <g transform="translate(${140 + index * 270} 1130)">
          <text x="0" y="0" class="caption">${escapeXml(label)}</text>
          <text x="0" y="42" class="percentile">${escapeXml(value)}</text>
        </g>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" role="img" aria-label="bodymod shareable result card">
  <style>
    .brand { font: 700 56px Georgia, serif; fill: #f2f0e8; }
    .eyebrow, .caption { font: 700 22px Georgia, serif; fill: #c7d0d9; text-transform: uppercase; letter-spacing: 2px; }
    .title { font: 700 44px Georgia, serif; fill: #f2f0e8; }
    .match { font: 700 64px Georgia, serif; fill: #f2f0e8; }
    .value { font: 700 36px Georgia, serif; fill: #f2f0e8; }
    .percentile { font: 700 44px Georgia, serif; fill: #f2f0e8; }
    .note { font: 24px Georgia, serif; fill: #c7d0d9; }
    .silhouette-axis { stroke: #526170; stroke-width: 1.2; }
    .silhouette-head, .silhouette-body { fill: none; stroke: #f2f0e8; stroke-width: 4; stroke-linejoin: round; }
  </style>
  <rect width="1080" height="1350" fill="#101923" />
  <rect x="54" y="54" width="972" height="1242" fill="#14202b" stroke="#526170" stroke-width="2" />
  <text x="110" y="142" class="brand">${escapeXml(model.brand)}</text>
  <text x="110" y="205" class="eyebrow">${escapeXml(model.title)}</text>
  <text x="110" y="286" class="caption">Top match</text>
  <text x="110" y="356" class="match">${escapeXml(model.topMatch)}</text>
  <text x="110" y="410" class="note">Similarity score ${escapeXml(model.similarity)}</text>

  <g transform="translate(130 438) scale(1.55)">
    <line x1="120" y1="10" x2="120" y2="345" class="silhouette-axis" />
    <circle cx="${model.silhouette.head.cx}" cy="${model.silhouette.head.cy}" r="${model.silhouette.head.r}" class="silhouette-head" />
    <path d="${model.silhouette.path}" class="silhouette-body" />
  </g>

  ${stats}
  <rect x="110" y="1066" width="860" height="1" fill="#526170" />
  ${percentiles}
  <text x="110" y="1248" class="note">Approximate, local-first result card. Not medical advice.</text>
</svg>`;
}

export function resultCardDataUrl(measurements, result = {}) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildResultCardSvg(measurements, result)
  )}`;
}

export function downloadResultCard(measurements, result = {}, filename = "bodymod-result-card.svg") {
  const blob = new Blob([buildResultCardSvg(measurements, result)], {
    type: "image/svg+xml"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function buildMorphShareCardSvg(currentMeasurements, targetProfile = {}) {
  const frames = buildMorphFrames(
    currentMeasurements,
    targetProfile.measurements || {},
    5
  ).map((frame) => ({
    ...frame,
    silhouette: buildFrontSilhouette(frame.measurements)
  }));
  const current = frames[0].silhouette;
  const midpoint = frames[Math.floor(frames.length / 2)];
  const target = frames[frames.length - 1].silhouette;
  const pathValues = frames.map((frame) => frame.silhouette.path).join(";");
  const headCxValues = frames.map((frame) => frame.silhouette.head.cx).join(";");
  const headCyValues = frames.map((frame) => frame.silhouette.head.cy).join(";");
  const headRValues = frames.map((frame) => frame.silhouette.head.r).join(";");
  const targetLabel = targetProfile.label || "Target";
  const waistDelta =
    Number(targetProfile.measurements?.waistCircumference) -
    Number(currentMeasurements.waistCircumference);
  const shoulderDelta =
    Number(targetProfile.measurements?.bideltoidCircumference) -
    Number(currentMeasurements.bideltoidCircumference);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" role="img" aria-label="bodymod animated morph share card">
  <style>
    .brand { font: 700 56px Georgia, serif; fill: #f2f0e8; }
    .eyebrow, .caption { font: 700 22px Georgia, serif; fill: #c7d0d9; text-transform: uppercase; letter-spacing: 2px; }
    .title { font: 700 48px Georgia, serif; fill: #f2f0e8; }
    .value { font: 700 36px Georgia, serif; fill: #f2f0e8; }
    .note { font: 24px Georgia, serif; fill: #c7d0d9; }
    .silhouette-axis { stroke: #526170; stroke-width: 1.2; }
    .silhouette-head, .silhouette-body { fill: none; stroke: #f2f0e8; stroke-width: 4; stroke-linejoin: round; }
    .target-head, .target-body { fill: none; stroke: #6fb6ff; stroke-width: 3; stroke-linejoin: round; opacity: 0.55; }
    .mini-head, .mini-body { fill: none; stroke: #8da9c4; stroke-width: 3; stroke-linejoin: round; }
    .panel { fill: #182430; stroke: #526170; }
  </style>
  <rect width="1080" height="1350" fill="#101923" />
  <rect x="54" y="54" width="972" height="1242" fill="#14202b" stroke="#526170" stroke-width="2" />
  <text x="110" y="142" class="brand">bodymod</text>
  <text x="110" y="205" class="eyebrow">Morph comparison</text>
  <text x="110" y="286" class="title">You to ${escapeXml(targetLabel)}</text>

  <g transform="translate(222 340) scale(2.55)">
    <line x1="120" y1="10" x2="120" y2="345" class="silhouette-axis" />
    <path d="${escapeXml(target.path)}" class="target-body" />
    <circle cx="${target.head.cx}" cy="${target.head.cy}" r="${target.head.r}" class="target-head" />
    <path d="${escapeXml(current.path)}" class="silhouette-body">
      <animate attributeName="d" values="${escapeXml(`${pathValues};${[...frames].reverse().map((frame) => frame.silhouette.path).join(";")}`)}" dur="5s" repeatCount="indefinite" />
    </path>
    <circle cx="${current.head.cx}" cy="${current.head.cy}" r="${current.head.r}" class="silhouette-head">
      <animate attributeName="cx" values="${escapeXml(`${headCxValues};${[...frames].reverse().map((frame) => frame.silhouette.head.cx).join(";")}`)}" dur="5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="${escapeXml(`${headCyValues};${[...frames].reverse().map((frame) => frame.silhouette.head.cy).join(";")}`)}" dur="5s" repeatCount="indefinite" />
      <animate attributeName="r" values="${escapeXml(`${headRValues};${[...frames].reverse().map((frame) => frame.silhouette.head.r).join(";")}`)}" dur="5s" repeatCount="indefinite" />
    </circle>
  </g>

  <rect x="110" y="1060" width="266" height="120" class="panel" />
  <text x="140" y="1104" class="caption">Waist delta</text>
  <text x="140" y="1154" class="value">${Number.isFinite(waistDelta) && waistDelta > 0 ? "+" : ""}${Number.isFinite(waistDelta) ? waistDelta.toFixed(1) : "--"} cm</text>
  <rect x="407" y="1060" width="266" height="120" class="panel" />
  <text x="437" y="1104" class="caption">Shoulder delta</text>
  <text x="437" y="1154" class="value">${Number.isFinite(shoulderDelta) && shoulderDelta > 0 ? "+" : ""}${Number.isFinite(shoulderDelta) ? shoulderDelta.toFixed(1) : "--"} cm</text>
  <rect x="704" y="1060" width="266" height="120" class="panel" />
  <text x="734" y="1104" class="caption">Midpoint</text>
  <text x="734" y="1154" class="value">${Math.round(midpoint.fraction * 100)}%</text>
  <text x="110" y="1248" class="note">Animated SVG morph from measurement interpolation. Not medical advice.</text>
</svg>`;
}

export function morphShareCardDataUrl(currentMeasurements, targetProfile = {}) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildMorphShareCardSvg(currentMeasurements, targetProfile)
  )}`;
}

export function downloadMorphShareCard(
  currentMeasurements,
  targetProfile = {},
  filename = "bodymod-morph-card.svg"
) {
  const blob = new Blob([buildMorphShareCardSvg(currentMeasurements, targetProfile)], {
    type: "image/svg+xml"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
