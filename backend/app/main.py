import os
import secrets

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.account_email import account_magic_link_email_configured
from app.account_email import send_account_magic_link_email
from app.data.attractiveness_evidence import ATTRACTIVENESS_EVIDENCE
from app.data.bloodwork import BLOODWORK_LIBRARY
from app.data.clothing_sizes import CLOTHING_SIZE_TABLES
from app.data.entitlements import ENTITLEMENT_CONFIG
from app.data.exercises import EXERCISE_LIBRARY
from app.data.food_usda import USDA_FOOD_LIBRARY, search_usda_foods
from app.data.launch_readiness import LAUNCH_READINESS
from app.data.live_updates import LIVE_UPDATE_MANIFEST
from app.data.measurement_guides import MEASUREMENT_GUIDES
from app.data.planning import GOAL_PRESETS, PERSONAS, PROTOCOL_TAXONOMY, PROTOCOL_TEMPLATES
from app.data.procedures import PROCEDURE_LIBRARY
from app.data.reference import REFERENCE_DATA
from app.data.strategy_corpus import STRATEGY_CORPUS
from app.models import AttractivenessEvidenceLibrary
from app.models import AccountMagicLinkRequest
from app.models import AccountMagicLinkResponse
from app.models import AccountMagicLinkVerifyRequest
from app.models import AccountSessionRecord
from app.models import AccountSessionResponse
from app.models import AccountSessionRevokeResponse
from app.models import BloodworkLibrary
from app.models import CaseLogSubmissionRequest
from app.models import CaseLogSubmissionRecord
from app.models import CaseLogSubmissionResponse
from app.models import CaseLogModerationListResponse
from app.models import CaseLogModerationReviewRequest
from app.models import ClothingSizeTables
from app.models import ClientErrorReportRequest
from app.models import ClientErrorReportResponse
from app.models import EntitlementConfig
from app.models import ExerciseLibrary
from app.models import FoodSearchResponse
from app.models import LaunchReadiness
from app.models import LiveUpdateManifest
from app.models import LiveUpdateManifestResponse
from app.models import MeasurementGuideLibrary
from app.models import MeasurementSet
from app.models import NativePushTokenRequest
from app.models import NativePushTokenResponse
from app.models import NativePushUnsubscribeRequest
from app.models import NativePushUnsubscribeResponse
from app.models import PersonalDataTokenCreateRequest
from app.models import PersonalDataTokenCreateResponse
from app.models import PersonalDataTokenRevokeResponse
from app.models import PlanningData
from app.models import PopulationReferenceData
from app.models import ProcedureLibrary
from app.models import ProductAnalyticsReportRequest
from app.models import ProductAnalyticsReportResponse
from app.models import ShareDashboardCreateRequest
from app.models import ShareDashboardCreateResponse
from app.models import ShareDashboardPublicRecord
from app.models import ShareDashboardRevokeRequest
from app.models import ShareDashboardUpdateRequest
from app.models import ShareSnapshotCreateRequest
from app.models import ShareSnapshotCreateResponse
from app.models import ShareSnapshotPublicRecord
from app.models import StrategyCorpusSeed
from app.models import SyncVaultCreateRequest
from app.models import SyncVaultCreateResponse
from app.models import SyncVaultRecord
from app.models import SyncVaultTokenRequest
from app.models import SyncVaultUpdateRequest
from app.models import WebPushConfigResponse
from app.models import WebPushSubscriptionRequest
from app.models import WebPushSubscriptionResponse
from app.models import WebPushUnsubscribeRequest
from app.models import WebPushUnsubscribeResponse
from app.native_push import native_push_delivery_configured
from app.rate_limit import enforce_match_rate_limit
from app.repositories import (
    AccountIdentityRepository,
    CaseLogSubmissionRepository,
    ClientErrorRepository,
    NativePushTokenRepository,
    PersonalDataTokenRepository,
    ProductAnalyticsRepository,
    ShareDashboardRepository,
    ShareSnapshotRepository,
    SyncConflictError,
    SyncVaultRepository,
    WebPushSubscriptionRepository,
)
from app.services import build_match_response, get_match_priorities, get_targets

