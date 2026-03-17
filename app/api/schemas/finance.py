"""
Схемы Pydantic для финансовых данных системы управления бюджетом Кэкэйбо
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, computed_field, validator


class CategoryType(str, Enum):
    """Типы категорий расходов и доходов по методу Кэкэйбо"""

    NEEDS = "needs"
    WANTS = "wants"
    CULTURE = "culture"
    UNEXPECTED = "unexpected"
    INCOME = "income"


class TransactionType(str, Enum):
    """Типы транзакций"""

    EXPENSE = "expense"
    INCOME = "income"


class NotebookType(str, Enum):
    """Тип блокнота Кэкэйбо"""

    SMALL = "small"
    BIG = "big"


class AnalysisStatus(str, Enum):
    """Статус финансового анализа"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Category Schemas
class CategoryBase(BaseModel):
    """Базовая схема категории"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category_type: CategoryType
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class CategoryCreate(CategoryBase):
    """Схема создания категории"""

    pass


class CategoryUpdate(BaseModel):
    """Схема обновления категории"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class CategoryResponse(CategoryBase):
    """Схема ответа категории"""

    id: int
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Budget Schemas
class BudgetBase(BaseModel):
    """Базовая схема бюджета"""

    category_id: int = Field(..., gt=0)
    amount: Decimal = Field(..., ge=0, decimal_places=2)
    period_start: datetime
    period_end: datetime

    @validator("period_end")
    def validate_period_end(cls, v, values):
        if "period_start" in values and v <= values["period_start"]:
            raise ValueError("Дата окончания должна быть позже даты начала")
        return v


class BudgetCreate(BudgetBase):
    """Схема создания бюджета"""

    pass


class BudgetUpdate(BaseModel):
    """Схема обновления бюджета"""

    amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    """Схема ответа бюджета"""

    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse
    spent: Decimal = Decimal("0")
    remaining: Decimal = Decimal("0")

    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    """Базовая схема транзакции"""

    category_id: int = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    transaction_type: TransactionType
    notebook_type: NotebookType
    description: str = Field(..., min_length=1, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)
    transaction_date: datetime
    is_planned: bool = False
    is_recurring: bool = False


class TransactionCreate(TransactionBase):
    """Схема создания транзакции"""

    pass


class TransactionUpdate(BaseModel):
    """Схема обновления транзакции"""

    category_id: Optional[int] = Field(None, gt=0)
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    transaction_type: Optional[TransactionType] = None
    notebook_type: Optional[NotebookType] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)
    transaction_date: Optional[datetime] = None
    is_planned: Optional[bool] = None
    is_recurring: Optional[bool] = None


class TransactionResponse(TransactionBase):
    """Схема ответа транзакции"""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse

    class Config:
        from_attributes = True


# Financial Goal Schemas
class FinancialGoalBase(BaseModel):
    """Базовая схема финансовой цели"""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    target_amount: Decimal = Field(..., gt=0, decimal_places=2)
    target_date: datetime
    priority: int = Field(1, ge=1, le=5)

    @validator("target_date", pre=True)
    def validate_target_date(cls, v):
        if isinstance(v, str):
            # Handle date-only strings like "2026-12-31"
            if "T" not in v and len(v) == 10:
                v = datetime.strptime(v, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59
                )
            else:
                # Strip trailing Z and parse ISO format
                v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        # Strip timezone info to avoid naive/aware comparison errors
        if hasattr(v, "tzinfo") and v.tzinfo is not None:
            v = v.replace(tzinfo=None)
        if v.date() < datetime.now().date():
            raise ValueError("Дата цели должна быть в будущем")
        return v


class FinancialGoalCreate(FinancialGoalBase):
    """Схема создания финансовой цели"""

    pass


class FinancialGoalUpdate(BaseModel):
    """Схема обновления финансовой цели"""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    target_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    current_amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    target_date: Optional[datetime] = None
    is_achieved: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=1, le=5)


