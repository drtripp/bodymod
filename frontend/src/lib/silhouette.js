const PROFILE_DEFAULTS = {
  male: {
    average: {
      height: 176,
      weight: 78,
      shoulders: 118,
      underbust: 94,
      waist: 83,
      hips: 97
    },
    widths: {
      neck: 18,
      shoulder: 38,
      deltoid: 41,
      chest: 34,
      underbust: 30,
      waist: 24,
      highHip: 27,
      hip: 29,
      upperThigh: 23,
      midThigh: 19,
      knee: 11.5,
      calf: 9.5,
      ankle: 5.9
    },
    y: {
      neck: 0.0,
      shoulder: 0.05,
      deltoid: 0.095,
      chest: 0.16,
      underbust: 0.235,
      waist: 0.375,
      highHip: 0.45,
      hip: 0.515,
      upperThigh: 0.63,
      midThigh: 0.73,
      knee: 0.825,
      calf: 0.905,
      ankle: 0.985
    }
  },
  female: {
    average: {
      height: 164,
      weight: 62,
      shoulders: 104,
      underbust: 78,
      waist: 70,
      hips: 100
    },
    widths: {
      neck: 16,
      shoulder: 31,
      deltoid: 33,
      chest: 29,
      underbust: 24,
      waist: 19,
      highHip: 25,
      hip: 31,
      upperThigh: 21,
      midThigh: 17,
      knee: 10.5,
      calf: 8.8,
      ankle: 5.4
    },
    y: {
      neck: 0.0,
      shoulder: 0.05,
      deltoid: 0.1,
      chest: 0.165,
      underbust: 0.24,
      waist: 0.37,
      highHip: 0.445,
      hip: 0.525,
      upperThigh: 0.645,
      midThigh: 0.74,
      knee: 0.83,
      calf: 0.91,
      ankle: 0.985
    }
  }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundPoint(point) {
  return {
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2))
  };
}

function ratio(value, average) {
  return clamp(value / average, 0.72, 1.36);
}

function measurementInfluence(value, average, exponent = 1) {
  return Math.pow(ratio(value, average), exponent);
}

function smoothPath(points) {
  if (points.length < 2) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  let path = `M ${firstPoint.x} ${firstPoint.y}`;

  for (let index = 0; index < rest.length; index += 1) {
    const currentPoint = rest[index];
    const nextPoint = rest[index + 1];

    if (!nextPoint) {
      path += ` L ${currentPoint.x} ${currentPoint.y}`;
      continue;
    }

    const midpointX = (currentPoint.x + nextPoint.x) / 2;
    const midpointY = (currentPoint.y + nextPoint.y) / 2;

    path += ` Q ${currentPoint.x} ${currentPoint.y} ${midpointX} ${midpointY}`;
  }

  const lastPoint = points[points.length - 1];
  path += ` L ${lastPoint.x} ${lastPoint.y}`;

  return path;
}

function buildHalfWidths(measurements, profile) {
  const { average, widths } = profile;
  const heightScale = clamp(measurements.height / average.height, 0.84, 1.18);
  const bodyMassIndex = measurements.weight / Math.pow(measurements.height / 100, 2);
  const averageBodyMassIndex = average.weight / Math.pow(average.height / 100, 2);
  const massScale = clamp(1 + (bodyMassIndex - averageBodyMassIndex) * 0.018, 0.8, 1.22);

  const shoulderInfluence = measurementInfluence(
    measurements.shoulders,
    average.shoulders,
    0.9
  );
  const underbustInfluence = measurementInfluence(
    measurements.underbust,
    average.underbust,
    0.92
  );
  const waistInfluence = measurementInfluence(
    measurements.waist,
    average.waist,
    1.08
  );
  const hipInfluence = measurementInfluence(measurements.hips, average.hips, 0.96);

  const frameScale = heightScale * (0.72 + shoulderInfluence * 0.28);
  const torsoMassScale = 0.84 + massScale * 0.16;
  const lowerMassScale = 0.8 + massScale * 0.2;

  return {
    neck: widths.neck * heightScale * (0.9 + massScale * 0.1),
    shoulder: widths.shoulder * frameScale * shoulderInfluence,
    deltoid:
      widths.deltoid *
      frameScale *
      (shoulderInfluence * 0.72 + underbustInfluence * 0.28),
    chest:
      widths.chest *
      heightScale *
      torsoMassScale *
      (shoulderInfluence * 0.34 + underbustInfluence * 0.66),
    underbust: widths.underbust * heightScale * torsoMassScale * underbustInfluence,
    waist: widths.waist * heightScale * torsoMassScale * waistInfluence,
    highHip:
      widths.highHip *
      heightScale *
      lowerMassScale *
      (waistInfluence * 0.35 + hipInfluence * 0.65),
    hip: widths.hip * heightScale * lowerMassScale * hipInfluence,
    upperThigh:
      widths.upperThigh *
      heightScale *
      lowerMassScale *
      (hipInfluence * 0.58 + massScale * 0.42),
    midThigh:
      widths.midThigh *
      heightScale *
      lowerMassScale *
      (hipInfluence * 0.44 + massScale * 0.56),
    knee: widths.knee * heightScale * (0.9 + massScale * 0.1),
    calf: widths.calf * heightScale * (0.88 + massScale * 0.12),
    ankle: widths.ankle * heightScale
  };
}

export function buildFrontSilhouette(measurements) {
  const profile = PROFILE_DEFAULTS[measurements.sex] || PROFILE_DEFAULTS.male;
  const centerX = 120;
  const headRadius = clamp(17 + (measurements.height - 170) * 0.05, 15.5, 19.5);
  const headCenterY = 26;
  const bodyTopY = headCenterY + headRadius + 6;
  const bodyBottomY = 338;
  const bodyHeight = bodyBottomY - bodyTopY;
  const halfWidths = buildHalfWidths(measurements, profile);

  const leftSide = Object.entries(profile.y).map(([key, proportion]) => ({
    x: centerX - halfWidths[key],
    y: bodyTopY + bodyHeight * proportion
  }));

  const hemInset = Math.max(8, halfWidths.ankle * 1.15);
  const bottomPoints = [
    { x: centerX - hemInset, y: bodyBottomY },
    { x: centerX + hemInset, y: bodyBottomY }
  ];

  const rightSide = [...leftSide]
    .reverse()
    .map((point) => ({
      x: centerX + (centerX - point.x),
      y: point.y
    }));

  const pathPoints = [
    ...leftSide,
    ...bottomPoints,
    ...rightSide
  ].map(roundPoint);

  return {
    head: {
      cx: centerX,
      cy: headCenterY,
      r: Number(headRadius.toFixed(2))
    },
    path: `${smoothPath(pathPoints)} Z`
  };
}
