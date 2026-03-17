"""
CRUD операции для финансовых данных
"""

from .budget import CategoryCRUD, BudgetCRUD
from .transaction import TransactionCRUD
from .analysis import (
    FinancialGoalCRUD, 
    FinancialAnalysisCRUD, 
    FinancialAssessmentCRUD, 
    DataConsentCRUD
)

__all__ = [
    "CategoryCRUD",
    "BudgetCRUD", 
    "TransactionCRUD",
    "FinancialGoalCRUD",
    "FinancialAnalysisCRUD",
    "FinancialAssessmentCRUD",
    "DataConsentCRUD"
]