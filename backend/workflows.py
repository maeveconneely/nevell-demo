"""Drafted work products (pricing replies, schedule notices) that wait for a person to approve them."""

from __future__ import annotations

import re
import statistics
import time
from datetime import datetime
from typing import Any, Callable
from uuid import uuid4

# Placeholder unit costs so the demo can price. Nevell's real cost database replaces this table.
PLACEHOLDER_RATES: dict[str, dict[str, float | str]] = {
    "shaft liner": {"unit": "SF", "labor": 9.50, "material": 6.75},
    "drywall": {"unit": "SF", "labor": 3.10, "material": 1.65},
    "sheathing": {"unit": "SF", "labor": 2.40, "material": 2.20},
    "track": {"unit": "LF", "labor": 1.80, "material": 2.35},
    "ceiling": {"unit": "SF", "labor": 4.20, "material": 5.10},
}

drafts: list[dict[str, Any]] = []
outbox: list[dict[str, Any]] = []

_QUANTITY = re.compile(
    r"(\d[\d,]*)\s*(SF|LF)\b\s+(?:of\s+)?([A-Za-z][A-Za-z\- ]*?)"
    r"(?=\s+(?:and|for|at|in|to|that|which|with)\b|[,.;]|$)",
    re.IGNORECASE,
)
_CHANGE = re.compile(r"\bchanges?\s+(?:the\s+|to\s+)?([A-Za-z][A-Za-z\- ]{3,60}?)(?=[.;,]|$)", re.IGNORECASE)
_DEADLINE = re.compile(
    r"\bby\s+((?:mon|tues|wednes|thurs|fri|satur|sun)day(?:\s+\d{1,2}(?::\d{2})?\s*[ap]m)?)",
    re.IGNORECASE,
)
_DAILY_COST = re.compile(r"\$\s?(\d[\d,]*)\s*(?:a|per|/)\s*day", re.IGNORECASE)
_PANELS = re.compile(r"\bP-\d{3}(?:\s*(?:thru|through|to|-)\s*\d{3})?", re.IGNORECASE)


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _first_name(sender: str) -> str:
    return (sender.split(",")[0].split() or ["there"])[0]


def _money(value: float) -> str:
    return f"${value:,.2f}"


def _line_total(line: dict[str, Any]) -> float | None:
    if line["laborUnit"] is None or line["materialUnit"] is None:
        return None
    return round((line["quantity"] or 1) * (line["laborUnit"] + line["materialUnit"]), 2)


def _refresh_totals(draft: dict[str, Any]) -> None:
    for line in draft["lineItems"]:
        line["total"] = _line_total(line)
    priced = [line["total"] for line in draft["lineItems"] if line["total"] is not None]
    draft["totalUsd"] = round(sum(priced), 2) if draft["lineItems"] else None
    draft["fullyPriced"] = all(line["total"] is not None for line in draft["lineItems"])


def _build_quote(project: dict[str, Any], record: dict[str, Any]) -> dict[str, Any] | None:
    text = f"{record['subject']}\n{record['body']}"
    lines: list[dict[str, Any]] = []
    for match in _QUANTITY.finditer(text):
        description = " ".join(match.group(3).split())
        rate = next((value for key, value in PLACEHOLDER_RATES.items() if key in description.lower()), None)
        lines.append(
            {
                "id": str(uuid4()),
                "description": description.capitalize(),
                "quantity": float(match.group(1).replace(",", "")),
                "unit": match.group(2).upper(),
                "laborUnit": rate["labor"] if rate else None,
                "materialUnit": rate["material"] if rate else None,
                "rateSource": "placeholder rate" if rate else "needs input",
            }
        )
    for match in _CHANGE.finditer(text):
        lines.append(
            {
                "id": str(uuid4()),
                "description": f"Changes to {' '.join(match.group(1).split())}",
                "quantity": 1.0,
                "unit": "LS",
                "laborUnit": None,
                "materialUnit": None,
                "rateSource": "needs input",
            }
        )
    if not lines:
        return None

    deadline = _DEADLINE.search(text)
    due = deadline.group(1) if deadline else record["parsed"]["due"]
    amount = record["exposure"]["amountUsd"]
    asked_breakout = "breakout" in text.lower()
    draft = {
        "kind": "quote",
        "reviewerRole": "Estimating",
        "title": "Price the added scope",
        "extraction": [
            {"label": "Event", "value": "Added scope with a pricing request"},
            {"label": "Price needed by", "value": due},
            {"label": "Labor and material breakout requested", "value": "Yes" if asked_breakout else "Not stated"},
            {"label": "Scope items found", "value": str(len(lines))},
        ],
        "reference": {"label": "Figure cited in the email", "amountUsd": amount} if amount else None,
        "lineItems": lines,
        "message": {
            "to": record["senderEmail"],
            "subject": f"RE: {record['subject']}",
            "intro": (
                f"Hi {_first_name(record['senderName'])},\n\nThanks for the note on {project['name']}. "
                "Here is our pricing for the added scope, with labor and material broken out:"
            ),
            "closing": (
                f"This price is carried separately from the base contract and is due to you by {due}. "
                "Assumptions and exclusions to follow.\n\nRegards,"
            ),
        },
    }
    return draft


