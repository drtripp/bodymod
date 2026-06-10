import SilhouetteView from "./SilhouetteView";
import {
  coreCompletion,
  coreOnboardingFields,
  demoMeasurements,
  goalById,
  onboardingGoalOptions,
  optionalUnlockFields
} from "../lib/onboarding";

function formatPercentile(value) {
  return Number.isFinite(Number(value)) ? `${Number(value)}th pct` : "pending";
}

function nextCheckInDate() {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(nextDate);
}

export default function OnboardingPanel({
  profile,
  measurements,
  result,
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
  const completedFields = new Set(profile.completedFields || []);
  const topMatch = result.top_match?.label || result.matches?.[0]?.label || "Target loading";

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
    <section className="onboarding-panel panel" aria-label="First run onboarding">
      <div className="panel-header">
        <h2>First run</h2>
        <p>Choose a starting intent, confirm the core five, then keep using the full editor below.</p>
      </div>

      <div className="onboarding-goals" aria-label="Goal question">
        {onboardingGoalOptions.map((goal) => (
          <button
            key={goal.id}
            className={`button ${profile.goalId === goal.id ? "is-active" : ""}`}
            type="button"
            onClick={() => handleGoalSelect(goal)}
          >
            {goal.label}
          </button>
        ))}
      </div>
      {selectedGoal ? (
        <p className="muted-text" aria-label="Selected onboarding intent">
          {selectedGoal.tone}
        </p>
      ) : null}

      <div className="onboarding-main">
        <div className="core-flow" aria-label="Core five progressive flow">
          <div className="completion-meter" aria-label="Completion meter">
            <strong>{completion.completeCount} of {completion.totalCount} core fields confirmed</strong>
            <div className="completion-track">
              <i style={{ width: `${completion.percent}%` }} />
            </div>
          </div>

          <label className="field">
            <span className="field-label">
              {currentStep.label}
              {currentStep.unit ? ` (${currentStep.unit})` : ""}
            </span>
            {currentStep.type === "select" ? (
              <select
                aria-label={`Onboarding ${currentStep.label}`}
                value={measurements[currentStep.name]}
                onChange={(event) => onSetMeasurement(currentStep.name, event.target.value)}
              >
                {currentStep.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Onboarding ${currentStep.label}`}
                type="number"
                inputMode="decimal"
                value={measurements[currentStep.name]}
                onChange={(event) => onSetMeasurement(currentStep.name, event.target.value)}
              />
            )}
          </label>
          <p className="muted-text">{currentStep.unlock}</p>
          <button className="button" type="button" onClick={handleNextField}>
            Confirm field
          </button>

          <div className="optional-unlocks" aria-label="Optional field unlocks">
            <h3>Optional fields</h3>
            <p>Everything below is optional forever. Add fields only when they are useful.</p>
            <ul>
              {optionalUnlockFields.map((field) => (
                <li key={field.name}>
                  <strong>{field.label}</strong>
                  <span>{field.unlock}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="onboarding-payoff" aria-label="Instant payoff">
          <SilhouetteView
            measurements={measurements}
            label="Onboarding profile"
            view={silhouetteView}
          />
          <div className="payoff-copy">
            <strong>{topMatch}</strong>
            <span>Height {formatPercentile(result.percentiles?.height)}</span>
            <span>Waist {formatPercentile(result.percentiles?.waistCircumference)}</span>
          </div>
          <div className="onboarding-actions">
            <button className="button" type="button" onClick={handleDemoMode}>
              Explore with a sample profile
            </button>
            <button
              className="button"
              type="button"
              disabled={!completion.isComplete || Boolean(profile.firstSnapshotSavedAt)}
              onClick={handleSnapshot}
            >
              {profile.firstSnapshotSavedAt
                ? `Snapshot #1 saved. Next check-in: ${nextCheckInDate()}`
                : "Save Snapshot #1"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