class FinancialGoalResponse(FinancialGoalBase):
    """Схема ответа финансовой цели"""

    id: int
    user_id: int
    current_amount: Decimal
    is_achieved: bool
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def progress_percentage(self) -> float:
        """Процент выполнения цели"""
        if self.target_amount <= 0:
            return 0.0
        return min(float(self.current_amount / self.target_amount * 100), 100.0)

    class Config:
        from_attributes = True


# Financial Analysis Schemas
class FinancialAnalysisBase(BaseModel):
    """Базовая схема финансового анализа"""

    period_start: datetime
    period_end: datetime

    @validator("period_end")
    def validate_period_end(cls, v, values):
        if "period_start" in values and v <= values["period_start"]:
            raise ValueError("Дата окончания должна быть позже даты начала")
        return v


class FinancialAnalysisCreate(FinancialAnalysisBase):
    """Схема создания финансового анализа"""

    pass


class FinancialAnalysisResponse(FinancialAnalysisBase):
    """Схема ответа финансового анализа"""

    id: int
    user_id: int
    analysis_date: datetime
    total_income: Decimal
    total_expenses: Decimal
    savings_rate: Decimal
    ai_summary: Optional[str]
    ai_recommendations: Optional[str]
    spending_insights: Optional[str]
    status: AnalysisStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Financial Assessment Schemas
class FinancialAssessmentAnswer(BaseModel):
    """Схема ответа на вопрос финансового опроса"""

    question_id: str
    question_text: str
    answer: str
    weight: float = 1.0


class FinancialAssessmentBase(BaseModel):
    """Базовая схема финансового опроса"""

    risk_tolerance: Optional[str] = None
    financial_experience: Optional[str] = None
    income_stability: Optional[str] = None
    financial_goals_priority: Optional[str] = None
    spending_habits: Optional[str] = None
    score: Optional[int] = None
    recommendations: Optional[str] = None


class FinancialAssessmentCreate(BaseModel):
    """Схема создания финансового опроса"""

    answers: List[FinancialAssessmentAnswer]


class FinancialAssessmentResponse(FinancialAssessmentBase):
    """Схема ответа финансового опроса"""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Data Consent Schemas
class DataConsentBase(BaseModel):
    """Базовая схема согласия на обработку данных"""

    analytics_consent: bool = False
    ai_improvement_consent: bool = False
    marketing_consent: bool = False


class DataConsentCreate(DataConsentBase):
    """Схема создания согласия на обработку данных"""

    pass


class DataConsentUpdate(BaseModel):
    """Схема обновления согласия на обработку данных"""

    analytics_consent: Optional[bool] = None
    ai_improvement_consent: Optional[bool] = None
    marketing_consent: Optional[bool] = None


class DataConsentResponse(DataConsentBase):
    """Схема ответа согласия на обработку данных"""

    id: int
    user_id: int
    consent_date: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Dashboard and Summary Schemas
class CategorySpendingSummary(BaseModel):
    """Сводка трат по категории"""

    category: CategoryResponse
    budgeted: Decimal
    spent: Decimal
    remaining: Decimal
    percentage_used: float


class FinancialSummary(BaseModel):
    """Общая финансовая сводка"""

    period_start: datetime
    period_end: datetime
    total_income: Decimal
    total_expenses: Decimal
    total_budget: Decimal
    savings: Decimal
    savings_rate: float
    categories: List[CategorySpendingSummary]
    top_expenses: List[TransactionResponse]


class KakeiboNotebookSummary(BaseModel):
    """Сводка блокнота Кэкэйбо"""

    notebook_type: NotebookType
    period: str
    total_planned: Decimal
    total_actual: Decimal
    variance: Decimal
    transactions: List[TransactionResponse]


