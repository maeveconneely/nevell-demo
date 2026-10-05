import { useState } from 'react'

export type DraftLine = {
  id: string
  description: string
  quantity: number | null
  unit: string
  laborUnit: number | null
  materialUnit: number | null
  rateSource: string
  total: number | null
}

export type Draft = {
  id: string
  kind: 'quote' | 'delay_notice'
  reviewerRole: string
  title: string
  status: 'pending' | 'approved' | 'rejected'
  projectName: string
  alertId: string | null
  createdAt: string
  decidedAt: string | null
  reviewSeconds: number | null
  generationMs: number
  edited: boolean
  source: { sender: string; subject: string; excerpt: string }
  extraction: { label: string; value: string }[]
  reference: { label: string; amountUsd: number } | null
  lineItems: DraftLine[]
  totalUsd: number | null
  message: { to: string; subject: string; intro: string; closing: string }
}

export type WorkflowData = {
  pending: Draft[]
  completed: Draft[]
  outbox: { id: string; draftId: string; at: string; to: string; subject: string; body: string }[]
}

export const emptyWorkflows: WorkflowData = { pending: [], completed: [], outbox: [] }

export type EvaluationResult = {
  ranAt: string
  parser: string
  all: EvaluationSummary
  demo: EvaluationSummary
  heldOut: EvaluationSummary
  failures: {
    id: string
    set: string
    subject: string
    expect: Record<string, string | number | null>
    got: Record<string, string | number | null>
    wrong: string[]
    held: boolean
  }[]
}

type EvaluationSummary = {
  cases: number
  allCorrect: number
  silentErrors: number
  caughtByReview: number
  byField: Record<string, number>
}

const money = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const toNumber = (text: string): number | null => (text.trim() === '' ? null : Number(text))

