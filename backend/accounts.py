"""Demo accounts, sessions, and visibility rules. No passwords: the demo signs in by choosing an account."""

from __future__ import annotations

import secrets
from typing import Any

SESSION_COOKIE = "nevell_session"

ACCOUNTS: list[dict[str, Any]] = [
    {
        "id": "executive",
        "name": "Taylor Brooks",
        "title": "Executive Leadership",
        "summary": "Portfolio, service lines, shop floor, and Operational Impact, with Estimating approval access and notification settings.",
        "views": ["portfolio", "approvals", "services", "operations", "value"],
        "landing": "portfolio",
        "projectIds": None,
        "alertOwners": None,
        "workflowRoles": ["Estimating"],
        "canManageNotifications": True,
        "canReviewEmails": True,
    },
    {
        "id": "project-manager",
        "name": "Sofia Alvarez",
        "title": "Project Manager",
        "summary": "Runs Miller Children's and North Harbor. Sees only those projects and their alerts.",
        "views": ["portfolio", "approvals", "services"],
        "landing": "portfolio",
        "projectIds": [4821, 4829],
        "alertOwners": None,
        "workflowRoles": ["Project Management"],
        "canManageNotifications": False,
        "canReviewEmails": False,
    },
    {
        "id": "shop-manager",
        "name": "Marcus Reyes",
        "title": "Prefab Shop & Warehouse Manager",
        "summary": "Runs the shop floor. Sees production, quality, material, and dispatch, and alerts owned by Manufacturing or Procurement.",
        "views": ["operations"],
        "landing": "operations",
        "projectIds": None,
        "alertOwners": ["Manufacturing", "Procurement"],
        "workflowRoles": [],
        "canManageNotifications": False,
        "canReviewEmails": False,
    },
    {
        "id": "preconstruction",
        "name": "Elena Park",
        "title": "Preconstruction & Estimating Manager",
        "summary": "Covers every project's pricing and drawings. Sees all projects but only Estimating and BIM alerts.",
        "views": ["portfolio", "approvals", "services"],
        "landing": "portfolio",
        "projectIds": None,
        "alertOwners": ["Estimating", "BIM"],
        "workflowRoles": ["Estimating"],
        "canManageNotifications": False,
        "canReviewEmails": False,
    },
]

EXECUTIVE = ACCOUNTS[0]
_sessions: dict[str, str] = {}


def get_account(account_id: str) -> dict[str, Any] | None:
    return next((account for account in ACCOUNTS if account["id"] == account_id), None)


def create_session(account_id: str, replacing: str | None = None) -> str:
    if replacing:
        _sessions.pop(replacing, None)
    token = secrets.token_urlsafe(32)
    _sessions[token] = account_id
    return token


def end_session(token: str | None) -> None:
    if token:
        _sessions.pop(token, None)


def account_for_token(token: str | None) -> dict[str, Any] | None:
    account_id = _sessions.get(token or "")
    return get_account(account_id) if account_id else None


def can_see_project(account: dict[str, Any], project_id: int | None) -> bool:
    scope = account["projectIds"]
    return scope is None or project_id in scope


def can_see_draft(account: dict[str, Any], draft: dict[str, Any]) -> bool:
    return (
        "approvals" in account["views"]
        and draft["reviewerRole"] in account["workflowRoles"]
        and can_see_project(account, draft["projectId"])
    )


def can_see_alert(account: dict[str, Any], alert: dict[str, Any]) -> bool:
    owners = account["alertOwners"]
    return can_see_project(account, alert["projectId"]) and (owners is None or alert["owner"] in owners)
