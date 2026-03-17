"""
API роуты для дашборда и общих финансовых сводок
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.auth import get_current_user
from app.api.schemas.finance import (
    CategoryResponse,
    CategorySpendingSummary,
    FinancialSummary,
    KakeiboNotebookSummary,
    TransactionResponse,
)
from app.core.cache import get_cache
from app.core.database import get_async_session
from app.core.db.crud.finance.analysis import FinancialAnalysisCRUD, FinancialGoalCRUD
from app.core.db.crud.finance.budget import BudgetCRUD, CategoryCRUD
from app.core.db.crud.finance.transaction import TransactionCRUD
from app.core.db.models.user import User
from app.sdk.nlp.llm_integration import get_financial_analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance/dashboard", tags=["Financial Dashboard"])


@router.get("/summary", response_model=FinancialSummary)
async def get_financial_summary(
    period_days: int = Query(30, ge=1, le=365, description="Период в днях"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить общую финансовую сводку"""

    # Определяем период
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)

    # Проверяем кэш
    cache = get_cache()
    cache_key = f"summary_{period_days}d"
    if cache:
        cached_summary = await cache.get_user_summary(current_user.id)
        if cached_summary and cache_key in cached_summary:
            return FinancialSummary(**cached_summary[cache_key])

    # Получаем статистику транзакций
    stats = await TransactionCRUD.get_transaction_stats(
        db=db, user_id=current_user.id, start_date=start_date, end_date=end_date
    )

    # Получаем текущие бюджеты
    budgets = await BudgetCRUD.get_current_budgets(db, current_user.id)
    total_budget = sum((budget.amount for budget in budgets), Decimal(0))

    # Получаем топ расходов
    top_expenses = await TransactionCRUD.get_top_expenses(
        db=db,
        user_id=current_user.id,
        limit=5,
        start_date=start_date,
        end_date=end_date,
    )

    # Создаем разбивку по категориям с бюджетами
    categories_data = []
    budget_by_category = {b.category_id: b for b in budgets}

    for category_stat in stats.get("category_breakdown", []):
        category_id = category_stat["category_id"]
        category = await CategoryCRUD.get(db, category_id)

        if category:
            budget = budget_by_category.get(category_id)
            budgeted = budget.amount if budget else Decimal("0")
            spent = category_stat["total"]
            remaining = budgeted - spent
            percentage_used = float(spent / budgeted * 100) if budgeted > 0 else 0

            categories_data.append(
                CategorySpendingSummary(
                    category=CategoryResponse.from_orm(category),
                    budgeted=budgeted,
                    spent=spent,
                    remaining=remaining,
                    percentage_used=min(percentage_used, 100.0),
                )
            )

    # Вычисляем показатели
    total_income = stats["total_income"]
    total_expenses = stats["total_expenses"]
    savings = total_income - total_expenses
    savings_rate = float(savings / total_income * 100) if total_income > 0 else 0

    summary = FinancialSummary(
        period_start=start_date,
        period_end=end_date,
        total_income=total_income,
        total_expenses=total_expenses,
        total_budget=total_budget,
        savings=savings,
        savings_rate=savings_rate,
        categories=categories_data,
        top_expenses=[TransactionResponse.model_validate(t) for t in top_expenses],
    )

    # Кэшируем результат
    if cache:
        await cache.cache_user_summary(
            current_user.id,
            {cache_key: summary.dict()},
            ttl=600,  # 10 минут
        )

    return summary


