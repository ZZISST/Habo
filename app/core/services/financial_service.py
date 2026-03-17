import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.finance import FinancialAnalysisCreate
from app.core.cache import get_cache
from app.core.db.crud.finance import (
    BudgetCRUD,
    CategoryCRUD,
    FinancialAnalysisCRUD,
    FinancialGoalCRUD,
    TransactionCRUD,
)
from app.core.db.models.finance import CategoryType, NotebookType
from app.sdk.nlp.llm_integration import get_financial_analyzer

logger = logging.getLogger(__name__)


class KakeiboService:
    """Сервис для работы с методологией Кэкэйбо"""

    @staticmethod
    async def setup_user_for_kakeibo(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Настроить пользователя для работы с Кэкэйбо"""

        # Создаем базовый бюджет на текущий месяц для всех категорий
        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Получаем следующий месяц
        if now.month == 12:
            end_of_month = now.replace(year=now.year + 1, month=1, day=1) - timedelta(
                days=1
            )
        else:
            end_of_month = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        end_of_month = end_of_month.replace(hour=23, minute=59, second=59)

        # Получаем стандартные категории
        default_categories = await CategoryCRUD.get_default_categories(db)

        setup_results = {
            "budgets_created": 0,
            "categories_available": len(default_categories),
            "period": {"start": start_of_month, "end": end_of_month},
        }

        # Создаем базовые бюджеты для основных категорий
        default_budgets = {
            CategoryType.NEEDS: Decimal("30000"),  # Потребности - 30k
            CategoryType.WANTS: Decimal("15000"),  # Желания - 15k
            CategoryType.CULTURE: Decimal("5000"),  # Культура - 5k
            CategoryType.UNEXPECTED: Decimal("5000"),  # Неожиданные - 5k
        }

        for category in default_categories:
            if category.category_type in default_budgets:
                from app.api.schemas.finance import BudgetCreate

                budget_data = BudgetCreate(
                    category_id=category.id,
                    amount=default_budgets[category.category_type],
                    period_start=start_of_month,
                    period_end=end_of_month,
                )

                try:
                    await BudgetCRUD.create(db, user_id, budget_data)
                    setup_results["budgets_created"] += 1
                except Exception as e:
                    logger.warning(
                        f"Не удалось создать бюджет для категории {category.name}: {e}"
                    )

        return setup_results

    @staticmethod
    async def get_kakeibo_dashboard(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Получить дашборд Кэкэйбо"""

        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Статистика за месяц по блокнотам
        small_notebook = await TransactionCRUD.get_kakeibo_notebook(
            db, user_id, NotebookType.SMALL, start_of_month, now
        )

        big_notebook = await TransactionCRUD.get_kakeibo_notebook(
            db, user_id, NotebookType.BIG, start_of_month, now
        )

        # Вычисляем метрики
        small_planned = sum(t.amount for t in small_notebook if t.is_planned)
        small_actual = sum(t.amount for t in small_notebook if not t.is_planned)

        big_planned = sum(t.amount for t in big_notebook if t.is_planned)
        big_actual = sum(t.amount for t in big_notebook if not t.is_planned)

        # Анализ по категориям Кэкэйбо
        category_analysis = {}
        for category_type in CategoryType:
            type_transactions = [
                t
                for t in (small_notebook + big_notebook)
                if t.category.category_type == category_type
            ]

            category_analysis[category_type.value] = {
                "planned": sum(t.amount for t in type_transactions if t.is_planned),
                "actual": sum(t.amount for t in type_transactions if not t.is_planned),
                "transactions_count": len(type_transactions),
            }

        return {
            "period": {"start": start_of_month, "end": now},
            "small_notebook": {
                "planned": small_planned,
                "actual": small_actual,
                "variance": small_planned - small_actual,
                "transactions": len(small_notebook),
            },
            "big_notebook": {
                "planned": big_planned,
                "actual": big_actual,
                "variance": big_planned - big_actual,
                "transactions": len(big_notebook),
            },
            "category_analysis": category_analysis,
            "total_variance": (small_planned + big_planned)
            - (small_actual + big_actual),
        }


class FinancialAnalysisService:
    """Сервис для финансового анализа"""

    @staticmethod
    async def perform_comprehensive_analysis(
        db: AsyncSession, user_id: int, period_days: int = 30
    ) -> Dict[str, Any]:
        """Выполнить комплексный финансовый анализ"""

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)

        # Check cache first
        cache = get_cache()
        cache_key = f"comprehensive_{period_days}d"
        if cache:
            try:
                cached = await cache.get_ai_analysis(user_id, cache_key)
                if cached and cached.get("result"):
                    logger.info(
                        "Returning cached comprehensive analysis for user %s", user_id
                    )
                    return cached["result"]
            except Exception as e:
                logger.warning("Cache read failed for comprehensive analysis: %s", e)

        # Базовая статистика
        stats = await TransactionCRUD.get_transaction_stats(
            db, user_id, start_date, end_date
        )

        # Анализ целей
        goals = await FinancialGoalCRUD.get_user_goals(db, user_id, active_only=True)
        goals_data = [
            {
                "title": goal.title,
                "target_amount": goal.target_amount,
                "current_amount": goal.current_amount,
                "target_date": goal.target_date,
            }
            for goal in goals
        ]
        goals_summary = await FinancialGoalCRUD.get_goals_summary(db, user_id)

        # Анализ по категориям Кэкэйбо
        # Aggregate category_breakdown by category_type
        kakeibo_totals: Dict[str, Decimal] = {
            ct.value: Decimal("0") for ct in CategoryType
        }
        total_expenses = stats.get("total_expenses", Decimal("0"))

        for cat_stat in stats.get("category_breakdown", []):
            category = await CategoryCRUD.get(db, cat_stat["category_id"])
            if category and category.category_type:
                ct_value = (
                    category.category_type.value
                    if hasattr(category.category_type, "value")
                    else str(category.category_type)
                )
                if ct_value in kakeibo_totals:
                    kakeibo_totals[ct_value] += cat_stat["total"]

        kakeibo_analysis = {}
        for category_type in CategoryType:
            spent = kakeibo_totals[category_type.value]
            kakeibo_analysis[category_type.value] = {
                "total_spent": spent,
                "percentage_of_total": float(spent / total_expenses * 100)
                if total_expenses > 0
                else 0.0,
            }

        # AI анализ
        ai_insights = None
        ai_recommendations = None
        analyzer = get_financial_analyzer()
        if analyzer:
            ai_insights = await analyzer.analyze_financial_situation(
                user_id, stats, period_days
            )
            # Also generate recommendations using goal details
            if goals_data:
                try:
                    ai_recommendations = await analyzer.generate_recommendations(
                        user_id=user_id,
                        financial_data=stats,
                        user_goals=goals_data,
                    )
                except Exception as e:
                    ai_recommendations = None
                    logger.warning("Failed to generate AI recommendations: %s", e)
            else:
                ai_recommendations = None

        # Сохраняем результат анализа через FinancialAnalysisCRUD
        try:
            analysis_create = FinancialAnalysisCreate(
                period_start=start_date,
                period_end=end_date,
            )
            analysis_record = await FinancialAnalysisCRUD.create(
                db, user_id, analysis_create
            )
            await FinancialAnalysisCRUD.update_analysis_results(
                db,
                analysis_id=analysis_record.id,
                user_id=user_id,
                total_income=stats.get("total_income", Decimal("0")),
                total_expenses=total_expenses,
                savings_rate=Decimal(str(stats.get("savings_rate", 0))),
                ai_summary=json.dumps(ai_insights) if ai_insights else None,
                ai_recommendations=None,
                spending_insights=json.dumps(
                    {
                        k: {
                            "total_spent": str(v["total_spent"]),
                            "percentage_of_total": v["percentage_of_total"],
                        }
                        for k, v in kakeibo_analysis.items()
                    }
                ),
            )
        except Exception as e:
            logger.warning(f"Не удалось сохранить результат анализа: {e}")

        result = {
            "period": {"start": start_date, "end": end_date, "days": period_days},
            "basic_metrics": stats,
            "goals_analysis": goals_summary,
            "goals_details": goals_data,
            "kakeibo_breakdown": kakeibo_analysis,
            "ai_insights": ai_insights,
            "ai_recommendations": ai_recommendations if analyzer else None,
            "recommendations": {
                "needs_attention": [],
                "positive_trends": [],
                "action_items": [],
            },
        }

        # Cache the result
        if cache:
            try:
                await cache.cache_ai_analysis(user_id, cache_key, result, ttl=1800)
                logger.info("Cached comprehensive analysis for user %s", user_id)
            except Exception as e:
                logger.warning("Failed to cache comprehensive analysis: %s", e)

        return result

    @staticmethod
    async def generate_monthly_report(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Сгенерировать месячный отчет"""

        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Получаем данные за месяц
        analysis = await FinancialAnalysisService.perform_comprehensive_analysis(
            db, user_id, (now - start_of_month).days
        )

        # Дашборд Кэкэйбо
        kakeibo_dashboard = await KakeiboService.get_kakeibo_dashboard(db, user_id)

        # Прогресс по целям
        goals = await FinancialGoalCRUD.get_user_goals(db, user_id, active_only=True)

        return {
            "report_type": "monthly",
            "generated_at": now,
            "period": {"start": start_of_month, "end": now},
            "financial_analysis": analysis,
            "kakeibo_summary": kakeibo_dashboard,
            "goals_progress": [
                {
                    "title": goal.title,
                    "progress_percentage": float(
                        goal.current_amount / goal.target_amount * 100
                    )
                    if goal.target_amount > 0
                    else 0,
                    "is_achieved": goal.is_achieved,
                }
                for goal in goals
            ],
        }


class BudgetOptimizationService:
    """Сервис для оптимизации бюджета"""

    @staticmethod
    async def suggest_budget_adjustments(
        db: AsyncSession, user_id: int
    ) -> Dict[str, Any]:
        """Предложить корректировки бюджета"""

        # Получаем текущие бюджеты
        current_budgets = await BudgetCRUD.get_current_budgets(db, user_id)

        # Получаем статистику трат за последние 3 месяца
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=90)

        stats = await TransactionCRUD.get_transaction_stats(
            db, user_id, start_date, end_date
        )

        suggestions = []

        # Анализируем каждый бюджет
        for budget in current_budgets:
            # Находим фактические траты по этой категории
            category_spent = Decimal("0")
            for cat_stat in stats.get("category_breakdown", []):
                if cat_stat["category_id"] == budget.category_id:
                    category_spent = cat_stat["total"] / 3  # Среднемесячные траты
                    break

            utilization = (
                float(category_spent / budget.amount * 100) if budget.amount > 0 else 0
            )

            suggestion = {
                "category": budget.category.name,
                "current_budget": budget.amount,
                "avg_monthly_spending": category_spent,
                "utilization_percentage": utilization,
                "status": "optimal",
            }

            if utilization > 120:
                suggestion["status"] = "increase_needed"
                suggestion["suggested_amount"] = category_spent * Decimal(
                    "1.1"
                )  # +10% буфер
                suggestion["reason"] = "Регулярное превышение бюджета"
            elif utilization < 50:
                suggestion["status"] = "decrease_possible"
                suggestion["suggested_amount"] = category_spent * Decimal(
                    "1.2"
                )  # +20% буфер
                suggestion["reason"] = "Недоиспользование бюджета"

            suggestions.append(suggestion)

        return {
            "analysis_period": {"start": start_date, "end": end_date},
            "suggestions": suggestions,
            "summary": {
                "total_current_budget": sum(b.amount for b in current_budgets),
                "categories_analyzed": len(suggestions),
                "needs_increase": len(
                    [s for s in suggestions if s["status"] == "increase_needed"]
                ),
                "can_decrease": len(
                    [s for s in suggestions if s["status"] == "decrease_possible"]
                ),
            },
        }


class NotificationService:
    """Сервис для уведомлений"""

    @staticmethod
    async def check_budget_alerts(
        db: AsyncSession, user_id: int
    ) -> List[Dict[str, Any]]:
        """Проверить превышения бюджета"""

        alerts = []
        current_budgets = await BudgetCRUD.get_current_budgets(db, user_id)

        # Получаем траты за текущий месяц
        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        stats = await TransactionCRUD.get_transaction_stats(
            db, user_id, start_of_month, now
        )

        for budget in current_budgets:
            # Находим траты по этой категории
            category_spent = Decimal("0")
            for cat_stat in stats.get("category_breakdown", []):
                if cat_stat["category_id"] == budget.category_id:
                    category_spent = cat_stat["total"]
                    break

            utilization = (
                float(category_spent / budget.amount * 100) if budget.amount > 0 else 0
            )

            if utilization >= 90:
                alert_type = "critical" if utilization >= 100 else "warning"
                alerts.append(
                    {
                        "type": alert_type,
                        "category": budget.category.name,
                        "budget_amount": budget.amount,
                        "spent_amount": category_spent,
                        "utilization": utilization,
                        "message": f"Бюджет категории '{budget.category.name}' использован на {utilization:.1f}%",
                    }
                )

        return alerts

    @staticmethod
    async def check_goal_milestones(
        db: AsyncSession, user_id: int
    ) -> List[Dict[str, Any]]:
        """Проверить достижение промежуточных целей"""

        notifications = []
        goals = await FinancialGoalCRUD.get_user_goals(db, user_id, active_only=True)

        for goal in goals:
            progress = (
                float(goal.current_amount / goal.target_amount * 100)
                if goal.target_amount > 0
                else 0
            )

            # Уведомления о промежуточных достижениях
            milestones = [25, 50, 75, 90]
            for milestone in milestones:
                if progress >= milestone:
                    notifications.append(
                        {
                            "type": "milestone",
                            "goal_title": goal.title,
                            "milestone": milestone,
                            "current_progress": progress,
                            "message": f"Достигнуто {milestone}% от цели '{goal.title}'",
                        }
                    )

        return notifications
