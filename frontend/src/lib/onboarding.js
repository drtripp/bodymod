const ONBOARDING_PROFILE_KEY = "bodymod:onboarding-profile:v1";

export const onboardingGoalOptions = [
  {
    id: "build-muscle",
    label: "Build muscle",
    defaultTab: "body",
    tone: "Training and measurement changes stay paired."
  },
  {
    id: "lose-fat",
    label: "Lose fat",
    defaultTab: "diet",
    tone: "Trend weight, waist, and diet logs stay in view."
  },
  {
    id: "change-shape",
    label: "Change shape",
    defaultTab: "body",
    tone: "Shape goals use measurements, photos, and conservative training suggestions."
  },
  {
    id: "track-transition",
    label: "Track transition",
    defaultTab: "body",
    tone: "Private longitudinal measurements stay local-first."
  },
  {
    id: "just-curious",
    label: "Just curious",
    defaultTab: "body",
    tone: "Explore results without committing to a plan."
  }
];

export const coreOnboardingFields = [
  {
    name: "sex",
    label: "Sex",
    type: "select",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" }
    ],
    unlock: "sets silhouette and percentile assumptions"
  },
  {
    name: "height",
    label: "Height",
    unit: "cm",
    unlock: "unlocks BMI and waist-to-height ratio"
  },
  {
    name: "weight",
    label: "Weight",
    unit: "kg",
    unlock: "unlocks BMI, calorie targets, and trend weight"
  },
  {
    name: "waistCircumference",
    label: "Waist",
    unit: "cm",
    unlock: "unlocks waist ratios and fat-loss trend context"
  },
  {
    name: "bideltoidCircumference",
    label: "Bideltoid Circ",
    unit: "cm",
    unlock: "unlocks shoulder-to-waist and V-taper matching"
  }
];

export const optionalUnlockFields = [
  {
    name: "hipCircumference",
    label: "Hip",
    unlock: "adds waist-to-hip ratio and lower-body shape context"
  },
  {
    name: "neckCircumference",
    label: "Neck",
    unlock: "improves Navy body-fat estimates"
  },
  {
    name: "wristCircumference",
    label: "Wrist",
    unlock: "adds frame-size and potential-model context"
  },
  {
    name: "ankleCircumference",
    label: "Ankle",
    unlock: "adds Casey Butt potential-model context"
  },
  {
    name: "upperThighCircumference",
    label: "Upper thigh",
    unlock: "adds leg-program and physique tracking context"
  },
  {
    name: "bicepCircumference",
    label: "Bicep",
    unlock: "adds arm progression context"
  }
];

export const demoMeasurements = {
  height: 173,
  weight: 68,
  sex: "female",
  headCircumference: 55,
  neckCircumference: 33,
  biacromialWidth: 36,
  bideltoidWidth: 44,
  bideltoidCircumference: 99,
  armpitCircumference: 87,
  nippleCircumference: 89,
  underbustCircumference: 79,
  waistCircumference: 72,
  pantWaistCircumference: 78,
  hipCircumference: 99,
  upperThighCircumference: 56,
  midThighCircumference: 48,
  calfCircumference: 35,
  ankleCircumference: 21,
  bicepCircumference: 28,
  upperForearmCircumference: 23,
  wristCircumference: 15
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function defaultOnboardingProfile() {
  return {
    version: 1,
    goalId: "",
    defaultTab: "body",
    completedFields: [],
    coreStepIndex: 0,
    demoMode: false,
    firstSnapshotSavedAt: "",
    notificationPermissionAsked: false
  };
}

export function loadOnboardingProfile() {
  if (!canUseStorage()) {
    return defaultOnboardingProfile();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ONBOARDING_PROFILE_KEY) || "null");
    return {
      ...defaultOnboardingProfile(),
      ...(parsed || {}),
      completedFields: Array.isArray(parsed?.completedFields) ? parsed.completedFields : []
    };
  } catch {
    return defaultOnboardingProfile();
  }
}

export function persistOnboardingProfile(profile) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    ONBOARDING_PROFILE_KEY,
    JSON.stringify({
      ...defaultOnboardingProfile(),
      ...profile
    })
  );
}

export function goalById(goalId) {
  return onboardingGoalOptions.find((goal) => goal.id === goalId) || null;
}

export function markFieldComplete(profile, fieldName) {
  const completedFields = new Set(profile.completedFields || []);
  completedFields.add(fieldName);
  return {
    ...profile,
    completedFields: [...completedFields]
  };
}

export function coreCompletion(profile) {
  const completed = new Set(profile.completedFields || []);
  const completeCount = coreOnboardingFields.filter((field) => completed.has(field.name)).length;

  return {
    completeCount,
    totalCount: coreOnboardingFields.length,
    percent: Math.round((completeCount / coreOnboardingFields.length) * 100),
    isComplete: completeCount === coreOnboardingFields.length
  };
}
