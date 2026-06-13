import { useEffect, useState } from "react";
import AccountGoalPanel from "./components/AccountGoalPanel";
import ComparisonPanel from "./components/ComparisonPanel";
import DietDashboard from "./components/DietDashboard";
import InfoFootnote from "./components/InfoFootnote";
import MeasurementForm from "./components/MeasurementForm";
import OnboardingPanel from "./components/OnboardingPanel";
import PopulationPanel from "./components/PopulationPanel";
import PublicShareDashboard from "./components/PublicShareDashboard";
import ResultSummary from "./components/ResultSummary";
import SiteHeader from "./components/SiteHeader";
import StrategyCorpus from "./components/StrategyCorpus";
import {
  createShareSnapshot,
  fetchClothingSizeTables,
  fetchEntitlements,
  fetchHealth,
  fetchMatchPriorities,
  fetchMatches,
  fetchMeasurementGuides,
  fetchReferenceData,
  fetchShareDashboard,
  fetchShareSnapshot,
  fetchTargets
} from "./lib/api";
import { trackEvent } from "./lib/analytics";
import { DEFAULT_CLOTHING_SIZE_TABLES } from "./lib/clothingSizes";
import {
  emptyMeasurementGuideLibrary,
  normalizeMeasurementGuideLibrary
} from "./lib/measurementGuides";
import {
  buildShareUrl,
  decodeMeasurementsFromUrl
} from "./lib/share";
import {
  buildShareSnapshotPayload,
  publicShareSnapshotUrl
} from "./lib/shareSnapshots";
import { loadSnapshots } from "./lib/storage";
import {
  loadOnboardingProfile,
  persistOnboardingProfile
} from "./lib/onboarding";
import { requestTrendNotificationPermission } from "./lib/notifications";
import {
  applyThemePreference,
  loadThemePreference,
  persistThemePreference,
  themeOptions
} from "./lib/theme";
import {
  createTranslator,
  loadLocalePreference,
  persistLocalePreference,
  translatedLocaleOptions
} from "./lib/i18n";
import {
  extractMagicLinkTokenFromSearch
} from "./lib/magicLinkAccount";
import {
  fallbackEntitlementConfig,
  normalizeEntitlementConfig
} from "./lib/entitlements";
import { useComparisonState } from "./hooks/useComparisonState";
import { useMeasurementFormState } from "./hooks/useMeasurementFormState";
import { useSnapshotState } from "./hooks/useSnapshotState";

const fallbackMatchPriorities = [
  {
    id: "balanced",
    label: "Balanced",
    summary: "Equal all-around body-shape matching."
  },
  {
    id: "shoulders",
    label: "Prioritize shoulders",
    summary: "Weights frame width, deltoid width, and shoulder-to-waist ratio more heavily."
  },
  {
    id: "waist-hip",
    label: "Prioritize waist/hip",
    summary: "Weights waist, hip, pant-waist, and waist-to-hip ratio more heavily."
  }
];

