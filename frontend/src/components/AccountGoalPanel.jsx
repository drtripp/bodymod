import { useEffect, useMemo, useState } from "react";
import SnapshotPanel from "./SnapshotPanel";
import { fetchPlanningData } from "../lib/api";
import {
  appendGoalCheckIn,
  appendProtocolCheckIn,
  archiveUserProtocol,
  calculateTrendWeight,
  clearSession,
  createLocalAccount,
  loadAccounts,
  loadUserCheckIns,
  loadSessionAccount,
  loadUserGoals,
  loadUserProtocols,
  loginLocalAccount,
  persistUserCheckIn,
  persistUserGoal,
  persistUserProtocol
} from "../lib/account";

const emptyPlanningData = {
  personas: [],
  goalPresets: [],
  protocolTemplates: []
};

const cadenceFields = {
  daily: ["Weight"],
  weekly: ["Waist", "Hip/Buttock Circ", "Bideltoid Circ", "Neck Circ"],
  monthly: ["Height", "Head Circ", "Wrist Circ", "Biacromial Width"]
};

const goalMetricLabels = {
  weight: ["Weight", "kg"],
  waistCircumference: ["Waist", "cm"],
  hipCircumference: ["Hip", "cm"],
  bideltoidCircumference: ["Bideltoid Circ", "cm"],
  bicepCircumference: ["Bicep Circ", "cm"],
  upperThighCircumference: ["Upper Thigh Circ", "cm"]
};

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(timestamp)
  );
}

function protocolLabels(protocolIds, protocolTemplates) {
  return protocolIds
    .map((id) => protocolTemplates.find((protocol) => protocol.id === id)?.label || id)
    .join(", ");
}

function formatSignedDelta(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function protocolDelta(protocol, currentMeasurements) {
  const starting = protocol.startingMeasurements;
  if (!starting) {
    return "";
  }

  const weightDelta = Number(currentMeasurements.weight) - Number(starting.weight);
  const waistDelta =
    Number(currentMeasurements.waistCircumference) - Number(starting.waistCircumference);

  return `Since start: weight ${formatSignedDelta(weightDelta)} kg, waist ${formatSignedDelta(waistDelta)} cm`;
}

function daysSince(timestamp) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
}

function formatCheckIn(checkIn) {
  if (checkIn.type === "daily-weight") {
    const calories = Number.isFinite(Number(checkIn.calories))
      ? ` / ${Number(checkIn.calories)} kcal`
      : "";
    return `Daily weight: ${Number(checkIn.weight).toFixed(1)} kg${calories}`;
  }

  return `Weekly measurements: waist ${Number(checkIn.measurements?.waistCircumference).toFixed(1)} cm`;
}

function clampProgress(value) {
  return Math.max(0, Math.min(100, value));
}

