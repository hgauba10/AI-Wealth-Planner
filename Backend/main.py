import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables first before configuring services
load_dotenv()

from database import engine, SessionLocal
from models import Base, UserPlan
from auth import hash_password
from auth import verify_password
from models import User

Base.metadata.create_all(bind=engine)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
         "https://ai-wealth-planner.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserData(BaseModel):
    income: float
    expenses: float
    savings: float
    risk: str
    goal: str
    city: str
    age: int
    horizon: str


class SavePlanRequest(BaseModel):
    name: str
    age: int
    city: str
    income: float
    expenses: float
    savings: float
    goal: str
    risk: str
    horizon: str
    advice: str
    userId: int
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str
class LoginRequest(BaseModel):
    email: str
    password: str

@app.get("/")
def root():
    return {"message": "AI Wealth Planner API"}


def future_value(monthly, annual_rate, years):
    r = annual_rate / 100 / 12
    n = years * 12
    return monthly * (((1 + r) ** n - 1) / r)


@app.post("/analyze")
def analyze(data: UserData):
    # Base variables calculated first to prevent NameError
    surplus = data.income - data.expenses
    monthly_investment = surplus
    recommended_emergency_fund = data.expenses * 6

    goal_target = 0

    if data.goal == "Retirement":
        goal_target = 5000000
    elif data.goal == "House":
        goal_target = 3000000
    elif data.goal == "Child Education":
        goal_target = 2500000
    elif data.goal == "Wealth Creation":
        goal_target = 10000000
    elif data.goal == "Emergency Fund":
        goal_target = recommended_emergency_fund
    else:
        goal_target = 1000000

    annual_investment = monthly_investment * 12

    estimated_years = (
        round(goal_target / annual_investment, 1)
        if annual_investment > 0
        else 0
    )
    
    goal_progress = (
        min((data.savings / goal_target) * 100, 100)
        if goal_target > 0
        else 0
    )

    emergency_progress = (
        min((data.savings / recommended_emergency_fund) * 100, 100)
        if recommended_emergency_fund > 0
        else 0
    )

    savings_rate = (
        (surplus / data.income) * 100
        if data.income > 0
        else 0
    )

    if savings_rate > 50:
        health_score = 100
    elif savings_rate > 30:
        health_score = 80
    elif savings_rate > 20:
        health_score = 60
    elif savings_rate > 10:
        health_score = 40
    else:
        health_score = 20

    prompt = f"""
        You are a financial advisor.

        User Details:
        Age: {data.age}
        Income: {data.income}
        Expenses: {data.expenses}
        Savings: {data.savings}
        Goal: {data.goal}
        Risk Appetite: {data.risk}
        Investment Horizon: {data.horizon}
        Savings Rate: {savings_rate:.2f}%
        Financial Health Score: {health_score}/100

        Give concise personalized financial advice
        in 3-5 sentences.Provide advice for Indian investors only.
        Use Indian financial products such as PPF, NPS, SIP, FD, Debt Funds, Gold ETFs.
        Do not mention 401(k), IRA, Roth IRA or US-specific investment products.
        """
    try:
        response = model.generate_content(prompt)
        advice = response.text
    except Exception as e:
        print("Gemini Error:", e)
        advice = "AI advice temporarily unavailable due to API limits."

    investments = []
    action_plan = []

    # Retirement Strategy
    if data.goal == "Retirement":
        if data.risk == "High":
            if data.horizon == "1-3 Years":
                equity_allocation = 20
                ppf_allocation = 40
                nps_allocation = 40
            elif data.horizon == "3-5 Years":
                equity_allocation = 40
                ppf_allocation = 30
                nps_allocation = 30
            elif data.horizon == "5-10 Years":
                equity_allocation = 60
                ppf_allocation = 20
                nps_allocation = 20
            else:  # 10+ Years
                if data.age < 35:
                    equity_allocation = 70
                    ppf_allocation = 15
                    nps_allocation = 15
                else:
                    equity_allocation = 40
                    ppf_allocation = 30
                    nps_allocation = 30

            equity_amount = round(surplus * equity_allocation / 100)
            ppf_amount = round(surplus * ppf_allocation / 100)
            nps_amount = round(surplus * nps_allocation / 100)

            investments = [
                {
                    "name": "Equity SIP",
                    "risk": "High",
                    "returns": "12-15%",
                    "allocation": equity_allocation,
                    "explanation": "Long-term wealth creation for retirement.",
                    "institution": "Groww / Zerodha Coin",
                    "steps": [
                        "Open Demat account",
                        "Complete KYC verification",
                        "Select mutual fund",
                        "Set monthly SIP amount",
                        "Enable auto-debit from bank",
                        "Review performance every 6 months"
                    ]
                },
                {
                    "name": "PPF",
                    "risk": "Low",
                    "returns": "7-8%",
                    "allocation": ppf_allocation,
                    "explanation": "Tax-efficient retirement savings.",
                    "institution": "State Bank of India",
                    "steps": [
                        "Visit nearest SBI branch",
                        "Carry Aadhaar Card",
                        "Carry PAN Card",
                        "Fill PPF account opening form",
                        "Deposit minimum ₹500",
                        "Activate online banking access"
                    ]
                },
                {
                    "name": "NPS",
                    "risk": "Medium",
                    "returns": "9-12%",
                    "allocation": nps_allocation,
                    "explanation": "Retirement-focused investment product.",
                    "institution": "NPS Trust",
                    "steps": [
                        "Visit NPS portal",
                        "Register with PAN",
                        "Complete KYC verification",
                        "Choose pension fund manager",
                        "Select asset allocation",
                        "Start monthly contributions"
                    ]
                }
            ]

            action_plan = [
                "Build an emergency fund covering 6 months of expenses",
                f"Invest ₹{equity_amount:,}/month into Equity SIP",
                f"Invest ₹{ppf_amount:,}/month into PPF",
                f"Invest ₹{nps_amount:,}/month into NPS",
                "Review portfolio every 6 months"
            ]
        else:
            ppf_allocation = 50
            nps_allocation = 30
            fd_allocation = 20

            ppf_amount = round(surplus * ppf_allocation / 100)
            nps_amount = round(surplus * nps_allocation / 100)
            fd_amount = round(surplus * fd_allocation / 100)

            investments = [
                {
                    "name": "PPF",
                    "risk": "Low",
                    "returns": "7-8%",
                    "allocation": ppf_allocation,
                    "explanation": "Safe retirement corpus building.",
                    "institution": "State Bank of India",
                    "steps": [
                        "Visit nearest SBI branch",
                        "Carry Aadhaar Card",
                        "Carry PAN Card",
                        "Fill PPF account opening form",
                        "Deposit minimum ₹500",
                        "Activate online banking access"
                    ]
                },
                {
                    "name": "NPS",
                    "risk": "Medium",
                    "returns": "9-12%",
                    "allocation": nps_allocation,
                    "explanation": "Retirement-focused investing.",
                    "institution": "NPS Trust",
                    "steps": [
                        "Visit NPS portal",
                        "Register with PAN",
                        "Complete KYC verification",
                        "Choose pension fund manager",
                        "Select asset allocation",
                        "Start monthly contributions"
                    ]
                },
                {
                    "name": "FD",
                    "risk": "Low",
                    "returns": "6-7%",
                    "allocation": fd_allocation,
                    "explanation": "Capital preservation.",
                    "institution": "HDFC / SBI / ICICI",
                    "steps": [
                        "Visit bank branch or net banking",
                        "Choose FD tenure",
                        "Select deposit amount",
                        "Confirm interest payout option",
                        "Submit and create FD"
                    ]
                }
            ]

            action_plan = [
                "Build an emergency fund covering 6 months of expenses",
                f"Invest ₹{ppf_amount:,}/month into PPF",
                f"Invest ₹{nps_amount:,}/month into NPS",
                f"Invest ₹{fd_amount:,}/month into FD",
                "Review portfolio every 6 months"
            ]

    # Wealth Creation Strategy
    elif data.goal == "Wealth Creation":
        investments = [
            {
                "name": "Equity SIP",
                "risk": "High",
                "returns": "12-15%",
                "allocation": 70,
                "explanation": "Aggressive long-term growth.",
                "institution": "Groww / Zerodha Coin",
                "steps": [
                    "Open Demat account",
                    "Complete KYC verification",
                    "Select mutual fund",
                    "Set monthly SIP amount",
                    "Enable auto-debit from bank",
                    "Review performance every 6 months"
                ]
            },
            {
                "name": "Gold ETF",
                "risk": "Medium",
                "returns": "8-10%",
                "allocation": 15,
                "explanation": "Portfolio diversification.",
                "institution": "Nippon India Gold ETF",
                "steps": [
                    "Open Demat account",
                    "Search Gold ETF",
                    "Purchase ETF units",
                    "Hold for long-term diversification",
                    "Review yearly"
                ]
            },
            {
                "name": "PPF",
                "risk": "Low",
                "returns": "7-8%",
                "allocation": 15,
                "explanation": "Stable long-term returns.",
                "institution": "State Bank of India",
                "steps": [
                    "Visit nearest SBI branch",
                    "Carry Aadhaar Card",
                    "Carry PAN Card",
                    "Fill PPF account opening form",
                    "Deposit minimum ₹500",
                    "Activate online banking access"
                ]
            }
        ]

        action_plan = [
            "Build emergency fund first",
            "Start monthly Equity SIP",
            "Allocate 15% to Gold ETF",
            "Invest regularly in PPF",
            "Review portfolio every 6 months"
        ]

    # Emergency Fund Strategy
    elif data.goal == "Emergency Fund":
        investments = [
            {
                "name": "Fixed Deposit",
                "risk": "Low",
                "returns": "6-7%",
                "allocation": 50,
                "explanation": "Easy access to emergency money.",
                "institution": "HDFC / SBI / ICICI",
                "steps": [
                    "Visit bank branch or net banking",
                    "Choose FD tenure",
                    "Select deposit amount",
                    "Confirm interest payout option",
                    "Submit and create FD"
                ]
            },
            {
                "name": "Liquid Fund",
                "risk": "Low",
                "returns": "5-7%",
                "allocation": 30,
                "explanation": "High liquidity.",
                "institution": "ICICI Liquid Fund",
                "steps": [
                    "Complete KYC",
                    "Select liquid fund",
                    "Transfer money online",
                    "Keep for emergency needs",
                    "Withdraw anytime if required"
                ]
            },
            {
                "name": "Savings Account",
                "risk": "Low",
                "returns": "3-4%",
                "allocation": 20,
                "explanation": "Immediate cash availability.",
                "institution": "Any Scheduled Bank",
                "steps": [
                    "Open savings account",
                    "Enable net banking",
                    "Maintain emergency reserve",
                    "Keep funds easily accessible"
                ]
            }
        ]

        action_plan = [
            "Save at least 6 months of expenses",
            "Keep part of money in liquid funds",
            "Maintain emergency cash reserve",
            "Avoid risky investments",
            "Review emergency fund yearly"
        ]

    # House Purchase Strategy
    elif data.goal == "House":
        investments = [
            {
                "name": "Debt Fund",
                "risk": "Low",
                "returns": "7-9%",
                "allocation": 40,
                "explanation": "Suitable for medium-term goals.",
                "institution": "HDFC Debt Fund",
                "steps": [
                    "Complete mutual fund KYC",
                    "Select debt fund",
                    "Invest lump sum or SIP",
                    "Track returns quarterly",
                    "Redeem when goal approaches"
                ]
            },
            {
                "name": "Fixed Deposit",
                "risk": "Low",
                "returns": "6-7%",
                "allocation": 30,
                "explanation": "Safe capital accumulation.",
                "institution": "HDFC / SBI / ICICI",
                "steps": [
                    "Visit bank branch or net banking",
                    "Choose FD tenure",
                    "Select deposit amount",
                    "Confirm interest payout option",
                    "Submit and create FD"
                ]
            },
            {
                "name": "SIP",
                "risk": "Medium",
                "returns": "10-12%",
                "allocation": 30,
                "explanation": "Long-term growth with moderate risk.",
                "institution": "Groww / Zerodha Coin",
                "steps": [
                    "Complete KYC",
                    "Choose mutual fund",
                    "Set SIP amount",
                    "Enable auto-debit",
                    "Review every 6 months"
                ]
            }
        ]

        action_plan = [
            "Determine house down payment target",
            "Start monthly investments",
            "Allocate funds between Debt Fund and FD",
            "Review progress every quarter",
            "Increase contributions when income rises"
        ]

    # Child Education Strategy
    elif data.goal == "Child Education":
        investments = [
            {
                "name": "Equity SIP",
                "risk": "Medium",
                "returns": "10-14%",
                "allocation": 50,
                "explanation": "Long-term education funding.",
                "institution": "Groww / Zerodha Coin",
                "steps": [
                    "Open Demat account",
                    "Complete KYC verification",
                    "Select mutual fund",
                    "Set monthly SIP amount",
                    "Enable auto-debit from bank",
                    "Review performance every 6 months"
                ]
            },
            {
                "name": "PPF",
                "risk": "Low",
                "returns": "7-8%",
                "allocation": 30,
                "explanation": "Stable long-term savings.",
                "institution": "State Bank of India",
                "steps": [
                    "Visit nearest SBI branch",
                    "Carry Aadhaar Card",
                    "Carry PAN Card",
                    "Fill PPF account opening form",
                    "Deposit minimum ₹500",
                    "Activate online banking access"
                ]
            },
            {
                "name": "Debt Fund",
                "risk": "Low",
                "returns": "7-9%",
                "allocation": 20,
                "explanation": "Reduces overall portfolio risk.",
                "institution": "HDFC Debt Fund",
                "steps": [
                    "Complete mutual fund KYC",
                    "Select debt fund",
                    "Invest lump sum or SIP",
                    "Track returns quarterly",
                    "Redeem when goal approaches"
                ]
            }
        ]

        action_plan = [
            "Estimate future education cost for the goal",
            "Start monthly Equity SIP for long-term growth",
            "Build a stable base with PPF contributions",
            "Add Debt Fund to reduce overall risk",
            "Review and rebalance every 6 months"
        ]

    # Default fallback Strategy
    else:
        investments = [
            {
                "name": "FD",
                "risk": "Low",
                "returns": "6-7%",
                "allocation": 40,
                "explanation": "Capital protection.",
                "institution": "HDFC / SBI / ICICI",
                "steps": [
                    "Visit bank branch or net banking",
                    "Choose FD tenure",
                    "Select deposit amount",
                    "Confirm interest payout option",
                    "Submit and create FD"
                ]
            },
            {
                "name": "PPF",
                "risk": "Low",
                "returns": "7-8%",
                "allocation": 40,
                "explanation": "Government-backed savings.",
                "institution": "State Bank of India",
                "steps": [
                    "Visit nearest SBI branch",
                    "Carry Aadhaar Card",
                    "Carry PAN Card",
                    "Fill PPF account opening form",
                    "Deposit minimum ₹500",
                    "Activate online banking access"
                ]
            },
            {
                "name": "Government Bonds",
                "risk": "Low",
                "returns": "6-8%",
                "allocation": 20,
                "explanation": "Very low-risk investment option.",
                "institution": "RBI Retail Direct",
                "steps": [
                    "Register on RBI Retail Direct",
                    "Complete KYC",
                    "Browse available bonds",
                    "Purchase desired bond",
                    "Hold until maturity"
                ]
            }
        ]

        action_plan = [
            "Define a clear savings target for this goal",
            "Split monthly surplus between FD and PPF",
            "Add Government Bonds for extra safety",
            "Avoid high-risk instruments for this goal",
            "Review allocation every 6 months"
        ]

    if data.risk == "High":
        annual_return = 12
    elif data.risk == "Moderate":
        annual_return = 10
    else:
        annual_return = 7

    # Fixed syntax parentheses errors below
    growth_5 = round(future_value(monthly_investment, annual_return, 5))
    growth_10 = round(future_value(monthly_investment, annual_return, 10))
    growth_20 = round(future_value(monthly_investment, annual_return, 20))

    return {
        "surplus": surplus,
        "growth5": growth_5,
        "growth10": growth_10,
        "growth20": growth_20,
        "savingsRate": savings_rate,
        "healthScore": health_score,
        "investments": investments,
        "actionPlan": action_plan,
        "recommendedEmergencyFund": recommended_emergency_fund,
        "emergencyProgress": emergency_progress,
        "goalTarget": goal_target,
        "estimatedYears": estimated_years,
        "goalProgress": goal_progress,
        "advice": advice,
    }