app = FastAPI(title="bodymod api", version="0.1.0")


def allowed_cors_origins() -> list[str]:
    configured_origins = os.getenv("BODYMOD_CORS_ORIGINS", "")
    if configured_origins.strip():
        return [
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        ]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
    ]


def web_push_config_payload() -> dict[str, str | bool]:
    public_key = os.getenv("BODYMOD_WEB_PUSH_VAPID_PUBLIC_KEY", "").strip()
    private_key = os.getenv("BODYMOD_WEB_PUSH_VAPID_PRIVATE_KEY", "").strip()
    subject = os.getenv("BODYMOD_WEB_PUSH_VAPID_SUBJECT", "").strip()
    enabled = bool(public_key and private_key and subject)

    return {
        "enabled": enabled,
        "vapidPublicKey": public_key if enabled else "",
        "reason": ""
        if enabled
        else "Remote web push is disabled until VAPID public key, private key, and subject are configured.",
    }


def account_magic_link_delivery_status() -> str:
    if os.getenv("BODYMOD_AUTH_DEV_TOKENS", "").lower() == "true":
        return "dev-token-returned"
    if account_magic_link_email_configured():
        return "provider-configured"
    return "provider-not-configured"


def bearer_access_token(authorization: str) -> str:
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    access_token = authorization[len(prefix) :].strip()
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    return access_token


def require_case_log_review_token(
    x_bodymod_review_token: str = Header(default=""),
) -> None:
    configured_token = os.getenv("BODYMOD_CASE_LOG_REVIEW_TOKEN", "").strip()
    if not configured_token:
        raise HTTPException(
            status_code=503,
            detail="Case-log review API is disabled until BODYMOD_CASE_LOG_REVIEW_TOKEN is configured.",
        )
    if not x_bodymod_review_token or not secrets.compare_digest(
        x_bodymod_review_token,
        configured_token,
    ):
        raise HTTPException(status_code=403, detail="Invalid case-log review token.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/targets")
def list_targets() -> dict[str, list[dict]]:
    return {"targets": [target.model_dump() for target in get_targets()]}


@app.post("/api/match")
def match_profile(
    measurements: MeasurementSet,
    priority: str = "balanced",
    _rate_limit: None = Depends(enforce_match_rate_limit),
) -> dict:
    return build_match_response(measurements, priority).model_dump()


@app.get("/api/match-priorities")
def match_priorities() -> dict[str, list[dict]]:
    priorities = [priority.model_dump() for priority in get_match_priorities()]
    return {"priorities": priorities}


@app.get("/api/planning")
def planning_data() -> dict:
    return PlanningData.model_validate(
        {
            "personas": PERSONAS,
            "goalPresets": GOAL_PRESETS,
            "protocolTemplates": PROTOCOL_TEMPLATES,
            "protocolTaxonomy": PROTOCOL_TAXONOMY,
        }
    ).model_dump()


@app.get("/api/live-updates/manifest", response_model=LiveUpdateManifestResponse)
def live_update_manifest(
    channel: str = "production",
    currentVersion: str = "",
    platform: str = "web",
) -> dict:
    manifest = LiveUpdateManifest.model_validate(LIVE_UPDATE_MANIFEST)
    selected_channel = next(
        (item for item in manifest.channels if item.id == channel),
        next(
            (item for item in manifest.channels if item.id == manifest.currentChannel),
            manifest.channels[0],
        ),
    )

    payload = manifest.model_dump()
    payload["selectedChannel"] = selected_channel.model_dump()
    return LiveUpdateManifestResponse.model_validate(payload).model_dump()


