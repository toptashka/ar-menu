from sqlalchemy import Column, Integer, Float, String, Text, CheckConstraint
from .database import Base


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    calories = Column(Integer, nullable=False)
    protein = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    composition = Column(Text, nullable=False)
    model_whole = Column(String(255), nullable=False)
    model_cut = Column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("calories >= 0", name="check_calories_positive"),
        CheckConstraint("protein >= 0", name="check_protein_positive"),
        CheckConstraint("fat >= 0", name="check_fat_positive"),
        CheckConstraint("carbs >= 0", name="check_carbs_positive"),
    )