# AI Analysis Request
class AnalysisRequest(BaseModel):
    """Запрос на AI анализ"""

    period_start: datetime
    period_end: datetime
    include_predictions: bool = True
    include_recommendations: bool = True
    analysis_depth: str = Field("standard", pattern=r"^(basic|standard|detailed)$")


# Алиас для обратной совместимости
AIAnalysisRequest = AnalysisRequest


class AnalysisResponse(BaseModel):
    """Ответ AI анализа"""

    analysis_id: str
    period_start: datetime
    period_end: datetime
    insights: List[str]
    recommendations: List[str]
    risk_assessment: str
    confidence_score: float
    generated_at: datetime


class FinancialInsightResponse(BaseModel):
    """Финансовая аналитика"""

    insight_type: str
    description: str
    impact_level: str  # low, medium, high
    suggested_action: Optional[str] = None
    data_points: Dict[str, Any] = {}


class MonthlyInsightResponse(BaseModel):
    """Месячная аналитика"""

    month: int
    year: int
    insights: List[FinancialInsightResponse]
    summary: str
    trends: Dict[str, Any] = {}


# Kakeibo Notebook Schemas
class KakeiboNotebookCreate(BaseModel):
    """Схема создания блокнота Кэкэйбо"""

    notebook_type: NotebookType
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)
    planned_income: Optional[Decimal] = Field(None, gt=0)
    planned_expenses: Dict[str, Decimal] = {}
    goals: Optional[str] = Field(None, max_length=1000)


class KakeiboNotebookResponse(BaseModel):
    """Схема ответа блокнота Кэкэйбо"""

    id: int
    user_id: int
    notebook_type: NotebookType
    month: int
    year: int
    planned_income: Optional[Decimal]
    actual_income: Decimal = Decimal("0")
    planned_expenses: Dict[str, Decimal]
    actual_expenses: Decimal = Decimal("0")
    goals: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KakeiboReflectionCreate(BaseModel):
    """Схема создания рефлексии Кэкэйбо"""

    notebook_id: int
    reflection_text: str = Field(..., max_length=2000)
    lessons_learned: Optional[str] = Field(None, max_length=1000)
    next_month_goals: Optional[str] = Field(None, max_length=1000)


class KakeiboReflectionResponse(BaseModel):
    """Схема ответа рефлексии Кэкэйбо"""

    id: int
    notebook_id: int
    reflection_text: str
    lessons_learned: Optional[str]
    next_month_goals: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Dashboard Summary Schemas
class DashboardResponse(BaseModel):
    """Схема ответа дашборда"""

    user_id: int
    current_balance: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_savings: Decimal
    savings_rate: float
    budget_utilization: float
    active_goals: int
    recent_transactions: List[TransactionResponse]
    expense_categories: List[Dict[str, Any]]
    period: str


class BudgetSummaryResponse(BaseModel):
    """Сводка бюджета"""

    total_budgeted: Decimal
    total_spent: Decimal
    remaining: Decimal
    utilization_rate: float
    categories_summary: List[Dict[str, Any]]
    over_budget_categories: List[str]


class TransactionsSummaryResponse(BaseModel):
    """Сводка транзакций"""

    total_transactions: int
    total_income: Decimal
    total_expenses: Decimal
    average_transaction: Decimal
    largest_expense: Optional[TransactionResponse]
    most_frequent_category: Optional[str]
    period_start: datetime
    period_end: datetime


class ExpenseByCategoryResponse(BaseModel):
    """Расходы по категориям"""

    category_name: str
    category_type: CategoryType
    total_amount: Decimal
    percentage_of_total: float
    transaction_count: int
    average_amount: Decimal
    budget_allocated: Optional[Decimal]
    budget_remaining: Optional[Decimal]


class GoalsProgressResponse(BaseModel):
    """Прогресс по целям"""

    goal_id: int
    goal_name: str
    target_amount: Decimal
    current_amount: Decimal
    progress_percentage: float
    days_remaining: Optional[int]
    projected_completion: Optional[datetime]
    on_track: bool
