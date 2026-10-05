export type Account = {
  id: string
  name: string
  title: string
  summary: string
  views: ('portfolio' | 'approvals' | 'services' | 'operations' | 'value')[]
  landing: 'portfolio' | 'approvals' | 'services' | 'operations' | 'value'
  projectIds: number[] | null
  alertOwners: string[] | null
  canManageNotifications: boolean
  canReviewEmails: boolean
}

const viewLabels: Record<Account['views'][number], string> = {
  portfolio: 'Portfolio',
  approvals: 'Approvals',
  services: 'Service lines',
  operations: 'Internal operations',
  value: 'Operational Impact',
}

export const initials = (name: string) =>
  name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

export function LoginScreen({
  accounts,
  error,
  onSignIn,
}: {
  accounts: Account[]
  error: string | null
  onSignIn: (accountId: string) => void
}) {
  return (
    <div className="login-shell">
      <header className="login-header">
        <p className="eyebrow">Nevell Group Internal Ops</p>
        <h1>Sign in</h1>
        <p>
          Each role sees only the views and data it needs. Demo sign-in: choose an account, no password.
        </p>
        <p>
          <a className="login-lab-link" href="/admin/email-lab" target="_blank" rel="noopener noreferrer">Open the email lab</a>
        </p>
      </header>

      {error && <p className="alert-error" role="alert">{error}</p>}

      <ul className="account-grid">
        {accounts.map((account) => (
          <li key={account.id}>
            <button type="button" className="account-card" onClick={() => onSignIn(account.id)}>
              <span className="account-avatar" aria-hidden="true">{initials(account.name)}</span>
              <span className="account-name">{account.name}</span>
              <span className="account-title">{account.title}</span>
              <span className="account-summary">{account.summary}</span>
              <span className="account-views">
                {account.views.map((view) => viewLabels[view]).join(' \u00b7 ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
