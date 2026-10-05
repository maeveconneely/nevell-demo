"""Service-line work packages per project, and tagging external project emails to a service line."""

from __future__ import annotations

import copy
from datetime import datetime
from typing import Any
from uuid import uuid4

INTERNAL_DOMAIN = "nevell-demo.example"

# Keyword -> weight. Highest total wins; a tie goes to the line listed first.
SERVICE_KEYWORDS: dict[str, dict[str, int]] = {
    "Prefab Exterior Panels": {"panel": 2, "prefab": 3, "fabrication": 1, "frames": 1, "load-bearing": 2},
    "Metal Stud Framing": {"stud": 2, "framing": 2, "track": 1, "gauge": 1, "wall close-in": 2, "sheathing": 2, "partition": 1},
    "Gypsum Wallboard": {"drywall": 2, "gypsum": 2, "wallboard": 2, "taping": 1, "shaft liner": 3, "shaft wall": 3, "type x": 1},
    "Lath & Plaster": {"plaster": 3, "lath": 3, "stucco": 2},
    "EIFS": {"eifs": 3, "finish coat": 1, "insulation board": 1},
    "Acoustical & Specialty Ceilings": {"acoustical": 3, "ceiling": 2},
    "Fireproofing": {"fireproof": 3, "intumescent": 3, "spray-applied": 2, "fire-rated": 1, "fire rated": 1},
    "Rain Screen Systems": {"rain screen": 3, "rainscreen": 3, "cladding": 2},
    "Preconstruction": {
        "addendum": 1, "pricing": 1, "price": 1, "bid": 1, "takeoff": 2, "estimate": 1,
        "gmp": 1, "scope sheet": 1, "value engineering": 2, "alternate": 1, "rfi": 1,
    },
}

# What an email event does to a package's status. Events not listed only add an update.
EVENT_STATUS = {
    "supplier_delay": "Delayed",
    "schedule_risk": "Schedule at risk",
    "budget_risk": "Pricing requested",
    "drawing_revision": "Revision pending",
    "manufacturing_issue": "Quality hold",
    "delivery_confirmed": "Delivery confirmed",
}


def _package(
    project_id: int, service: str, scope: str, quantity: str, percent: int, status: str, milestone: str, due: str
) -> dict[str, Any]:
    return {
        "id": f"{project_id}-{service}",
        "projectId": project_id,
        "service": service,
        "scope": scope,
        "quantity": quantity,
        "percentComplete": percent,
        "status": status,
        "statusSource": "seed",
        "nextMilestone": milestone,
        "due": due,
        "origin": "seed",
        "liveFromShop": False,
        "updates": [],
    }


# Illustrative sample data. Replace with approved project scope and schedule records.
SEED_PACKAGES: list[dict[str, Any]] = [
    _package(4821, "Preconstruction", "Design-assist and clash coordination for the clinic wing; GMP reconciliation", "Levels 1-2 clinic wing", 85, "In progress", "Close RFI 217 coordination with the architect", "Oct 9"),
    _package(4821, "Metal Stud Framing", "Interior partitions, 20 ga 3-5/8\" studs, with deflection track at deck", "38,000 SF", 62, "In progress", "Finish Level 2 east partitions", "Oct 16"),
    _package(4821, "Gypsum Wallboard", "Type X board with Level 4 finish at exam rooms and corridors", "54,000 SF", 18, "Starting", "Level 1 board close-in after above-ceiling inspection", "Oct 21"),
    _package(4821, "EIFS", "Sto EIFS at south and east elevations over sheathed backup", "11,500 SF", 0, "Not started", "Substrate and flashing inspection", "Nov 2"),
    _package(4821, "Prefab Exterior Panels", "", "", 0, "In production", "", ""),
    _package(4821, "Fireproofing", "Spray-applied fireproofing at Level 1 structural steel", "Level 1 steel, 84 members", 40, "In progress", "Special inspection of Level 1 deck", "Oct 14"),
    _package(4829, "Metal Stud Framing", "Tenant framing and exterior backup walls, 16 ga at storefront returns", "28,500 SF", 78, "In progress", "Level 2 west rooms framing", "Oct 8"),
    _package(4829, "Lath & Plaster", "Three-coat plaster at the entry vestibule and feature walls", "6,200 SF", 25, "In progress", "Approve plaster finish mockup", "Oct 15"),
    _package(4829, "Acoustical & Specialty Ceilings", "Acoustical tile and wood-look specialty ceilings on the sales floor", "17,800 SF", 5, "Starting", "Confirm ceiling grid elevations with MEP", "Oct 28"),
    _package(4829, "Rain Screen Systems", "Aluminum composite rainscreen at the street elevation", "3,900 SF", 10, "Awaiting material", "Receive sheathing balance and start subframing", "Oct 10"),
    _package(4829, "Prefab Exterior Panels", "", "", 0, "In production", "", ""),
    _package(4855, "Preconstruction", "Addenda review, GMP support, and shaft wall alternates", "Addenda 1-4", 70, "In progress", "Price the Addendum 4 scope change", "Oct 6"),
    _package(4855, "Metal Stud Framing", "Load-bearing and non-load-bearing framing across the classroom wings", "72,000 SF", 35, "In progress", "Complete Wing B Level 1 framing", "Oct 20"),
    _package(4855, "Gypsum Wallboard", "Gypsum board, shaft liner, and rated corridor walls", "96,000 SF", 12, "Pending design", "Release stair 3 shaft liner once SK-32 is issued", "Oct 18"),
    _package(4855, "Acoustical & Specialty Ceilings", "Classroom acoustical ceilings and gym wall baffles", "41,000 SF", 0, "Not started", "Submittals approved by the architect", "Nov 9"),
    _package(4855, "Prefab Exterior Panels", "", "", 0, "In production", "", ""),
    _package(4855, "Fireproofing", "Intumescent coating at exposed atrium steel", "Atrium steel, 120 members", 0, "Not started", "Material submittal approval", "Nov 4"),
    _package(4872, "Preconstruction", "Conceptual estimate refresh for the office core", "Office core", 100, "Complete", "Estimate accepted by the owner", "Closed"),
    _package(4872, "Metal Stud Framing", "Office core and exterior wall framing", "46,000 SF", 91, "Nearly complete", "Punch list walk with the superintendent", "Oct 11"),
    _package(4872, "Lath & Plaster", "Plaster at the lobby and conference suite", "3,400 SF", 55, "In progress", "Brown coat inspection", "Oct 13"),
    _package(4872, "Gypsum Wallboard", "Office core board and finish, Level 4 at the lobby", "38,000 SF", 80, "In progress", "Finish the lobby ceiling and soffits", "Oct 17"),
    _package(4872, "EIFS", "EIFS at the office elevation", "7,800 SF", 70, "In progress", "Finish coat at the north elevation", "Oct 12"),
    _package(4872, "Rain Screen Systems", "Metal panel rainscreen at the loading dock offices", "5,200 SF", 45, "In progress", "Install clips at the east elevation", "Oct 19"),
]