@router.get("/quick-stats", response_model=Dict[str, Any])
async def get_quick_stats(
    period: Optional[str] = Query(
        None, description="Period as 'start_end' dates (YYYY-MM-DD_YYYY-MM-DD)"
    ),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить быструю статистику для дашборда"""

    now = datetime.utcnow()

    # Parse custom period if provided, otherwise use current month
    if period and "_" in period:
        try:
            parts = period.split("_")
            period_start = datetime.fromisoformat(parts[0])
            period_end = datetime.fromisoformat(parts[1])
            # When the client sends a date-only string like "2026-03-12",
            # fromisoformat produces midnight (00:00:00).  Extend to
            # end-of-day so that transactions created later in the day
            # are included in the period.
            if (
                period_end.hour == 0
                and period_end.minute == 0
                and period_end.second == 0
            ):
                period_end = period_end.replace(hour=23, minute=59, second=59)
        except (ValueError, IndexError):
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            period_end = now
    else:
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_end = now

    # Статистика за период
    month_stats = await TransactionCRUD.get_transaction_stats(
        db=db, user_id=current_user.id, start_date=period_start, end_date=period_end
    )

    # --- Expense by category (with resolved category names) ---
    expense_by_category: Dict[str, Any] = {}
    for cat_stat in month_stats.get("category_breakdown", []):
        category_id = cat_stat["category_id"]
        category = await CategoryCRUD.get(db, category_id)
        cat_name = category.name if category else f"Категория {category_id}"
        expense_by_category[cat_name] = float(cat_stat["total"])

    # --- Monthly trend (up to 6 previous months) ---
    monthly_trend: List[Dict[str, Any]] = []
    for i in range(5, -1, -1):
        # Walk backwards from current month
        m_year = now.year
        m_month = now.month - i
        while m_month <= 0:
            m_month += 12
            m_year -= 1
        m_start = datetime(m_year, m_month, 1)
        if m_month == 12:
            m_end = datetime(m_year + 1, 1, 1) - timedelta(seconds=1)
        else:
            m_end = datetime(m_year, m_month + 1, 1) - timedelta(seconds=1)
        # Clamp to not exceed "now"
        if m_end > now:
            m_end = now

        m_stats = await TransactionCRUD.get_transaction_stats(
            db=db,
            user_id=current_user.id,
            start_date=m_start,
            end_date=m_end,
        )
        monthly_trend.append(
            {
                "month": m_start.strftime("%Y-%m-%d"),
                "income": float(m_stats["total_income"]),
                "expenses": float(m_stats["total_expenses"]),
            }
        )

    # Статистика целей
    goals_summary = await FinancialGoalCRUD.get_goals_summary(db, current_user.id)

    # Последний анализ
    latest_analysis = await FinancialAnalysisCRUD.get_latest_analysis(
        db, current_user.id
    )

    # Сегодняшние транзакции
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_transactions = await TransactionCRUD.get_daily_transactions(
        db=db, user_id=current_user.id, date=today
    )

    return {
        "current_month": {
            "income": month_stats["total_income"],
            "expenses": month_stats["total_expenses"],
            "savings": month_stats["total_income"] - month_stats["total_expenses"],
            "savings_rate": month_stats["savings_rate"],
            "transactions_count": month_stats["total_transactions"],
        },
        "expense_by_category": expense_by_category,
        "monthly_trend": monthly_trend,
        "goals": goals_summary,
        "today": {
            "transactions_count": len(today_transactions),
            "total_spent": sum(
                t.amount
                for t in today_transactions
                if t.transaction_type.value == "expense"
            ),
            "total_earned": sum(
                t.amount
                for t in today_transactions
                if t.transaction_type.value == "income"
            ),
        },
        "latest_analysis": {
            "exists": latest_analysis is not None,
            "date": latest_analysis.analysis_date if latest_analysis else None,
            "status": latest_analysis.status if latest_analysis else None,
        },
    }


@router.get("/kakeibo-overview", response_model=Dict[str, Any])
async def get_kakeibo_overview(
    period_months: int = Query(1, ge=1, le=12, description="Период в месяцах"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить обзор блокнотов Кэкэйбо"""

    from app.api.schemas.finance import NotebookType as SchemaNotebookType
    from app.core.db.models.finance import NotebookType as ModelNotebookType

    # Определяем период
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_months * 30)

    # Получаем данные для маленького блокнота (ежедневные траты)
    small_notebook_transactions = await TransactionCRUD.get_kakeibo_notebook(
        db=db,
        user_id=current_user.id,
        notebook_type=ModelNotebookType.SMALL,
        start_date=start_date,
        end_date=end_date,
    )

    # Получаем данные для большого блокнота (долгосрочные планы)
    big_notebook_transactions = await TransactionCRUD.get_kakeibo_notebook(
        db=db,
        user_id=current_user.id,
        notebook_type=ModelNotebookType.BIG,
        start_date=start_date,
        end_date=end_date,
    )

    period_str = f"{start_date.strftime('%Y-%m')} — {end_date.strftime('%Y-%m')}"

    # Build notebook summaries using proper schema
    small_planned = sum(
        (t.amount for t in small_notebook_transactions if t.is_planned), Decimal(0)
    )
    small_actual = sum(
        (t.amount for t in small_notebook_transactions if not t.is_planned), Decimal(0)
    )

    small_notebook_summary = KakeiboNotebookSummary(
        notebook_type=SchemaNotebookType.SMALL,
        period=period_str,
        total_planned=small_planned,
        total_actual=small_actual,
        variance=small_planned - small_actual,
        transactions=[
            TransactionResponse.model_validate(t) for t in small_notebook_transactions
        ],
    )

    big_planned = sum(
        (t.amount for t in big_notebook_transactions if t.is_planned), Decimal(0)
    )
    big_actual = sum(
        (t.amount for t in big_notebook_transactions if not t.is_planned), Decimal(0)
    )

    big_notebook_summary = KakeiboNotebookSummary(
        notebook_type=SchemaNotebookType.BIG,
        period=period_str,
        total_planned=big_planned,
        total_actual=big_actual,
        variance=big_planned - big_actual,
        transactions=[
            TransactionResponse.model_validate(t) for t in big_notebook_transactions
        ],
    )

    # Build return dict using the structured summaries
    small_data = small_notebook_summary.model_dump()
    big_data = big_notebook_summary.model_dump()

    # AI инсайты
    insights = None
    analyzer = get_financial_analyzer()
    if analyzer:
        insights = await analyzer.generate_kakeibo_insights(
            user_id=current_user.id,
            small_notebook_data=small_data,
            big_notebook_data=big_data,
            period=f"{period_months} месяц(ев)",
        )

    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
            "months": period_months,
        },
        "small_notebook": small_data,
        "big_notebook": big_data,
        "combined": {
            "total_planned": small_notebook_summary.total_planned
            + big_notebook_summary.total_planned,
            "total_actual": small_notebook_summary.total_actual
            + big_notebook_summary.total_actual,
            "total_variance": small_notebook_summary.variance
            + big_notebook_summary.variance,
            "planning_accuracy": float(
                (
                    small_notebook_summary.total_actual
                    + big_notebook_summary.total_actual
                )
                / max(
                    small_notebook_summary.total_planned
                    + big_notebook_summary.total_planned,
                    Decimal(1),
                )
                * 100
            ),
        },
        "ai_insights": insights,
    }


