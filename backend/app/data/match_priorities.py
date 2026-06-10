MATCH_PRIORITY_PRESETS = [
    {
        "id": "balanced",
        "label": "Balanced",
        "summary": "Equal all-around body-shape matching.",
        "fieldMultipliers": {},
        "ratioMultipliers": {},
        "sexMismatchMultiplier": 1.0,
    },
    {
        "id": "shoulders",
        "label": "Prioritize shoulders",
        "summary": "Weights frame width, deltoid width, and shoulder-to-waist ratio more heavily.",
        "fieldMultipliers": {
            "biacromialWidth": 1.45,
            "bideltoidWidth": 1.55,
            "bideltoidCircumference": 1.65,
            "armpitCircumference": 1.18,
            "bicepCircumference": 1.12,
        },
        "ratioMultipliers": {
            "shoulder / waist": 1.4,
        },
        "sexMismatchMultiplier": 1.0,
    },
    {
        "id": "waist-hip",
        "label": "Prioritize waist/hip",
        "summary": "Weights waist, hip, pant-waist, and waist-to-hip ratio more heavily.",
        "fieldMultipliers": {
            "waistCircumference": 1.55,
            "pantWaistCircumference": 1.35,
            "hipCircumference": 1.4,
            "underbustCircumference": 1.12,
        },
        "ratioMultipliers": {
            "waist / hip": 1.8,
        },
        "sexMismatchMultiplier": 1.0,
    },
]
