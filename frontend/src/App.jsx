import { useEffect, useState } from 'react'
import './App.css'

// Single source of truth for the backend address.
// Use the local backend while developing, then swap to the live Render URL
// once you've pushed api.py and Render has redeployed with the new endpoints.
//const API_BASE = 'http://127.0.0.1:8000'
const API_BASE = 'https://revive-pay-ai.onrender.com'

const initialForm = {
  transaction_amount: '', customer_tenure_months: '', retry_count: '0', gateway_response_time_ms: '',
  failure_reason: 'insufficient_funds', payment_method: 'Electronic check', customer_segment: 'new_customer',
}

const actionLabels = {
  immediate_retry: 'Retry immediately', delayed_retry: 'Schedule delayed retry',
  send_incentive: 'Send recovery incentive', switch_payment_method: 'Switch payment method',
  escalate_to_manual_review: 'Escalate to manual review',
}

const channelLabels = {
  payment_gateway_auto_retry: 'Payment gateway · automatic retry',
  payment_gateway_scheduled_retry: 'Payment gateway · scheduled retry',
  sms_and_email_offer: 'SMS and email offer',
  sms_prompt_update_method: 'SMS prompt to update payment method',
  internal_ops_queue: 'Internal operations queue',
}

function formatIndianCurrency(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '₹0.00L'
  return `₹${(amount / 100000).toFixed(2)}L`
}