export default function App() {
  const shareDashboardToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("share") || ""
      : "";
  const shareSnapshotToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("snapshot") || ""
      : "";
  const [magicLinkTokenFromUrl] = useState(() =>
    typeof window !== "undefined" ? extractMagicLinkTokenFromSearch(window.location.search) : ""
  );
  const [apiStatus, setApiStatus] = useState("checking");
  const [targets, setTargets] = useState([]);
  const [result, setResult] = useState({
    top_match: null,
    matches: [],
    percentiles: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [insightTab, setInsightTab] = useState("result");
  const [activeSection, setActiveSection] = useState("body");
  const [theme, setTheme] = useState(() => loadThemePreference());
  const [locale, setLocale] = useState(() => loadLocalePreference());
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isStrategyExplorerOpen, setIsStrategyExplorerOpen] = useState(false);
  const [clothingSizeTables, setClothingSizeTables] = useState(DEFAULT_CLOTHING_SIZE_TABLES);
  const [measurementGuideLibrary, setMeasurementGuideLibrary] = useState(
    emptyMeasurementGuideLibrary
  );
  const [populationReferenceData, setPopulationReferenceData] = useState(null);
  const [entitlements, setEntitlements] = useState(fallbackEntitlementConfig);
  const [onboardingProfile, setOnboardingProfile] = useState(() => loadOnboardingProfile());
  const [publicShareRecord, setPublicShareRecord] = useState(null);
  const [publicShareStatus, setPublicShareStatus] = useState(
    shareDashboardToken ? "Loading shared dashboard..." : ""
  );
  const measurements = useMeasurementFormState();
  const snapshotsState = useSnapshotState();
  const comparison = useComparisonState({
    result,
    targets,
    snapshots: snapshotsState.snapshots,
    currentMeasurements: measurements.currentMeasurements,
    fallbackMatchPriorities
  });
  const {
    formState,
    displayFormState,
    errors,
    globalUnitSystem,
    fieldUnitOverrides,
    hoveredMeasurement,
    currentMeasurements,
    setHoveredMeasurement,
    setMeasurementSet,
    setMeasurementValue,
    handleChange,
    handleFieldBlur,
    validateCurrentMeasurements,
    handleGlobalUnitChange,
    handleFieldUnitChange,
    handleFieldUnitReset
  } = measurements;
  const {
    snapshots,
    snapshotLabel,
    snapshotNote,
    importStatus,
    setSnapshotLabel,
    setSnapshotNote,
    setSnapshots,
    saveSnapshot,
    deleteSnapshot,
    exportSnapshots,
    importSnapshots,
    restoreSnapshots
  } = snapshotsState;
  const {
    comparisonSnapshotId,
    comparisonMode,
    silhouetteView,
    matchPriority,
    matchPriorityPresets,
    targetFilters,
    rankedMatches,
    allComparisonTargets,
    targetFilterOptions,
    comparisonTargets,
    selectedTarget,
    comparisonSnapshot,
    snapshotComparison,
    setMatchPriorityPresets,
    setSelectedTargetId,
    handleTargetChange,
    handleTargetFilterChange,
    handleComparisonModeChange,
    handleSilhouetteViewChange,
    handleMatchPriorityChange,
    handleCompareSnapshot,
    clearComparisonSnapshot
  } = comparison;
  const t = createTranslator(locale);
  const headerCopy = {
    sectionAria: t("nav.section.aria"),
    body: t("nav.section.body"),
    diet: t("nav.section.diet"),
    actionsAria: t("nav.actions.aria"),
    themeAria: t("nav.theme.aria"),
    localeAria: t("nav.locale.aria"),
    accountAria: t("nav.account.aria"),
    shareAria: t("nav.share.aria"),
    snapshotShareAria: t("nav.shareSnapshot.aria"),
    buildPlan: t("nav.buildPlan")
  };
  const localizedThemeOptions = themeOptions.map((option) => ({
    ...option,
    label: t(`nav.theme.${option.id}`)
  }));
  const localizedLocaleOptions = translatedLocaleOptions(locale);

  useEffect(() => {
    applyThemePreference(theme);
    persistThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    persistLocalePreference(locale);
  }, [locale]);

  useEffect(() => {
    if (!magicLinkTokenFromUrl || typeof window === "undefined") {
      return;
    }
    setIsAccountPanelOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("magicLinkToken");
    url.searchParams.delete("accountMagicToken");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [magicLinkTokenFromUrl]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (isStrategyExplorerOpen) {
        setIsStrategyExplorerOpen(false);
        return;
      }

      if (isAccountPanelOpen) {
        setIsAccountPanelOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAccountPanelOpen, isStrategyExplorerOpen]);

  useEffect(() => {
    trackEvent("app_loaded");
    const storedSnapshots = loadSnapshots();
    setSnapshots(storedSnapshots);
    const sharedMeasurements = decodeMeasurementsFromUrl(
      new URLSearchParams(window.location.search).get("m")
    );

    if (sharedMeasurements) {
      setMeasurementSet(sharedMeasurements);
      trackEvent("share_url_loaded");
    } else if (storedSnapshots.length) {
      setMeasurementSet(storedSnapshots[0].measurements);
    }

    fetchHealth()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));

    fetchTargets()
      .then((response) => {
        setTargets(response.targets);
        setSelectedTargetId((current) => current || response.targets[0]?.id || "");
      })
      .catch(() => setTargets([]));

    fetchMatchPriorities()
      .then((response) => {
        if (response.priorities?.length) {
          setMatchPriorityPresets(response.priorities);
        }
      })
      .catch(() => setMatchPriorityPresets(fallbackMatchPriorities));

    fetchClothingSizeTables()
      .then((response) => setClothingSizeTables(response))
      .catch(() => setClothingSizeTables(DEFAULT_CLOTHING_SIZE_TABLES));

    fetchMeasurementGuides()
      .then((response) => setMeasurementGuideLibrary(normalizeMeasurementGuideLibrary(response)))
      .catch(() => setMeasurementGuideLibrary(emptyMeasurementGuideLibrary));

    fetchReferenceData()
      .then((response) => setPopulationReferenceData(response))
      .catch(() => setPopulationReferenceData(null));

    fetchEntitlements()
      .then((response) => setEntitlements(normalizeEntitlementConfig(response)))
      .catch(() => setEntitlements(fallbackEntitlementConfig));
  }, []);

  useEffect(() => {
    if (!shareDashboardToken) {
      return;
    }

    setPublicShareStatus("Loading shared dashboard...");
    fetchShareDashboard(shareDashboardToken)
      .then((record) => {
        setPublicShareRecord(record);
        setPublicShareStatus("");
        trackEvent("share_dashboard_loaded");
      })
      .catch(() => {
        setPublicShareRecord(null);
        setPublicShareStatus("This share link is missing, revoked, or unavailable.");
      });
  }, [shareDashboardToken]);

  useEffect(() => {
    if (!shareSnapshotToken || shareDashboardToken) {
      return;
    }

    setShareStatus(t("share.snapshotLoading"));
    fetchShareSnapshot(shareSnapshotToken)
      .then((record) => {
        if (!record?.snapshot?.measurements) {
          throw new Error("Missing share snapshot measurements.");
        }
        setMeasurementSet(record.snapshot.measurements);
        setShareStatus(t("share.snapshotLoaded"));
        trackEvent("share_snapshot_loaded");
      })
      .catch(() => {
        setShareStatus(t("share.snapshotUnavailable"));
      });
  }, [locale, shareDashboardToken, shareSnapshotToken]);

  useEffect(() => {
    if (!targets.length) {
      return;
    }
    const validation = validateCurrentMeasurements();
    if (!validation.isValid) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runMatch(validation.measurements);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [fieldUnitOverrides, formState, globalUnitSystem, matchPriority, targets]);

  async function runMatch(measurements) {
    setIsLoading(true);

    try {
      const response = await fetchMatches(measurements, matchPriority);
      setResult(response);
      setSelectedTargetId((current) => current || response.matches?.[0]?.id || "");
      trackEvent("result_rendered", {
        matchCount: response.matches?.length || 0,
        topMatch: response.top_match?.id,
        priority: response.priority || matchPriority
      });
    } catch (error) {
      setResult({
        top_match: null,
        matches: [],
        percentiles: {}
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validation = validateCurrentMeasurements();
    if (!validation.isValid) {
      return;
    }

    void runMatch(validation.measurements);
  }

  function handleSaveSnapshot(options = {}) {
    const validation = validateCurrentMeasurements();
    if (!validation.isValid) {
      return false;
    }

    return saveSnapshot(validation.measurements, options);
  }

  function handleSaveFirstSnapshot() {
    const validation = validateCurrentMeasurements();
    if (!validation.isValid) {
      return false;
    }

    saveSnapshot(validation.measurements, {
      label: "Snapshot #1",
      note: "First onboarding snapshot.",
      source: "onboarding"
    });

    void requestTrendNotificationPermission({ context: "first-snapshot" }).then(
      (preference) => {
        trackEvent("notification_permission_updated", {
          context: "first-snapshot",
          permission: preference.permission
        });
      }
    );

    return true;
  }

  function handleLoadSnapshot(snapshotId) {
    const snapshot = snapshots.find((item) => item.id === snapshotId);
    if (!snapshot) {
      return;
    }

    setMeasurementSet(snapshot.measurements);
  }

  function handleDeleteSnapshot(snapshotId) {
    deleteSnapshot(snapshotId);
    clearComparisonSnapshot(snapshotId);
  }

  function handleExportSnapshots() {
    exportSnapshots();
  }

  function handleImportSnapshots(event) {
    importSnapshots(event);
  }

  function handleRestoreSnapshots(importedSnapshots = []) {
    return restoreSnapshots(importedSnapshots);
  }

  function applyMeasurementSet(measurements) {
    setMeasurementSet(measurements);
  }

  function updateOnboardingProfile(patch) {
    setOnboardingProfile((current) => {
      const nextProfile = {
        ...current,
        ...patch
      };
      persistOnboardingProfile(nextProfile);
      return nextProfile;
    });

  }

  function setOnboardingMeasurement(name, value) {
    setMeasurementValue(name, value);
  }

  const shareUrl =
    typeof window !== "undefined" ? buildShareUrl(currentMeasurements) : "";

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus(t("share.copied"));
      trackEvent("share_link_copied");
    } catch (error) {
      setShareStatus(t("share.copyFailed"));
    }
  }

  async function handleCreateShareSnapshot() {
    const validation = validateCurrentMeasurements();
    if (!validation.isValid) {
      setShareStatus(t("share.snapshotInvalid"));
      return;
    }

    const payload = buildShareSnapshotPayload(validation.measurements);
    setShareStatus(t("share.snapshotCreating"));

    try {
      const record = await createShareSnapshot(payload);
      const publicUrl = publicShareSnapshotUrl(record.publicToken);
      await navigator.clipboard.writeText(publicUrl);
      setShareStatus(t("share.snapshotCreated", { hours: payload.expiresInHours }));
      trackEvent("share_snapshot_created", { expiresInHours: payload.expiresInHours });
    } catch (error) {
      setShareStatus(t("share.snapshotFailed"));
    }
  }

  function handleSkipToMain(event) {
    event.preventDefault();
    const main = document.getElementById("main-content");
    main?.focus();
    main?.scrollIntoView();
  }

  return (
    <div className="app-shell">
      {shareDashboardToken ? (
        <PublicShareDashboard record={publicShareRecord} status={publicShareStatus} />
      ) : (
        <>
      <a className="skip-link" href="#main-content" onClick={handleSkipToMain}>
        {t("skip.main")}
      </a>
      <SiteHeader
        activeSection={activeSection}
        copy={headerCopy}
        locale={locale}
        localeOptions={localizedLocaleOptions}
        theme={theme}
        themeOptions={localizedThemeOptions}
        onLocaleChange={setLocale}
        onSectionChange={setActiveSection}
        onThemeChange={setTheme}
        onOpenAccount={() => setIsAccountPanelOpen(true)}
        onOpenStrategies={() => setIsStrategyExplorerOpen(true)}
        onShare={handleCopyShareLink}
        onShareSnapshot={handleCreateShareSnapshot}
        shareStatus={shareStatus}
      />

      {activeSection === "body" ? (
        <>
          <main id="main-content" className="workspace" tabIndex="-1">
            <section className="visual-column">
              <div className="insight-tabs panel">
                <div className="tab-bar" role="tablist" aria-label={t("tabs.aria")}>
                  <button
                    className={`button ${insightTab === "result" ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={insightTab === "result"}
                    onClick={() => setInsightTab("result")}
                  >
                    {t("tabs.result")}
                  </button>
                  <button
                    className={`button ${insightTab === "target" ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={insightTab === "target"}
                    onClick={() => setInsightTab("target")}
                  >
                    {t("tabs.target")}
                  </button>
                  <button
                    className={`button ${insightTab === "population" ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={insightTab === "population"}
                    onClick={() => setInsightTab("population")}
                  >
                    {t("tabs.population")}
                  </button>
                </div>

                {insightTab === "result" ? (
                  <ResultSummary
                    measurements={currentMeasurements}
                    result={result}
                    apiStatus={apiStatus}
                    clothingSizeTables={clothingSizeTables}
                    locale={locale}
                    hoveredMeasurement={hoveredMeasurement}
                    onMeasurementHover={setHoveredMeasurement}
                    silhouetteView={silhouetteView}
                    onSilhouetteViewChange={handleSilhouetteViewChange}
                    matchPriority={matchPriority}
                    matchPriorityPresets={matchPriorityPresets}
                    onMatchPriorityChange={handleMatchPriorityChange}
                  />
                ) : insightTab === "target" ? (
                  <ComparisonPanel
                    mode={comparisonMode}
                    onModeChange={handleComparisonModeChange}
                    selectedTarget={selectedTarget}
                    onTargetChange={handleTargetChange}
                    rankedMatches={comparisonTargets}
                    totalTargetCount={allComparisonTargets.length}
                    targetFilters={targetFilters}
                    targetFilterOptions={targetFilterOptions}
                    onTargetFilterChange={handleTargetFilterChange}
                    currentMeasurements={currentMeasurements}
                    snapshotComparison={snapshotComparison}
                    comparisonSnapshot={comparisonSnapshot}
                    locale={locale}
                    silhouetteView={silhouetteView}
                    onSilhouetteViewChange={handleSilhouetteViewChange}
                  />
                ) : (
                  <PopulationPanel
                    measurements={currentMeasurements}
                    referenceData={populationReferenceData}
                    locale={locale}
                  />
                )}
              </div>
            </section>

            <section className="control-column">
              <OnboardingPanel
                profile={onboardingProfile}
                measurements={currentMeasurements}
                result={result}
                locale={locale}
                t={t}
                onProfileChange={updateOnboardingProfile}
                onSetMeasurement={setOnboardingMeasurement}
                onApplyDemo={applyMeasurementSet}
                onSaveFirstSnapshot={handleSaveFirstSnapshot}
                silhouetteView={silhouetteView}
              />

              <MeasurementForm
                formState={displayFormState}
                errors={errors}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onFieldBlur={handleFieldBlur}
                globalUnitSystem={globalUnitSystem}
                fieldUnitOverrides={fieldUnitOverrides}
                onGlobalUnitChange={handleGlobalUnitChange}
                onFieldUnitChange={handleFieldUnitChange}
                onFieldUnitReset={handleFieldUnitReset}
                hoveredMeasurement={hoveredMeasurement}
                onMeasurementHover={setHoveredMeasurement}
                measurementGuideLibrary={measurementGuideLibrary}
                t={t}
              />

            </section>
          </main>
          <InfoFootnote />
        </>
      ) : (
        <main id="main-content" tabIndex="-1">
          <DietDashboard currentMeasurements={currentMeasurements} locale={locale} />
        </main>
      )}

      {isStrategyExplorerOpen ? (
        <div className="strategy-explorer-overlay" role="presentation">
          <div
            className="strategy-explorer-shell"
            role="dialog"
            aria-modal="true"
            aria-label={t("strategy.dialog.aria")}
          >
            <button
              className="modal-close strategy-explorer-close"
              type="button"
              aria-label={t("strategy.close.aria")}
              onClick={() => setIsStrategyExplorerOpen(false)}
            >
              x
            </button>
            <StrategyCorpus locale={locale} />
          </div>
        </div>
      ) : null}

      {isAccountPanelOpen ? (
        <AccountGoalPanel
          currentMeasurements={currentMeasurements}
          entitlements={entitlements}
          locale={locale}
          onApplyMeasurements={applyMeasurementSet}
          targetProfiles={rankedMatches}
          initialMagicLinkToken={magicLinkTokenFromUrl}
          onOpenStrategies={() => {
            setIsAccountPanelOpen(false);
            setIsStrategyExplorerOpen(true);
          }}
          onClose={() => setIsAccountPanelOpen(false)}
          silhouetteView={silhouetteView}
          snapshotProps={{
            snapshotLabel,
            onSnapshotLabelChange: setSnapshotLabel,
            snapshotNote,
            onSnapshotNoteChange: setSnapshotNote,
            snapshots,
            onSaveSnapshot: handleSaveSnapshot,
            onLoadSnapshot: handleLoadSnapshot,
            onDeleteSnapshot: handleDeleteSnapshot,
            comparisonSnapshotId,
            onCompareSnapshot: handleCompareSnapshot,
            onExportSnapshots: handleExportSnapshots,
            onImportSnapshots: handleImportSnapshots,
            onRestoreSnapshots: handleRestoreSnapshots,
            importStatus
          }}
        />
      ) : null}
        </>
      )}
    </div>
  );
}
