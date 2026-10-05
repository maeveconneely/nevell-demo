"""A labeled set of synthetic project emails used to measure the parsing pipeline."""

from __future__ import annotations

from typing import Any, Awaitable, Callable

# "demo" cases are the sample emails the rules were written around; "held-out" cases were written afterwards.
CASES: list[dict[str, Any]] = [
    {"id": "demo-1", "set": "demo", "subject": "RE: Miller panels delivery - need to flag this",
     "body": "The exterior board for Miller Children's is not going to make the Wed truck. That is a 2 day slip and standby crew cost is running about $2,400 a day.",
     "expect": {"project": 4821, "event": "supplier_delay", "amount": 2400, "days": 2}},
    {"id": "demo-2", "set": "demo", "subject": "Miller Children's | RFI 217 response",
     "body": "RFI #217: use detail 6/A-503, Rev 18, for the east clinic return. Please confirm the affected panels are coordinated before release to fabrication.",
     "expect": {"project": 4821, "event": "rfi_response", "amount": None, "days": None}},
    {"id": "demo-3", "set": "demo", "subject": "North Harbor - sheathing allocation / revised ship date",
     "body": "One truck of 5/8 sheathing got shorted at the mill. We can ship the balance Thursday instead of Tuesday.",
     "expect": {"project": 4829, "event": "supplier_delay", "amount": None, "days": None}},
    {"id": "demo-4", "set": "demo", "subject": "North Harbor access plan for level 2",
     "body": "We lost the Tuesday night access window because electrical needs the corridor. This is a 2 day hit to the current wall close-in sequence.",
     "expect": {"project": 4829, "event": "schedule_risk", "amount": None, "days": 2}},
    {"id": "demo-5", "set": "demo", "subject": "Civic Center Addendum 4 - pricing impact due Monday",
     "body": "Addendum 4 adds approximately 1,800 SF of shaft liner. This is not in our current scope sheet. Our rough carry is about $38,500; we need your number by Monday 2pm.",
     "expect": {"project": 4855, "event": "budget_risk", "amount": 38500, "days": None}},
    {"id": "demo-6", "set": "demo", "subject": "Civic Center - SK-32 replaces A-611 at stair 3",
     "body": "Please use attached SK-32 in place of the current A-611 detail at Stair 3. Existing wall panels at grid C/7 will need to be checked before shop release.",
     "expect": {"project": 4855, "event": "drawing_revision", "amount": None, "days": None}},
    {"id": "demo-7", "set": "demo", "subject": "Riverside lot 6 - 2 frames out of square",
     "body": "Caught two frames on lot 6 that are out about 3/8 at the top. dont load these yet. Need QC to look before they get wrapped.",
     "expect": {"project": 4872, "event": "manufacturing_issue", "amount": None, "days": None}},
    {"id": "demo-8", "set": "demo", "subject": "Riverside delivery slot confirmed for tomorrow",
     "body": "Dock 3 is clear for your wall panels at 7:00 AM tomorrow. Please send the final load list before 3 today.",
     "expect": {"project": 4872, "event": "delivery_confirmed", "amount": None, "days": None}},
    {"id": "demo-9", "set": "demo", "subject": "FW: re: that thing from this morning",
     "body": "Forwarding this along, not sure who needs it. Customer called again about the thing we discussed.",
     "expect": {"project": None, "event": "general", "amount": None, "days": None}},
    {"id": "held-1", "set": "held-out", "subject": "Lot 4 shipping",
     "body": "Riverside lot 4 panels shipped as planned. Truck arrives 6am Thursday. Please confirm the unloading crew.",
     "expect": {"project": 4872, "event": "delivery_confirmed", "amount": None, "days": None}},
    {"id": "held-2", "set": "held-out", "subject": "Slab pour",
     "body": "Our rebar sub is running behind again at Miller Children's. Probably a 3 day delay to the slab pour. Not sure on cost yet.",
     "expect": {"project": 4821, "event": "schedule_risk", "amount": None, "days": 3}},
    {"id": "held-3", "set": "held-out", "subject": "Hold fabrication at grid C",
     "body": "Per the revised A-611 detail please hold fabrication on the Civic Center panels at grid C. Revision to follow.",
     "expect": {"project": 4855, "event": "drawing_revision", "amount": None, "days": None}},
    {"id": "held-4", "set": "held-out", "subject": "Damaged panels",
     "body": "Two panels for Riverside were damaged in transit, cracked corners. Photos attached. Replacement needed by Friday.",
     "expect": {"project": 4872, "event": "manufacturing_issue", "amount": None, "days": None}},
    {"id": "held-5", "set": "held-out", "subject": "RFI 221",
     "body": "Can you confirm the RFI 221 response is in the portal for Miller Children's? Inspector walks Tuesday.",
     "expect": {"project": 4821, "event": "rfi_response", "amount": None, "days": None}},
    {"id": "held-6", "set": "held-out", "subject": "Level 3 start",
     "body": "Heads up, the GC is pushing the start of level 3 at North Harbor by a week. Wall framing crew should plan accordingly.",
     "expect": {"project": 4829, "event": "schedule_risk", "amount": None, "days": 7}},
    {"id": "held-7", "set": "held-out", "subject": "Lobby ceiling pricing",
     "body": "Pricing for the added fire-rated ceiling at the Civic Center lobby came back at $12.5k from our supplier.",
     "expect": {"project": 4855, "event": "budget_risk", "amount": 12500, "days": None}},
    {"id": "held-8", "set": "held-out", "subject": "Thanks",
     "body": "Thanks for the update on Riverside, no issues on our end.",
     "expect": {"project": 4872, "event": "general", "amount": None, "days": None}},
    {"id": "held-9", "set": "held-out", "subject": "Safety stand-down",
     "body": "Reminder: safety stand-down Friday 7am, all trades.",
     "expect": {"project": None, "event": "general", "amount": None, "days": None}},
    {"id": "held-10", "set": "held-out", "subject": "Two jobs",
     "body": "Comparing Civic Center and Miller Children's schedules; the delay on Civic is 4 days.",
     "expect": {"project": None, "event": "schedule_risk", "amount": None, "days": 4}},
    {"id": "held-11", "set": "held-out", "subject": "Backorder cleared",
     "body": "North Harbor sheathing backorder cleared, material arrives tomorrow, no further delay.",
     "expect": {"project": 4829, "event": "delivery_confirmed", "amount": None, "days": None}},
    {"id": "held-12", "set": "held-out", "subject": "Standby cost",
     "body": "Standby crew at Miller Children's is costing $1,800 per day, 3 days so far on the board delay.",
     "expect": {"project": 4821, "event": "supplier_delay", "amount": 1800, "days": 3}},
    {"id": "held-13", "set": "held-out", "subject": "Extra track",
     "body": "Need pricing for the extra 400 LF of track at Riverside, rough budget is $6,200, due Wednesday.",
     "expect": {"project": 4872, "event": "budget_risk", "amount": 6200, "days": None}},
]