function formatTimestamp(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [impact, setImpact] = useState(null)
  const [impactLoading, setImpactLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const handleChange = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))

  const loadImpact = async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/impact-summary`, { signal })
      if (!response.ok) throw new Error('Impact summary unavailable')
      setImpact(await response.json())
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Impact summary fetch failed:', err)
    } finally {
      if (!signal?.aborted) setImpactLoading(false)
    }
  }

  const loadHistory = async (signal) => {
    try {
      const response = await fetch(`${API_BASE}/audit-trail?limit=10`, { signal })
      if (!response.ok) throw new Error('Audit trail unavailable')
      const data = await response.json()
      setHistory((data.records || []).slice().reverse())
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Audit trail fetch failed:', err)
    } finally {
      if (!signal?.aborted) setHistoryLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadImpact(controller.signal)
    loadHistory(controller.signal)
    return () => controller.abort()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    const payload = {
      ...form, transaction_amount: Number(form.transaction_amount),
      customer_tenure_months: Number(form.customer_tenure_months), retry_count: Number(form.retry_count),
      gateway_response_time_ms: Number(form.gateway_response_time_ms),
    }
    try {
      const response = await fetch(`${API_BASE}/predict-and-decide`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Prediction request failed')
      const data = await response.json()
      setResult(data)
      loadHistory()
    } catch {
      setError(`Couldn't reach the recovery agent — check the API is running at ${API_BASE}`)
    } finally {
      setLoading(false)
    }
  }

  const probability = result ? Math.min(100, Math.max(0, result.probability * 100)) : 0
  const isManualReview = result?.recommended_action === 'escalate_to_manual_review'

  return <main className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="app-header"><div className="brand-mark" aria-hidden="true"><img src="/favi.svg" alt="" /></div><div><p className="eyebrow">PAYMENT INTELLIGENCE</p><h1>RevivePay <em>AI</em></h1><p className="subtitle">Agentic Payment Failure Recovery System</p></div><div className="live-status"><i />System ready</div></header>
    <section className="workspace" aria-label="Payment recovery prediction">
      <div className="intro"><div><p className="section-kicker">RECOVERY COMMAND CENTER</p><h2>Turn failed payments into<br /><span>recovered revenue.</span></h2></div><p>Give the recovery agent transaction context and receive a data-driven next best action in seconds.</p></div>

      {(impactLoading || impact) && <section className="impact-section" aria-busy={impactLoading}>
        <div className="impact-heading"><div><p className="section-kicker">MEASURED PERFORMANCE</p><h3>Recovery performance</h3></div><p>Measured lift from intelligent payment recovery decisions.</p></div>
        <div className={`impact-grid ${impactLoading ? 'is-loading' : ''}`}>
          {impactLoading ? Array.from({ length: 5 }, (_, index) => <div className="impact-card impact-skeleton" key={index}><span /><strong /><small /></div>) : <>
            <article className="impact-card"><p>Baseline recovery</p><strong>{formatIndianCurrency(impact.baseline_recovered)}</strong><small>{(impact.baseline_recovery_rate * 100).toFixed(2)}% recovery rate</small></article>
            <article className="impact-card"><p>With RevivePay AI</p><strong>{formatIndianCurrency(impact.total_recovered_with_system)}</strong><small>Total recovered revenue</small></article>
            <article className="impact-card impact-highlight"><p><span className="impact-arrow">↗</span>Additional recovered</p><strong>{formatIndianCurrency(impact.additional_recovered)}</strong><small>Revenue recovered above baseline</small></article>
            <article className="impact-card"><p>Improvement</p><strong>{Number(impact.improvement_percentage).toFixed(2)}%</strong><small>Lift over baseline recovery</small></article>
            <article className="impact-card"><p>Wasted retries avoided</p><strong>{formatIndianCurrency(impact.wasted_retry_avoided)}</strong><small>Across {impact.card_expired_cases_count} cases</small></article>
          </>}
        </div>
      </section>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="card-heading"><div className="heading-icon">↗</div><div><h3>Transaction details</h3><p>Enter the signals from the failed attempt</p></div></div>
        <div className="form-grid">
          <label>Transaction amount <span>USD</span><div className="input-wrap"><b>$</b><input name="transaction_amount" type="number" min="0" step="0.01" value={form.transaction_amount} onChange={handleChange} placeholder="0.00" required /></div></label>
          <label>Customer tenure <span>MONTHS</span><div className="input-wrap"><input name="customer_tenure_months" type="number" min="0" step="1" value={form.customer_tenure_months} onChange={handleChange} placeholder="e.g. 24" required /></div></label>
          <label>Retry count <span>ATTEMPTS</span><div className="input-wrap"><input name="retry_count" type="number" min="0" max="3" step="1" value={form.retry_count} onChange={handleChange} required /></div></label>
          <label>Gateway response time <span>MS</span><div className="input-wrap"><input name="gateway_response_time_ms" type="number" min="0" step="1" value={form.gateway_response_time_ms} onChange={handleChange} placeholder="e.g. 420" required /></div></label>
          <label>Failure reason<select name="failure_reason" value={form.failure_reason} onChange={handleChange}><option value="insufficient_funds">Insufficient funds</option><option value="card_expired">Card expired</option><option value="network_error">Network error</option><option value="bank_decline">Bank decline</option></select></label>
          <label>Payment method<select name="payment_method" value={form.payment_method} onChange={handleChange}><option>Electronic check</option><option>Mailed check</option><option>Bank transfer (automatic)</option><option>Credit card (automatic)</option></select></label>
          <label className="wide-field">Customer segment<select name="customer_segment" value={form.customer_segment} onChange={handleChange}><option value="high_value_repeat">High value repeat</option><option value="occasional">Occasional</option><option value="new_customer">New customer</option></select></label>
        </div>
        <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" />Evaluating...</> : <>Predict &amp; Decide <span>→</span></>}</button>
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>

      {result && <section className={`results-card ${isManualReview ? 'manual-review' : ''}`} aria-live="polite">
        <div className="result-summary">
          <p className="section-kicker">RECOVERY FORECAST</p>
          <div className="probability-reading"><strong>{probability.toFixed(1)}%</strong><span>recovery probability</span></div>
          <div className="probability-bar" role="progressbar" aria-label="Recovery probability" aria-valuemin="0" aria-valuemax="100" aria-valuenow={probability}><span style={{ width: `${probability}%` }} /></div>
          <p className="probability-copy">Likelihood of successfully recovering this payment from the available transaction signals.</p>
        </div>
        <div className="recommendation">
          <p className="section-kicker">RECOMMENDED ACTION</p>
          <h3>{actionLabels[result.recommended_action] || result.recommended_action}</h3>
          <p className="channel-label">Via {channelLabels[result.escalation_channel] || result.escalation_channel}</p>
          <p className="explanation">{result.explanation}</p>
          <div className="audit-footer"><span><b>Audit ID</b>{result.audit_id}</span><span><b>Timestamp</b>{result.timestamp}</span></div>
        </div>
      </section>}

      <section className="history-section">
        <div className="history-heading"><div><p className="section-kicker">AUDIT TRAIL</p><h3>Recent decisions</h3></div><p>The last 10 recovery decisions logged by the system, most recent first.</p></div>
        {historyLoading ? <div className="history-empty">Loading audit history…</div>
          : history.length === 0 ? <div className="history-empty">No decisions recorded yet — submit a transaction above to get started.</div>
          : <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Time</th><th>Amount</th><th>Failure reason</th><th>Action</th><th>Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => <tr key={row.audit_id}>
                    <td>{formatTimestamp(row.timestamp)}</td>
                    <td>₹{Number(row.transaction_amount).toLocaleString('en-IN')}</td>
                    <td>{row.failure_reason.replaceAll('_', ' ')}</td>
                    <td><span className={`action-pill ${row.recommended_action}`}>{actionLabels[row.recommended_action] || row.recommended_action}</span></td>
                    <td>{(Number(row.probability) * 100).toFixed(1)}%</td>
                  </tr>)}
                </tbody>
              </table>
            </div>}
      </section>
    </section><footer><span>REVIVEPAY INTELLIGENCE</span><span>•</span><span>Decision engine online</span></footer>
  </main>
}

export default App