@app.get("/api/launch-readiness")
def launch_readiness() -> dict:
    return LaunchReadiness.model_validate(LAUNCH_READINESS).model_dump()


@app.get("/api/clothing-sizes")
def clothing_size_tables() -> dict:
    return ClothingSizeTables.model_validate(CLOTHING_SIZE_TABLES).model_dump()


@app.get("/api/exercise-library")
def exercise_library() -> dict:
    return ExerciseLibrary.model_validate(EXERCISE_LIBRARY).model_dump()


@app.get("/api/procedure-library")
def procedure_library() -> dict:
    return ProcedureLibrary.model_validate(PROCEDURE_LIBRARY).model_dump()


@app.get("/api/bloodwork-library")
def bloodwork_library() -> dict:
    return BloodworkLibrary.model_validate(BLOODWORK_LIBRARY).model_dump()


@app.get("/api/strategy-corpus")
def strategy_corpus() -> dict:
    return StrategyCorpusSeed.model_validate(STRATEGY_CORPUS).model_dump()


@app.get("/api/attractiveness-evidence")
def attractiveness_evidence() -> dict:
    return AttractivenessEvidenceLibrary.model_validate(ATTRACTIVENESS_EVIDENCE).model_dump()


@app.get("/api/measurement-guides")
def measurement_guides() -> dict:
    return MeasurementGuideLibrary.model_validate(MEASUREMENT_GUIDES).model_dump()


@app.get("/api/reference-data")
def reference_data() -> dict:
    return PopulationReferenceData.model_validate(REFERENCE_DATA).model_dump()


@app.get("/api/entitlements")
def entitlement_config() -> dict:
    return EntitlementConfig.model_validate(ENTITLEMENT_CONFIG).model_dump()


@app.get("/api/food/search")
def food_search(query: str = "") -> dict:
    return FoodSearchResponse.model_validate(
        {
            "version": USDA_FOOD_LIBRARY["version"],
            "source": USDA_FOOD_LIBRARY["source"],
            "notes": USDA_FOOD_LIBRARY["notes"],
            "foods": search_usda_foods(query),
        }
    ).model_dump()


