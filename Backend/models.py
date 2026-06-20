from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String

from sqlalchemy.orm import declarative_base

Base = declarative_base()

class UserPlan(Base):

    __tablename__ = "user_plans"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)

    age = Column(Integer)

    city = Column(String)

    income = Column(Float)

    expenses = Column(Float)

    savings = Column(Float)

    goal = Column(String)

    risk = Column(String)

    horizon = Column(String)

    advice = Column(String)