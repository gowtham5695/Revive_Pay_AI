from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load('src/final_model.pkl')

print("Model loaded successfully")


class TransactionRequest(BaseModel):
    transaction_amount: float
    customer_tenure_months: int
    retry_count: int
    gateway_response_time_ms: float
    failure_reason: str
    payment_method: str
    customer_segment: str


def recommend_action(probability, failure_reason, customer_segment, retry_count):

    if failure_reason == 'card_expired':
        action = 'switch_payment_method'
        explanation = "Failure reason is card_expired, which almost never recovers through retries. Recommending the customer update their payment method instead."

    elif failure_reason == 'insufficient_funds' and probability >= 0.4:
        action = 'delayed_retry'
        explanation = f"Failure reason is insufficient_funds with a reasonable recovery probability ({probability:.2f}). Waiting allows time for the customer's balance to potentially refill before retrying."

    elif probability >= 0.7:
        action = 'immediate_retry'
        explanation = f"High recovery probability ({probability:.2f}) with no time-dependent failure reason. Retrying immediately is likely to succeed."

    elif probability < 0.5 and customer_segment == 'high_value_repeat':
        action = 'send_incentive'
        explanation = f"Recovery probability is moderate-to-low ({probability:.2f}), but customer is high-value and repeat. Worth offering an incentive to actively recover this payment."

    else:
        action = 'delayed_retry'
        explanation = f"No strong signal for immediate action (probability={probability:.2f}). Defaulting to a low-cost delayed retry rather than an expensive incentive."

    return action, explanation


@app.post("/predict-and-decide")
def predict_and_decide(transaction: TransactionRequest):

    input_dict = {
        'transaction_amount': transaction.transaction_amount,
        'customer_tenure_months': transaction.customer_tenure_months,
        'retry_count': transaction.retry_count,
        'gateway_response_time_ms': transaction.gateway_response_time_ms,
        'is_high_value_transaction': int(transaction.transaction_amount > 846.3),
        'is_repeat_failure': int(transaction.retry_count > 0),
    }

    for reason in ['bank_decline', 'card_expired', 'insufficient_funds', 'network_error']:
        input_dict[f'failure_reason_{reason}'] = 1 if transaction.failure_reason == reason else 0

    for method in ['Bank transfer (automatic)', 'Credit card (automatic)', 'Electronic check', 'Mailed check']:
        input_dict[f'payment_method_{method}'] = 1 if transaction.payment_method == method else 0

    for segment in ['high_value_repeat', 'new_customer', 'occasional']:
        input_dict[f'customer_segment_{segment}'] = 1 if transaction.customer_segment == segment else 0

    input_df = pd.DataFrame([input_dict])

    probability = model.predict_proba(input_df)[:, 1][0]

    action, explanation = recommend_action(
        probability, transaction.failure_reason, transaction.customer_segment, transaction.retry_count
    )

    return {
        "probability": round(float(probability), 4),
        "recommended_action": action,
        "explanation": explanation
    }