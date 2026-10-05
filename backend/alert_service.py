"""Alert records, an audit trail, and notification delivery for the demo backend."""

from __future__ import annotations

import asyncio
import json
import os
import re
import secrets
import smtplib
import urllib.request
from datetime import datetime
from email.message import EmailMessage
from typing import Any, Awaitable, Callable
from uuid import uuid4

OWNER_ROLES = ["BIM", "Estimating", "Manufacturing", "Operations", "Procurement", "Project Management"]
NTFY_TOPIC_PATTERN = re.compile(r"^[A-Za-z0-9_-]{6,64}$")
_configured_ntfy_server = os.getenv("NEVELL_NTFY_SERVER", "https://ntfy.sh").rstrip("/")
NTFY_SERVER = _configured_ntfy_server if _configured_ntfy_server.startswith("https://") else "https://ntfy.sh"

alerts: list[dict[str, Any]] = []
notification_log: list[dict[str, Any]] = []
settings: dict[str, str | None] = {"ntfyTopic": os.getenv("NEVELL_NTFY_TOPIC") or None}

_publisher: Callable[[], Awaitable[None]] | None = None
_tasks: set[asyncio.Task[None]] = set()


def configure(publisher: Callable[[], Awaitable[None]]) -> None:
    global _publisher
    _publisher = publisher


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _ascii(text: str) -> str:
    return " ".join(text.replace("\u2014", "-").encode("ascii", "ignore").decode().split())


def _webhook_url() -> str | None:
    url = os.getenv("NEVELL_ALERT_WEBHOOK_URL", "")
    return url if url.startswith("https://") else None


def _smtp_ready() -> bool:
    return bool(os.getenv("NEVELL_SMTP_HOST") and os.getenv("NEVELL_ALERT_EMAIL_TO"))


def channel_status() -> list[dict[str, Any]]:
    topic = settings["ntfyTopic"]
    return [
        {"key": "in_app", "name": "In-app", "configured": True, "detail": "Always on. Appears on this dashboard."},
        {
            "key": "ntfy",
            "name": "Phone push (ntfy)",
            "configured": bool(topic),
            "detail": f"Publishing to topic {topic}." if topic else "Choose a topic below, then subscribe to it in the ntfy app.",
        },
        {
            "key": "email",
            "name": "Email (SMTP)",
            "configured": _smtp_ready(),
            "detail": "Sending to the configured address." if _smtp_ready() else "Set NEVELL_SMTP_HOST and NEVELL_ALERT_EMAIL_TO.",
        },
        {
            "key": "webhook",
            "name": "Webhook (JSON text)",
            "configured": _webhook_url() is not None,
            "detail": "Posting to the configured URL." if _webhook_url() else "Set NEVELL_ALERT_WEBHOOK_URL (https only).",
        },
    ]


def _send_ntfy(topic: str, title: str, message: str, urgent: bool) -> None:
    request = urllib.request.Request(
        f"{NTFY_SERVER}/{topic}",
        data=message.encode("utf-8"),
        method="POST",
        headers={"Title": _ascii(title), "Priority": "5" if urgent else "3", "Tags": "warning"},
    )
    with urllib.request.urlopen(request, timeout=6) as response:
        if response.status >= 300:
            raise RuntimeError(f"ntfy returned HTTP {response.status}")


def _send_webhook(url: str, text: str) -> None:
    request = urllib.request.Request(
        url,
        data=json.dumps({"text": text}).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=6) as response:
        if response.status >= 300:
            raise RuntimeError(f"Webhook returned HTTP {response.status}")


