import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AlertCenter, emptyAlertCenter } from './AlertCenter'
import type { AlertCenterData } from './AlertCenter'
import { LoginScreen, initials } from './Login'
import type { Account } from './Login'
import { ApprovalsView, WorkflowValue, emptyWorkflows } from './Approvals'
import type { EvaluationResult, WorkflowData } from './Approvals'
import { ServiceLinePage } from './ServiceLines'
import type { ServicePackage } from './ServiceLines'
import { ChangeIntelligence } from './ChangeIntel'
import type { ChangeEntry } from './ChangeIntel'

type Project = {
  projectId: number
  name: string
  priority: string
  status: string
  issue: string
  owner: string
  due: string
  schedule: number
  budget: number
  bim: number
  materials: number
  rfis: number
  manufacturing: number
  estimating: number
  healthScore?: number
  healthStatus?: string
  lastUpdate: string
  projectType: string
  location: string
  serviceLines?: string[]
  manufacturingSource?: string
}

type AttentionRow = {
  project: string
  issue: string
  owner: string
  due: string
  priority: string
}

type BidRow = {
  bid: string
  gc: string
  type: string
  due: string
  scope: string
  missing: string
  status: string
}

type ProductionOrder = {
  facility: string
  projectId: number
  projectName: string
  panelType: string
  plannedUnits: number
  completedUnits: number
  qaHoldUnits: number
  previousQaHoldUnits: number
  plannedLaborHours: number
  actualLaborHours: number
  plannedDispatch: string
  actualDispatch: string | null
  materialShortageUnits: number
  status: string
  completionRate: number
  laborVarianceHours: number
  laborVariancePct: number
  dispatchDelayDays: number | null
  manufacturingHealth: number
  qaHoldIncrease: number
  affectedUnits: number
  severity: 'High' | 'Medium' | 'Low'
  exceptions: ManufacturingException[]
}

type ManufacturingException = {
  type: 'qa_hold' | 'material_shortage' | 'dispatch_delay'
  title: string
  affectedUnits: number
  currentUnits: number
  qaHoldIncrease: number
  severity: 'High' | 'Medium' | 'Low'
  action: string
  projectId: number
  projectName: string
  panelType: string
  plannedDispatch: string
  actualDispatch: string | null
  previousQaHoldUnits: number
  plannedUnits: number
  completedUnits: number
  plannedLaborHours: number
  actualLaborHours: number
  laborVarianceHours: number
  completionRate: number
  laborVariancePct: number
  manufacturingHealth: number
}

type InternalOperations = {
  facility: string
  source: {
    name: string
    updatedAt: string
    isSample: boolean
    connected: boolean
    watchFolder: string
    pollSeconds: number
    files: { name: string; rowCount: number }[]
    lastChecked: string
    error: string | null
  }
  integrations: { name: string; status: string; detail: string; mode: string }[]
  summary: {
    activeOrders: number
    plannedUnits: number
    completedUnits: number
    productionAttainment: number
    qaHoldUnits: number
    firstPassQuality: number
    laborPlanAttainment: number
    onTimeDispatch: number
    atRiskDispatches: number
    materialShortageUnits: number
  }
  orders: ProductionOrder[]
  exceptions: ManufacturingException[]
}

type ValueMetrics = {
  draftsCreated: number
  draftsApproved: number
  draftsEdited: number
  draftsRejected: number
  medianDraftMs: number | null
  medianReviewSeconds: number | null
  emailsReceived: number
  autoApplied: number
  awaitingReview: number
  reviewedApplied: number
  changeEventsIdentified: number
  shopProjectsWithIssues: number
  downstreamActionsCreated: number
  potentialScheduleExposureUsd: number
  issuesFlagged: number
  medianProcessingMs: number | null
  exposureUsd: number
  delayDays: number
}

type ReviewItem = {
  id: string
  senderName: string
  subject: string
  holdReason: string
}

type DashboardData = {
  projects: Project[]
  attentionQueue: AttentionRow[]
  changeIntel: ChangeEntry[]
  bidQueue: BidRow[]
  activityFeed: string[]
  internalOperations: InternalOperations | null
  valueMetrics: ValueMetrics | null
  reviewQueue: ReviewItem[]
  alerts: AlertCenterData
  workflows: WorkflowData
  evaluation: EvaluationResult | null
  serviceWork: ServicePackage[]
}