FIELDS = ("project", "event", "amount", "days")
Processor = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


async def run(process: Processor) -> dict[str, Any]:
    """`process` returns the pipeline's result for one case: project, event, amount, days, held."""
    results = []
    for case in CASES:
        got = await process(case)
        wrong = [field for field in FIELDS if got[field] != case["expect"][field]]
        results.append(
            {
                "id": case["id"],
                "set": case["set"],
                "subject": case["subject"],
                "expect": case["expect"],
                "got": {field: got[field] for field in FIELDS},
                "wrong": wrong,
                "held": got["held"],
            }
        )

    def summarize(items: list[dict[str, Any]]) -> dict[str, Any]:
        total = len(items)
        failed = [item for item in items if item["wrong"]]
        return {
            "cases": total,
            "allCorrect": total - len(failed),
            "silentErrors": sum(1 for item in failed if not item["held"]),
            "caughtByReview": sum(1 for item in failed if item["held"]),
            "byField": {
                field: round(sum(1 for item in items if field not in item["wrong"]) / total * 100) if total else 0
                for field in FIELDS
            },
        }

    return {
        "all": summarize(results),
        "demo": summarize([item for item in results if item["set"] == "demo"]),
        "heldOut": summarize([item for item in results if item["set"] == "held-out"]),
        "failures": [item for item in results if item["wrong"]],
    }