@app.post(
    "/api/client-errors",
    response_model=ClientErrorReportResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def report_client_error(request: ClientErrorReportRequest) -> dict:
    return ClientErrorRepository().record_event(request.event)


@app.post(
    "/api/product-analytics",
    response_model=ProductAnalyticsReportResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def report_product_analytics(request: ProductAnalyticsReportRequest) -> dict:
    return ProductAnalyticsRepository().record_event(request.event)


@app.post(
    "/api/case-log-submissions",
    response_model=CaseLogSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def submit_case_log_for_moderation(request: CaseLogSubmissionRequest) -> dict:
    return CaseLogSubmissionRepository().create_submission(request)


@app.get(
    "/api/case-log-submissions/review",
    response_model=CaseLogModerationListResponse,
)
def list_case_log_submissions_for_review(
    includeRemoved: bool = False,
    _review_token: None = Depends(require_case_log_review_token),
) -> dict:
    return {
        "submissions": CaseLogSubmissionRepository().list_submission_dicts(
            include_removed=includeRemoved
        )
    }


@app.patch(
    "/api/case-log-submissions/review/{submission_id}",
    response_model=CaseLogSubmissionRecord,
)
def review_case_log_submission(
    submission_id: str,
    request: CaseLogModerationReviewRequest,
    _review_token: None = Depends(require_case_log_review_token),
) -> dict:
    submission = CaseLogSubmissionRepository().review_submission(
        submission_id,
        request.status,
        request.moderationNote,
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Case-log submission not found.")
    return submission


@app.post(
    "/api/share-snapshots",
    response_model=ShareSnapshotCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_share_snapshot(request: ShareSnapshotCreateRequest) -> dict:
    return ShareSnapshotRepository().create_snapshot(request.snapshot, request.expiresInHours)


@app.get(
    "/api/share-snapshots/{public_token}",
    response_model=ShareSnapshotPublicRecord,
)
def read_share_snapshot(public_token: str) -> dict:
    snapshot = ShareSnapshotRepository().get_public_snapshot(public_token)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Share snapshot not found or expired.")
    return snapshot


@app.post(
    "/api/accounts/magic-links",
    response_model=AccountMagicLinkResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_account_magic_link(request: AccountMagicLinkRequest) -> dict:
    delivery_status = account_magic_link_delivery_status()
    response = AccountIdentityRepository().request_magic_link(
        request.email,
        request.displayName,
        request.userAgentFamily,
        delivery_status,
        delivery_status == "dev-token-returned",
        delivery_status == "provider-configured",
    )
    delivery_token = response.pop("_deliveryToken", "")
    if delivery_status == "provider-configured":
        try:
            send_account_magic_link_email(
                to_email=request.email,
                token=delivery_token,
                expires_at=response["expiresAt"],
            )
        except Exception as error:
            raise HTTPException(
                status_code=503,
                detail="Magic link email delivery failed.",
            ) from error
    return response


@app.post(
    "/api/accounts/magic-links/verify",
    response_model=AccountSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def verify_account_magic_link(request: AccountMagicLinkVerifyRequest) -> dict:
    try:
        return AccountIdentityRepository().verify_magic_link(request.token)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error


@app.get(
    "/api/accounts/session",
    response_model=AccountSessionRecord,
)
def read_account_session(authorization: str = Header(default="")) -> dict:
    session_token = bearer_access_token(authorization)
    session = AccountIdentityRepository().get_session(session_token)
    if not session:
        raise HTTPException(status_code=403, detail="Account session is invalid or expired.")
    return session


@app.post(
    "/api/accounts/logout",
    response_model=AccountSessionRevokeResponse,
)
def revoke_account_session(authorization: str = Header(default="")) -> dict:
    session_token = bearer_access_token(authorization)
    return AccountIdentityRepository().revoke_session(session_token)


@app.get("/api/web-push/config", response_model=WebPushConfigResponse)
def web_push_config() -> dict[str, str | bool]:
    return web_push_config_payload()


@app.post(
    "/api/web-push/subscriptions",
    response_model=WebPushSubscriptionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_web_push_subscription(request: WebPushSubscriptionRequest) -> dict:
    response = WebPushSubscriptionRepository().upsert_subscription(
        request.subscription,
        request.context,
        request.userAgentFamily,
        request.createdAt,
        request.nextReminderAfter,
    )
    response["deliveryConfigured"] = bool(web_push_config_payload()["enabled"])
    return response


@app.post(
    "/api/web-push/subscriptions/unsubscribe",
    response_model=WebPushUnsubscribeResponse,
)
def revoke_web_push_subscription(request: WebPushUnsubscribeRequest) -> dict:
    return WebPushSubscriptionRepository().revoke_subscription(request.endpoint)


@app.post(
    "/api/native-push/tokens",
    response_model=NativePushTokenResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_native_push_token(request: NativePushTokenRequest) -> dict:
    response = NativePushTokenRepository().upsert_token(
        request.token,
        request.platform,
        request.context,
        request.createdAt,
        request.nextReminderAfter,
    )
    response["deliveryConfigured"] = native_push_delivery_configured(request.platform)
    return response


@app.post(
    "/api/native-push/tokens/unsubscribe",
    response_model=NativePushUnsubscribeResponse,
)
def revoke_native_push_token(request: NativePushUnsubscribeRequest) -> dict:
    return NativePushTokenRepository().revoke_token(request.token, request.tokenHash)


@app.post(
    "/api/sync-vaults",
    response_model=SyncVaultCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sync_vault(request: SyncVaultCreateRequest) -> dict:
    return SyncVaultRepository().create_vault(request.deviceId, request.blob)


@app.post(
    "/api/sync-vaults/{vault_id}/read",
    response_model=SyncVaultRecord,
)
def read_sync_vault(vault_id: str, request: SyncVaultTokenRequest) -> dict:
    try:
        vault = SyncVaultRepository().get_vault(vault_id, request.syncToken)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not vault:
        raise HTTPException(status_code=404, detail="Sync vault not found.")
    return vault


@app.put(
    "/api/sync-vaults/{vault_id}",
    response_model=SyncVaultRecord,
)
def update_sync_vault(vault_id: str, request: SyncVaultUpdateRequest) -> dict:
    try:
        vault = SyncVaultRepository().update_vault(
            vault_id,
            request.syncToken,
            request.expectedRevision,
            request.deviceId,
            request.blob,
            request.force,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except SyncConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": str(error),
                "currentRevision": error.current_revision,
                "updatedAt": error.updated_at,
            },
        ) from error

    if not vault:
        raise HTTPException(status_code=404, detail="Sync vault not found.")
    return vault


@app.post("/api/sync-vaults/{vault_id}/revoke")
def revoke_sync_vault(vault_id: str, request: SyncVaultTokenRequest) -> dict[str, str]:
    try:
        revoked = SyncVaultRepository().revoke_vault(vault_id, request.syncToken)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not revoked:
        raise HTTPException(status_code=404, detail="Sync vault not found.")
    return {"status": "revoked"}


@app.post(
    "/api/personal-data/tokens",
    response_model=PersonalDataTokenCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_personal_data_token(request: PersonalDataTokenCreateRequest) -> dict:
    try:
        token = PersonalDataTokenRepository().create_token(
            request.vaultId,
            request.syncToken,
            request.label,
            request.scopes,
            request.expiresAt,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not token:
        raise HTTPException(status_code=404, detail="Sync vault not found.")
    return token


@app.get(
    "/api/personal-data/sync-vault",
    response_model=SyncVaultRecord,
)
def read_personal_data_sync_vault(authorization: str = Header(default="")) -> dict:
    access_token = bearer_access_token(authorization)
    try:
        vault = PersonalDataTokenRepository().read_sync_vault(access_token)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not vault:
        raise HTTPException(status_code=404, detail="Sync vault not found.")
    return vault


@app.post(
    "/api/personal-data/tokens/revoke",
    response_model=PersonalDataTokenRevokeResponse,
)
def revoke_personal_data_token(authorization: str = Header(default="")) -> dict:
    access_token = bearer_access_token(authorization)
    return PersonalDataTokenRepository().revoke_token(access_token)


@app.post(
    "/api/share-dashboards",
    response_model=ShareDashboardCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_share_dashboard(request: ShareDashboardCreateRequest) -> dict:
    return ShareDashboardRepository().create_dashboard(request.dashboard)


@app.get(
    "/api/share-dashboards/{public_token}",
    response_model=ShareDashboardPublicRecord,
)
def get_share_dashboard(public_token: str) -> dict:
    dashboard = ShareDashboardRepository().get_public_dashboard(public_token)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Share dashboard not found.")
    return dashboard


@app.put(
    "/api/share-dashboards/{public_token}",
    response_model=ShareDashboardPublicRecord,
)
def update_share_dashboard(public_token: str, request: ShareDashboardUpdateRequest) -> dict:
    try:
        dashboard = ShareDashboardRepository().update_dashboard(
            public_token,
            request.revokeToken,
            request.dashboard,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not dashboard:
        raise HTTPException(status_code=404, detail="Share dashboard not found.")
    return dashboard


@app.post("/api/share-dashboards/{public_token}/revoke")
def revoke_share_dashboard(public_token: str, request: ShareDashboardRevokeRequest) -> dict[str, str]:
    try:
        revoked = ShareDashboardRepository().revoke_dashboard(
            public_token,
            request.revokeToken,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not revoked:
        raise HTTPException(status_code=404, detail="Share dashboard not found.")
    return {"status": "revoked"}
