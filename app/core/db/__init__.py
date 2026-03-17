from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

metadata = MetaData()

class Base(DeclarativeBase):
    metadata = metadata

# Импортируем все модели для их регистрации в metadata
# Это необходимо для корректной работы Alembic миграций
from app.core.db.models.user import User  # noqa: F401
from app.core.db.models.finance import (  # noqa: F401
    Category, Budget, Transaction, FinancialGoal, 
    FinancialAnalysis, FinancialAssessment, DataConsent
)

# Экспорт CRUD операций
from app.core.db import crud

__all__ = ["Base", "metadata", "crud"]