packages: list[dict[str, Any]] = copy.deepcopy(SEED_PACKAGES)


def reset() -> None:
    packages[:] = copy.deepcopy(SEED_PACKAGES)


def classify(subject: str, body: str, sender_email: str) -> dict[str, Any]:
    internal = sender_email.lower().endswith(f"@{INTERNAL_DOMAIN}")
    if internal:
        return {"internal": True, "serviceLine": None, "matches": []}
    text = f"{subject}\n{body}".lower()
    best: tuple[int, str, list[str]] | None = None
    for service, keywords in SERVICE_KEYWORDS.items():
        hits = [word for word in keywords if word in text]
        score = sum(keywords[word] for word in hits)
        if score and (best is None or score > best[0]):
            best = (score, service, hits)
    if best is None:
        return {"internal": False, "serviceLine": None, "matches": []}
    return {"internal": False, "serviceLine": best[1], "matches": best[2]}


def _find(project_id: int, service: str) -> dict[str, Any] | None:
    return next((item for item in packages if item["projectId"] == project_id and item["service"] == service), None)


def apply_email(project: dict[str, Any], record: dict[str, Any]) -> dict[str, Any] | None:
    service = record.get("serviceLine")
    event_type = record["parsed"]["event_type"]
    if not service or record.get("internal") or event_type == "general":
        return None

    package = _find(project["projectId"], service)
    if package is None:
        package = _package(
            project["projectId"], service, "Scope not yet defined; added from a project email", "To be confirmed",
            0, "In progress", "Confirm scope and schedule with the project team", "TBD",
        )
        package["origin"] = "email"
        packages.append(package)
        if service not in project["serviceLines"]:
            project["serviceLines"].append(service)

    figures = []
    amount = record["exposure"]["amountUsd"]
    days = record["exposure"]["delayDays"]
    if amount:
        figures.append(f"${amount:,.0f}")
    if days:
        figures.append(f"{days} day{'s' if days != 1 else ''}")
    package["updates"].insert(
        0,
        {
            "id": str(uuid4()),
            "at": record["receivedAt"],
            "sender": record["senderName"],
            "subject": record["subject"],
            "kind": event_type.replace("_", " "),
            "summary": record["parsed"]["summary"],
            "figures": " \u00b7 ".join(figures),
        },
    )
    del package["updates"][8:]
    status = EVENT_STATUS.get(event_type)
    if status:
        package["status"] = status
        package["statusSource"] = "email"
    return package


def _pretty_date(iso: str) -> str:
    return datetime.strptime(iso, "%Y-%m-%d").strftime("%b %d").replace(" 0", " ")


def view(orders_by_project: dict[int, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    result = []
    for package in packages:
        item = {**package, "updates": list(package["updates"])}
        rows = orders_by_project.get(package["projectId"]) if package["service"] == "Prefab Exterior Panels" else None
        if rows:
            planned = sum(row["plannedUnits"] for row in rows)
            completed = sum(row["completedUnits"] for row in rows)
            qa_holds = sum(row["qaHoldUnits"] for row in rows)
            shortages = sum(row["materialShortageUnits"] for row in rows)
            open_dates = sorted(row["plannedDispatch"] for row in rows if not row["actualDispatch"])
            item.update(
                scope=(
                    f"Shop-built {rows[0]['panelType']}"
                    if any(word in rows[0]["panelType"].lower() for word in ("panel", "shape"))
                    else f"Shop-built {rows[0]['panelType']} panels"
                ),
                quantity=f"{completed} of {planned} units built",
                percentComplete=round(completed / planned * 100) if planned else 0,
                nextMilestone=(
                    "All orders shipped" if not open_dates
                    else f"Dispatch to site, {qa_holds} on QA hold and {shortages} short on material"
                    if (qa_holds or shortages) else "Dispatch to site"
                ),
                due=_pretty_date(open_dates[0]) if open_dates else "Shipped",
                liveFromShop=True,
            )
            if package["statusSource"] != "email":
                item["status"] = (
                    "Quality hold" if qa_holds else "Material shortage" if shortages
                    else "Complete" if completed == planned else "In production"
                )
        result.append(item)
    return result
