from app.account_email import build_account_magic_link_message
from app.account_email import build_magic_link_url
from app.account_email import load_account_magic_link_email_config
from app.account_email import send_account_magic_link_email


def smtp_env() -> dict[str, str]:
    return {
        "BODYMOD_AUTH_EMAIL_PROVIDER": "smtp",
        "BODYMOD_AUTH_SMTP_HOST": "smtp.example.test",
        "BODYMOD_AUTH_SMTP_PORT": "2525",
        "BODYMOD_AUTH_SMTP_USERNAME": "mailer",
        "BODYMOD_AUTH_SMTP_PASSWORD": "secret",
        "BODYMOD_AUTH_SMTP_FROM": "Bodymod <login@example.test>",
        "BODYMOD_AUTH_SMTP_STARTTLS": "true",
        "BODYMOD_AUTH_MAGIC_LINK_BASE_URL": "https://bodymod.example.test/account",
    }


def test_account_magic_link_email_config_requires_smtp_settings() -> None:
    disabled = load_account_magic_link_email_config({})
    assert disabled.enabled is False
    assert disabled.provider == "none"

    missing_host = load_account_magic_link_email_config(
        {
            "BODYMOD_AUTH_EMAIL_PROVIDER": "smtp",
            "BODYMOD_AUTH_SMTP_FROM": "Bodymod <login@example.test>",
            "BODYMOD_AUTH_MAGIC_LINK_BASE_URL": "https://bodymod.example.test",
        }
    )
    assert missing_host.enabled is False
    assert "BODYMOD_AUTH_SMTP_HOST" in missing_host.reason

    configured = load_account_magic_link_email_config(smtp_env())
    assert configured.enabled is True
    assert configured.smtp_host == "smtp.example.test"
    assert configured.smtp_port == 2525
    assert configured.smtp_starttls is True


def test_magic_link_url_replaces_existing_token_query() -> None:
    url = build_magic_link_url(
        "https://bodymod.example.test/app?foo=bar&magicLinkToken=old",
        "bmd_ml_new-token-abcdefghijklmnopqrstuvwxyz",
    )

    assert url == (
        "https://bodymod.example.test/app?"
        "foo=bar&magicLinkToken=bmd_ml_new-token-abcdefghijklmnopqrstuvwxyz"
    )


def test_smtp_sender_builds_measurement_free_magic_link_email() -> None:
    config = load_account_magic_link_email_config(smtp_env())
    token = "bmd_ml_test-token-abcdefghijklmnopqrstuvwxyz"
    sent_messages = []
    smtp_calls = []

    class FakeSmtp:
        def __init__(self, host, port, timeout):
            smtp_calls.append(("connect", host, port, timeout))

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            smtp_calls.append(("close",))

        def starttls(self, context):
            smtp_calls.append(("starttls", bool(context)))

        def login(self, username, password):
            smtp_calls.append(("login", username, password))

        def send_message(self, message):
            sent_messages.append(message)

    send_account_magic_link_email(
        to_email="mason@example.com",
        token=token,
        expires_at="2026-06-13T12:15:00+00:00",
        config=config,
        smtp_factory=FakeSmtp,
    )

    assert smtp_calls[:3] == [
        ("connect", "smtp.example.test", 2525, 10.0),
        ("starttls", True),
        ("login", "mailer", "secret"),
    ]
    assert len(sent_messages) == 1
    message = sent_messages[0]
    body = message.get_content()
    assert message["To"] == "mason@example.com"
    assert message["From"] == "Bodymod <login@example.test>"
    assert message["X-Bodymod-Email-Type"] == "account-magic-link"
    assert f"magicLinkToken={token}" in body
    assert token in body
    assert "waistCircumference" not in body
    assert "measurements, notes, photos, or logs" in body


def test_magic_link_message_can_be_built_without_sending() -> None:
    config = load_account_magic_link_email_config(smtp_env())
    message = build_account_magic_link_message(
        to_email="riley@example.com",
        token="bmd_ml_preview-token-abcdefghijklmnopqrstuvwxyz",
        expires_at="2026-06-13T12:15:00+00:00",
        config=config,
    )

    assert message["Subject"] == "Your bodymod sign-in link"
    assert "riley@example.com" not in message.get_content()
