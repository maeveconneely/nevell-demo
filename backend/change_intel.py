"""Change intelligence per project: drawing, RFI, addendum, and delivery changes found in emails, plus shop-schedule exceptions."""

from __future__ import annotations

import re
from datetime import date
from typing import Any
from uuid import uuid4

_PANEL = re.compile(r"\bP-(\d{3})(?:\s*(?:thru|through|to|-)\s*(?:P-)?(\d{3}))?", re.IGNORECASE)
_REFERENCE = re.compile(r"\b(SK-\d{1,3}|[A-OQ-Z]-\d{3,4}|Addendum\s+\d+|RFI\s*#?\s*\d+|PO\s*\d{4,6})\b")
_REVISION = re.compile(r"\bRev(?:ision)?\.?\s*(\d+)\b", re.IGNORECASE)
_LOCATION = re.compile(r"\b(grid\s+[A-Z]/\d+|stair\s+\d+|level\s+\d+(?:\s+\w+\s+rooms)?)", re.IGNORECASE)

TRACKED_EVENTS = {
    "drawing_revision": ("Detail changed; shop drawings need a recheck", "Manufacturing"),
    "rfi_response": ("RFI response issued; confirm the detail is coordinated", "BIM"),
    "budget_risk": ("Added scope; pricing needed", "Estimating"),
    "supplier_delay": ("Delivery is slipping; release is at risk", "Procurement"),
    "manufacturing_issue": ("Quality issue; hold before shipping", "Manufacturing"),
    "schedule_risk": ("Access or sequence change", "Operations"),
}

SEED_ENTRIES: list[dict[str, Any]] = [
    {
        "id": "seed-4821-a503",
        "projectId": 4821,
        "source": "sample",
        "sourceLabel": "Sample revision",
        "reference": "A-503 Rev 18",
        "summary": "Revision to the east clinic return detail.",
        "detectedAt": None,
        "emailId": None,
        "alertId": None,
        "draftId": None,
        "rows": [
            {"item": "P-104", "change": "Width changed 8'-0\" to 8'-6\"", "impact": "Manufacturing", "priority": "High", "owner": "BIM"},
            {"item": "P-106", "change": "Material changed from Type A to Type B", "impact": "Procurement", "priority": "High", "owner": "Procurement"},
            {"item": "P-105", "change": "No downstream changes detected", "impact": "None", "priority": "Low", "owner": "Operations"},
        ],
    },
]

entries: list[dict[str, Any]] = [dict(item) for item in SEED_ENTRIES]


def reset() -> None:
    entries[:] = [dict(item) for item in SEED_ENTRIES]


def _panels(text: str) -> list[str]:
    found: list[str] = []
    for match in _PANEL.finditer(text):
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else start
        if 0 <= end - start <= 12:
            found.extend(f"P-{number}" for number in range(start, end + 1))
        else:
            found.append(f"P-{start}")
    return list(dict.fromkeys(found))


def apply_email(project: dict[str, Any], record: dict[str, Any]) -> dict[str, Any] | None:
    event_type = record["parsed"]["event_type"]
    if event_type not in TRACKED_EVENTS:
        return None
    text = f"{record['subject']}\n{record['body']}"
    panels = _panels(text)
    references = list(dict.fromkeys(" ".join(match.group(1).replace("#", " ").split()) for match in _REFERENCE.finditer(text)))
    locations = list(dict.fromkeys(" ".join(match.group(1).split()).title() for match in _LOCATION.finditer(text)))
    locations = [place for place in locations if not any(other != place and other.startswith(place) for other in locations)]
    if not (panels or references or locations):
        return None

    revision = _REVISION.search(text)
    reference = ", ".join(references[:3]) or (
        locations[0] if locations else "Panels " + panels[0] + (f" to {panels[-1]}" if len(panels) > 1 else "")
    )
    if revision and references:
        reference += f" Rev {revision.group(1)}"

    change, impact = TRACKED_EVENTS[event_type]
    days = record["exposure"]["delayDays"] or 0
    amount = record["exposure"]["amountUsd"] or 0
    if event_type in {"drawing_revision", "manufacturing_issue"} or (event_type == "supplier_delay" and days >= 2) or (
        event_type == "budget_risk" and amount >= 10000
    ):
        priority = "High"
    elif event_type == "rfi_response":
        priority = "Low"
    else:
        priority = "Medium"

    items = (panels[:6] or locations[:4] or [references[0]])
    rows = [
        {"item": item, "change": change, "impact": impact, "priority": priority, "owner": record["parsed"]["owner"]}
        for item in items
    ]
    entry = {
        "id": str(uuid4()),
        "projectId": project["projectId"],
        "source": "email",
        "sourceLabel": f"Email from {record['senderName']}",
        "reference": reference,
        "summary": record["parsed"]["summary"],
        "detectedAt": record["receivedAt"],
        "emailId": record["id"],
        "alertId": None,
        "draftId": None,
        "rows": rows,
    }
    entries.insert(0, entry)
    del entries[40:]
    return entry


def link(email_id: str, alert_id: str | None, draft_id: str | None) -> None:
    for entry in entries:
        if entry["emailId"] == email_id:
            entry["alertId"] = alert_id
            entry["draftId"] = draft_id


def _units(count: int) -> str:
    return f"{count} unit{'s' if count != 1 else ''}"


def _shop_entry(project_id: int, rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    items: list[dict[str, Any]] = []
    for row in rows:
        built = f"{row['panelType']} ({row['completedUnits']} of {row['plannedUnits']} built)"
        qa_increase = max(row.get("qaHoldIncrease", 0), 0)
        if row["qaHoldUnits"]:
            change = (
                f"QA holds increased by {qa_increase}; {row['qaHoldUnits']} currently on hold"
                if qa_increase else f"{_units(row['qaHoldUnits'])} on QA hold"
            )
            items.append({
                "item": built, "change": change, "impact": "Manufacturing",
                "priority": "High" if max(qa_increase, row["qaHoldUnits"]) >= 5 else "Medium", "owner": "Manufacturing",
            })
        if row["materialShortageUnits"]:
            items.append({
                "item": built, "change": f"{_units(row['materialShortageUnits'])} short on material", "impact": "Procurement",
                "priority": "High" if row["materialShortageUnits"] >= 5 else "Medium", "owner": "Procurement",
            })
        if row["actualDispatch"] and row["actualDispatch"] > row["plannedDispatch"]:
            late = (date.fromisoformat(row["actualDispatch"]) - date.fromisoformat(row["plannedDispatch"])).days
            items.append({
                "item": built, "change": f"Shipped {late} day{'s' if late != 1 else ''} late", "impact": "Dispatch",
                "priority": "Low", "owner": "Operations",
            })
    if not items:
        return None
    return {
        "id": f"shop-{project_id}",
        "projectId": project_id,
        "source": "spreadsheet",
        "sourceLabel": "Shop schedule spreadsheet",
        "reference": "Shop schedule exceptions",
        "summary": "Calculated from the watched production schedule.",
        "detectedAt": None,
        "emailId": None,
        "alertId": None,
        "draftId": None,
        "rows": items,
    }


def view(orders_by_project: dict[int, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    shop = [entry for project_id, rows in orders_by_project.items() if (entry := _shop_entry(project_id, rows))]
    from_email = [entry for entry in entries if entry["source"] == "email"]
    sample = [entry for entry in entries if entry["source"] == "sample"]
    return from_email + shop + sample
