# RevivePay AI — Agentic Payment Failure Recovery System

**Razorpay AI Builder Internship 2026 — Track 3: AI Revenue Recovery**

An end-to-end machine learning system that predicts whether a failed payment can be recovered, and recommends a specific, explainable recovery action (immediate retry, delayed retry, switch payment method, send incentive, or escalate to manual review) instead of applying a single generic rule to every failure — with measured business impact, stopping rules, escalation routing, and a persistent audit trail.

## Live Demo

- **Web app:** https://revive-pay-ai.vercel.app
- **API docs (Swagger UI):** https://revive-pay-ai.onrender.com/docs

> Note: the backend is hosted on Render's free tier, which spins down after periods of inactivity. The first request after a period of inactivity may take up to a minute to respond while the server wakes up.

## Problem Statement

Payment gateways and fintech platforms lose significant revenue every time a transaction fails due to insufficient funds, expired cards, network errors, or bank declines. Most businesses either retry blindly, wasting attempts and annoying customers, or don't retry at all, losing recoverable revenue.

A generic "retry after 24 hours for every failure" rule gets easy cases wrong in both directions: an insufficient-funds failure often needs time (for a salary credit, for example) rather than an instant retry, while a card-expired failure will never recover through any retry, no matter how many attempts or how long the wait.

This project looks at each failed transaction individually — why it failed, how much it was for, who the customer is, and their payment history — and recommends a specific action along with a short explanation, instead of one generic response for every case. It also enforces a stopping rule so the system doesn't retry indefinitely, routes each action to an appropriate channel, and logs every decision to a persistent, queryable audit trail.

## Approach

The project follows ten stages, each documented in its own notebook or module:

1. **Data preparation** — Telco Customer Churn (Kaggle) reframed into payment-domain language, extended with synthetic transaction fields (`retry_count`, `failure_reason`, `gateway_response_time_ms`) generated with realistic, correlated logic rather than pure randomness, and rescaled to a realistic INR transaction range.
2. **Exploratory data analysis** — recovery rate broken down by failure reason, customer segment, payment method, and retry count, establishing which signals actually predict recovery.
3. **Feature engineering** — derived flags (`is_high_value_transaction`, `is_repeat_failure`) and one-hot encoding of categorical fields.
4. **Class imbalance handling** — confirmed the target was close to balanced (~48/52), and used `class_weight='balanced'` at training time rather than oversampling with SMOTE.
5. **Model training and comparison** — Logistic Regression, Random Forest, and XGBoost trained and compared on precision, recall, F1, and ROC-AUC, with recall on the "recoverable" class prioritized as the key business metric.
6. **Hyperparameter tuning** — `GridSearchCV` used to tune the winning model.
7. **Decision agent layer** — a rule-based function that combines the model's predicted probability with `failure_reason`, `customer_segment`, and `retry_count` to recommend one of five actions, each with a plain-language explanation. A stopping rule forces escalation to manual review once a transaction has been retried past a configurable limit, regardless of what the model predicts. Every action is mapped to a delivery channel (auto-retry queue, scheduled retry, SMS/email offer, or an internal operations queue).
8. **Deployment** — a FastAPI backend serving the model and decision agent, and a React frontend for interactive use, both deployed live (Render + Vercel). The frontend also surfaces the measured business impact and a live audit history, not just single-transaction predictions.
9. **Business impact calculation** — estimated revenue recovered under the recommended actions, compared to a no-action baseline, using the test set; served live via a dedicated API endpoint and displayed on the frontend.
10. **Documentation** — this README and an accompanying pitch video.

## Key Findings

- **Logistic Regression outperformed Random Forest and XGBoost** on every metric that mattered, including the priority metric, recall on the recoverable class. The target variable was built from fairly clean, largely additive rules, which favours a linear model over tree ensembles — a useful reminder that model complexity should follow the structure of the data, not assumptions about which algorithm is "best."
- **Hyperparameter tuning provided a modest, genuine improvement** in recall (from roughly 0.83 to 0.86), confirming the default settings were already close to optimal for this data rather than dramatically transforming performance.
- **A currency-scale bug was found and fixed during deployment testing**: the training data initially inherited USD-scale transaction amounts from the source dataset (roughly $18–120), which caused the model to behave unpredictably — probabilities collapsing toward zero — on realistic INR-scale transaction amounts (e.g. ₹2,500). This was corrected by rescaling the feature to a realistic INR range and retraining end to end.
- **A feature-count mismatch was found and fixed during deployment**: an experimental interaction feature (`high_retry_low_value`) tested during model iteration was accidentally left in a saved feature set and model, causing a production `ValueError` when the API's 17-feature input didn't match the model's 18 expected features. Traced back to the source feature-engineering notebook, regenerated cleanly, and verified the deployed model's feature list before redeploying.
- **Business impact**: across 1,409 test transactions worth roughly ₹10.9L in failed payments, the natural (no-action) recovery rate was about 50.6%. Applying the model's recommended actions to transactions flagged as recoverable, and assuming a conservative 40% success rate on that targeted outreach, the system could recover an estimated additional ~₹1.1–1.3L — a 20–24% improvement over doing nothing. Separately, the system correctly identifies roughly ₹2.2L across ~278 transactions as unrecoverable card-expired cases, avoiding wasted retry attempts on payments that were never going to succeed.

