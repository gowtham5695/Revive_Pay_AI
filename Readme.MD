# RevivePay AI — Agentic Payment Failure Recovery System

**Razorpay AI Builder Internship 2026 — Track 3: AI Revenue Recovery**

An end-to-end machine learning system that predicts whether a failed payment can be recovered, and recommends a specific, explainable recovery action (immediate retry, delayed retry, switch payment method, or send incentive) instead of applying a single generic rule to every failure.

## Live Demo

- **Web app:** https://revive-pay-ai.vercel.app
- **API docs (Swagger UI):** https://revive-pay-ai.onrender.com/docs

> Note: the backend is hosted on Render's free tier, which spins down after periods of inactivity. The first request after a period of inactivity may take up to a minute to respond while the server wakes up.

## Problem Statement

Payment gateways and fintech platforms lose significant revenue every time a transaction fails due to insufficient funds, expired cards, network errors, or bank declines. Most businesses either retry blindly, wasting attempts and annoying customers, or don't retry at all, losing recoverable revenue.

A generic "retry after 24 hours for every failure" rule gets easy cases wrong in both directions: an insufficient-funds failure often needs time (for a salary credit, for example) rather than an instant retry, while a card-expired failure will never recover through any retry, no matter how many attempts or how long the wait.

This project looks at each failed transaction individually — why it failed, how much it was for, who the customer is, and their payment history — and recommends a specific action along with a short explanation, instead of one generic response for every case.

## Approach

The project follows ten stages, each documented in its own notebook or module:

1. **Data preparation** — Telco Customer Churn (Kaggle) reframed into payment-domain language, extended with synthetic transaction fields (`retry_count`, `failure_reason`, `gateway_response_time_ms`) generated with realistic, correlated logic rather than pure randomness.
2. **Exploratory data analysis** — recovery rate broken down by failure reason, customer segment, payment method, and retry count, establishing which signals actually predict recovery.
3. **Feature engineering** — derived flags (`is_high_value_transaction`, `is_repeat_failure`) and one-hot encoding of categorical fields.
4. **Class imbalance handling** — confirmed the target was close to balanced (~48/52), and used `class_weight='balanced'` at training time rather than oversampling with SMOTE.
5. **Model training and comparison** — Logistic Regression, Random Forest, and XGBoost trained and compared on precision, recall, F1, and ROC-AUC, with recall on the "recoverable" class prioritized as the key business metric.
6. **Hyperparameter tuning** — `GridSearchCV` used to tune the winning model.
7. **Decision agent layer** — a rule-based function that combines the model's predicted probability with `failure_reason`, `customer_segment`, and `retry_count` to recommend one of four actions, each with a plain-language explanation.
8. **Deployment** — a FastAPI backend serving the model and decision agent, and a React frontend for interactive use, both deployed live (Render + Vercel).
9. **Business impact calculation** — estimated revenue recovered under the recommended actions, compared to a no-action baseline, using the test set.
10. **Documentation** — this README and an accompanying pitch video.

## Key Findings

- **Logistic Regression outperformed Random Forest and XGBoost** on every metric that mattered, including the priority metric, recall on the recoverable class (0.86 vs 0.68 and 0.73 respectively). The target variable was built from fairly clean, largely additive rules, which favours a linear model over tree ensembles — a useful reminder that model complexity should follow the structure of the data, not assumptions about which algorithm is "best."
- **Hyperparameter tuning provided a small, genuine improvement** in recall, confirming the default settings were already close to optimal for this data rather than dramatically transforming performance.
- **A currency-scale bug was found and fixed during deployment testing**: the training data inherited USD-scale transaction amounts from the source dataset, which caused the model to behave unpredictably on realistic INR-scale transaction amounts. This was corrected by rescaling the feature and retraining.
- **Business impact**: across 1,409 test transactions worth ₹10.88 lakh in failed payments, the natural (no-action) recovery rate was 50.6%. Applying the model's recommended actions to transactions flagged as recoverable, and assuming a conservative 40% success rate on that targeted outreach, the system could recover an estimated additional ₹1.30 lakh — a 23.6% improvement over doing nothing. Separately, the system correctly identifies ₹2.21 lakh across 278 transactions as unrecoverable card-expired cases, avoiding wasted retry attempts on payments that were never going to succeed.

## Tech Stack

| Layer | Tools |
|---|---|
| Data & EDA | Python, Pandas, NumPy, Matplotlib, Seaborn |
| Modeling | scikit-learn (Logistic Regression, Random Forest), XGBoost |
| Decision agent | Python rule engine |
| Backend | FastAPI, Uvicorn |
| Frontend | React (Vite) |
| Deployment | Render (API), Vercel (frontend) |
| Version control | Git & GitHub |

## Repository Structure

```
RevivePay AI/
├── Data/                   # Prepared datasets and train/test splits
├── src/
│   ├── data_prep_01.ipynb  # Data preparation
│   ├── data_prep_02.ipynb  # EDA
│   ├── data_prep_03.ipynb  # Feature engineering
│   ├── data_prep_04.ipynb  # Train/test split, imbalance check
│   ├── model_training.ipynb# Model training, tuning
│   ├── agent.ipynb         # Decision agent + business impact
│   ├── api.py               # FastAPI backend
│   └── final_model.pkl      # Trained, tuned model
├── frontend/                # React application
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
Open the printed local address in a browser. Update the API URL inside `src/App.jsx` to `http://127.0.0.1:8000/predict-and-decide` if testing against a local backend rather than the deployed one.

## Known Limitations

- **Synthetic data**: the dataset is built from a public churn dataset extended with synthetic, rule-based payment fields, since real payment-failure data is not publicly available. The model's behaviour reflects the assumptions built into that synthetic generation (for example, that `card_expired` recovers ~5–8% of the time). Before real-world deployment, the model would need to be retrained and its assumptions validated against actual historical transaction data.
- **Free-tier hosting**: the backend may take up to a minute to respond after a period of inactivity, due to Render's free-tier cold start.
- **Recommendation, not execution**: the system recommends an action and explanation; it does not automatically send retries, emails, or incentives. This was a deliberate choice to keep a human in the loop for financial actions rather than fully automating them.
- **scikit-learn version mismatch**: the model was originally trained under scikit-learn 1.8 and is loaded under 1.9 in the deployed environment. This has not caused observed issues but has not been formally re-validated.

## Author

Built as part of the Razorpay AI Builder Internship 2026 application, Track 3: AI Revenue Recovery.