def _build_delay_notice(project: dict[str, Any], record: dict[str, Any]) -> dict[str, Any]:
    text = f"{record['subject']}\n{record['body']}"
    days = record["exposure"]["delayDays"]
    daily = _DAILY_COST.search(text)
    daily_cost = float(daily.group(1).replace(",", "")) if daily else None
    exposure = daily_cost * days if daily_cost and days else None
    panels = sorted({" ".join(match.group(0).split()) for match in _PANELS.finditer(text)})
    due = record["parsed"]["due"]

    extraction = [
        {"label": "Event", "value": record["parsed"]["event_type"].replace("_", " ")},
        {"label": "Slip", "value": f"{days} days" if days else "Not stated"},
        {"label": "New date", "value": due},
        {"label": "Affected panels", "value": ", ".join(panels) or "Not stated"},
        {"label": "Standby cost", "value": f"${daily_cost:,.0f} per day" if daily_cost else "Not stated"},
    ]
    if exposure:
        extraction.append({"label": "Computed exposure", "value": f"${exposure:,.0f} ({days} days at ${daily_cost:,.0f})"})

    facts = [record["parsed"]["summary"]]
    if days:
        facts.append(f"Expected slip: {days} days. New date: {due}.")
    if panels:
        facts.append(f"Affected panels: {', '.join(panels)}.")
    if exposure:
        facts.append(f"Standby exposure is about ${exposure:,.0f} (${daily_cost:,.0f} per day for {days} days).")
    return {
        "kind": "delay_notice",
        "reviewerRole": "Project Management",
        "title": "Notify the field of the delay",
        "extraction": extraction,
        "reference": {"label": "Computed standby exposure", "amountUsd": exposure} if exposure else None,
        "lineItems": [],
        "message": {
            "to": "field@nevell-demo.example",
            "subject": f"Schedule heads-up: {project['name']}",
            "intro": f"Team,\n\nHeads-up on {project['name']}:\n" + "\n".join(f"- {fact}" for fact in facts),
            "closing": (
                "Suggested actions: hold the lift until the delivery is confirmed, re-confirm crew and crane "
                "scheduling, and tell the general contractor today.\n\nRegards,"
            ),
        },
    }


def create_for_email(project: dict[str, Any], record: dict[str, Any]) -> dict[str, Any] | None:
    started = time.perf_counter()
    event_type = record["parsed"]["event_type"]
    if event_type == "budget_risk":
        draft = _build_quote(project, record)
    elif event_type in {"supplier_delay", "schedule_risk"}:
        draft = _build_delay_notice(project, record)
    else:
        draft = None
    if draft is None:
        return None

    draft.update(
        {
            "id": str(uuid4()),
            "status": "pending",
            "projectId": project["projectId"],
            "projectName": project["name"],
            "emailId": record["id"],
            "alertId": None,
            "source": {
                "sender": record["senderName"],
                "subject": record["subject"],
                "excerpt": record["body"][:600],
            },
            "createdAt": _now(),
            "createdEpoch": time.time(),
            "generationMs": round((time.perf_counter() - started) * 1000),
            "decidedAt": None,
            "reviewSeconds": None,
            "edited": False,
            "history": [{"at": _now(), "actor": "System", "action": "Draft prepared from the email"}],
        }
    )
    _refresh_totals(draft)
    draft["original"] = {
        "lines": [(line["quantity"], line["laborUnit"], line["materialUnit"]) for line in draft["lineItems"]],
        "intro": draft["message"]["intro"],
        "closing": draft["message"]["closing"],
    }
    drafts.insert(0, draft)
    del drafts[40:]
    return draft


def find(draft_id: str) -> dict[str, Any] | None:
    return next((draft for draft in drafts if draft["id"] == draft_id), None)