const initialData: DashboardData = {
  projects: [],
  attentionQueue: [],
  changeIntel: [],
  bidQueue: [],
  activityFeed: [],
  valueMetrics: null,
  reviewQueue: [],
  alerts: emptyAlertCenter,
  workflows: emptyWorkflows,
  evaluation: null,
  serviceWork: [],
  internalOperations: null,
}

const projectServiceTabs = [
  { key: 'Preconstruction', label: 'Preconstruction', description: 'Design-build/design assist, BIM coordination, conceptual estimating, and early constructibility work.' },
  { key: 'Metal Stud Framing', label: 'Metal Stud Framing', description: 'Interior and exterior wall and ceiling framing work.' },
  { key: 'Lath & Plaster', label: 'Lath & Plaster', description: 'Lath installation and durable plaster finishes.' },
  { key: 'Gypsum Wallboard', label: 'Gypsum Wallboard', description: 'Drywall installation, taping, and finish scope.' },
  { key: 'EIFS', label: 'EIFS', description: 'Exterior insulation and finish systems, including waterproofing coordination.' },
  { key: 'Acoustical & Specialty Ceilings', label: 'Acoustical Ceilings', description: 'Acoustical walls, ceilings, and specialty ceiling systems.' },
  { key: 'Prefab Exterior Panels', label: 'Prefab Exterior Panels', description: 'Factory-built exterior panels, including Sto and load-bearing panel scope.' },
  { key: 'Fireproofing', label: 'Fireproofing', description: 'Spray-applied fireproofing, intumescent coatings, and related fire protection scope.' },
  { key: 'Rain Screen Systems', label: 'Rain Screen Systems', description: 'Exterior panel and rainscreen cladding systems.' },
] as const

type Section = Account['views'][number]

const sectionLabels: Record<Section, string> = {
  portfolio: 'Portfolio',
  approvals: 'Approvals',
  services: 'Service lines',
  operations: 'Internal operations',
  value: 'Operational Impact',
}