@app.get("/plans")
def get_plans():
    db = SessionLocal()
    try:
        plans = db.query(UserPlan).all()
        return plans
    finally:
        db.close()

@app.get("/plans")
def get_plans():

    db = SessionLocal()

    plans = db.query(UserPlan).all()

    return plans

@app.get("/plans/{user_id}")
def get_user_plans(user_id: int):

    db = SessionLocal()

    plans = (
        db.query(UserPlan)
        .filter(
            UserPlan.user_id == user_id
        )
        .all()
    )

    return plans
@app.post("/save-plan")
def save_plan(data: SavePlanRequest):
    db = SessionLocal()
    try:
        plan = UserPlan(
            name=data.name,
            age=data.age,
            city=data.city,
            income=data.income,
            expenses=data.expenses,
            savings=data.savings,
            goal=data.goal,
            risk=data.risk,
            horizon=data.horizon,
            advice=data.advice,
            user_id=data.userId
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return {"message": "Plan saved successfully", "id": plan.id}
    finally:
        db.close()
@app.post("/signup")
def signup(data: SignupRequest):

    db = SessionLocal()

    existing_user = (
        db.query(User)
        .filter(
            User.email == data.email
        )
        .first()
    )

    if existing_user:
        return {
            "message": "User already exists"
        }

    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(
            data.password
        )
    )

    db.add(user)
    db.commit()

    return {
        "message": "Signup successful"
    }
@app.post("/login")
def login(data: LoginRequest):

    db = SessionLocal()

    user = (
        db.query(User)
        .filter(
            User.email == data.email
        )
        .first()
    )

    if not user:
        return {
            "message": "User not found"
        }

    if not verify_password(
        data.password,
        user.password
    ):
        return {
            "message": "Invalid password"
        }

    return {
        "message": "Login successful",
        "userId": user.id,
        "username": user.username
    }