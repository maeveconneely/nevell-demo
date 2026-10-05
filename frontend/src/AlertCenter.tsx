import { useEffect, useRef, useState } from 'react'

export type AlertItem = {
  id: string
  projectId: number | null
  projectName: string
  severity: string
  title: string
  detail: string
  owner: string
  source: { type: string; label: string; detail?: string }
  status: 'open' | 'resolved'
  draftId?: string | null
  createdAt: string
  history: { at: string; actor: string; action: string }[]
}

export type AlertCenterData = {
  items: AlertItem[]
  owners: string[]
  canConfigure: boolean
  channels: { key: string; name: string; configured: boolean; detail: string }[]
  log: {
    id: string
    at: string
    alertId: string | null
    title: string
    severity: string
    kind: string
    channel: string
    channelName: string
    status: string
    detail: string
  }[]
  ntfyTopic: string | null
  ntfyServer: string
  rules: string[]
}

export const emptyAlertCenter: AlertCenterData = {
  items: [],
  owners: [],
  canConfigure: false,
  channels: [],
  log: [],
  ntfyTopic: null,
  ntfyServer: 'https://ntfy.sh',
  rules: [],
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })

async function post(url: string, body?: unknown): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.ok) return null
    const problem = (await response.json().catch(() => null)) as { detail?: unknown } | null
    return typeof problem?.detail === 'string' ? problem.detail : `Request failed (${response.status})`
  } catch {
    return 'Could not reach the server.'
  }
}

