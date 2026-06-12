import SilhouetteView from "./SilhouetteView";
import {
  coreCompletion,
  coreOnboardingFields,
  demoMeasurements,
  goalById,
  onboardingGoalOptions,
  optionalUnlockFields
} from "../lib/onboarding";

function formatPercentile(value, t) {
  if (!Number.isFinite(Number(value))) {
    return copy(t, "onboarding.percentile.pending", "pending");
  }

  return copy(t, "onboarding.percentile.value", "{value}th pct", {
    value: Number(value)
  });
}

function nextCheckInDate(locale = undefined) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(nextDate);
}

function copy(t, key, fallback, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    t(key, values, fallback)
  );
}

export default function OnboardingPanel({
  profile,
  measurements,
  result,
  locale,
  t = (key, values, fallback) => fallback || key,
  onProfileChange,
  onSetMeasurement,
  onApplyDemo,
  onSaveFirstSnapshot,
  silhouetteView = "front"
}) {
  const selectedGoal = goalById(profile.goalId);
  const completion = coreCompletion(profile);
  const currentStep = coreOnboardingFields[
    Math.min(profile.coreStepIndex || 0, coreOnboardingFields.length - 1)
  ];
  const currentStepLabel = copy(
    t,
    `onboarding.core.${currentStep.name}.label`,
    currentStep.label
  );
  const currentStepUnlock = copy(
    t,
    `onboarding.core.${currentStep.name}.unlock`,
    currentStep.unlock
  );
  const topMatch =
    result.top_match?.label ||
    result.matches?.[0]?.label ||
    copy(t, "onboarding.target.loading", "Target loading");
  const percentileHeight = copy(
    t,
    "onboarding.payoff.height",
    "Height {percentile}",
    {
      percentile: formatPercentile(result.percentiles?.height, t)
    }
  );
  const percentileWaist = copy(
    t,
    "onboarding.payoff.waist",
    "Waist {percentile}",
    {
      percentile: formatPercentile(result.percentiles?.waistCircumference, t)
    }
  );
  const fieldAriaPrefix = copy(t, "onboarding.field.ariaPrefix", "Onboarding");

  function handleGoalSelect(goal) {
    onProfileChange({
      goalId: goal.id,
      defaultTab: goal.defaultTab
    });
  }

  function handleNextField() {
    const completed = new Set(profile.completedFields || []);
    completed.add(currentStep.name);
    onProfileChange({
      completedFields: [...completed],
      coreStepIndex: Math.min((profile.coreStepIndex || 0) + 1, coreOnboardingFields.length - 1)
    });
  }

  function handleDemoMode() {
    onApplyDemo(demoMeasurements);
    onProfileChange({
      demoMode: true,
      goalId: "just-curious",
      defaultTab: "body",
      completedFields: coreOnboardingFields.map((field) => field.name),
      coreStepIndex: coreOnboardingFields.length - 1
    });
  }

  function handleSnapshot() {
    const saved = onSaveFirstSnapshot();
    if (!saved) {
      return;
    }

    onProfileChange({
      firstSnapshotSavedAt: new Date().toISOString(),
      notificationPermissionAsked: true
    });
  }

  return (
    <section
      className="onboarding-panel panel"
      aria-label={copy(t, "onboarding.aria", "First run onboarding")}
    >
      <div className="panel-header">
        <h2>{copy(t, "onboarding.title", "First run")}</h2>
        <p>
          {copy(
            t,
            "onboarding.intro",
            "Choose a starting intent, confirm the core five, then keep using the full editor below."
          )}
        </p>
      </div>

      <div className="onboarding-goals" aria-label={copy(t, "onboarding.goal.aria", "Goal question")}>
        {onboardingGoalOptions.map((goal) => (
          <button
            key={goal.id}
            className={`button ${profile.goalId === goal.id ? "is-active" : ""}`}
            type="button"
            onClick={() => handleGoalSelect(goal)}
          >
            {copy(t, `onboarding.goal.${goal.id}.label`, goal.label)}
          </button>
        ))}
      </div>
      {selectedGoal ? (
        <p
          className="muted-text"
          aria-label={copy(t, "onboarding.selected.aria", "Selected onboarding intent")}
        >
          {copy(t, `onboarding.goal.${selectedGoal.id}.tone`, selectedGoal.tone)}
        </p>
      ) : null}

      <div className="onboarding-main">
        <div
          className="core-flow"
          aria-label={copy(t, "onboarding.core.aria", "Core five progressive flow")}
        >
          <div
            className="completion-meter"
            aria-label={copy(t, "onboarding.completion.aria", "Completion meter")}
          >
            <strong>
              {copy(
                t,
                "onboarding.completion.text",
                "{completeCount} of {totalCount} core fields confirmed",
                {
                  completeCount: completion.completeCount,
                  totalCount: completion.totalCount
                }
              )}
            </strong>
            <div className="completion-track">
              <i style={{ width: `${completion.percent}%` }} />
            </div>
          </div>

          <label className="field">
            <span className="field-label">
              {currentStepLabel}
              {currentStep.unit ? ` (${currentStep.unit})` : ""}
            </span>
            {currentStep.type === "select" ? (
              <select
                aria-label={`${fieldAriaPrefix} ${currentStepLabel}`}
                value={measurements[currentStep.name]}
                onChange={(event) => onSetMeasurement(currentStep.name, event.target.value)}
              >
                {currentStep.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {copy(
                      t,
                      `measurement.field.${currentStep.name}.option.${option.value}`,
                      option.label
                    )}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`${fieldAriaPrefix} ${currentStepLabel}`}
                type="number"
                inputMode="decimal"
                value={measurements[currentStep.name]}
                onChange={(event) => onSetMeasurement(currentStep.name, event.target.value)}
              />
            )}
          </label>
          <p className="muted-text">{currentStepUnlock}</p>
          <button className="button" type="button" onClick={handleNextField}>
            {copy(t, "onboarding.confirmField", "Confirm field")}
          </button>

          <div
            className="optional-unlocks"
            aria-label={copy(t, "onboarding.optional.aria", "Optional field unlocks")}
          >
            <h3>{copy(t, "onboarding.optional.title", "Optional fields")}</h3>
            <p>
              {copy(
                t,
                "onboarding.optional.body",
                "Everything below is optional forever. Add fields only when they are useful."
              )}
            </p>
            <ul>
              {optionalUnlockFields.map((field) => (
                <li key={field.name}>
                  <strong>
                    {copy(t, `onboarding.optional.${field.name}.label`, field.label)}
                  </strong>
                  <span>
                    {copy(t, `onboarding.optional.${field.name}.unlock`, field.unlock)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="onboarding-payoff"
          aria-label={copy(t, "onboarding.payoff.aria", "Instant payoff")}
        >
          <SilhouetteView
            measurements={measurements}
            label={copy(t, "onboarding.profile.label", "Onboarding profile")}
            view={silhouetteView}
          />
          <div className="payoff-copy">
            <strong>{topMatch}</strong>
            <span>{percentileHeight}</span>
            <span>{percentileWaist}</span>
          </div>
          <div className="onboarding-actions">
            <button className="button" type="button" onClick={handleDemoMode}>
              {copy(t, "onboarding.demo", "Explore with a sample profile")}
            </button>
            <button
              className="button"
              type="button"
              disabled={!completion.isComplete || Boolean(profile.firstSnapshotSavedAt)}
              onClick={handleSnapshot}
            >
              {profile.firstSnapshotSavedAt
                ? copy(
                    t,
                    "onboarding.snapshot.savedNext",
                    "Snapshot #1 saved. Next check-in: {date}",
                    { date: nextCheckInDate(locale) }
                  )
                : copy(t, "onboarding.snapshot.save", "Save Snapshot #1")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
