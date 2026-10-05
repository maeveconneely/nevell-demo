import { useState } from 'react'

export type ServiceUpdate = {
  id: string
  at: string
  sender: string
  subject: string
  kind: string
  summary: string
  figures: string
}

export type ServicePackage = {
  id: string
  projectId: number
  service: string
  scope: string
  quantity: string
  percentComplete: number
  status: string
  statusSource: 'seed' | 'email'
  nextMilestone: string
  due: string
  origin: 'seed' | 'email'
  liveFromShop: boolean
  updates: ServiceUpdate[]
}

type ServiceProject = {
  projectId: number
  name: string
  projectType: string
  location: string
  schedule: number
  budget: number
}

const HIGH_STATUSES = new Set(['Delayed', 'Schedule at risk', 'Quality hold', 'Material shortage', 'Awaiting material', 'On hold'])
const MEDIUM_STATUSES = new Set(['Pricing requested', 'Revision pending', 'Pending design'])

const statusClass = (status: string) =>
  HIGH_STATUSES.has(status) ? 'high' : MEDIUM_STATUSES.has(status) ? 'medium' : status === 'Not started' ? 'neutral' : 'low'

const stamp = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function ServiceLinePage({
  service,
  projects,
  packages,
  onOpenProject,
}: {
  service: { key: string; label: string; description: string }
  projects: ServiceProject[]
  packages: ServicePackage[]
  onOpenProject: (projectId: number) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const rows = packages
    .filter((item) => item.service === service.key)
    .map((item) => ({ item, project: projects.find((project) => project.projectId === item.projectId) }))
    .filter((row): row is { item: ServicePackage; project: ServiceProject } => row.project !== undefined)

  const atRisk = rows.filter((row) => HIGH_STATUSES.has(row.item.status) || MEDIUM_STATUSES.has(row.item.status)).length
  const emailUpdates = rows.reduce((total, row) => total + row.item.updates.length, 0)
  const activeRows = rows.filter((row) => row.item.status !== 'Complete')
  const averageProgress = activeRows.length
    ? Math.round(activeRows.reduce((total, row) => total + row.item.percentComplete, 0) / activeRows.length)
    : null

  return (
    <main className="service-page">
      <section className="service-heading">
        <div>
          <p className="ops-eyebrow">Service line / across all projects</p>
          <h2>{service.label}</h2>
          <p>
            {service.description} Scope, quantities, and milestones are sample data. Emails from outside Nevell are tagged
            to a service line when they are parsed, and their effects appear here.
          </p>
        </div>
        <span className="demo-data-tag">Sample scope, live email updates</span>
      </section>

      <div className="kpi-grid service-kpis">
        <div className="kpi-card">
          <span>Projects with this scope</span>
          <strong>{rows.length}</strong>
          <small>{activeRows.length} still active</small>
        </div>
        <div className="kpi-card">
          <span>Delayed, held, or pending</span>
          <strong>{atRisk}</strong>
          <small>Packages needing follow-up</small>
        </div>
        <div className="kpi-card">
          <span>Emails tagged here</span>
          <strong>{emailUpdates}</strong>
          <small>From outside Nevell, this session</small>
        </div>
        <div className="kpi-card">
          <span>Average progress</span>
          <strong>{averageProgress === null ? '\u2014' : `${averageProgress}%`}</strong>
          <small>Active packages</small>
        </div>
      </div>

      <section className="panel service-projects-panel">
        <div className="panel-header">
          <div>
            <h2>{service.label} work packages</h2>
            <p>One row per project. A status marked "from email" was changed by a parsed email.</p>
          </div>
        </div>
        {rows.length > 0 ? (
          <div className="table-scroll">
            <table className="service-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Scope</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Next milestone</th>
                  <th>Latest email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, project }) => {
                  const latest = item.updates[0]
                  return (
                    <tr key={item.id}>
                      <td>
                        <button type="button" className="link-button" onClick={() => onOpenProject(project.projectId)}>
                          {project.name}
                        </button>
                        <small className="table-subline">{project.projectType} &middot; {project.location}</small>
                      </td>
                      <td>
                        {item.scope || '\u2014'}
                        <small className="table-subline">
                          {item.quantity || '\u2014'}{item.liveFromShop ? ' \u00b7 live from shop schedule' : ''}
                          {item.origin === 'email' ? ' \u00b7 added from an email' : ''}
                        </small>
                      </td>
                      <td>
                        <div className="service-progress">
                          <div className="progress-track"><div className="progress-bar" style={{ width: `${item.percentComplete}%` }} /></div>
                          <strong>{item.percentComplete}%</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`priority-badge ${statusClass(item.status)}`}>{item.status}</span>
                        {item.statusSource === 'email' && <small className="table-subline">from email</small>}
                      </td>
                      <td>
                        {item.nextMilestone || '\u2014'}
                        <small className="table-subline">{/^[A-Z][a-z]{2} \d/.test(item.due) ? `Due ${item.due}` : item.due || '\u2014'}</small>
                      </td>
                      <td>
                        {latest ? (
                          <>
                            <small className="update-meta">
                              {stamp(latest.at)} &middot; {latest.kind}{latest.figures ? ` \u00b7 ${latest.figures}` : ''}
                            </small>
                            <span className="update-summary">{latest.summary}</span>
                            <small className="table-subline">{latest.sender}</small>
                            {item.updates.length > 1 && (
                              <button
                                type="button"
                                className="link-button"
                                aria-expanded={open === item.id}
                                onClick={() => setOpen(open === item.id ? null : item.id)}
                              >
                                {open === item.id ? 'Hide earlier' : `${item.updates.length - 1} earlier`}
                              </button>
                            )}
                            {open === item.id && (
                              <ul className="update-history">
                                {item.updates.slice(1).map((update) => (
                                  <li key={update.id}>
                                    <small className="update-meta">{stamp(update.at)} &middot; {update.kind}</small>
                                    {update.summary}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <span className="update-none">No emails tagged</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-operations">No work packages are assigned to this service line for the projects you can see.</p>
        )}
      </section>
    </main>
  )
}