function buildGoalProgress(goal, currentMeasurements) {
  const starting = goal.startingMeasurements;
  const targetMetrics = goal.targetMetrics || {};
  const rows = Object.entries(targetMetrics)
    .map(([key, targetDelta]) => {
      const [label, unit] = goalMetricLabels[key] || [key, ""];
      const start = Number(starting?.[key]);
      const current = Number(currentMeasurements[key]);
      const delta = Number(targetDelta);

      if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(delta) || delta === 0) {
        return null;
      }

      const target = start + delta;
      const progress = clampProgress(((current - start) / delta) * 100);

      return {
        key,
        label,
        unit,
        start,
        current,
        target,
        progress
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return null;
  }

  const average = rows.reduce((total, row) => total + row.progress, 0) / rows.length;
  return {
    average,
    rows
  };
}

function buildInsightDrops({ checkIns, trendWeight, goals, protocols }) {
  const insights = [];
  const latestWeekly = checkIns.find((checkIn) => checkIn.type === "weekly-measurements");

  if (trendWeight) {
    const direction =
      trendWeight.delta < -0.05
        ? "down"
        : trendWeight.delta > 0.05
          ? "up"
          : "stable";
    insights.push(
      `Trend weight is ${direction}: ${trendWeight.value.toFixed(1)} kg across ${trendWeight.count} daily log(s).`
    );
  }

  if (latestWeekly?.measurements) {
    insights.push(
      `Latest weekly check-in saved waist ${Number(latestWeekly.measurements.waistCircumference).toFixed(1)} cm and hip ${Number(latestWeekly.measurements.hipCircumference).toFixed(1)} cm.`
    );
  }

  const activeProtocols = protocols.filter((protocol) => protocol.status !== "archived");
  if (activeProtocols.length) {
    insights.push(`${activeProtocols.length} active protocol(s) need adherence review.`);
  }

  if (goals.length) {
    insights.push(`${goals.length} saved goal(s) are using the current measurement set as their reference.`);
  }

  return insights;
}

export default function AccountGoalPanel({
  currentMeasurements,
  onApplyMeasurements,
  snapshotProps,
  onOpenStrategies,
  onClose
}) {
  const [planningData, setPlanningData] = useState(emptyPlanningData);
  const [planningStatus, setPlanningStatus] = useState("Loading planning data...");
  const [accounts, setAccounts] = useState(() => loadAccounts());
  const initialAccount = loadSessionAccount();
  const [account, setAccount] = useState(() => initialAccount);
  const [goals, setGoals] = useState(() => loadUserGoals(initialAccount?.id));
  const [protocols, setProtocols] = useState(() => loadUserProtocols(initialAccount?.id));
  const [checkIns, setCheckIns] = useState(() => loadUserCheckIns(initialAccount?.id));
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedProtocolTemplateId, setSelectedProtocolTemplateId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalNote, setGoalNote] = useState("");
  const [protocolDose, setProtocolDose] = useState("");
  const [protocolFrequency, setProtocolFrequency] = useState("");
  const [protocolStartDate, setProtocolStartDate] = useState("");
  const [protocolEndDate, setProtocolEndDate] = useState("");
  const [protocolConfounders, setProtocolConfounders] = useState("");
  const [dailyWeight, setDailyWeight] = useState("");
  const [dailyCalories, setDailyCalories] = useState("");
  const [checkInNote, setCheckInNote] = useState("");
  const [selectedProtocolIds, setSelectedProtocolIds] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchPlanningData()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setPlanningData(data);
        setPlanningStatus(
          `Loaded ${data.personas.length} personas, ${data.goalPresets.length} goals, and ${data.protocolTemplates.length} protocols.`
        );
        setSelectedPersonaId((current) => current || data.personas[0]?.id || "");
        setSelectedGoalId((current) => current || data.goalPresets[0]?.id || "");
        setSelectedProtocolTemplateId(
          (current) => current || data.protocolTemplates[0]?.id || ""
        );
      })
      .catch(() => {
        if (isMounted) {
          setPlanningStatus("Planning data unavailable. Local account tools still work.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPersona = planningData.personas.find(
    (persona) => persona.id === selectedPersonaId
  );
  const selectedGoal = planningData.goalPresets.find((goal) => goal.id === selectedGoalId);
  const selectedProtocolTemplate = planningData.protocolTemplates.find(
    (protocol) => protocol.id === selectedProtocolTemplateId
  );
  const trendWeight = useMemo(() => calculateTrendWeight(checkIns), [checkIns]);
  const insightDrops = useMemo(
    () => buildInsightDrops({ checkIns, trendWeight, goals, protocols }),
    [checkIns, goals, protocols, trendWeight]
  );
  const latestDailyCheckIn = checkIns.find((checkIn) => checkIn.type === "daily-weight");
  const latestWeeklyCheckIn = checkIns.find((checkIn) => checkIn.type === "weekly-measurements");
  const dailyDue = daysSince(latestDailyCheckIn?.createdAt) >= 0.75;
  const weeklyDue = daysSince(latestWeeklyCheckIn?.createdAt) >= 6;

  useEffect(() => {
    setSelectedProtocolIds(selectedGoal?.suggestedProtocols || []);
  }, [selectedGoal?.id]);

  const suggestedProtocols = useMemo(() => {
    if (!selectedProtocolIds.length) {
      return [];
    }

    return selectedProtocolIds
      .map((id) => planningData.protocolTemplates.find((protocol) => protocol.id === id))
      .filter(Boolean);
  }, [planningData.protocolTemplates, selectedProtocolIds]);

  function refreshAccountState(nextAccount) {
    setAccount(nextAccount);
    setAccounts(loadAccounts());
    setGoals(loadUserGoals(nextAccount?.id));
    setProtocols(loadUserProtocols(nextAccount?.id));
    setCheckIns(loadUserCheckIns(nextAccount?.id));
  }

  function handleCreateAccount(event) {
    event.preventDefault();
    try {
      const nextAccount = createLocalAccount({
        displayName,
        email,
        personaId: selectedPersonaId
      });
      refreshAccountState(nextAccount);
      setStatus(`Signed in as ${nextAccount.displayName}.`);
      if (selectedPersona?.startingMeasurements) {
        onApplyMeasurements(selectedPersona.startingMeasurements);
        setStatus(`Signed in as ${nextAccount.displayName}. Persona measurements loaded.`);
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleApplyPersona() {
    if (!selectedPersona?.startingMeasurements) {
      return;
    }

    onApplyMeasurements(selectedPersona.startingMeasurements);
    setStatus(`${selectedPersona.label} measurements loaded into the form.`);
  }

  function handleLogin(event) {
    event.preventDefault();
    try {
      const nextAccount = loginLocalAccount(loginEmail);
      refreshAccountState(nextAccount);
      setStatus(`Signed in as ${nextAccount.displayName}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleLogout() {
    clearSession();
    refreshAccountState(null);
    setStatus("Logged out of this browser profile.");
  }

  function handleSetGoal(event) {
    event.preventDefault();
    if (!account || !selectedGoal) {
      return;
    }

    const nextGoal = persistUserGoal(account.id, {
      presetId: selectedGoal.id,
      label: selectedGoal.label,
      category: selectedGoal.category,
      summary: selectedGoal.summary,
      targetMetrics: selectedGoal.targetMetrics,
      targetDate,
      note: goalNote.trim(),
      protocolIds: selectedProtocolIds,
      startingMeasurements: currentMeasurements
    });

    setGoals([nextGoal, ...goals]);
    setGoalNote("");
    setStatus(`Goal saved: ${selectedGoal.label}.`);
  }

  function handleGoalCheckIn(goalId, adherence) {
    const nextGoals = appendGoalCheckIn(account.id, goalId, {
      adherence,
      snapshotCount: snapshotProps.snapshots.length
    });
    setGoals(nextGoals);
    setStatus("Goal check-in logged.");
  }

  function handleDailyCheckIn(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    const weight = Number(dailyWeight || currentMeasurements.weight);
    if (!Number.isFinite(weight)) {
      setStatus("Enter a valid daily weight.");
      return;
    }

    const calories = dailyCalories === "" ? null : Number(dailyCalories);
    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "daily-weight",
      weight,
      calories: Number.isFinite(calories) ? calories : null,
      note: checkInNote.trim(),
      measurements: {
        weight
      }
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setDailyWeight("");
    setDailyCalories("");
    setStatus("Daily check-in logged.");
  }

  function handleWeeklyCheckIn() {
    if (!account) {
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "weekly-measurements",
      measurements: currentMeasurements,
      dueFields: cadenceFields.weekly,
      note: checkInNote.trim()
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setCheckInNote("");
    setStatus("Weekly measurements logged.");
  }

  function handleStartProtocol(event) {
    event.preventDefault();
    if (!account || !selectedProtocolTemplate) {
      return;
    }

    const nextProtocol = persistUserProtocol(account.id, {
      templateId: selectedProtocolTemplate.id,
      label: selectedProtocolTemplate.label,
      category: selectedProtocolTemplate.category,
      summary: selectedProtocolTemplate.summary,
      evidence: selectedProtocolTemplate.evidence,
      riskLevel: selectedProtocolTemplate.riskLevel,
      dose: protocolDose.trim() || "not specified",
      frequency: protocolFrequency.trim() || selectedProtocolTemplate.cadence,
      startDate: protocolStartDate,
      endDate: protocolEndDate,
      confounders: protocolConfounders.trim(),
      startingMeasurements: currentMeasurements,
      startingSnapshotCount: snapshotProps.snapshots.length
    });

    setProtocols([nextProtocol, ...protocols]);
    setProtocolDose("");
    setProtocolFrequency("");
    setProtocolConfounders("");
    setStatus(`Protocol started: ${selectedProtocolTemplate.label}.`);
  }

  function handleProtocolCheckIn(protocolId, adherence) {
    const nextProtocols = appendProtocolCheckIn(account.id, protocolId, {
      adherence,
      measurements: currentMeasurements,
      snapshotCount: snapshotProps.snapshots.length,
      confounders: protocolConfounders.trim()
    });
    setProtocols(nextProtocols);
    setStatus("Protocol adherence check-in logged.");
  }

  function handleArchiveProtocol(protocolId) {
    setProtocols(archiveUserProtocol(account.id, protocolId));
    setStatus("Protocol archived.");
  }

  return (
    <div className="account-overlay" role="presentation">
      <section className="account-panel panel" role="dialog" aria-modal="true" aria-label="Account, logs, and goals">
        <button className="modal-close account-close" type="button" aria-label="Close account panel" onClick={onClose}>
          x
        </button>

        <div className="panel-header account-header">
          <div>
            <h2>Account, logs, and goals</h2>
            <p>Local-first profile tools for persona walkthroughs, snapshots, and build plans.</p>
          </div>
          <span className="account-status">{planningStatus}</span>
        </div>

        {!account ? (
          <div className="account-auth-grid">
            <form className="auth-card" onSubmit={handleCreateAccount}>
              <h3>Create local account</h3>
              <label className="field">
                <span className="field-label">Display name</span>
                <input
                  aria-label="Display name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Mason"
                />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  aria-label="Account email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Persona sample</span>
                <select
                  aria-label="Persona sample"
                  value={selectedPersonaId}
                  onChange={(event) => setSelectedPersonaId(event.target.value)}
                >
                  {planningData.personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPersona ? (
                <p className="muted-text">{selectedPersona.motivation}</p>
              ) : null}
              <button className="button" type="submit">
                Create account
              </button>
            </form>

            <form className="auth-card" onSubmit={handleLogin}>
              <h3>Log in on this device</h3>
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  aria-label="Login email"
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button className="button" type="submit" disabled={!accounts.length}>
                Log in
              </button>
              <p className="muted-text">
                {accounts.length
                  ? `${accounts.length} local account(s) on this browser.`
                  : "No local accounts on this browser yet."}
              </p>
            </form>
          </div>
        ) : (
          <div className="account-workspace">
            <section className="account-summary">
              <div>
                <h3>{account.displayName}</h3>
                <p>{account.email}</p>
              </div>
              <button className="button" type="button" onClick={handleLogout}>
                Log out
              </button>
            </section>

            <section className="persona-loader" aria-label="Persona sample loader">
              <label className="field">
                <span className="field-label">Persona sample</span>
                <select
                  aria-label="Signed-in persona sample"
                  value={selectedPersonaId}
                  onChange={(event) => setSelectedPersonaId(event.target.value)}
                >
                  {planningData.personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPersona ? <p className="muted-text">{selectedPersona.motivation}</p> : null}
              <button className="button" type="button" onClick={handleApplyPersona}>
                Load persona measurements
              </button>
            </section>

            <section className="checkin-loop" aria-label="Check-in loop">
              <div className="panel-header">
                <h3>Check-in loop</h3>
                <p>Daily weight is quick; tape measurements stay weekly unless a protocol needs closer notes.</p>
              </div>
              <div className="cadence-grid" aria-label="Measurement cadence">
                <div>
                  <strong>{dailyDue ? "Due today" : "Logged today"}</strong>
                  <span>Daily: {cadenceFields.daily.join(", ")}</span>
                </div>
                <div>
                  <strong>{weeklyDue ? "Weekly due" : "Weekly current"}</strong>
                  <span>{cadenceFields.weekly.join(", ")}</span>
                </div>
                <div>
                  <strong>Monthly</strong>
                  <span>{cadenceFields.monthly.join(", ")}</span>
                </div>
              </div>
              <form className="checkin-form" onSubmit={handleDailyCheckIn}>
                <label className="field">
                  <span className="field-label">Daily weight</span>
                  <input
                    aria-label="Daily weight"
                    inputMode="decimal"
                    value={dailyWeight}
                    onChange={(event) => setDailyWeight(event.target.value)}
                    placeholder={String(currentMeasurements.weight)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Calories optional</span>
                  <input
                    aria-label="Daily calories"
                    inputMode="decimal"
                    value={dailyCalories}
                    onChange={(event) => setDailyCalories(event.target.value)}
                    placeholder="2400"
                  />
                </label>
                <label className="field checkin-note">
                  <span className="field-label">Check-in note</span>
                  <textarea
                    aria-label="Check-in note"
                    value={checkInNote}
                    onChange={(event) => setCheckInNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit">
                  Log daily check-in
                </button>
                <button className="button" type="button" onClick={handleWeeklyCheckIn}>
                  Save weekly check-in
                </button>
              </form>
              <div className="checkin-summary" aria-label="Check-in summary">
                <strong>
                  Trend weight: {trendWeight ? `${trendWeight.value.toFixed(1)} kg` : "--"}
                </strong>
                <span>
                  {trendWeight
                    ? `${trendWeight.count} log(s), ${formatSignedDelta(trendWeight.delta)} kg last trend step`
                    : "No daily logs yet."}
                </span>
              </div>
              <div aria-label="Check-in history">
                {checkIns.length ? (
                  <ul className="checkin-list">
                    {checkIns.slice(0, 5).map((checkIn) => (
                      <li key={checkIn.id}>
                        <strong>{formatCheckIn(checkIn)}</strong>
                        <span>{formatDate(checkIn.createdAt)}</span>
                        {checkIn.note ? <p>{checkIn.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">No check-ins logged yet.</p>
                )}
              </div>
              <div className="insight-drop-list" aria-label="Insight drops">
                <h4>Insight drops</h4>
                {insightDrops.length ? (
                  <ul>
                    {insightDrops.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">Log a check-in to generate insights.</p>
                )}
              </div>
            </section>

            <section className="goal-builder" aria-label="Goal builder">
              <div className="panel-header">
                <h3>Set a goal</h3>
                <p>Goals are local records attached to this browser account.</p>
              </div>
              <form className="goal-form" onSubmit={handleSetGoal}>
                <label className="field">
                  <span className="field-label">Goal preset</span>
                  <select
                    aria-label="Goal preset"
                    value={selectedGoalId}
                    onChange={(event) => setSelectedGoalId(event.target.value)}
                  >
                    {planningData.goalPresets.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Target date</span>
                  <input
                    aria-label="Goal target date"
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                  />
                </label>
                <label className="field goal-note">
                  <span className="field-label">Goal note</span>
                  <textarea
                    aria-label="Goal note"
                    value={goalNote}
                    onChange={(event) => setGoalNote(event.target.value)}
                  />
                </label>
                {selectedGoal ? (
                  <p className="muted-text">{selectedGoal.summary}</p>
                ) : null}
                <button className="button" type="submit">
                  Save goal
                </button>
              </form>

              {suggestedProtocols.length ? (
                <div className="protocol-card-grid" aria-label="Suggested protocols">
                  {suggestedProtocols.map((protocol) => (
                    <article key={protocol.id} className="protocol-card">
                      <strong>{protocol.label}</strong>
                      <span>{protocol.category} / {protocol.evidence}</span>
                      <p>{protocol.summary}</p>
                      <small>{protocol.cadence}</small>
                    </article>
                  ))}
                </div>
              ) : null}
              <button className="button" type="button" onClick={onOpenStrategies}>
                Learn from strategy corpus
              </button>
            </section>

            <section className="goal-list-section" aria-label="Saved goals">
              <h3>Saved goals</h3>
              {goals.length ? (
                <ul className="goal-list">
                  {goals.map((goal) => (
                    <li key={goal.id} className="goal-row">
                      <div>
                        {(() => {
                          const progress = buildGoalProgress(goal, currentMeasurements);
                          return progress ? (
                            <div className="goal-progress" aria-label={`${goal.label} progress`}>
                              <strong>Progress: {Math.round(progress.average)}%</strong>
                              <div className="goal-progress-track">
                                <i style={{ width: `${progress.average}%` }} />
                              </div>
                              <ul>
                                {progress.rows.map((row) => (
                                  <li key={row.key}>
                                    {row.label}: {row.current.toFixed(1)} / target {row.target.toFixed(1)} {row.unit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null;
                        })()}
                        <strong>{goal.label}</strong>
                        <span>{goal.category} / created {formatDate(goal.createdAt)}</span>
                        {goal.targetDate ? <span>Target date: {goal.targetDate}</span> : null}
                        {goal.protocolIds?.length ? (
                          <span>{protocolLabels(goal.protocolIds, planningData.protocolTemplates)}</span>
                        ) : null}
                        {goal.note ? <p>{goal.note}</p> : null}
                        <span>{goal.checkIns?.length || 0} check-in(s)</span>
                      </div>
                      <div className="button-row">
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleGoalCheckIn(goal.id, "on track")}
                        >
                          On track
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleGoalCheckIn(goal.id, "needs adjustment")}
                        >
                          Needs adjustment
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">No goals saved yet.</p>
              )}
            </section>

            <section className="protocol-tracker" aria-label="Protocol tracker">
              <div className="panel-header">
                <h3>Protocol tracker</h3>
                <p>Track planned workouts, procedures, routines, or hacks against snapshots.</p>
              </div>
              <form className="protocol-form" onSubmit={handleStartProtocol}>
                <label className="field">
                  <span className="field-label">Protocol template</span>
                  <select
                    aria-label="Protocol template"
                    value={selectedProtocolTemplateId}
                    onChange={(event) => setSelectedProtocolTemplateId(event.target.value)}
                  >
                    {planningData.protocolTemplates.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Dose / plan</span>
                  <input
                    aria-label="Protocol dose"
                    value={protocolDose}
                    onChange={(event) => setProtocolDose(event.target.value)}
                    placeholder="4-day upper/lower split"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Frequency</span>
                  <input
                    aria-label="Protocol frequency"
                    value={protocolFrequency}
                    onChange={(event) => setProtocolFrequency(event.target.value)}
                    placeholder={selectedProtocolTemplate?.cadence || "weekly"}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Start date</span>
                  <input
                    aria-label="Protocol start date"
                    type="date"
                    value={protocolStartDate}
                    onChange={(event) => setProtocolStartDate(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">End date</span>
                  <input
                    aria-label="Protocol end date"
                    type="date"
                    value={protocolEndDate}
                    onChange={(event) => setProtocolEndDate(event.target.value)}
                  />
                </label>
                <label className="field protocol-confounders">
                  <span className="field-label">Confounders / notes</span>
                  <textarea
                    aria-label="Protocol confounders"
                    value={protocolConfounders}
                    onChange={(event) => setProtocolConfounders(event.target.value)}
                  />
                </label>
                {selectedProtocolTemplate ? (
                  <p className="muted-text">
                    {selectedProtocolTemplate.summary} Evidence:{" "}
                    {selectedProtocolTemplate.evidence}; risk:{" "}
                    {selectedProtocolTemplate.riskLevel}.
                  </p>
                ) : null}
                <button className="button" type="submit">
                  Start protocol
                </button>
              </form>

              <div aria-label="Active protocols">
                {protocols.length ? (
                  <ul className="protocol-list">
                    {protocols.map((protocol) => (
                      <li key={protocol.id} className={`protocol-row protocol-row--${protocol.status}`}>
                        <div>
                          <strong>{protocol.label}</strong>
                          <span>
                            {protocol.category} / {protocol.evidence} / {protocol.status}
                          </span>
                          <span>Dose: {protocol.dose}; frequency: {protocol.frequency}</span>
                          {protocol.startDate || protocol.endDate ? (
                            <span>
                              Window: {protocol.startDate || "open"} - {protocol.endDate || "open"}
                            </span>
                          ) : null}
                          {protocol.confounders ? <p>{protocol.confounders}</p> : null}
                          <span>{protocol.checkIns?.length || 0} adherence check-in(s)</span>
                          <span>{protocolDelta(protocol, currentMeasurements)}</span>
                        </div>
                        <div className="button-row">
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleProtocolCheckIn(protocol.id, "on track")}
                          >
                            Protocol on track
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleProtocolCheckIn(protocol.id, "missed")}
                          >
                            Protocol missed
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleArchiveProtocol(protocol.id)}
                            disabled={protocol.status === "archived"}
                          >
                            Archive protocol
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">No protocols started yet.</p>
                )}
              </div>
            </section>

            <SnapshotPanel {...snapshotProps} />
          </div>
        )}

        {selectedPersona && account ? (
          <section className="persona-walkthrough" aria-label="Persona walkthrough">
            <h3>{selectedPersona.label} walkthrough</h3>
            <ol>
              {selectedPersona.walkthrough.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {status ? <p className="account-status-line">{status}</p> : null}
      </section>
    </div>
  );
}