function App() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [demoAccounts, setDemoAccounts] = useState<Account[]>([])
  const [loginError, setLoginError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData>(initialData)
  const [selectedProjectId, setSelectedProjectId] = useState<number>(4821)
  const [activeSection, setActiveSection] = useState<Section>('portfolio')
  const [activeProjectService, setActiveProjectService] = useState<string>(projectServiceTabs[0].key)
  const accountId = account?.id

  useEffect(() => {
    const loadSession = async () => {
      try {
        const [me, list] = await Promise.all([fetch('/api/auth/me'), fetch('/api/auth/accounts')])
        if (list.ok) setDemoAccounts(((await list.json()) as { accounts: Account[] }).accounts)
        setAccount(me.ok ? ((await me.json()) as Account) : null)
      } catch {
        setLoginError('Cannot reach the server. Is the backend running?')
        setAccount(null)
      }
    }
    void loadSession()
  }, [])

  useEffect(() => {
    if (!accountId) return
    let closed = false
    const events = new EventSource('/api/events')
    events.onmessage = (event) => {
      setDashboard(JSON.parse(event.data) as DashboardData)
    }
    events.onerror = () => {
      void fetch('/api/auth/me').then((response) => {
        if (response.status === 401 && !closed) setAccount(null)
      })
    }
    return () => {
      closed = true
      events.close()
    }
  }, [accountId])

  const signIn = async (nextAccountId: string) => {
    setLoginError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: nextAccountId }),
      })
      if (!response.ok) throw new Error(`Sign-in failed (${response.status})`)
      const next = (await response.json()) as Account
      setDashboard(initialData)
      setActiveSection(next.landing)
      setAccount(next)
    } catch {
      setLoginError('Could not sign in. Check that the backend is running.')
    }
  }

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setDashboard(initialData)
    setAccount(null)
  }

  const section: Section =
    account && account.views.includes(activeSection) ? activeSection : account?.landing ?? 'portfolio'

  const selectedProject =
    dashboard.projects.find((project) => project.projectId === selectedProjectId) ??
    dashboard.projects[0]

  const projectHealth: [string, number, string?][] = selectedProject
    ? [
        ['Schedule', selectedProject.schedule],
        ['Budget', selectedProject.budget],
        ['BIM', selectedProject.bim],
        ['Materials', selectedProject.materials],
        ['RFIs', selectedProject.rfis],
        [
          'Manufacturing',
          selectedProject.manufacturing,
          selectedProject.manufacturingSource ? 'Live from shop schedule' : undefined,
        ],
        ['Estimating', selectedProject.estimating],
      ]
    : []

  const openProject = (projectId: number) => {
    setSelectedProjectId(projectId)
    document.getElementById('project-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (account === undefined) {
    return <div className="login-shell"><p>Loading…</p></div>
  }
  if (account === null) {
    return <LoginScreen accounts={demoAccounts} error={loginError} onSignIn={(id) => void signIn(id)} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Nevell Group Internal Ops</p>
          <h1>
            {section === 'portfolio'
              ? 'Project Portfolio'
              : section === 'approvals'
                ? 'Approvals'
                : section === 'services'
                ? 'Service Lines'
                : section === 'operations'
                  ? 'Internal Operations'
                  : 'Operational Impact'}
          </h1>
        </div>
        {account.views.length > 1 && (
          <nav className="section-switcher" aria-label="Dashboard sections">
            {account.views.map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={section === view}
                onClick={() => setActiveSection(view)}
              >
                {sectionLabels[view]}
                {view === 'approvals' && dashboard.workflows.pending.length > 0 && (
                  <span className="nav-badge">{dashboard.workflows.pending.length}</span>
                )}
              </button>
            ))}
          </nav>
        )}
        <div className="account-menu">
          <span className="account-chip">
            <span className="account-avatar small" aria-hidden="true">{initials(account.name)}</span>
            <span>
              <strong>{account.name}</strong>
              <small>{account.title}</small>
            </span>
          </span>
          <label>
            <span>Demo: switch account</span>
            <select value={account.id} onChange={(event) => void signIn(event.target.value)}>
              {demoAccounts.map((option) => (
                <option key={option.id} value={option.id}>{option.name} — {option.title}</option>
              ))}
            </select>
          </label>
          <a className="account-signout" href="/admin/email-lab" target="_blank" rel="noopener noreferrer">Email lab</a>
          <button type="button" className="account-signout" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>

      {section === 'portfolio' ? (
            <>
      <AlertCenter
        center={dashboard.alerts}
        reviewCount={dashboard.reviewQueue.length}
        projectCount={dashboard.projects.length}
        onOpenProject={openProject}
        onOpenDraft={account.views.includes('approvals') ? () => setActiveSection('approvals') : undefined}
      />

      <section className="project-detail" id="project-detail">
        <div className="detail-heading">
          <div>
            <p className="ops-eyebrow">Project detail</p>
            <h2>{selectedProject?.name ?? 'Project'}</h2>
          </div>
          <div className="health-picker detail-picker">
            <label htmlFor="project-select">Selected project</label>
            <select
              id="project-select"
              value={selectedProject?.projectId ?? ''}
              onChange={(event) => setSelectedProjectId(Number(event.target.value))}
            >
              {dashboard.projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <main className="content-grid">
          <aside className="panel">
            <div className="panel-header">
              <div>
                <h2>Project health</h2>
                {selectedProject && <p className="health-score-label">Illustrative weighted health score</p>}
              </div>
              {selectedProject && (
                <div className={`health-score ${(selectedProject.healthStatus ?? 'unscored').toLowerCase().replace(' ', '-')}`}>
                  <strong>{selectedProject.healthScore ?? '—'}</strong>
                  <span>{selectedProject.healthStatus ?? 'Unscored'}</span>
                </div>
              )}
            </div>
            <p className="health-method-note">Demo weights: schedule (25%), budget (25%), RFIs (15%), materials (15%), BIM (10%), manufacturing (5%), and estimating (5%). Manufacturing is calculated from the live shop schedule (QA holds, short material, late shipments). A production score should use verified project data and agreed business thresholds.</p>
            {projectHealth.map(([label, value, note]) => (
              <div key={label} className="health-row">
                <div className="health-label-row">
                  <span>{label}{note && <small className="signal-source">{note}</small>}</span>
                  <strong>{value}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </aside>

          <ChangeIntelligence
            entries={dashboard.changeIntel.filter((entry) => entry.projectId === selectedProject?.projectId)}
            onOpenDraft={account.views.includes('approvals') ? () => setActiveSection('approvals') : undefined}
          />
        </main>
      </section>

            </>
      ) : section === 'services' ? (
        <>
          <nav className="project-service-nav" aria-label="Service lines">
            {projectServiceTabs.map((service) => (
              <button
                key={service.key}
                type="button"
                aria-current={activeProjectService === service.key ? 'page' : undefined}
                onClick={() => setActiveProjectService(service.key)}
              >
                {service.label}
              </button>
            ))}
          </nav>
          <ServiceLinePage
            service={projectServiceTabs.find((service) => service.key === activeProjectService) ?? projectServiceTabs[0]}
            projects={dashboard.projects}
            packages={dashboard.serviceWork ?? []}
            onOpenProject={(projectId) => {
              setSelectedProjectId(projectId)
              setActiveSection('portfolio')
            }}
          />
        </>
      ) : section === 'approvals' ? (
        <ApprovalsView data={dashboard.workflows} reviewerRoles={account.title} />
      ) : section === 'operations' ? (
        <>
          {!account.views.includes('portfolio') && (
            <AlertCenter
              center={dashboard.alerts}
              reviewCount={0}
              projectCount={0}
              onOpenProject={undefined}
            />
          )}
          {dashboard.internalOperations && <InternalOperationsView data={dashboard.internalOperations} />}
        </>
      ) : (
        dashboard.valueMetrics && (
          <ValueView metrics={dashboard.valueMetrics} evaluation={dashboard.evaluation} canRun={account.views.includes('value')} />
        )
      )}
    </div>
  )
}

function ValueView({
  metrics,
  evaluation,
  canRun,
}: {
  metrics: ValueMetrics
  evaluation: EvaluationResult | null
  canRun: boolean
}) {
  const [emailsPerWeek, setEmailsPerWeek] = useState(80)
  const [manualMinutes, setManualMinutes] = useState(8)
  const [reviewMinutes, setReviewMinutes] = useState(2)
  const [hoursUntilNoticed, setHoursUntilNoticed] = useState(24)
  const [laborRate, setLaborRate] = useState(65)

  const estimate = useMemo(() => {
    const minutesSavedPerEmail = Math.max(manualMinutes - reviewMinutes, 0)
    const annualHours = (emailsPerWeek * 52 * minutesSavedPerEmail) / 60
    return { annualHours, annualValue: annualHours * laborRate }
  }, [emailsPerWeek, manualMinutes, reviewMinutes, laborRate])

  const seconds = metrics.medianProcessingMs === null ? null : metrics.medianProcessingMs / 1000
  const duration =
    seconds === null ? '—' : seconds < 1 ? '< 1 s' : `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`
  const elapsedReviewMinutes = metrics.medianReviewSeconds === null ? null : metrics.medianReviewSeconds / 60
  const reviewDuration = elapsedReviewMinutes === null
    ? '—'
    : elapsedReviewMinutes < 1
      ? `${Math.round(metrics.medianReviewSeconds as number)} sec`
      : `${elapsedReviewMinutes.toFixed(1)} min`
  const draftEditRate = metrics.draftsApproved
    ? `${Math.round(metrics.draftsEdited / metrics.draftsApproved * 100)}%`
    : '—'

  return (
    <main className="value-page">
      <aside className="impact-disclaimer" role="note">
        <strong>Illustrative/demo data — not realized savings</strong>
        <span>Exposure is estimated from sample emails and shop data. No avoided cost, labor savings, or financial benefit has been verified.</span>
      </aside>

      <section className="service-heading">
        <div>
          <p className="ops-eyebrow">Operational workflow / current demo session</p>
          <h2>From incoming signal to accountable action</h2>
          <p>Session activity is measured from this demo. Deliver sample emails in the <a href="/admin/email-lab">email lab</a> to see these figures update.</p>
        </div>
      </section>

      <section className="impact-group" aria-labelledby="automation-title">
        <h2 id="automation-title">Automation</h2>
        <div className="kpi-grid">
          <div className="kpi-card"><span>Emails processed</span><strong>{metrics.emailsReceived}</strong><small>Items received by the demo workflow</small></div>
          <div className="kpi-card"><span>Changes identified</span><strong>{metrics.changeEventsIdentified}</strong><small>Email changes and shop exception groups</small></div>
          <div className="kpi-card"><span>Automatically routed</span><strong>{metrics.autoApplied}</strong><small>Project emails applied without human review</small></div>
          <div className="kpi-card"><span>Held for review</span><strong>{metrics.awaitingReview}</strong><small>Not applied because routing or parsing was uncertain</small></div>
        </div>
      </section>

      <section className="impact-group" aria-labelledby="human-effort-title">
        <h2 id="human-effort-title">Human effort</h2>
        <div className="kpi-grid">
          <div className="kpi-card"><span>Median automated processing</span><strong>{duration}</strong><small>Backend parse and apply time; excludes human review</small></div>
          <div className="kpi-card"><span>Median draft-to-decision</span><strong>{reviewDuration}</strong><small>Elapsed time from draft creation to decision, not active work time</small></div>
          <div className="kpi-card"><span>Drafts requiring edits</span><strong>{draftEditRate}</strong><small>{metrics.draftsEdited} edited of {metrics.draftsApproved} approved drafts</small></div>
        </div>
      </section>

      <section className="impact-group" aria-labelledby="business-impact-title">
        <h2 id="business-impact-title">Business impact</h2>
        <div className="kpi-grid">
          <div className="kpi-card"><span>Potential schedule exposure identified</span><strong>${metrics.potentialScheduleExposureUsd.toLocaleString()}</strong><small>Calculated from cited daily cost and delay; not realized or avoided cost</small></div>
          <div className="kpi-card"><span>Downstream actions created</span><strong>{metrics.downstreamActionsCreated}</strong><small>Alert and draft records created, not necessarily completed</small></div>
          <div className="kpi-card"><span>Projects with shop issues detected</span><strong>{metrics.shopProjectsWithIssues}</strong><small>Projects with QA, material, or dispatch exceptions in the current schedule</small></div>
        </div>
      </section>

      {metrics.emailsReceived === 0 && (
        <p className="value-empty">No email activity in this session yet. Deliver sample emails in the email lab to populate automation and effort measures.</p>
      )}

      <WorkflowValue metrics={metrics} evaluation={evaluation} canRun={canRun} />

      <section className="panel roi-panel">
        <div className="panel-header">
          <div>
            <h2>Estimate the impact</h2>
            <p className="health-method-note">Starting assumptions are placeholders. Replace them with Nevell's own figures.</p>
          </div>
        </div>
        <div className="roi-grid">
          <div className="roi-inputs">
            <label>
              Actionable project emails / week
              <input type="number" min="0" value={emailsPerWeek} onChange={(e) => setEmailsPerWeek(Number(e.target.value))} />
            </label>
            <label>
              Minutes to read, route, and log manually
              <input type="number" min="0" value={manualMinutes} onChange={(e) => setManualMinutes(Number(e.target.value))} />
            </label>
            <label>
              Minutes to review with automation
              <input type="number" min="0" value={reviewMinutes} onChange={(e) => setReviewMinutes(Number(e.target.value))} />
            </label>
            <label>
              Hours before a manual process surfaces an issue
              <input type="number" min="0" value={hoursUntilNoticed} onChange={(e) => setHoursUntilNoticed(Number(e.target.value))} />
            </label>
            <label>
              Loaded labor rate ($/hr)
              <input type="number" min="0" value={laborRate} onChange={(e) => setLaborRate(Number(e.target.value))} />
            </label>
          </div>
          <div className="roi-summary">
            <div className="metric-box">
              <span>Admin hours freed / year</span>
              <strong>{Math.round(estimate.annualHours).toLocaleString()} hrs</strong>
            </div>
            <div className="metric-box">
              <span>Earlier awareness</span>
              <strong>~{hoursUntilNoticed} hrs → {seconds === null ? 'seconds' : duration}</strong>
            </div>
            <div className="metric-box highlight">
              <span>Labor value of admin time / year</span>
              <strong>${Math.round(estimate.annualValue).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function InternalOperationsView({
  data,
}: {
  data: InternalOperations
}) {
  const [activePage, setActivePage] = useState<'overview' | 'production' | 'quality' | 'materials' | 'dispatch'>('overview')
  const summary = data.summary
  const qualityOrders = data.orders.filter((order) => order.qaHoldUnits > 0)
  const materialOrders = data.orders.filter((order) => order.materialShortageUnits > 0)
  const dispatchOrders = [...data.orders].sort((left, right) => {
    const leftLate = !left.actualDispatch || left.actualDispatch > left.plannedDispatch
    const rightLate = !right.actualDispatch || right.actualDispatch > right.plannedDispatch
    return Number(rightLate) - Number(leftLate) || left.plannedDispatch.localeCompare(right.plannedDispatch)
  })

  return (
    <main className="operations-view">
      <section className="operations-intro">
        <div>
          <p className="ops-eyebrow">Prefabrication / in-house manufacturing</p>
          <h2>{data.facility || 'Manufacturing operations'}</h2>
          <p>Production, quality, labor, material, and dispatch status from the current shop schedule.</p>
        </div>
        <div className="sheet-actions">
          <a className="sample-sheet-link" href="/api/ops/sample.csv" download>
            Download schedule template
          </a>
        </div>
      </section>

      <section className={`operations-source ${data.source.connected ? 'connected' : 'disconnected'}`} role="status">
        <span className={`source-indicator ${data.source.connected ? 'connected' : 'disconnected'}`} />
        <div>
          <strong>{data.source.connected ? 'Live source connected' : 'Source needs attention'}</strong>
          <span>{data.source.watchFolder} · checks every {data.source.pollSeconds}s</span>
        </div>
        <div className="source-files">
          {data.source.files.map((file) => (
            <span key={file.name}>{file.name} · {file.rowCount} rows</span>
          ))}
        </div>
        <span>{data.source.lastChecked ? `Checked ${new Date(data.source.lastChecked).toLocaleTimeString()}` : ''}</span>
      </section>
      {data.source.error && <p className="connection-error">{data.source.error}. Previous valid data is being retained.</p>}
      <p className="source-guidance">Replace or edit a CSV/XLSX schedule in the watched folder; all valid files there are combined. Add the raw optional <code>previous_qa_hold_units</code> column to calculate QA-hold change; severity and other metrics are derived by the backend, not stored in the sheet. Revit users can export a schedule to CSV/XLSX there.</p>

      <nav className="operations-nav" aria-label="Internal operations pages">
        {([
          ['overview', 'Overview', 'Admin'],
          ['production', 'Production', 'Shop floor'],
          ['quality', 'Quality', 'QA'],
          ['materials', 'Materials', 'Procurement'],
          ['dispatch', 'Dispatch', 'Shipping'],
        ] as const).map(([page, label, role]) => (
          <button
            key={page}
            type="button"
            aria-current={activePage === page ? 'page' : undefined}
            onClick={() => setActivePage(page)}
          >
            <strong>{label}</strong>
            <span>{role}</span>
          </button>
        ))}
      </nav>

      {activePage === 'overview' && (
        <>
          <div className="kpi-grid operations-kpis">
            <OperationsMetric label="Production plan complete" value={`${summary.completedUnits} / ${summary.plannedUnits}`} detail={`${summary.productionAttainment}% of planned panel units`} meter={summary.productionAttainment} />
            <OperationsMetric label="First-pass quality" value={`${summary.firstPassQuality}%`} detail={`${summary.qaHoldUnits} ${summary.qaHoldUnits === 1 ? 'unit' : 'units'} on QA hold`} />
            <OperationsMetric label="Labor to plan" value={`${summary.laborPlanAttainment}%`} detail="Planned labor hours ÷ actual labor hours" />
            <OperationsMetric label="On-time dispatch" value={`${summary.onTimeDispatch}%`} detail={`${summary.atRiskDispatches} at-risk dispatches`} />
          </div>
          {data.exceptions.length > 0 && (
            <section className="manufacturing-exceptions" aria-label="Calculated manufacturing exceptions">
              <div className="panel-header">
                <div>
                  <h2>Manufacturing exceptions</h2>
                  <p>Calculated from raw production counts, labor hours, and dispatch dates.</p>
                </div>
              </div>
              <div className="manufacturing-exception-list">
                {data.exceptions.map((exception, index) => (
                  <article className={`manufacturing-exception ${exception.severity.toLowerCase()}`} key={`${exception.projectId}-${exception.type}-${index}`}>
                    <div className="exception-title-row">
                      <span className={`priority-badge ${exception.severity.toLowerCase()}`}>{exception.severity} manufacturing risk</span>
                      <strong>{exception.projectName}</strong>
                      <span className="exception-product">{exception.panelType}</span>
                    </div>
                    <h3>{exception.title}</h3>
                    <p>
                      {exception.type === 'qa_hold'
                        ? `${exception.currentUnits} ${exception.currentUnits === 1 ? 'unit' : 'units'} currently on hold${exception.qaHoldIncrease > 0 ? ` · +${exception.qaHoldIncrease} from ${exception.previousQaHoldUnits} previous holds` : ` · no increase from ${exception.previousQaHoldUnits} previous holds`}`
                        : `${exception.affectedUnits} ${exception.affectedUnits === 1 ? 'unit' : 'units'} affected`}
                      {' · '}Dispatch {new Date(`${exception.plannedDispatch}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="exception-context">
                      {exception.completedUnits} of {exception.plannedUnits} complete ({exception.completionRate}%)
                      {' · '}{Math.abs(exception.laborVariancePct)}% {exception.laborVariancePct <= 0 ? 'under' : 'over'} labor plan
                      {' · '}manufacturing health {exception.manufacturingHealth}%
                    </p>
                    <strong className="exception-action">Action: {exception.action}</strong>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className="operations-alerts" aria-label="Manufacturing exceptions">
            <div><span className="alert-number">{summary.qaHoldUnits}</span><span>units on quality hold</span></div>
            <div><span className="alert-number">{summary.materialShortageUnits}</span><span>units affected by material shortages</span></div>
            <div><span className="alert-number">{summary.atRiskDispatches}</span><span>late or open dispatches</span></div>
          </section>
          <OperationsTable title="Current production orders" subtitle={`${summary.activeOrders} jobs across the facility`} orders={data.orders} columns="overview" />
          <IntegrationList integrations={data.integrations} />
        </>
      )}

      {activePage === 'production' && (
        <>
          <div className="kpi-grid operations-kpis">
            <OperationsMetric label="Units complete" value={`${summary.completedUnits} / ${summary.plannedUnits}`} detail={`${summary.productionAttainment}% of shift plan`} meter={summary.productionAttainment} />
            <OperationsMetric label="Active production orders" value={String(summary.activeOrders)} detail="Rows in current shop schedule" />
            <OperationsMetric label="Labor to plan" value={`${summary.laborPlanAttainment}%`} detail="Planned hours ÷ actual hours" />
            <OperationsMetric label="Open unit balance" value={String(Math.max(summary.plannedUnits - summary.completedUnits, 0))} detail="Planned units not yet completed" />
          </div>
          <OperationsTable title="Shop production board" subtitle="Production worker view · order progress and labor" orders={data.orders} columns="production" />
        </>
      )}

      {activePage === 'quality' && (
        <>
          <div className="kpi-grid operations-kpis">
            <OperationsMetric label="First-pass quality" value={`${summary.firstPassQuality}%`} detail="Completed units excluding QA holds" />
            <OperationsMetric label="Units on hold" value={String(summary.qaHoldUnits)} detail={`${qualityOrders.length} orders require QA review`} />
            <OperationsMetric label="Orders with holds" value={String(qualityOrders.length)} detail="Review before pack-out or dispatch" />
            <OperationsMetric label="Completed units" value={String(summary.completedUnits)} detail="Current production schedule" />
          </div>
          <OperationsTable title="Quality exceptions" subtitle="QA review queue · clear holds before release" orders={qualityOrders} columns="quality" emptyMessage="No production units are currently on QA hold." />
        </>
      )}

      {activePage === 'materials' && (
        <>
          <div className="kpi-grid operations-kpis">
            <OperationsMetric label="Shortage units" value={String(summary.materialShortageUnits)} detail={`${materialOrders.length} production orders exposed`} />
            <OperationsMetric label="Affected orders" value={String(materialOrders.length)} detail={`${materialOrders.length} ${materialOrders.length === 1 ? 'production order' : 'production orders'} exposed`} />
            <OperationsMetric label="Orders in plan" value={String(summary.activeOrders)} detail="Current facility schedule" />
          </div>
          <OperationsTable title="Material shortage watch" subtitle="Procurement and shop planning view" orders={materialOrders} columns="materials" emptyMessage="No material shortages are reported in the current schedule." />
        </>
      )}

      {activePage === 'dispatch' && (
        <>
          <div className="kpi-grid operations-kpis">
            <OperationsMetric label="On-time dispatch" value={`${summary.onTimeDispatch}%`} detail="Shipped orders meeting planned date" />
            <OperationsMetric label="At-risk dispatches" value={String(summary.atRiskDispatches)} detail="Late or not yet shipped" />
            <OperationsMetric label="Shipped orders" value={String(data.orders.filter((order) => order.actualDispatch).length)} detail="Actual dispatch date recorded" />
            <OperationsMetric label="Open orders" value={String(data.orders.filter((order) => !order.actualDispatch).length)} detail="Awaiting shipment" />
          </div>
          <OperationsTable title="Dispatch board" subtitle="Shipping view · planned and actual ship dates" orders={dispatchOrders} columns="dispatch" />
        </>
      )}
      <p className="operations-footnote">Folder connection is local to this demo machine. The watched folder is checked continuously; operations data is held in backend memory and returns to the watched files on server restart. Direct cloud APIs require company-approved credentials and field mappings.</p>
    </main>
  )
}

function OperationsMetric({
  label,
  value,
  detail,
  meter,
}: {
  label: string
  value: string
  detail: string
  meter?: number
}) {
  return (
    <div className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {meter !== undefined && <div className="ops-meter"><i style={{ width: `${Math.min(meter, 100)}%` }} /></div>}
    </div>
  )
}

function OperationsTable({
  title,
  subtitle,
  orders,
  columns,
  emptyMessage = 'No rows are available in the connected production schedule.',
}: {
  title: string
  subtitle: string
  orders: ProductionOrder[]
  columns: 'overview' | 'production' | 'quality' | 'materials' | 'dispatch'
  emptyMessage?: string
}) {
  const showQuality = columns === 'overview' || columns === 'quality'
  const showLabor = columns === 'overview' || columns === 'production'
  const showMaterials = columns === 'overview' || columns === 'materials'
  const showDispatch = columns === 'overview' || columns === 'dispatch'

  return (
    <section className="panel operations-orders">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {orders.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Product</th>
                <th>Units complete</th>
                {showQuality && <th>QA hold</th>}
                {showLabor && <th>Labor actual / plan</th>}
                {showDispatch && <th>Dispatch plan / actual</th>}
                {showMaterials && <th>Shortage units</th>}
                {columns === 'overview' && <th>Manufacturing health</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={`${order.projectId}-${order.panelType}`}>
                  <td><strong>{order.projectName}</strong><small className="table-subline">{order.projectId}</small></td>
                  <td>{order.panelType}</td>
                  <td>{order.completedUnits} / {order.plannedUnits}<small className="table-subline">{order.completionRate}% complete</small></td>
                  {showQuality && (
                    <td>
                      {order.qaHoldUnits}
                      {order.qaHoldIncrease > 0 && <small className="table-subline">+{order.qaHoldIncrease} since previous</small>}
                    </td>
                  )}
                  {showLabor && (
                    <td>
                      {order.actualLaborHours} / {order.plannedLaborHours} hrs
                      <small className="table-subline">{Math.abs(order.laborVariancePct)}% {order.laborVariancePct <= 0 ? 'under' : 'over'} plan</small>
                    </td>
                  )}
                  {showDispatch && (
                    <td>
                      {order.plannedDispatch} / {order.actualDispatch || 'Open'}
                      {order.dispatchDelayDays !== null && order.dispatchDelayDays > 0 && <small className="table-subline">{order.dispatchDelayDays} days late</small>}
                    </td>
                  )}
                  {showMaterials && <td>{order.materialShortageUnits}</td>}
                  {columns === 'overview' && <td><span className={`priority-badge ${order.severity.toLowerCase()}`}>{order.manufacturingHealth}% · {order.severity}</span></td>}
                  <td><span className={`ops-status ${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-operations">{emptyMessage}</p>
      )}
    </section>
  )
}

function IntegrationList({ integrations }: { integrations: InternalOperations['integrations'] }) {
  return (
    <section className="panel integration-panel">
      <div className="panel-header">
        <div>
          <h2>Systems and data connections</h2>
          <p>Live feeds are distinguished from export pathways and integrations still needing setup.</p>
        </div>
      </div>
      <div className="integration-list">
        {integrations.map((integration) => (
          <div className="integration-row" key={integration.name}>
            <strong>{integration.name}</strong>
            <span className={`integration-status ${integration.mode}`}>{integration.status}</span>
            <p>{integration.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default App
