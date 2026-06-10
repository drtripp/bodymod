ENTITLEMENT_CONFIG = {
    "version": 1,
    "currentTier": "free",
    "source": "Dummy entitlement config for prototype gating decisions.",
    "tiers": [
        {
            "id": "free",
            "label": "Free",
            "summary": "All current tracking, local logs, imports, exports, and restore tools remain free."
        },
        {
            "id": "pro",
            "label": "Pro",
            "summary": "Future paid tier for marginal-cost compute, curation, sync, and automation features."
        }
    ],
    "features": [
        {
            "id": "measurement-tracking",
            "label": "Measurement tracking",
            "tier": "free",
            "status": "available",
            "category": "Tracking",
            "summary": "Manual measurements, snapshots, check-ins, trend charts, and goals."
        },
        {
            "id": "local-data-export",
            "label": "Local data export",
            "tier": "free",
            "status": "available",
            "category": "Data ownership",
            "summary": "Snapshot JSON export, encrypted local backup, and progress report downloads."
        },
        {
            "id": "diet-workout-logs",
            "label": "Diet and workout logs",
            "tier": "free",
            "status": "available",
            "category": "Tracking",
            "summary": "Food logging, CSV imports, fluid logs, workout sessions, and PR charts."
        },
        {
            "id": "adaptive-insights",
            "label": "Aggregated adaptive insights",
            "tier": "pro",
            "status": "preview",
            "category": "Compute",
            "summary": "Higher-cost analysis across longer histories and richer cohorts."
        },
        {
            "id": "ai-data-explainer",
            "label": "AI explain my data",
            "tier": "pro",
            "status": "preview",
            "category": "Compute",
            "summary": "A bounded assistant for questions about the user's own logs and corpus entries."
        },
        {
            "id": "healthkit-auto-sync",
            "label": "HealthKit and Health Connect auto-sync",
            "tier": "pro",
            "status": "preview",
            "category": "Native automation",
            "summary": "Native-device sync, automatic imports, and write-back once mobile apps ship."
        },
        {
            "id": "multi-profile",
            "label": "Multi-profile stores",
            "tier": "pro",
            "status": "preview",
            "category": "Accounts",
            "summary": "Separate encrypted stores for household, coach, or clinic use."
        }
    ],
    "nonPaywalledFeatureIds": [
        "measurement-tracking",
        "local-data-export",
        "diet-workout-logs"
    ],
    "waitlist": {
        "enabled": True,
        "storage": "local-only",
        "message": "Join the local Pro waitlist before pricing or checkout exists."
    }
}