async function send(url: string, body?: unknown): Promise<string | null> {
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

function DraftCard({ draft }: { draft: Draft }) {
  const [lines, setLines] = useState(() =>
    Object.fromEntries(
      draft.lineItems.map((line) => [
        line.id,
        {
          quantity: String(line.quantity ?? ''),
          laborUnit: line.laborUnit === null ? '' : String(line.laborUnit),
          materialUnit: line.materialUnit === null ? '' : String(line.materialUnit),
        },
      ]),
    ),
  )
  const [intro, setIntro] = useState(draft.message.intro)
  const [closing, setClosing] = useState(draft.message.closing)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const lineTotal = (line: DraftLine): number | null => {
    const edit = lines[line.id]
    const quantity = toNumber(edit.quantity)
    const labor = toNumber(edit.laborUnit)
    const material = toNumber(edit.materialUnit)
    if (quantity === null || labor === null || material === null) return null
    return quantity * (labor + material)
  }
  const totals = draft.lineItems.map(lineTotal)
  const allPriced = totals.every((total) => total !== null)
  const grandTotal = totals.reduce<number>((sum, total) => sum + (total ?? 0), 0)
  const reference = draft.reference

  const decide = async (approve: boolean) => {
    setBusy(true)
    setError(null)
    const failure = approve
      ? await send(`/api/drafts/${draft.id}/approve`, {
          lineItems: draft.lineItems.map((line) => ({
            id: line.id,
            quantity: toNumber(lines[line.id].quantity),
            laborUnit: toNumber(lines[line.id].laborUnit),
            materialUnit: toNumber(lines[line.id].materialUnit),
          })),
          intro,
          closing,
        })
      : await send(`/api/drafts/${draft.id}/reject`)
    setError(failure)
    setBusy(false)
  }

  const setField = (id: string, field: 'quantity' | 'laborUnit' | 'materialUnit', value: string) =>
    setLines((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))

  return (
    <article className="panel draft-card">
      <div className="draft-head">
        <div>
          <p className="ops-eyebrow">{draft.kind === 'quote' ? 'Pricing reply' : 'Schedule notice'} / {draft.reviewerRole}</p>
          <h3>{draft.title}: {draft.projectName}</h3>
        </div>
        <span className="demo-data-tag">Draft ready in {draft.generationMs < 1 ? '< 1' : draft.generationMs} ms</span>
      </div>

      <div className="draft-columns">
        <div>
          <h4>Source email</h4>
          <p className="draft-source"><strong>{draft.source.sender}</strong><br />{draft.source.subject}</p>
          <details>
            <summary>Show message</summary>
            <p className="draft-excerpt">{draft.source.excerpt}</p>
          </details>
        </div>
        <div>
          <h4>What the system found</h4>
          <dl className="draft-facts">
            {draft.extraction.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {draft.lineItems.length > 0 && (
        <div className="table-scroll">
          <table className="draft-lines">
            <thead>
              <tr><th>Scope</th><th>Qty</th><th>Unit</th><th>Labor / unit</th><th>Material / unit</th><th>Total</th></tr>
            </thead>
            <tbody>
              {draft.lineItems.map((line, index) => (
                <tr key={line.id}>
                  <td>
                    {line.description}
                    <small className={`rate-source ${line.rateSource === 'needs input' ? 'needs' : ''}`}>{line.rateSource}</small>
                  </td>
                  <td><input type="number" min="0" step="any" aria-label={`${line.description} quantity`} value={lines[line.id].quantity} onChange={(event) => setField(line.id, 'quantity', event.target.value)} /></td>
                  <td>{line.unit}</td>
                  <td><input type="number" min="0" step="any" aria-label={`${line.description} labor per unit`} value={lines[line.id].laborUnit} onChange={(event) => setField(line.id, 'laborUnit', event.target.value)} /></td>
                  <td><input type="number" min="0" step="any" aria-label={`${line.description} material per unit`} value={lines[line.id].materialUnit} onChange={(event) => setField(line.id, 'materialUnit', event.target.value)} /></td>
                  <td>{totals[index] === null ? 'Needs input' : money(totals[index] as number)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={5}><strong>Total</strong></td><td><strong>{allPriced ? money(grandTotal) : 'Incomplete'}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      )}
      {draft.lineItems.length > 0 && (
        <p className="notify-note">
          Rates marked "placeholder rate" are demo values. Nevell's cost database would supply real ones.
        </p>
      )}
      {reference && (
        <p className="draft-reference">
          {reference.label}: <strong>{money(reference.amountUsd)}</strong>
          {draft.lineItems.length > 0 && allPriced && (
            <> &middot; your total is {money(grandTotal - reference.amountUsd)} {grandTotal >= reference.amountUsd ? 'above' : 'below'} it</>
          )}
        </p>
      )}

      <div className="draft-message">
        <h4>Reply that will be sent</h4>
        <p className="notify-note">To {draft.message.to} &middot; {draft.message.subject}</p>
        <textarea aria-label="Reply introduction" rows={draft.kind === 'quote' ? 4 : 7} value={intro} onChange={(event) => setIntro(event.target.value)} />
        {draft.lineItems.length > 0 && <p className="notify-note">The priced scope table above is inserted here when you approve.</p>}
        <textarea aria-label="Reply closing" rows={4} value={closing} onChange={(event) => setClosing(event.target.value)} />
      </div>

      {error && <p className="alert-error" role="alert">{error}</p>}
      <div className="draft-actions">
        <button type="button" className="action-button" disabled={busy || !allPriced} onClick={() => void decide(true)}>
          Approve and send (simulated)
        </button>
        <button type="button" className="action-button secondary" disabled={busy} onClick={() => void decide(false)}>
          Reject, handle manually
        </button>
        {!allPriced && <span className="notify-note">Price every line to approve.</span>}
      </div>
    </article>
  )
}

export function ApprovalsView({ data, reviewerRoles }: { data: WorkflowData; reviewerRoles: string }) {
  return (
    <main className="approvals-page">
      <section className="service-heading">
        <div>
          <p className="ops-eyebrow">Human in the loop</p>
          <h2>Drafts waiting for your approval</h2>
          <p>
            The system turns project emails into ready-to-send work: pricing replies and schedule notices.
            Nothing is sent until a person approves it. Showing drafts for: {reviewerRoles}.
          </p>
        </div>
      </section>

      {data.pending.length === 0 ? (
        <p className="value-empty">
          No drafts waiting. Deliver the Civic Center addendum or the Miller delay email in the{' '}
          <a href="/admin/email-lab">email lab</a> to generate one.
        </p>
      ) : (
        data.pending.map((draft) => <DraftCard key={draft.id} draft={draft} />)
      )}

      {data.completed.length > 0 && (
        <section className="panel">
          <div className="panel-header"><h2>Recently decided</h2></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Result</th><th>Draft</th><th>Project</th><th>Review time</th><th>Edited</th></tr></thead>
              <tbody>
                {data.completed.map((draft) => (
                  <tr key={draft.id}>
                    <td><span className={`delivery-pill ${draft.status === 'approved' ? 'delivered' : 'failed'}`}>{draft.status}</span></td>
                    <td>{draft.title}</td>
                    <td>{draft.projectName}</td>
                    <td>{draft.reviewSeconds === null ? '—' : `${draft.reviewSeconds} s`}</td>
                    <td>{draft.status === 'approved' ? (draft.edited ? 'Yes' : 'No') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.outbox.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Sent messages</h2>
            <span className="demo-data-tag">Simulated: nothing leaves this system</span>
          </div>
          {data.outbox.map((message) => (
            <details key={message.id} className="outbox-item">
              <summary>{message.subject} &rarr; {message.to}</summary>
              <pre>{message.body}</pre>
            </details>
          ))}
        </section>
      )}
    </main>
  )
}

export function WorkflowValue({
  metrics,
  evaluation,
  canRun,
}: {
  metrics: {
    draftsCreated: number
    draftsApproved: number
    draftsEdited: number
    draftsRejected: number
    medianDraftMs: number | null
    medianReviewSeconds: number | null
  }
  evaluation: EvaluationResult | null
  canRun: boolean
}) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setError(null)
    setError(await send('/api/evaluation/run'))
    setRunning(false)
  }

  const heldOut = evaluation?.heldOut
  const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Drafting and approval</h2>
            <p className="health-method-note">Measured from this session. Review time is how long a person took to decide.</p>
          </div>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card"><span>Drafts prepared</span><strong>{metrics.draftsCreated}</strong><small>Pricing replies and schedule notices</small></div>
          <div className="kpi-card"><span>Approved</span><strong>{metrics.draftsApproved}</strong><small>{metrics.draftsEdited} edited first, {metrics.draftsRejected} rejected</small></div>
          <div className="kpi-card"><span>Median draft time</span><strong>{metrics.medianDraftMs === null ? '—' : metrics.medianDraftMs < 1 ? '< 1 ms' : `${metrics.medianDraftMs} ms`}</strong><small>Rule-based drafting; a model adds seconds</small></div>
          <div className="kpi-card"><span>Median review time</span><strong>{metrics.medianReviewSeconds === null ? '—' : `${metrics.medianReviewSeconds} s`}</strong><small>Draft ready, person decided</small></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>How accurate is the email reading?</h2>
            <p className="health-method-note">
              22 synthetic emails with known answers. 9 are the samples the rules were written around; 13 were written afterward.
              A case is correct only if project, event type, dollar figure, and days are all right.
            </p>
          </div>
          {canRun && (
            <button type="button" className="action-button" disabled={running} onClick={() => void run()}>
              {running ? 'Running...' : evaluation ? 'Run again' : 'Run the evaluation'}
            </button>
          )}
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        {!evaluation || !heldOut ? (
          <p className="value-empty">Not run yet.</p>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi-card"><span>Samples it was built on</span><strong>{pct(evaluation.demo.allCorrect, evaluation.demo.cases)}%</strong><small>{evaluation.demo.allCorrect} of {evaluation.demo.cases} fully correct</small></div>
              <div className="kpi-card"><span>New emails</span><strong>{pct(heldOut.allCorrect, heldOut.cases)}%</strong><small>{heldOut.allCorrect} of {heldOut.cases} fully correct</small></div>
              <div className="kpi-card"><span>Mistakes caught by review</span><strong>{evaluation.all.caughtByReview}</strong><small>Held for a person instead of applied</small></div>
              <div className="kpi-card"><span>Mistakes applied silently</span><strong>{evaluation.all.silentErrors}</strong><small>The number a model-based parser must drive down</small></div>
            </div>
            <p className="notify-note">
              Parser: {evaluation.parser}. On new emails, event type was right {heldOut.byField.event}% of the time,
              dollar figures {heldOut.byField.amount}%, days {heldOut.byField.days}%, project routing {heldOut.byField.project}%.
            </p>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Email</th><th>Wrong</th><th>Expected</th><th>Got</th><th>Outcome</th></tr></thead>
                <tbody>
                  {evaluation.failures.map((failure) => (
                    <tr key={failure.id}>
                      <td>{failure.subject}<small className="table-subline">{failure.set}</small></td>
                      <td>{failure.wrong.join(', ')}</td>
                      <td>{failure.wrong.map((field) => `${field}: ${failure.expect[field] ?? 'none'}`).join('; ')}</td>
                      <td>{failure.wrong.map((field) => `${field}: ${failure.got[field] ?? 'none'}`).join('; ')}</td>
                      <td><span className={`delivery-pill ${failure.held ? 'delivered' : 'failed'}`}>{failure.held ? 'caught by review' : 'applied silently'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header"><h2>What a pilot could look like</h2></div>
        <ol className="setup-steps">
          <li><strong>Week 1:</strong> connect one shared project inbox and one real schedule export. Replace the keyword reader with a model and re-run this evaluation on Nevell's own emails.</li>
          <li><strong>Week 2:</strong> load Nevell's unit costs so pricing drafts use real rates. Estimators approve every draft.</li>
          <li><strong>Weeks 3 and 4:</strong> measure time to a ready draft, edits per draft, and silent errors on live traffic. Expand only if silent errors stay near zero.</li>
        </ol>
      </section>
    </>
  )
}
