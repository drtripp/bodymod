import os
import smtplib
import ssl
from dataclasses import dataclass, replace
from email.message import EmailMessage
from typing import Mapping
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


@dataclass(frozen=True)
class AccountMagicLinkEmailConfig:
    provider: str
    enabled: bool
    reason: str
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    smtp_timeout_seconds: float = 10.0
    magic_link_base_url: str = ""


def _bool_env(value: str, default: bool = False) -> bool:
    if not value.strip():
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int_env(value: str, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _float_env(value: str, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _env_value(env: Mapping[str, str], key: str) -> str:
    return str(env.get(key, "")).strip()


def load_account_magic_link_email_config(
    env: Mapping[str, str] | None = None,
) -> AccountMagicLinkEmailConfig:
    source = env if env is not None else os.environ
    provider = _env_value(source, "BODYMOD_AUTH_EMAIL_PROVIDER").lower()
    if provider != "smtp":
        return AccountMagicLinkEmailConfig(
            provider=provider or "none",
            enabled=False,
            reason="Account email delivery is disabled until BODYMOD_AUTH_EMAIL_PROVIDER=smtp is configured.",
        )

    smtp_starttls = _bool_env(_env_value(source, "BODYMOD_AUTH_SMTP_STARTTLS"), True)
    smtp_port = _int_env(
        _env_value(source, "BODYMOD_AUTH_SMTP_PORT"),
        587 if smtp_starttls else 25,
    )
    config = AccountMagicLinkEmailConfig(
        provider="smtp",
        enabled=False,
        reason="",
        smtp_host=_env_value(source, "BODYMOD_AUTH_SMTP_HOST"),
        smtp_port=smtp_port,
        smtp_username=_env_value(source, "BODYMOD_AUTH_SMTP_USERNAME"),
        smtp_password=_env_value(source, "BODYMOD_AUTH_SMTP_PASSWORD"),
        smtp_from=_env_value(source, "BODYMOD_AUTH_SMTP_FROM"),
        smtp_starttls=smtp_starttls,
        smtp_timeout_seconds=_float_env(
            _env_value(source, "BODYMOD_AUTH_SMTP_TIMEOUT_SECONDS"),
            10.0,
        ),
        magic_link_base_url=_env_value(source, "BODYMOD_AUTH_MAGIC_LINK_BASE_URL"),
    )

    missing = []
    if not config.smtp_host:
        missing.append("BODYMOD_AUTH_SMTP_HOST")
    if not config.smtp_from:
        missing.append("BODYMOD_AUTH_SMTP_FROM")
    if not config.magic_link_base_url:
        missing.append("BODYMOD_AUTH_MAGIC_LINK_BASE_URL")
    if config.magic_link_base_url and not config.magic_link_base_url.startswith(
        ("https://", "http://localhost", "http://127.0.0.1")
    ):
        missing.append("BODYMOD_AUTH_MAGIC_LINK_BASE_URL_https")

    if missing:
        return replace(
            config,
            enabled=False,
            reason=f"SMTP account email delivery is missing: {', '.join(missing)}.",
        )

    return replace(config, enabled=True, reason="")


def account_magic_link_email_configured(env: Mapping[str, str] | None = None) -> bool:
    return load_account_magic_link_email_config(env).enabled


def build_magic_link_url(base_url: str, token: str) -> str:
    parts = urlsplit(base_url)
    query_items = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key not in {"magicLinkToken", "accountMagicToken"}
    ]
    query_items.append(("magicLinkToken", token))
    path = parts.path or "/"
    return urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            path,
            urlencode(query_items),
            parts.fragment,
        )
    )


def build_account_magic_link_message(
    *,
    to_email: str,
    token: str,
    expires_at: str,
    config: AccountMagicLinkEmailConfig,
) -> EmailMessage:
    magic_url = build_magic_link_url(config.magic_link_base_url, token)
    message = EmailMessage()
    message["Subject"] = "Your bodymod sign-in link"
    message["From"] = config.smtp_from
    message["To"] = to_email
    message["X-Bodymod-Email-Type"] = "account-magic-link"
    message.set_content(
        "\n".join(
            [
                "Use this bodymod sign-in link:",
                magic_url,
                "",
                "If the link does not open the app, paste this token into the Magic-link token field:",
                token,
                "",
                f"This link expires at {expires_at}.",
                "",
                "No measurements, notes, photos, or logs were sent to request this email.",
            ]
        )
    )
    return message


def send_account_magic_link_email(
    *,
    to_email: str,
    token: str,
    expires_at: str,
    config: AccountMagicLinkEmailConfig | None = None,
    smtp_factory=smtplib.SMTP,
) -> None:
    active_config = config or load_account_magic_link_email_config()
    if not active_config.enabled:
        raise RuntimeError(active_config.reason or "Account email delivery is not configured.")

    message = build_account_magic_link_message(
        to_email=to_email,
        token=token,
        expires_at=expires_at,
        config=active_config,
    )
    with smtp_factory(
        active_config.smtp_host,
        active_config.smtp_port,
        timeout=active_config.smtp_timeout_seconds,
    ) as smtp:
        if active_config.smtp_starttls:
            smtp.starttls(context=ssl.create_default_context())
        if active_config.smtp_username:
            smtp.login(active_config.smtp_username, active_config.smtp_password)
        smtp.send_message(message)
