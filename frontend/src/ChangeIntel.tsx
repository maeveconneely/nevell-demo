export type ChangeRow = {
  item: string
  change: string
  impact: string
  priority: string
  owner: string
}

export type ChangeEntry = {
  id: string
  projectId: number
  source: 'email' | 'spreadsheet' | 'sample'
  sourceLabel: string
  reference: string
  summary: string
  detectedAt: string | null
  emailId: string | null
  alertId: string | null
  draftId: string | null
  rows: ChangeRow[]
}

const sourceName = { email: 'Email', spreadsheet: 'Spreadsheet', sample: 'Sample' } as const

const stamp = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function ChangeIntelligence({
  entries,
  onOpenDraft,
}: {
  entries: ChangeEntry[]
  onOpenDraft?: () => void
}) {
  const latest = entries.find((entry) => entry.source === 'email') ?? entries.find((entry) => entry.source === 'sample')
  const highCount = entries.reduce((total, entry) => total + entry.rows.filter((row) => row.priority === 'High').length, 0)
  const totalRows = entries.reduce((total, entry) => total + entry.rows.length, 0)
  const hasLive = entries.some((entry) => entry.source !== 'sample')

  return (
    <section className="panel panel-wide">
      <div className="panel-header change-header">
        <h2>Change intelligence</h2>
        <span className="demo-data-tag">{hasLive ? 'Updates from emails and the shop spreadsheet' : 'Sample data'}</span>
      </div>

      {entries.length === 0 ? (
        <p className="value-empty">
          No drawing, RFI, addendum, or shop-schedule changes detected for this project yet. Changes appear here when an
          email references them or the shop spreadsheet shows a quality hold or material shortage.
        </p>
      ) : (
        <>
          {latest && (
            <div className="revision-box">
              <p className="revision-label">{latest.source === 'sample' ? 'Sample revision' : 'Latest change detected'}</p>
              <h3>{latest.reference}</h3>
              <p className="revision-source">
                {latest.sourceLabel}{latest.detectedAt ? ` \u00b7 ${stamp(latest.detectedAt)}` : ''}
              </p>
              <ul>
                <li>{latest.rows.length} {latest.rows.length === 1 ? 'item' : 'items'} affected</li>
                {latest.alertId && <li>Alert raised and assigned</li>}
                {latest.draftId && (
                  <li>
                    Draft ready for review
                    {onOpenDraft && <> &middot; <button type="button" className="link-button inline" onClick={onOpenDraft}>Open approvals</button></>}
                  </li>
                )}
              </ul>
            </div>
          )}

          <p className="notify-note">
            {totalRows} {totalRows === 1 ? 'item' : 'items'} across {entries.length} {entries.length === 1 ? 'change' : 'changes'}, {highCount} high priority.
          </p>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Change</th>
                  <th>Impact</th>
                  <th>Priority</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {entries.flatMap((entry) =>
                  entry.rows.map((row, index) => (
                    <tr key={`${entry.id}-${index}`}>
                      <td>{row.item}<small className="table-subline">{entry.reference}</small></td>
                      <td>{row.change}</td>
                      <td>{row.impact}</td>
                      <td>
                        <span className={`priority-badge ${row.priority.toLowerCase()}`}>{row.priority}</span>
                      </td>
                      <td>
                        <span className={`source-tag ${entry.source}`}>{sourceName[entry.source]}</span>
                        <small className="table-subline">
                          {entry.source === 'email' ? entry.sourceLabel.replace('Email from ', '') : entry.source === 'spreadsheet' ? 'Live from shop schedule' : 'Demo data'}
                        </small>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
