import { useState } from 'react'
import './App.css'

const initialForm = { transaction_amount: '', customer_tenure_months: '', retry_count: '0', gateway_response_time_ms: '', failure_reason: 'insufficient_funds', payment_method: 'Electronic check', customer_segment: 'new_customer' }
const actionLabels = { immediate_retry: 'Retry immediately', delayed_retry: 'Schedule delayed retry', switch_payment_method: 'Update payment method', send_incentive: 'Send recovery incentive' }

function App() {
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleChange = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))
  const handleSubmit = async (event) => {
    event.preventDefault(); setLoading(true); setError('')
    const payload = { ...form, transaction_amount: Number(form.transaction_amount), customer_tenure_months: Number(form.customer_tenure_months), retry_count: Number(form.retry_count), gateway_response_time_ms: Number(form.gateway_response_time_ms) }
    try {
      const response = await fetch('https://revive-pay-ai.onrender.com/predict-and-decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('Prediction request failed')
      setResult(await response.json())
    } catch { setResult(null); setError('Could not reach the prediction service. Please make sure the API is running and try again.') } finally { setLoading(false) }
  }
  const probability = result ? Math.round(result.probability * 100) : 0
  return <main className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="app-header"><div className="brand-mark" aria-hidden="true"><img src="/favi.svg" alt="" /></div><div><p className="eyebrow">PAYMENT INTELLIGENCE</p><h1>RevivePay <em>AI</em></h1><p className="subtitle">Agentic Payment Failure Recovery System</p></div><div className="live-status"><i />System ready</div></header>
    <section className="workspace" aria-label="Payment recovery prediction">
      <div className="intro"><div><p className="section-kicker">RECOVERY COMMAND CENTER</p><h2>Turn failed payments into<br /><span>recovered revenue.</span></h2></div><p>Give the recovery agent transaction context and receive a data-driven next best action in seconds.</p></div>
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
        <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" />Analyzing recovery path...</> : <>Predict &amp; Decide <span>→</span></>}</button>{error && <p className="error-message" role="alert">{error}</p>}
      </form>
      {result && <section className="results-card" aria-live="polite"><div className="result-main"><p className="section-kicker">RECOVERY FORECAST</p><div className="probability-row"><div className="progress-ring" style={{ '--progress': `${probability * 3.6}deg` }}><div><strong>{probability}%</strong><small>success chance</small></div></div><div><h3>Payment recovery<br />probability</h3><p>Likelihood of a successful recovery based on this transaction’s signals.</p></div></div></div><div className="recommendation"><p className="section-kicker">RECOMMENDED ACTION</p><span className={`action-pill ${result.recommended_action}`}>{actionLabels[result.recommended_action] || result.recommended_action}</span><p className="explanation">{result.explanation}</p></div></section>}
    </section><footer><span>REVIVEPAY INTELLIGENCE</span><span>•</span><span>Decision engine online</span></footer>
  </main>
}
export default App