def _send_email(subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = _ascii(subject)
    message["From"] = os.getenv("NEVELL_SMTP_FROM", os.getenv("NEVELL_SMTP_USER", "alerts@nevell-demo.example"))
    message["To"] = os.environ["NEVELL_ALERT_EMAIL_TO"]
    message.set_content(body)
    with smtplib.SMTP(os.environ["NEVELL_SMTP_HOST"], int(os.getenv("NEVELL_SMTP_PORT", "587")), timeout=8) as smtp:
        smtp.starttls()
        if os.getenv("NEVELL_SMTP_USER"):
            smtp.login(os.environ["NEVELL_SMTP_USER"], os.getenv("NEVELL_SMTP_PASSWORD", ""))
        smtp.send_message(message)


def _log(alert: dict[str, Any] | None, kind: str, channel: str, name: str, status: str, detail: str) -> None:
    notification_log.insert(
        0,
        {
            "id": str(uuid4()),
            "at": _now(),
            "alertId": alert["id"] if alert else None,
            "title": alert["title"] if alert else "Test notification",
            "severity": alert["severity"] if alert else "Test",
            "kind": kind,
            "channel": channel,
            "channelName": name,
            "status": status,
            "detail": detail,
        },
    )
    del notification_log[60:]


async def _deliver(alert: dict[str, Any] | None, kind: str, severity: str, title: str, message: str) -> None:
    if severity != "High":
        _log(alert, kind, "in_app", "In-app", "delivered", "Medium severity: dashboard only.")
        return

    _log(alert, kind, "in_app", "In-app", "delivered", "Shown on the dashboard.")
    urgent = True
    senders: list[tuple[str, str, Callable[[], None] | None]] = [
        ("ntfy", "Phone push (ntfy)", (lambda t=settings["ntfyTopic"]: _send_ntfy(t, title, message, urgent)) if settings["ntfyTopic"] else None),
        ("email", "Email (SMTP)", (lambda: _send_email(title, message)) if _smtp_ready() else None),
        ("webhook", "Webhook (JSON text)", (lambda u=_webhook_url(): _send_webhook(u, f"{title}\n{message}")) if _webhook_url() else None),
    ]
    for key, name, sender in senders:
        if sender is None:
            _log(alert, kind, key, name, "skipped", "Not configured.")
            continue
        try:
            await asyncio.to_thread(sender)
            _log(alert, kind, key, name, "delivered", "Accepted by the service.")
        except (OSError, RuntimeError, smtplib.SMTPException, KeyError, ValueError) as error:
            _log(alert, kind, key, name, "failed", f"{type(error).__name__}: {error}"[:200])


def _spawn(coroutine: Awaitable[None]) -> None:
    try:
        task = asyncio.get_running_loop().create_task(_run_and_publish(coroutine))
    except RuntimeError:
        if hasattr(coroutine, "close"):
            coroutine.close()  # type: ignore[union-attr]
        return
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


async def _run_and_publish(coroutine: Awaitable[None]) -> None:
    await coroutine
    if _publisher is not None:
        await _publisher()


def _message(alert: dict[str, Any]) -> str:
    return (
        f"{alert['projectName']}: {alert['title']}\n"
        f"{alert['detail']}\n"
        f"Source: {alert['source']['label']}. Owner: {alert['owner']}."
    )


def create_alert(
    *,
    project_id: int | None,
    project_name: str,
    severity: str,
    title: str,
    detail: str,
    owner: str,
    source: dict[str, str],
    notify: bool = True,
    draft_id: str | None = None,
) -> dict[str, Any]:
    alert = {
        "id": str(uuid4()),
        "projectId": project_id,
        "projectName": project_name,
        "severity": severity,
        "title": title,
        "detail": detail,
        "owner": owner,
        "source": source,
        "status": "open",
        "createdAt": _now(),
        "draftId": draft_id,
        "history": [{"at": _now(), "actor": "System", "action": f"Alert created from {source['label']}"}],
    }
    alerts.insert(0, alert)
    del alerts[60:]
    if notify:
        _spawn(_deliver(alert, "New alert", severity, f"{severity} alert - {project_name}", _message(alert)))
    return alert


def seed_from_attention(rows: list[dict[str, Any]]) -> None:
    for row in reversed(rows):
        if row["priority"] != "High":
            continue
        project_id_text, _, project_name = row["project"].partition(" - ")
        create_alert(
            project_id=int(project_id_text) if project_id_text.isdigit() else None,
            project_name=project_name or row["project"],
            severity="High",
            title=row["issue"],
            detail=f"Due {row['due']}.",
            owner=row["owner"],
            source={"type": "seed", "label": "Seeded demo data", "detail": "Existing item from the attention queue."},
            notify=False,
        )


def reset(rows: list[dict[str, Any]]) -> None:
    alerts.clear()
    notification_log.clear()
    seed_from_attention(rows)


def find(alert_id: str) -> dict[str, Any] | None:
    return next((item for item in alerts if item["id"] == alert_id), None)


def _record(alert: dict[str, Any], actor: str, action: str) -> None:
    alert["history"].append({"at": _now(), "actor": actor, "action": action})


def note(alert_id: str, actor: str, action: str) -> None:
    alert = find(alert_id)
    if alert:
        _record(alert, actor, action)


def assign(alert_id: str, owner: str, actor: str) -> dict[str, Any] | None:
    alert = find(alert_id)
    if alert and alert["status"] != "resolved" and owner != alert["owner"]:
        _record(alert, actor, f"Reassigned from {alert['owner']} to {owner}")
        alert["owner"] = owner
    return alert


def resolve(alert_id: str, actor: str) -> dict[str, Any] | None:
    alert = find(alert_id)
    if alert and alert["status"] != "resolved":
        alert["status"] = "resolved"
        _record(alert, actor, "Resolved")
    return alert


def set_ntfy_topic(topic: str | None, generate: bool = False) -> None:
    if generate:
        topic = f"nevell-demo-{secrets.token_hex(6)}"
    if topic and not NTFY_TOPIC_PATTERN.fullmatch(topic):
        raise ValueError("Topic must be 6-64 letters, numbers, dashes, or underscores.")
    settings["ntfyTopic"] = topic or None


def send_test() -> None:
    _spawn(
        _deliver(
            None,
            "Test",
            "High",
            "Test notification - Nevell demo",
            "This is a test from the Nevell project dashboard. Real alerts look like this.",
        )
    )


def payload(
    visible: Callable[[dict[str, Any]], bool] | None = None, admin: bool = True
) -> dict[str, Any]:
    items = [alert for alert in alerts if visible is None or visible(alert)]
    return {
        "items": items[:30],
        "owners": OWNER_ROLES,
        "canConfigure": admin,
        "channels": channel_status() if admin else [],
        "log": notification_log[:12] if admin else [],
        "ntfyTopic": settings["ntfyTopic"] if admin else None,
        "ntfyServer": NTFY_SERVER,
        "rules": [
            "High: dashboard plus every configured channel.",
            "Medium: dashboard only.",
        ] if admin else [],
    }