## Tech Stack

| Layer | Tools |
|---|---|
| Data & EDA | Python, Pandas, NumPy, Matplotlib, Seaborn |
| Modeling | scikit-learn (Logistic Regression, Random Forest), XGBoost |
| Decision agent | Python rule engine (stopping rules, channel routing, audit logging) |
| Backend | FastAPI, Uvicorn |
| Frontend | React (Vite) |
| Deployment | Render (API), Vercel (frontend) |
| Version control | Git & GitHub |

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/predict-and-decide` | POST | Takes transaction details, returns recovery probability, recommended action, escalation channel, explanation, and an audit ID. Logs the decision. |
| `/impact-summary` | GET | Returns the precomputed business impact figures from the Step 9 test-set analysis. |
| `/audit-trail` | GET | Returns the most recent logged decisions (default 50, configurable via `?limit=`). |
| `/docs` | GET | Interactive Swagger UI for testing all endpoints directly. |

## Repository Structure

```
RevivePay AI/
├── Data/                          # Prepared datasets, train/test splits, audit log, impact summary
├── src/
│   ├── data_prep_01.ipynb         # Data preparation (incl. currency rescaling)
│   ├── data_prep_02.ipynb         # EDA
│   ├── data_prep_03.ipynb         # Feature engineering
│   ├── data_prep_04.ipynb         # Train/test split, imbalance check
│   ├── model_training.ipynb       # Model training, tuning
│   ├── agent.ipynb    # Decision agent + business impact
│   ├── api.py                     # FastAPI backend (prediction, impact, audit trail)
│   └── final_model.pkl            # Trained, tuned model (17 features)
├── frontend/                      # React application
├── requirements.txt
└── README.md
```

## Running Locally

**Backend:**
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn src.api:app --reload
```
The API will be available at `http://127.0.0.1:8000/docs`.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Open the printed local address in a browser. The app reads the backend address from a single `API_BASE` constant in `src/App.jsx` — set it to `http://127.0.0.1:8000` for local testing or the live Render URL for production, and keep both the prediction and impact/audit-trail calls pointed at the same value.

## Known Limitations

- **Synthetic data**: the dataset is built from a public churn dataset extended with synthetic, rule-based payment fields, since real payment-failure data is not publicly available. The model's behaviour reflects the assumptions built into that synthetic generation (for example, that `card_expired` recovers roughly 5–8% of the time). Before real-world deployment, the model would need to be retrained and its assumptions validated against actual historical transaction data.
- **Free-tier hosting**: the backend may take up to a minute to respond after a period of inactivity, due to Render's free-tier cold start.
- **Recommendation, not execution**: the system recommends an action, routes it to a named channel, and logs the decision — it does not automatically send retries, emails, or incentives through a real payment gateway or messaging service. This was a deliberate choice to keep a human in the loop for financial actions rather than fully automating them; the escalation channels are logical labels, not live integrations.
- **Stateless retry counting**: the stopping rule relies on the `retry_count` supplied in each request rather than server-side transaction state, since the API does not persist per-transaction history beyond the audit log. A production version would track retries server-side per transaction ID.
- **Audit log persistence on free hosting**: `/audit-trail` is backed by a CSV file written on demand by the API. This works reliably during an active session, but Render's free tier does not guarantee persistent disk storage — the file can be reset when the service restarts (on redeploy, or after waking from a cold start), since only what's committed to the GitHub repository is guaranteed to survive. A production deployment would write audit entries to an external, durable store (e.g. PostgreSQL) instead of the local filesystem.
- **Precomputed impact figures**: `/impact-summary` serves a snapshot calculated once from the test set in Step 9, not a live recalculation over real transaction volume.
- **scikit-learn version mismatch**: the model was originally trained under scikit-learn 1.8 and is loaded under 1.9 in the deployed environment. This has not caused observed issues but has not been formally re-validated.

## Author

Built as part of the Razorpay AI Builder Internship 2026 application, Track 3: AI Revenue Recovery.