export function AlertCenter({
  center,
  reviewCount,
  projectCount,
  onOpenProject,
  onOpenDraft,
}: {
  center: AlertCenterData
  reviewCount: number
  projectCount: number
  onOpenProject: ((projectId: number) => void) | undefined
  onOpenDraft?: () => void
}) {
  const [historyOpen, setHistoryOpen] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [topicDraft, setTopicDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [toasts, setToasts] = useState<AlertItem[]>([])
  const seen = useRef<Set<string> | null>(null)
  const timers = useRef<number[]>([])

  const dismissToast = (id: string) => setToasts((current) => current.filter((item) => item.id !== id))

  const openAlerts = center.items.filter((item) => item.status !== 'resolved')
  const hasChannelData = center.owners.length > 0

  useEffect(() => {
    if (!hasChannelData) return
    if (seen.current === null) {
      seen.current = new Set(center.items.map((item) => item.id))
      return
    }
    const fresh = center.items.filter((item) => !seen.current!.has(item.id))
    fresh.forEach((item) => seen.current!.add(item.id))
    const visible = fresh.filter((item) => item.source.type !== 'seed')
    if (visible.length === 0) return
    setToasts((current) => [...visible, ...current].slice(0, 3))
    visible.forEach((item) => {
      timers.current.push(window.setTimeout(() => dismissToast(item.id), 12000))
    })
  }, [center.items, hasChannelData])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setToasts([])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts.length])

  const run = async (request: Promise<string | null>) => {
    setMessage(await request)
  }

  const savedTopic = center.ntfyTopic
  const topicLink = savedTopic ? `${center.ntfyServer}/${savedTopic}` : null

  return (
    <section
      className={`alert-banner ${openAlerts.length > 0 ? 'active' : 'clear'}`}
      aria-label="Alerts across all projects"
    >
      <div className="alert-banner-head">
        <strong>
          {openAlerts.length > 0
            ? `${openAlerts.length} open ${openAlerts.length === 1 ? 'alert' : 'alerts'}${projectCount > 0 ? ` across ${projectCount} projects` : ' for your team'}`
            : `No open alerts${projectCount > 0 ? ` across ${projectCount} projects` : ' for your team'}`}
        </strong>
        <span>
          {center.canConfigure ? 'All projects' : 'Assigned to you'}
        </span>
      </div>

      {(openAlerts.length > 0 || reviewCount > 0) && (
        <ul className="alert-list">
          {openAlerts.map((alert) => (
            <li key={alert.id} className={`alert-item status-${alert.status}`}>
              <div className="alert-main">
                <div className="alert-title-row">
                  <span className={`priority-badge ${alert.severity === 'High' ? 'high' : 'medium'}`}>
                    {alert.severity}
                  </span>
                  <strong>{alert.projectName}</strong>
                  <time dateTime={alert.createdAt}>{clock(alert.createdAt)}</time>
                </div>
                <p className="alert-headline">{alert.title}</p>
                <p className="alert-meta">{alert.detail}</p>
                <p className="alert-meta">
                  Source: {alert.source.label}
                  {alert.source.detail ? ` \u2014 ${alert.source.detail}` : ''}
                </p>
              </div>
              <div className="alert-actions">
                <label>
                  <span>Owner</span>
                  <select
                    value={alert.owner}
                    onChange={(event) =>
                      void run(post(`/api/alerts/${alert.id}`, { action: 'assign', owner: event.target.value }))
                    }
                  >
                    {!center.owners.includes(alert.owner) && <option value={alert.owner}>{alert.owner}</option>}
                    {center.owners.map((owner) => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </label>
                <div className="alert-buttons">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => void run(post(`/api/alerts/${alert.id}`, { action: 'resolve' }))}
                  >
                    Resolve
                  </button>
                </div>
                <div className="alert-links">
                  <button
                    type="button"
                    className="link-button"
                    aria-expanded={historyOpen === alert.id}
                    onClick={() => setHistoryOpen(historyOpen === alert.id ? null : alert.id)}
                  >
                    History ({alert.history.length})
                  </button>
                  {alert.draftId && onOpenDraft && (
                    <button type="button" className="link-button" onClick={onOpenDraft}>Review draft</button>
                  )}
                  {alert.projectId !== null && onOpenProject && (
                    <button type="button" className="link-button" onClick={() => onOpenProject(alert.projectId!)}>
                      View project
                    </button>
                  )}
                </div>
              </div>
              {historyOpen === alert.id && (
                <ol className="alert-history">
                  {alert.history.map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <time dateTime={entry.at}>{clock(entry.at)}</time> {entry.actor}: {entry.action}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
          {reviewCount > 0 && (
            <li className="alert-item">
              <div className="alert-main">
                <div className="alert-title-row">
                  <span className="priority-badge medium">Review</span>
                  <strong>{reviewCount} {reviewCount === 1 ? 'email' : 'emails'} held for human review</strong>
                </div>
                <p className="alert-meta">Not applied to any project yet. Open the email lab to approve or dismiss.</p>
              </div>
              <div className="alert-actions">
                <a className="link-button" href="/admin/email-lab">Open email lab</a>
              </div>
            </li>
          )}
        </ul>
      )}

      {message && <p className="alert-error" role="alert">{message}</p>}

      {center.canConfigure && (
      <div className="notify-toggle">
        <button
          type="button"
          className="link-button"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          {settingsOpen ? 'Hide notifications' : 'Notifications'}
        </button>
        <span>
          Active channels: {center.channels.filter((channel) => channel.configured).map((channel) => channel.name).join(', ') || 'none'}
        </span>
      </div>
      )}

      {center.canConfigure && settingsOpen && (
        <div className="notify-panel">
          <div className="notify-columns">
            <div>
              <h3>Channels</h3>
              <ul className="channel-list">
                {center.channels.map((channel) => (
                  <li key={channel.key}>
                    <span className={`channel-dot ${channel.configured ? 'on' : 'off'}`} aria-hidden="true" />
                    <div>
                      <strong>{channel.name}</strong>
                      <small>{channel.detail}</small>
                    </div>
                  </li>
                ))}
              </ul>
              <h3>Rules</h3>
              <ul className="rule-list">
                {center.rules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </div>

            <div>
              <h3>Phone push setup</h3>
              <ol className="setup-steps">
                <li>Install the free ntfy app and subscribe to a topic name.</li>
                <li>Enter the same name here and save.</li>
                <li>High alerts then reach the phone within seconds.</li>
              </ol>
              <div className="topic-row">
                <input
                  type="text"
                  aria-label="ntfy topic"
                  placeholder={savedTopic ?? 'topic-name'}
                  value={topicDraft}
                  maxLength={64}
                  onChange={(event) => setTopicDraft(event.target.value.trim())}
                />
                <button
                  type="button"
                  className="action-button"
                  disabled={!topicDraft}
                  onClick={() => void run(post('/api/notifications/settings', { ntfy_topic: topicDraft })).then(() => setTopicDraft(''))}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={() => void run(post('/api/notifications/settings', { generate: true }))}
                >
                  Generate
                </button>
                {savedTopic && (
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={() => void run(post('/api/notifications/settings', { ntfy_topic: null }))}
                  >
                    Clear
                  </button>
                )}
              </div>
              {topicLink && (
                <p className="notify-note">
                  Subscribed topic: <strong>{savedTopic}</strong>. Open{' '}
                  <a href={topicLink} target="_blank" rel="noopener noreferrer">{topicLink}</a> in a browser to receive the same alerts on this computer.
                </p>
              )}
              <p className="notify-note">
                Demo content only. A ntfy topic is readable by anyone who knows its name, so use a generated one.
              </p>
              <button
                type="button"
                className="action-button"
                onClick={() => void run(post('/api/notifications/test'))}
              >
                Send test notification
              </button>
            </div>
          </div>

          <h3>Delivery log</h3>
          {center.log.length === 0 ? (
            <p className="notify-note">Nothing sent yet. Deliver a project email or send a test.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Time</th><th>Channel</th><th>Result</th><th>Alert</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {center.log.map((entry) => (
                    <tr key={entry.id}>
                      <td>{clock(entry.at)}</td>
                      <td>{entry.channelName}</td>
                      <td><span className={`delivery-pill ${entry.status}`}>{entry.status}</span></td>
                      <td>{entry.kind === 'New alert' ? entry.title : `${entry.kind}: ${entry.title}`}</td>
                      <td>{entry.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.severity === 'High' ? 'high' : 'medium'}`}>
              <div className="toast-body">
                <strong>New {toast.severity.toLowerCase()} alert: {toast.projectName}</strong>
                <span>{toast.title}</span>
              </div>
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss alert notification"
                onClick={() => dismissToast(toast.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
