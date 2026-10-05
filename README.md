# Nevell Group Project Operations Demo

A prototype of a project-operations workflow for a specialty construction contractor. It combines project email, a watched prefab schedule, role-specific dashboard views, alerts, and human-approved work products. It is intended for exploration and a first-meeting demo; it is not a production system and it is not connected to Nevell Group's live business systems.

## Who this is for and what problem it explores

**Intended users:** project managers coordinating job changes; preconstruction and estimating staff pricing addenda; prefab shop/warehouse staff managing production, quality, materials, and dispatch; and executives who need a concise view of cross-project risk and follow-up.

**Problem hypothesis:** project-critical changes can arrive through external vendor, general-contractor, and design-partner emails as well as shop spreadsheets. Someone must connect each change to the right project and service, understand its schedule/cost/production impact, route it to an owner, and make sure the next action happens. The demo explores whether a shared workflow can reduce manual handoffs and time-to-awareness while keeping uncertain interpretation and consequential decisions under human review.

This is a hypothesis inferred from public company information, not a finding from Nevell employee interviews. The sample roles, work packages, thresholds, and data are illustrative; the first business-validation step is to ask Nevell users which handoff is actually costly and how they would measure improvement.

## Contents

- [What the demo does](#what-the-demo-does)
- [Business hypothesis and value](#business-hypothesis-and-value)
- [Quick start](#quick-start)
- [Demo walkthrough](#demo-walkthrough)
- [Views and demo accounts](#views-and-demo-accounts)
- [Email processing](#email-processing)
- [Approvals and generated work](#approvals-and-generated-work)
- [Alerts and notifications](#alerts-and-notifications)
- [Internal operations and spreadsheet data](#internal-operations-and-spreadsheet-data)
- [Operational Impact and parser evaluation](#operational-impact-and-parser-evaluation)
- [Architecture and API](#architecture-and-api)
- [Configuration](#configuration)
- [Reset and state](#reset-and-state)
- [Known limitations and production checklist](#known-limitations-and-production-checklist)

## What the demo does

The prototype is designed around one operational idea: information in project emails and shop spreadsheets can be extracted, checked, routed to the right person, and turned into an actionable draft without pretending that uncertain data is trustworthy.

| Capability | Current demo behavior | Data status |
| --- | --- | --- |
| Project overview | All-project alerts plus a selected-project detail view | Four illustrative projects; project data is simulated |
| Service lines | Filters the portfolio by nine Nevell service lines | Service list is based on Nevell's public site; project assignments are simulated |
| Change intelligence | Per-project list of drawing, RFI, addendum, delivery, and shop changes | Built from parsed emails and the watched spreadsheet; one sample revision is seeded |
| Internal operations | Overview, production, quality, materials, and dispatch views | Reads local CSV/XLSX files; included schedule is sample data |
| Email lab | Server parses editable sample messages and updates demo project signals | Local demo inbox; no external email is sent or received |
| Alerts | Tracks source, severity, owner, resolution, and audit history | In-app alerts work; external channels are optional |
| Drafted work | Builds pricing replies and field schedule notices for human approval | Rule-based drafts; cost rates are placeholders; sending is simulated |
| Role views | Four switchable profiles with server-side payload scoping | Passwordless demo accounts, not production identity |
| Operational Impact | Groups automation, human-effort, and business-impact signals | Session activity is measured; exposure is illustrative, not realized savings |

The Nevell service list is based on [nevellgroup.com](https://www.nevellgroup.com/). Descriptions, project facts, names, emails, prices, dates, and the included operating schedule are demo content unless explicitly identified as a local live-file input.

## Business hypothesis and value

### Problem hypothesis

The demo tests this hypothesis, rather than claiming it is already validated: project-critical changes arrive across email and shop spreadsheets, and people must manually identify the affected project, service, owner, cost/schedule implications, and next action. The resulting handoffs can be slow or inconsistent, while project leaders have limited visibility into what changed and whether someone acted on it.

The user problem is not "people need a dashboard" or "people need AI." It is: **when a relevant change arrives, can the right person understand it, verify the impact, and take the next action sooner without losing control?** This is aligned with Sea12's public positioning around connecting enterprise data and automating departmental workflows, but the hypothesis still needs to be confirmed with Nevell and its users.

### Users and decisions represented

| User | Information need | Decision/action in the demo |
| --- | --- | --- |
| Project manager | Project-specific schedule/design changes, affected scope, and requested follow-up | Review or reject a field schedule notice; manage assigned project alerts |
| Estimator / preconstruction manager | Addenda, scope changes, quantities, due dates, and cost basis | Complete missing pricing inputs and approve a simulated pricing reply |
| Prefab shop / warehouse manager | Production attainment, QA holds, shortages, and dispatch dates | Identify shop exceptions and see spreadsheet changes reflected in work-package status |
| Executive | Cross-project exceptions, ownership, and workflow evidence | See which changes are open, where they came from, and whether drafts were reviewed |

These are prototype personas inferred from public company information, not a verified Nevell org chart or a record of user interviews. The dashboard groups access by role so that each person sees a useful slice, but the real authority matrix, handoff paths, and terminology need discovery.

### How value would be measured

The prototype separates measured activity from assumed savings. Its session counters and synthetic evaluation demonstrate instrumentation, not realized business value. For a pilot, agree on a baseline and success criteria with the process owner before connecting real work:

| Measure | Baseline / comparison | Why it matters |
| --- | --- | --- |
| Time from receiving a change to a correct owner and project | Current manual handoff vs. pilot workflow | Tests whether routing removes delay without sending work to the wrong team |
| Time from receiving an addendum to a reviewable estimate draft | Current estimate process vs. human-reviewed draft workflow | Tests whether preconstruction work is accelerated while maintaining pricing control |
| Extraction/routing precision and recall by field | Labeled, representative emails; report project, event, service line, figures, and date separately | Prevents a high overall score from hiding costly errors in one field |
| Silent error rate and human correction rate | Wrong changes applied without review; edits/rejections per draft | Tests whether automation is trustworthy and where humans must stay in the loop |
| Time-to-detection for shop exceptions | Spreadsheet change to an owner-visible alert | Measures whether spreadsheet signals reach people sooner |
| Operational outcome | Rework avoided, dispatches protected, exposure confirmed, or estimating turnaround | Connects activity to business impact; do not count quoted exposure as savings without validation |

Before a pilot, ask the process owner which one of these outcomes is most valuable and what evidence they already trust. Do not infer labor savings from parser milliseconds, assume every email is actionable, or treat a cited dollar amount as money saved.

### Discovery before productizing

The next business step is not to add more tabs. Interview one project manager, one estimator, and one shop/warehouse lead; map one real change from source to decision and closeout; then test the data and authority assumptions. Useful questions:

- Which change did the team find out about too late most recently, and what did that delay cost or disrupt?
- Where did it first appear (email, drawing revision, schedule export, call), who acted, and what system became the source of truth?
- What makes an item urgent, who owns it, who can reassign or close it, and what evidence proves it is resolved?
- For pricing, which quantity takeoff, labor productivity, material rates, markups, exclusions, and approvals are required before a number can leave the company?
- What information must never be sent to an external AI or notification provider?
- Which single workflow should a two-week pilot improve, and what baseline would convince the team it helped?

The prototype currently answers these questions with demo choices so the workflow can be discussed. They must not be presented as established Nevell policy.

## Quick start

### Requirements

- Python 3.11 or newer is recommended; the project has been exercised with Python 3.11.
- Node.js and npm compatible with the installed Vite version.
- Windows, macOS, or Linux. Commands below use PowerShell first, followed by shell equivalents where useful.

### Install backend dependencies

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

If PowerShell blocks activation, invoke the environment's interpreter directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

On macOS/Linux, activate with `source .venv/bin/activate`.

### Install frontend dependencies

```powershell
cd frontend
npm install
cd ..
```

### Run the backend

From the repository root, start FastAPI on port 8002:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002
```

On macOS/Linux, from `backend/`, use `../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8002`.

Do not use `--reload` for the meeting demo. The server runs a spreadsheet watcher and a long-lived server-sent-events stream; process restarts can interrupt open streams and in-memory demo state is lost on restart.

### Run the frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5175
```

Open:

- Dashboard: `http://127.0.0.1:5175/`
- Email lab: `http://127.0.0.1:5175/admin/email-lab`
- Backend health: `http://127.0.0.1:8002/api/health`

Vite proxies `/api` and `/admin` to the backend on port 8002. The email lab is served by FastAPI and remains a separate demo harness.

### Build and lint

```powershell
cd frontend
npm run build
npm run lint
```

The build runs TypeScript project checks before producing the Vite bundle in `frontend/dist/`. There is not yet a maintained automated test suite; current behavior has been validated using focused backend and browser checks. Add repeatable tests before treating this as production software.

## Demo walkthrough

### Show the whole workflow

1. Open the dashboard and choose **Taylor Brooks, Executive Leadership**. Taylor has the full-access view.
2. Open the email lab in a second tab. Deliver **Civic Center Addendum 4 - pricing impact due Monday**.
3. Return to the dashboard. The email creates a Preconstruction change-intelligence entry, a pricing draft, and a linked alert.
4. Open **Approvals**. Show the extracted scope, due date, the cited $38,500 figure, and the placeholder shaft-liner rate. The stair-wall line is unpriced, so approval is blocked.
5. Enter a labor and material rate for the stair-wall line. Review the total and the difference from the email's cited figure. Approve it. The message is placed in the simulated outbox, the linked alert is resolved, and the reviewer is recorded in the history.
6. Deliver **RE: Miller panels delivery - need to flag this**. Show the $2,400/day amount, two-day slip, computed $4,800 exposure, Prefab Exterior Panels change entry, field notice draft, alert, and dashboard update.
7. Switch to **Sofia Alvarez, Project Manager**. She sees only Miller Children's and North Harbor, including drafts she is allowed to review for those projects.
8. Switch to **Marcus Reyes, Prefab Shop & Warehouse Manager**. He lands directly in Internal Operations and sees facility operations and Manufacturing/Procurement alerts.
9. Switch back to Taylor, open **Operational Impact**, and run the parser evaluation. Explain that its held-out result is intentionally visible, including errors and mistakes caught by review.

For an even shorter meeting, use steps 1-6 and leave role switching and evaluation as optional deeper dives.

### Demonstrate a held email

Choose the vague forwarded email in the lab. It cannot be confidently routed, so it is held for human review rather than changing a project's score. Taylor can review it in the email lab and select a project, or dismiss it. This is separate from the generated-work approvals queue: email review decides whether to apply an uncertain event; draft approval decides whether a prepared reply is ready to send.

### Demonstrate a spreadsheet update

With the backend running, edit `backend/data/live/production_schedule.csv` in a text editor or spreadsheet application. Increase `qa_hold_units` or `material_shortage_units` for a project by at least one unit, save, and wait for the two-second watcher interval. The operations view and project manufacturing score update over SSE. An alert is generated for an increase; five or more newly affected units produce a High alert. Restore the original file after the demo if you want the sample starting state back.

## Views and demo accounts

The account selector in the dashboard header changes the signed-in demo profile. The backend filters dashboard payloads, drafts, and alert actions according to the selected role; hiding a tab alone is not the access-control mechanism.

The Service lines view includes Preconstruction, Metal Stud Framing, Lath & Plaster, Gypsum Wallboard, EIFS, Acoustical & Specialty Ceilings, Prefab Exterior Panels, Fireproofing, and Rain Screen Systems. Each tab lists one work package per project: scope, quantity, percent complete, status, next milestone, and the latest tagged email.

The scope text, quantities, percentages, and milestones are sample data defined in `backend/service_work.py`. Prefab Exterior Panels rows are calculated from the live shop schedule instead (units built, QA holds, shortages, next dispatch). When an email from outside Nevell is parsed it is tagged to the most likely service line by weighted keyword matching (the lab shows the tag and the words matched). If the email is applied to a project, it is added to that package's update list and can change its status: a supplier delay marks it Delayed, a schedule risk marks it Schedule at risk, a pricing request marks it Pricing requested, a drawing revision marks it Revision pending, a quality issue marks it Quality hold, and a confirmed delivery marks it Delivery confirmed. Emails from the internal domain are not tagged, general emails only appear in the lab, and a package is created if an email names a service the project did not have. The tagging is rule-based and will sometimes pick the wrong line; review it before relying on it.

| Demo profile | Views | Scope and permissions |
| --- | --- | --- |
| Taylor Brooks, Executive Leadership | Portfolio, Approvals, Service lines, Internal operations, Operational Impact | All projects and alerts; email review queue; notification settings; can review Estimating drafts, but not Project Management delay notices |
| Sofia Alvarez, Project Manager | Portfolio, Approvals, Service lines | Miller Children's and North Harbor only; sole demo approver for Project Management delay notices on those projects |
| Marcus Reyes, Prefab Shop & Warehouse Manager | Internal operations | Facility-wide shop data; alerts owned by Manufacturing or Procurement; no portfolio, Operational Impact, or draft approvals |
| Elena Park, Preconstruction & Estimating Manager | Portfolio, Approvals, Service lines | All projects; Estimating and BIM alerts; can review Estimating drafts |

These are illustrative personas, not verified Nevell employees or an official organization chart. Accounts are defined in `backend/accounts.py`.

Demo login has no passwords. Sign-in issues an HttpOnly, SameSite=Lax cookie with an eight-hour lifetime; sessions themselves live in process memory. Sign-out removes the session. It is not a substitute for SSO, identity lifecycle, MFA, durable sessions, or production authorization. The email lab and demo reset endpoint are intentionally outside the dashboard sign-in flow so they can act as meeting controls; do not expose these routes on a public deployment.

## Email processing

The email lab models **inbound project correspondence from outside Nevell**: vendors, general contractors, architects/design partners, and third-party inspectors. Sample senders use fictional external `.example` domains. Internal-origin messages are still supported when manually composed and are explicitly labeled rather than presented as vendor correspondence. All names, addresses, projects, and message content are fictional. Delivery is local simulation only: it neither receives nor sends real email. The request is processed by FastAPI; the dashboard receives a refreshed payload through server-sent events.

### Routing and parsing

- Routing searches the subject and body for a project ID or known project alias. An unknown or ambiguous project is held.
- The default parser is a deterministic keyword parser. It classifies one of the event types defined in `backend/main.py`, extracts a short summary, owner and due text, and assigns a confidence value.
- If no `NEVELL_LLM_API_KEY` is set, the UI identifies the parser as a demo keyword parser. If configured, FastAPI calls an OpenAI-compatible chat-completions endpoint for event extraction and falls back to the keyword parser if the provider fails.
- Email text is untrusted input. The configured model prompt asks the model not to follow instructions inside the email and not to invent facts. Treat this as a prototype safeguard, not a complete prompt-injection/security boundary.
- Project score mutations use backend-owned event rules; a model does not directly choose arbitrary values to write into project records.
- Routing ambiguity or parse confidence below 60% holds the message. The review queue allows an authorized reviewer to choose a project and apply it, or dismiss it.
- Dollar amounts and day counts used for exposure and measured-value calculations are extracted with regular expressions. They are not guaranteed to capture every wording or context correctly.

Email deliveries update the in-memory demo project, attention and value data. The simulated inbox does not receive real external mail, and the lab's **Deliver to demo inbox** button does not send email.

### Enable model-backed extraction (optional)

Set these environment variables before starting FastAPI:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEVELL_LLM_API_KEY` | Enables model-backed email extraction | Unset; keyword parser is used |
| `NEVELL_LLM_MODEL` | Model name sent to the configured endpoint | `gpt-4o-mini` |
| `NEVELL_LLM_BASE_URL` | OpenAI-compatible API base URL | `https://api.openai.com/v1` |

PowerShell example (the key is entered into the current shell and is not written to the repository):

```powershell
$env:NEVELL_LLM_API_KEY = 'YOUR_KEY'
$env:NEVELL_LLM_MODEL = 'gpt-4o-mini'
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002
```

When enabled, email content submitted in the lab and synthetic evaluation messages are sent to that provider. Check provider privacy, retention, data-processing, and cost terms before using non-synthetic data. Never commit API keys.

## Approvals and generated work

`backend/workflows.py` creates two draft types from applied email events:

| Trigger | Draft | Reviewer |
| --- | --- | --- |
| `budget_risk` | Pricing reply with detected quantities, labor/material rates where available, cited amount, and a draft email | Estimating |
| `supplier_delay` or `schedule_risk` | Schedule notice to the field with detected days, new date, affected panels, and calculated standby exposure when the email gives a daily cost | Project Management |

Drafts are generated with local rules and patterns, not a generative model. The reviewer can edit quantities, unit rates, and the email text. Approval is blocked when any pricing line is incomplete. Approved messages go to an in-memory **simulated outbox**; nothing is sent externally. Approval records the reviewer, review duration, whether edits were made, and a history entry. Approving a linked draft resolves its alert. Rejecting records the decision and leaves the work for manual handling. Project Management delay notices are scoped to Sofia's PM role; Taylor's executive visibility does not grant permission to approve them. A draft is single-use: after approval or rejection it is no longer pending and a repeat approval request is rejected.

### Pricing assumptions

`PLACEHOLDER_RATES` in `backend/workflows.py` contains demonstration rates for shaft liner, drywall, sheathing, track, and ceiling. These are invented placeholder values, not Nevell pricing. Any line the parser does not match to a rate is marked **needs input**, and a person must price it before approval. Replace the table with an approved cost database and real pricing rules before using this for estimating.

The displayed difference between a draft total and a dollar figure in an email is a comparison for review, not an approved price or margin calculation. The draft does not account for taxes, markups, labor productivity, waste, exclusions, contract terms, or customer-specific pricing.

## Change intelligence

The Change intelligence panel in a project's detail view lists what has changed on that project and who it affects. Every row is tagged with its source:

- **Email:** when an email is applied to a project (`backend/change_intel.py`), the server looks in its text for panel numbers and ranges (for example P-104 thru 108), drawing and sketch references (A-503, SK-32), revisions, addenda, RFIs, purchase orders, and locations such as a grid line, stair, or level. A drawing revision, RFI response, pricing request, supplier delay, quality issue, or schedule change that mentions any of these creates a change with one row per panel or location. Its impact, owner, and priority come from the event type and the figures cited, and the change links to the alert and draft created for the same email.
- **Spreadsheet:** QA holds, material shortages, and late shipments are calculated from the watched production schedule on every request, so editing the CSV or XLSX changes these rows within a couple of seconds. A larger hold or shortage is marked High.
- **Sample:** a single seeded revision (A-503 Rev 18 on Miller Children's) is labeled as sample data.

Emails that give no panel, reference, or location produce no row, so a vague email will not appear here. The extraction uses regular expressions and can miss unusual formats. Reset demo data clears email-created changes; spreadsheet rows follow the file.

## Alerts and notifications

Alerts are shown in the Portfolio page's single all-projects alert box; shop-only users see the alert subset relevant to their role. Each alert contains a project, source, owner, severity, status, and audit history. Users with access can reassign, resolve, inspect history, and jump to a linked project or draft.

### Demo severity rules

- A risk-classified email event is High if it cites at least $10,000, cites at least two days of delay, leaves the project health score below 70, or drops that score by at least six points. Otherwise it is Medium. General, RFI, delivery-confirmed, and procurement-update events do not create email risk alerts under the current policy.
- A watched spreadsheet change creates an alert when QA-hold or material-shortage units increase for a project. Five or more newly affected units combined is High; a smaller increase is Medium.
- Medium notifications are logged as in-app only. High notifications are sent to every configured channel.
- High notifications are sent once to every configured channel. Seeded initial alerts do not send external notifications. Alerts stay open until someone resolves them; there is no acknowledgment workflow or automatic escalation.

These are demo thresholds chosen in code, not Nevell-approved risk policy.

### Notification channels

In-app alerts are always on. High alerts can also use:

| Channel | Configuration | Notes |
| --- | --- | --- |
| Phone push | Generate a topic under Portfolio > Notifications; subscribe to it in the ntfy app | Uses ntfy. A topic is public to anyone who knows its name; use synthetic data only. |
| Email | `NEVELL_SMTP_HOST`, `NEVELL_ALERT_EMAIL_TO`, and optional SMTP credentials | Uses SMTP STARTTLS. No inbound mailbox integration is implemented. |
| Webhook | `NEVELL_ALERT_WEBHOOK_URL` | HTTPS only; sends a JSON body shaped as `{"text": "..."}`. |

Additional variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEVELL_NTFY_TOPIC` | Initial ntfy topic | Unset |
| `NEVELL_NTFY_SERVER` | ntfy server; only HTTPS is accepted | `https://ntfy.sh` |
| `NEVELL_SMTP_PORT` | SMTP port | `587` |
| `NEVELL_SMTP_USER` | Optional SMTP login user | Unset |
| `NEVELL_SMTP_PASSWORD` | Optional SMTP login password | Unset |
| `NEVELL_SMTP_FROM` | Sender address | SMTP user or demo address |
| `NEVELL_ALERT_WEBHOOK_URL` | HTTPS webhook endpoint | Unset |

Use environment variables or a secrets manager; do not put secrets in source control. Notification delivery is asynchronous and recorded as **delivered**, **failed**, or **skipped** in the notification log. A delivered status means the service accepted the request, not that a person read it. The notification configuration and audit log are process-local demo state.

## Internal operations and spreadsheet data

The **Internal operations** area contains Overview, Production, Quality, Materials, and Dispatch views. FastAPI watches `backend/data/live/` every two seconds. Supported source files are CSV and XLSX. All recognized files in the folder are combined, so keep only files with compatible headers and rows for the same facility.

The included `backend/data/live/production_schedule.csv` is simulated starter data. A valid source must contain these required headers (the first worksheet is used for XLSX):

```text
facility,project_id,project_name,panel_type,planned_units,completed_units,qa_hold_units,planned_labor_hours,actual_labor_hours,planned_dispatch,actual_dispatch,material_shortage_units
```

An optional raw-data column, `previous_qa_hold_units`, records the last known QA-hold count so the application can calculate the change since that snapshot. If omitted, the parser treats the current count as the baseline (no increase). The starter file includes it for the QA-change demo. Do not add calculated fields such as severity, completion rate, labor variance, dispatch delay, health score, or affected units to the spreadsheet; those are derived by the backend from the raw inputs.

Data rules:

- Dates must use `YYYY-MM-DD`. Leave `actual_dispatch` blank until the order ships.
- The watcher accepts at most 250 combined rows, and all rows must identify one facility.
- Counts and hours cannot be negative; completed units cannot exceed planned units; QA-hold units cannot exceed completed units.
- XLSX is read with cached cell values. Recalculate formulas in Excel before saving.
- The watcher retains the last valid schedule if a file is temporarily invalid and reports the source error in the operations view. It adopts a changed file after a valid read.
- The folder is on the machine running FastAPI. A team deployment needs an approved shared location or a secure cloud/system connector.

### Calculated operations signals

- Production attainment = completed units / planned units.
- First-pass quality = (completed units - QA-hold units) / completed units.
- Labor plan attainment = planned labor hours / actual labor hours. Per-order labor variance is also calculated as `(actual - planned) / planned`; a negative percentage is under plan.
- On-time dispatch = shipped orders dispatched on or before the planned date / shipped orders.
- At-risk dispatches include orders without an actual dispatch date and orders dispatched late.
- Project manufacturing health is a demo penalty formula: start at 100, subtract 100 times the fraction of planned units represented by QA holds plus material shortages, and subtract 10 for each late shipment; clamp the result to 0-100. The project health score uses manufacturing at 5% weight. The formula is illustrative and should be replaced with thresholds agreed by Nevell operations.
- QA increase = current QA-hold units minus `previous_qa_hold_units`, floored at zero. A QA increase or material shortage of at least five units is High severity; a smaller nonzero exception is Medium. Dispatch delay is calculated from actual minus planned dispatch dates, or from today minus the planned date for an overdue open shipment. Exception cards show affected units, derived severity, completion rate, labor variance, manufacturing health, dispatch date, and a suggested action. These severities and actions are application rules, not spreadsheet values or Nevell-approved policy.

The website names Revit, AutoCAD, Navisworks Manage, BIM 360 Design, Rhino, Dynamo, Grasshopper, Bluebeam Revu, Smartsheet, PlanGrid, OST/Quick Bid, and PanelMax/custom manufacturing tools. This prototype has a local CSV/XLSX watcher and a Revit schedule-export path only. Direct integrations with those products are not configured. A connector requires approved credentials or an export format, field mapping, error/retry policy, and data ownership agreement.

## Operational Impact and parser evaluation

The **Operational Impact** view opens with a prominent notice: **Illustrative/demo data — not realized savings**. It groups information into three sections:

- **Automation:** emails processed, non-sample email change entries plus current shop-exception groups, automatically applied project emails, and messages held for human review.
- **Human effort:** median backend parse/apply time, median elapsed time from draft creation to decision, and the share of approved drafts that reviewers edited. Draft-to-decision time is not a measure of active review effort.
- **Business impact:** potential schedule exposure computed from cited daily cost and delay, alert and draft records created, and projects with shop exceptions.

The dashboard calculates these figures from the current in-memory session and current watched spreadsheet. “Downstream actions created” counts alert and draft records; it does not mean the work was completed. Exposure is a risk estimate based on sample content, not damage incurred or loss prevented. These are not validated business outcomes.

The view also retains the parser evaluation and an editable ROI estimate. The evaluation uses synthetic messages; the calculator's starting assumptions are placeholders. The calculator does not establish savings. Session metrics reset with the in-memory demo state, except the most recent evaluation result (see [Reset and state](#reset-and-state)).

### Synthetic evaluation

`backend/evaluation.py` contains 22 labeled synthetic messages: 9 demo examples the rules were written around and 13 messages written afterward. The Executive account can run them from Operational Impact. The current evaluation compares project route, event type, dollar amount, and days. It displays exact fully-correct cases, per-field correctness, errors held for review, and errors applied silently.

On the last recorded run with the keyword parser, all 9 demo examples were fully correct and 7 of 13 held-out examples were fully correct (54%). Four incorrect cases were held; two were applied silently. These numbers are a snapshot of synthetic data, not a production accuracy guarantee or an independent benchmark. Running with a model configured can call the provider for each synthetic case and incur cost; the result is stored in memory until the backend restarts.

## Architecture and API

```text
frontend/                 React 19 + TypeScript + Vite user interface
  src/App.tsx             Dashboard, top-level navigation, role-specific view composition
  src/AlertCenter.tsx     Alert actions, notification settings, delivery log, toasts
  src/Approvals.tsx       Draft review UI and parser evaluation UI
  src/ChangeIntel.tsx     Per-project change intelligence from email and spreadsheet events
  src/ServiceLines.tsx    Service-line work packages and tagged email history
  src/Login.tsx           Passwordless demo account picker
  src/App.css             Nevell-inspired interface styles
backend/
  main.py                 FastAPI routes, demo projects, parser orchestration, SSE, sheet watcher
  accounts.py             Demo account definitions and role scoping rules
  alert_service.py        Alert lifecycle, notification delivery, and audit history
  change_intel.py         Email-derived changes and shop-schedule exception rows
  service_work.py         Service tagging, sample work packages, and shop-linked prefab progress
  workflows.py            Pricing/schedule drafts, approvals, simulated outbox and workflow metrics
  evaluation.py           Synthetic labeled email cases and evaluation summary
  email_lab.html          Standalone email composition and server parsing lab
  data/live/              Watched CSV/XLSX operations inputs
```

Important API routes (the dashboard routes require a demo session unless indicated):

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Backend health check; no sign-in required |
| `GET /api/auth/accounts` | List passwordless demo accounts |
| `POST /api/auth/login` | Select an account and issue the session cookie |
| `POST /api/auth/logout`, `GET /api/auth/me` | End or inspect the current session |
| `GET /api/dashboard` | Role-scoped dashboard payload |
| `GET /api/events` | Role-scoped server-sent event stream |
| `GET /admin/email-lab` | Serve the email lab; no sign-in required |
| `GET /api/email-lab/state` | Demo projects, sample emails, parser status and recent messages |
| `POST /api/email-lab/send` | Process a message in the local demo inbox |
| `POST /api/email-lab/review/{email_id}` | Approve a held email to a project or dismiss it |
| `POST /api/alerts/{alert_id}` | Reassign or resolve an authorized alert |
| `POST /api/drafts/{draft_id}/approve` | Approve a role-visible draft; adds it to the simulated outbox |
| `POST /api/drafts/{draft_id}/reject` | Reject a role-visible draft |
| `POST /api/evaluation/run` | Run the synthetic evaluation; Operational Impact permission required |
| `POST /api/notifications/settings`, `POST /api/notifications/test` | Configure or test notifications; Executive permission required |
| `POST /api/demo/reset` | Reset demo state; no sign-in required |
| `GET /api/ops/sample.csv` | Download a sample operations CSV |

Use the browser interface for request payloads and workflows. FastAPI's interactive documentation is available from the backend at `/docs`.

## Configuration

All optional configuration is read from environment variables when the backend starts, except notification settings changed in the dashboard. Keep credentials out of README files, source code, screenshots, and demo recordings. The settings panel can send notifications externally; test only with synthetic data and destinations you control.

The primary variables are `NEVELL_LLM_API_KEY`, `NEVELL_LLM_MODEL`, `NEVELL_LLM_BASE_URL`, `NEVELL_NTFY_TOPIC`, `NEVELL_NTFY_SERVER`, `NEVELL_SMTP_HOST`, `NEVELL_SMTP_PORT`, `NEVELL_SMTP_USER`, `NEVELL_SMTP_PASSWORD`, `NEVELL_SMTP_FROM`, `NEVELL_ALERT_EMAIL_TO`, and `NEVELL_ALERT_WEBHOOK_URL`. See [Email processing](#email-processing) and [Alerts and notifications](#alerts-and-notifications) for behavior and defaults.

## Reset and state

The backend stores projects, sessions, email history, alerts, notification logs, drafts, outbox items, and evaluation results in process memory. Restarting FastAPI clears these values and creates fresh seeded alerts. The notification topic read from environment is initialized at startup; a topic changed in the UI is also process-local.

The email lab's **Reset demo data** button calls `POST /api/demo/reset`. It resets project metrics, the seeded attention items, activity, email history, alerts, delivery log, drafts, and outbox. It does not clear the last parser-evaluation result, modify CSV/XLSX files in `backend/data/live/`, or clear the notification topic. Restart the backend or change/reset the file separately to restore spreadsheet starter data and clear the evaluation result.

## Known limitations and production checklist

This repository is a demonstration prototype. Before any real deployment or real company data, address at least the following:

- Replace the passwordless chooser with SSO, server-verified identity, durable sessions, CSRF protection, and a reviewed authorization model.
- Protect the email lab and reset route; define which users can import, edit, approve, export, or delete data.
- Use a trusted inbound mail integration with mailbox scopes, encryption, retention limits, duplicate handling, attachment scanning, and provider outage/retry policies.
- Replace all simulated project data, service assignments, operational metrics, placeholder rates, thresholds, and sample email text with approved source data and agreed business definitions.
- Connect vendor systems through supported APIs or controlled exports. Add schema/version handling, idempotency, observability, retries, reconciliation, and a documented owner for each integration.
- Persist business events, alerts, notification settings, approvals, evaluation results, and audit history in a durable database with backups and retention rules.
- Configure safe delivery controls for email/webhook/push: recipients, secrets management, allowlists, idempotency, retry limits, delivery status semantics, and operator monitoring. ntfy public topics are unsuitable for confidential data.
- Review model-provider privacy and security; evaluate prompt injection, incorrect project routing, extraction drift, and model/version changes using representative labeled data.
- Replace the demo health score and alert cutoffs with business-approved definitions, validate them against actual project outcomes, and present data freshness/source lineage.
- Add automated unit, API, authorization, workflow, and end-to-end tests, plus logging, metrics, tracing, error reporting, deployment configuration, and accessibility/mobile checks.

The project-to-service assignments, initial attention items, change intelligence, and some project indicators are static or simulated. Treat any generated price, delay exposure, health score, accuracy result, or alert severity as a demo value unless it is verified against an approved source.