class ApprovalError(ValueError):
    pass


def _render_message(draft: dict[str, Any], actor_name: str) -> str:
    parts = [draft["message"]["intro"]]
    if draft["lineItems"]:
        rows = [
            f"- {line['description']}: {line['quantity']:g} {line['unit']} x "
            f"({_money(line['laborUnit'])} labor + {_money(line['materialUnit'])} material) = {_money(line['total'])}"
            for line in draft["lineItems"]
        ]
        parts.append("\n".join(rows) + f"\nTotal: {_money(draft['totalUsd'])}")
    parts.append(draft["message"]["closing"])
    parts.append(actor_name)
    return "\n\n".join(parts)


def approve(draft_id: str, edits: dict[str, Any], actor_name: str, actor: str) -> dict[str, Any]:
    draft = find(draft_id)
    if draft is None or draft["status"] != "pending":
        raise ApprovalError("This draft is no longer waiting for review.")

    lines = {line["id"]: line for line in draft["lineItems"]}
    for edit in edits.get("lineItems", []):
        line = lines.get(edit["id"])
        if line is None:
            raise ApprovalError("Unknown line item.")
        for field in ("quantity", "laborUnit", "materialUnit"):
            if field in edit:
                line[field] = edit[field]
    if edits.get("intro") is not None:
        draft["message"]["intro"] = edits["intro"]
    if edits.get("closing") is not None:
        draft["message"]["closing"] = edits["closing"]

    _refresh_totals(draft)
    if draft["lineItems"] and not draft["fullyPriced"]:
        raise ApprovalError("Price every line (labor and material) before approving.")

    current = [(line["quantity"], line["laborUnit"], line["materialUnit"]) for line in draft["lineItems"]]
    original = draft["original"]
    draft["edited"] = (
        current != original["lines"]
        or draft["message"]["intro"] != original["intro"]
        or draft["message"]["closing"] != original["closing"]
    )
    body = _render_message(draft, actor_name)
    draft["status"] = "approved"
    draft["decidedAt"] = _now()
    draft["reviewSeconds"] = round(time.time() - draft["createdEpoch"], 1)
    draft["history"].append(
        {"at": _now(), "actor": actor, "action": "Approved with edits" if draft["edited"] else "Approved as drafted"}
    )
    outbox.insert(
        0,
        {
            "id": str(uuid4()),
            "draftId": draft["id"],
            "at": _now(),
            "to": draft["message"]["to"],
            "subject": draft["message"]["subject"],
            "body": body,
            "simulated": True,
        },
    )
    del outbox[20:]
    return draft


def reject(draft_id: str, actor: str) -> dict[str, Any]:
    draft = find(draft_id)
    if draft is None or draft["status"] != "pending":
        raise ApprovalError("This draft is no longer waiting for review.")
    draft["status"] = "rejected"
    draft["decidedAt"] = _now()
    draft["reviewSeconds"] = round(time.time() - draft["createdEpoch"], 1)
    draft["history"].append({"at": _now(), "actor": actor, "action": "Rejected; handle manually"})
    return draft


def reset() -> None:
    drafts.clear()
    outbox.clear()


def _public(draft: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in draft.items() if key not in {"original", "createdEpoch"}}


def payload(visible: Callable[[dict[str, Any]], bool] | None = None) -> dict[str, Any]:
    allowed = [draft for draft in drafts if visible is None or visible(draft)]
    allowed_ids = {draft["id"] for draft in allowed}
    return {
        "pending": [_public(draft) for draft in allowed if draft["status"] == "pending"],
        "completed": [_public(draft) for draft in allowed if draft["status"] != "pending"][:10],
        "outbox": [item for item in outbox if item["draftId"] in allowed_ids][:6],
    }


def stats() -> dict[str, Any]:
    decided = [draft for draft in drafts if draft["status"] != "pending"]
    approved = [draft for draft in drafts if draft["status"] == "approved"]
    return {
        "draftsCreated": len(drafts),
        "draftsApproved": len(approved),
        "draftsEdited": sum(1 for draft in approved if draft["edited"]),
        "draftsRejected": sum(1 for draft in drafts if draft["status"] == "rejected"),
        "medianDraftMs": round(statistics.median(draft["generationMs"] for draft in drafts)) if drafts else None,
        "medianReviewSeconds": round(statistics.median(draft["reviewSeconds"] for draft in decided), 1) if decided else None,
    }
