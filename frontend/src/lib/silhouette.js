const PROFILE_DEFAULTS = {
  male: {
    average: {
      height: 176,
      weight: 78,
      headCircumference: 57,
      neckCircumference: 39,
      biacromialWidth: 40,
      bideltoidWidth: 50,
      bideltoidCircumference: 118,
      armpitCircumference: 98,
      nippleCircumference: 96,
      underbustCircumference: 92,
      waistCircumference: 80,
      pantWaistCircumference: 86,
      hipCircumference: 96,
      upperThighCircumference: 58,
      midThighCircumference: 50,
      calfCircumference: 38,
      bicepCircumference: 34,
      upperForearmCircumference: 29,
      wristCircumference: 17
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
      headCircumference: 55,
      neckCircumference: 32,
      biacromialWidth: 35,
      bideltoidWidth: 43,
      bideltoidCircumference: 100,
      armpitCircumference: 86,
      nippleCircumference: 88,
      underbustCircumference: 78,
      waistCircumference: 70,
      pantWaistCircumference: 77,
      hipCircumference: 100,
      upperThighCircumference: 56,
      midThighCircumference: 48,
      calfCircumference: 35,
      bicepCircumference: 28,
      upperForearmCircumference: 23,
      wristCircumference: 15
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

  const neckInfluence = measurementInfluence(
    measurements.neckCircumference,
    average.neckCircumference,
    0.9
  );
  const biacromialInfluence = measurementInfluence(
    measurements.biacromialWidth,
    average.biacromialWidth,
    0.95
  );
  const bideltoidWidthInfluence = measurementInfluence(
    measurements.bideltoidWidth,
    average.bideltoidWidth,
    0.95
  );
  const bideltoidCircumferenceInfluence = measurementInfluence(
    measurements.bideltoidCircumference,
    average.bideltoidCircumference,
    0.82
  );
  const armpitInfluence = measurementInfluence(
    measurements.armpitCircumference,
    average.armpitCircumference,
    0.9
  );
  const nippleInfluence = measurementInfluence(
    measurements.nippleCircumference,
    average.nippleCircumference,
    0.94
  );
  const underbustInfluence = measurementInfluence(
    measurements.underbustCircumference,
    average.underbustCircumference,
    0.92
  );
  const waistInfluence = measurementInfluence(
    measurements.waistCircumference,
    average.waistCircumference,
    1.08
  );
  const pantWaistInfluence = measurementInfluence(
    measurements.pantWaistCircumference,
    average.pantWaistCircumference,
    1
  );
  const hipInfluence = measurementInfluence(
    measurements.hipCircumference,
    average.hipCircumference,
    0.96
  );
  const upperThighInfluence = measurementInfluence(
    measurements.upperThighCircumference,
    average.upperThighCircumference,
    0.96
  );
  const midThighInfluence = measurementInfluence(
    measurements.midThighCircumference,
    average.midThighCircumference,
    0.96
  );
  const calfInfluence = measurementInfluence(
    measurements.calfCircumference,
    average.calfCircumference,
    0.96
  );

  const frameScale = heightScale * (0.72 + biacromialInfluence * 0.28);
  const torsoMassScale = 0.84 + massScale * 0.16;
  const lowerMassScale = 0.8 + massScale * 0.2;

  return {
    neck: widths.neck * heightScale * neckInfluence,
    shoulder: widths.shoulder * frameScale * biacromialInfluence,
    deltoid:
      widths.deltoid *
      frameScale *
      (bideltoidWidthInfluence * 0.58 +
        bideltoidCircumferenceInfluence * 0.28 +
        armpitInfluence * 0.14),
    chest:
      widths.chest *
      heightScale *
      torsoMassScale *
      (armpitInfluence * 0.24 + nippleInfluence * 0.46 + underbustInfluence * 0.3),
    underbust: widths.underbust * heightScale * torsoMassScale * underbustInfluence,
    waist: widths.waist * heightScale * torsoMassScale * waistInfluence,
    highHip:
      widths.highHip *
      heightScale *
      lowerMassScale *
      (pantWaistInfluence * 0.5 + hipInfluence * 0.5),
    hip: widths.hip * heightScale * lowerMassScale * hipInfluence,
    upperThigh:
      widths.upperThigh *
      heightScale *
      lowerMassScale *
      (upperThighInfluence * 0.7 + hipInfluence * 0.3),
    midThigh:
      widths.midThigh *
      heightScale *
      lowerMassScale *
      (midThighInfluence * 0.76 + upperThighInfluence * 0.24),
    knee: widths.knee * heightScale * (0.9 + massScale * 0.1),
    calf: widths.calf * heightScale * calfInfluence,
    ankle: widths.ankle * heightScale
  };
}

export function buildFrontSilhouette(measurements) {
  const profile = PROFILE_DEFAULTS[measurements.sex] || PROFILE_DEFAULTS.male;
  const centerX = 120;
  const averageHead = profile.average.headCircumference;
  const headRadius = clamp(
    17 + (measurements.height - 170) * 0.035,
    15.5,
    19.5
  ) * measurementInfluence(measurements.headCircumference, averageHead, 0.72);
  const headCenterY = 26;
  const bodyTopY = headCenterY + headRadius + 6;
  const bodyBottomY = 338;
  const bodyHeight = bodyBottomY - bodyTopY;
  const halfWidths = buildHalfWidths(measurements, profile);

  const leftSide = Object.entries(profile.y).map(([key, proportion]) => ({
    key,
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
      key: point.key,
      x: centerX + (centerX - point.x),
      y: point.y
    }));

  const pathPoints = [
    ...leftSide,
    ...bottomPoints,
    ...rightSide
  ].map(roundPoint);

  function sideSpan(key) {
    return {
      left: roundPoint(leftSide.find((point) => point.key === key)),
      right: roundPoint(rightSide.find((point) => point.key === key))
    };
  }

  function bodyY(proportion) {
    return bodyTopY + bodyHeight * proportion;
  }

  function centeredSpan(y, halfWidth) {
    return {
      left: roundPoint({ x: centerX - halfWidth, y }),
      right: roundPoint({ x: centerX + halfWidth, y })
    };
  }

  function limbSpan(y, centerOffset, circumference, averageCircumference) {
    const radius = clamp(
      (circumference / averageCircumference) * 5.6,
      3.8,
      9.5
    );
    const x = centerX + centerOffset;

    return {
      left: roundPoint({ x: x - radius, y }),
      right: roundPoint({ x: x + radius, y })
    };
  }

  const armOffset = halfWidths.deltoid + 15;
  const anchors = {
    headCircumference: centeredSpan(headCenterY, headRadius),
    neckCircumference: sideSpan("neck"),
    biacromialWidth: sideSpan("shoulder"),
    bideltoidWidth: sideSpan("deltoid"),
    bideltoidCircumference: sideSpan("deltoid"),
    armpitCircumference: centeredSpan(bodyY(0.135), halfWidths.chest * 0.96),
    nippleCircumference: sideSpan("chest"),
    underbustCircumference: sideSpan("underbust"),
    waistCircumference: sideSpan("waist"),
    pantWaistCircumference: sideSpan("highHip"),
    hipCircumference: sideSpan("hip"),
    upperThighCircumference: sideSpan("upperThigh"),
    midThighCircumference: sideSpan("midThigh"),
    calfCircumference: sideSpan("calf"),
    bicepCircumference: limbSpan(
      bodyY(0.24),
      armOffset,
      measurements.bicepCircumference,
      profile.average.bicepCircumference
    ),
    upperForearmCircumference: limbSpan(
      bodyY(0.39),
      armOffset + 2,
      measurements.upperForearmCircumference,
      profile.average.upperForearmCircumference
    ),
    wristCircumference: limbSpan(
      bodyY(0.54),
      armOffset,
      measurements.wristCircumference,
      profile.average.wristCircumference
    )
  };

  return {
    head: {
      cx: centerX,
      cy: headCenterY,
      r: Number(headRadius.toFixed(2))
    },
    anchors,
    path: `${smoothPath(pathPoints)} Z`
  };
}