@router.get("/spending-trends", response_model=Dict[str, Any])
async def get_spending_trends(
    category_ids: Optional[List[int]] = Query(
        None, description="ID категорий для фильтрации"
    ),
    period_days: int = Query(
        90, ge=7, le=365, description="Период для анализа тенденций"
    ),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить тенденции трат"""

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)

    # Разбиваем период на недели для анализа тренда
    weeks_data = []
    current_date = start_date

    while current_date < end_date:
        week_end = min(current_date + timedelta(days=7), end_date)

        week_stats = await TransactionCRUD.get_transaction_stats(
            db=db, user_id=current_user.id, start_date=current_date, end_date=week_end
        )

        weeks_data.append(
            {
                "week_start": current_date,
                "week_end": week_end,
                "income": week_stats["total_income"],
                "expenses": week_stats["total_expenses"],
                "savings": week_stats["total_income"] - week_stats["total_expenses"],
                "transactions_count": week_stats["total_transactions"],
            }
        )

        current_date = week_end

    # Анализируем тренды
    recent_avg = 0.0
    if len(weeks_data) >= 2:
        recent_avg = sum(w["expenses"] for w in weeks_data[-4:]) / min(
            len(weeks_data), 4
        )  # Последние 4 недели
        earlier_avg = sum(w["expenses"] for w in weeks_data[:-4]) / max(
            len(weeks_data) - 4, 1
        )  # Предыдущие недели
        trend = (
            "increasing"
            if recent_avg > earlier_avg
            else "decreasing"
            if recent_avg < earlier_avg
            else "stable"
        )
    else:
        trend = "insufficient_data"

    # Статистика по категориям за период
    period_stats = await TransactionCRUD.get_transaction_stats(
        db=db, user_id=current_user.id, start_date=start_date, end_date=end_date
    )

    return {
        "period": {"start_date": start_date, "end_date": end_date, "days": period_days},
        "weekly_data": weeks_data,
        "trend_analysis": {
            "overall_trend": trend,
            "recent_weekly_avg": recent_avg if len(weeks_data) >= 2 else 0,
            "total_period_expenses": period_stats["total_expenses"],
            "avg_weekly_expenses": float(
                period_stats["total_expenses"] / max(period_days / 7, 1)
            ),
        },
        "category_breakdown": period_stats["category_breakdown"],
    }


def _generate_rule_based_recommendations(
    stats: Dict[str, Any],
    goals_data: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Generate basic financial recommendations from data without AI."""
    recommendations: List[Dict[str, Any]] = []

    total_income = float(stats.get("total_income", 0))
    total_expenses = float(stats.get("total_expenses", 0))
    savings_rate = float(stats.get("savings_rate", 0))
    category_breakdown = stats.get("category_breakdown", [])

    # Estimate a 10% cut as a baseline potential saving for expense categories
    def _potential_saving(amount: float, pct: float = 0.10) -> float:
        return round(amount * pct)

    # --- Savings rate insight ---
    if total_income > 0:
        if savings_rate < 10:
            # How much more they need to save to reach 20%
            gap = total_income * 0.20 - (total_income - total_expenses)
            pot_save = _potential_saving(total_expenses, 0.15) if gap > 0 else 0
            recommendations.append(
                {
                    "insight_type": "savings_opportunity",
                    "description": f"Ваша норма сбережений составляет {savings_rate:.1f}% — это ниже рекомендуемых 20%. Попробуйте сократить необязательные расходы.",
                    "impact_level": "high",
                    "suggested_action": "Выделите фиксированную сумму на сбережения сразу после получения дохода (принцип «заплати себе первому»).",
                    "data_points": {
                        "savings_rate": savings_rate,
                        "target_rate": 20,
                        "potentialSavings": pot_save,
                    },
                }
            )
        elif savings_rate < 20:
            gap = total_income * 0.20 - (total_income - total_expenses)
            pot_save = (
                round(gap) if gap > 0 else _potential_saving(total_expenses, 0.05)
            )
            recommendations.append(
                {
                    "insight_type": "savings_opportunity",
                    "description": f"Вы откладываете {savings_rate:.1f}% дохода. Хороший результат, но до цели в 20% ещё есть потенциал.",
                    "impact_level": "medium",
                    "suggested_action": "Рассмотрите автоматический перевод разницы на накопительный счёт.",
                    "data_points": {
                        "savings_rate": savings_rate,
                        "target_rate": 20,
                        "potentialSavings": pot_save,
                    },
                }
            )
        else:
            recommendations.append(
                {
                    "insight_type": "positive_trend",
                    "description": f"Отличная работа! Ваша норма сбережений {savings_rate:.1f}% превышает рекомендуемый порог.",
                    "impact_level": "low",
                    "suggested_action": "Рассмотрите инвестирование части сбережений для защиты от инфляции.",
                    "data_points": {
                        "savings_rate": savings_rate,
                        "potentialSavings": _potential_saving(
                            total_income - total_expenses, 0.5
                        ),
                    },
                }
            )

    # --- Top spending category ---
    if category_breakdown:
        top_cat = max(category_breakdown, key=lambda c: float(c.get("total", 0)))
        top_amount = float(top_cat["total"])
        if total_expenses > 0:
            pct = top_amount / total_expenses * 100
            cut_pct = 0.15 if pct > 40 else 0.10
            recommendations.append(
                {
                    "insight_type": "spending_pattern",
                    "description": f"Самая крупная категория расходов занимает {pct:.0f}% всех трат ({top_amount:,.0f} ₽).",
                    "impact_level": "medium" if pct > 40 else "low",
                    "suggested_action": "Установите бюджет для этой категории, чтобы контролировать расходы.",
                    "data_points": {
                        "category_id": top_cat["category_id"],
                        "amount": top_amount,
                        "percentage": pct,
                        "potentialSavings": _potential_saving(top_amount, cut_pct),
                    },
                }
            )

    # --- Expense vs income warning ---
    if total_income > 0 and total_expenses > total_income:
        overspend = total_expenses - total_income
        recommendations.append(
            {
                "insight_type": "budget_warning",
                "description": f"Расходы превысили доходы на {overspend:,.0f} ₽ за последний месяц.",
                "impact_level": "high",
                "suggested_action": "Срочно пересмотрите бюджет и сократите необязательные траты.",
                "data_points": {
                    "overspend": overspend,
                    "potentialSavings": round(overspend),
                },
            }
        )

    # --- Goals progress ---
    for goal in goals_data:
        target = float(goal.get("target_amount", 0))
        current = float(goal.get("current_amount", 0))
        if target > 0:
            progress = current / target * 100
            monthly_needed = round((target - current) / max(6, 1))
            if progress < 25:
                recommendations.append(
                    {
                        "insight_type": "savings_opportunity",
                        "description": f"Цель «{goal['title']}» выполнена на {progress:.0f}%. Увеличьте ежемесячные взносы, чтобы успеть к сроку.",
                        "impact_level": "medium",
                        "suggested_action": f"Откладывайте минимум {monthly_needed:,.0f} ₽ в месяц для достижения цели за полгода.",
                        "data_points": {
                            "goal": goal["title"],
                            "progress": progress,
                            "potentialSavings": monthly_needed,
                        },
                    }
                )

    # --- No transactions fallback ---
    if total_income == 0 and total_expenses == 0:
        recommendations.append(
            {
                "insight_type": "general",
                "description": "Пока нет данных о транзакциях за последний месяц.",
                "impact_level": "low",
                "suggested_action": "Начните вносить доходы и расходы, чтобы получить персонализированные рекомендации.",
                "data_points": {},
            }
        )

    return recommendations


@router.get("/recommendations", response_model=Dict[str, Any])
async def get_personalized_recommendations(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить персонализированные рекомендации.

    This endpoint is called on page load, so it must NOT trigger a slow
    Ollama request.  Flow:
      1. Check Redis for a previously cached AI result.
      2. If nothing in cache → use fast rule-based recommendations.
    AI analysis is only triggered explicitly via POST /ai-analysis.
    """

    # 1. Check Redis cache for a previously stored AI analysis
    cache = get_cache()
    cached_recommendations = None
    if cache:
        try:
            cached = await cache.get_ai_analysis(current_user.id, "recommendations")
            if cached and cached.get("result"):
                cached_recommendations = cached["result"]
                logger.info(
                    "Returning cached AI recommendations for user %s",
                    current_user.id,
                )
        except Exception as e:
            logger.warning("Redis cache read failed: %s", e)

    if cached_recommendations:
        return {
            "recommendations": cached_recommendations,
            "source": "ai_cached",
            "generated_at": datetime.utcnow(),
        }

    # 2. No cache hit — compute fast rule-based recommendations (no AI)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)

    stats = await TransactionCRUD.get_transaction_stats(
        db=db, user_id=current_user.id, start_date=start_date, end_date=end_date
    )

    goals = await FinancialGoalCRUD.get_user_goals(
        db, current_user.id, active_only=True
    )
    goals_data = [
        {
            "title": goal.title,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "target_date": goal.target_date,
        }
        for goal in goals
    ]

    recommendations = _generate_rule_based_recommendations(stats, goals_data)

    return {
        "recommendations": recommendations,
        "source": "rule_based",
        "based_on": {
            "period": {"start": start_date, "end": end_date},
            "total_income": stats["total_income"],
            "total_expenses": stats["total_expenses"],
            "savings_rate": stats["savings_rate"],
            "active_goals": len(goals_data),
        },
        "generated_at": datetime.utcnow(),
    }
