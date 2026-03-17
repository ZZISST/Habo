import hashlib
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.auth import get_current_user
from app.api.schemas.finance import (
    AIAnalysisRequest,
    DataConsentCreate,
    DataConsentResponse,
    DataConsentUpdate,
    FinancialAnalysisCreate,
    FinancialAnalysisResponse,
    FinancialAssessmentCreate,
    FinancialAssessmentResponse,
    FinancialGoalCreate,
    FinancialGoalResponse,
    FinancialGoalUpdate,
    TransactionCreate,
)
from app.core.cache import get_cache
from app.core.database import get_async_session
from app.core.db.crud.finance.analysis import (
    DataConsentCRUD,
    FinancialAnalysisCRUD,
    FinancialAssessmentCRUD,
    FinancialGoalCRUD,
)
from app.core.db.crud.finance.budget import CategoryCRUD
from app.core.db.crud.finance.transaction import TransactionCRUD
from app.core.db.models.finance import NotebookType, TransactionType
from app.core.db.models.user import User
from app.core.services.assessment_questions import (
    FINANCIAL_ASSESSMENT_QUESTIONS,
    calculate_assessment_score,
)
from app.sdk.nlp.llm_integration import get_financial_analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance/analysis", tags=["Financial Analysis & Goals"])


@router.get("/goals", response_model=List[FinancialGoalResponse])
async def get_financial_goals(
    active_only: bool = Query(True, description="Показать только активные цели"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    return await FinancialGoalCRUD.get_user_goals(
        db=db, user_id=current_user.id, active_only=active_only, skip=skip, limit=limit
    )


@router.post(
    "/goals", response_model=FinancialGoalResponse, status_code=status.HTTP_201_CREATED
)
async def create_financial_goal(
    goal_data: FinancialGoalCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    goal = await FinancialGoalCRUD.create(db, current_user.id, goal_data)

    # Инвалидируем кэш
    cache = get_cache()
    if cache:
        await cache.invalidate_user_cache(current_user.id)

    return goal


@router.get("/goals/{goal_id}", response_model=FinancialGoalResponse)
async def get_financial_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    goal = await FinancialGoalCRUD.get(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Финансовая цель не найдена"
        )

    return goal


@router.put("/goals/{goal_idw}", response_model=FinancialGoalResponse)
async def update_financial_goal(
    goal_id: int,
    goal_data: FinancialGoalUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    goal = await FinancialGoalCRUD.update(db, goal_id, current_user.id, goal_data)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Финансовая цель не найдена"
        )

    # Инвалидируем кэш
    cache = get_cache()
    if cache:
        await cache.invalidate_user_cache(current_user.id)

    return goal


class GoalProgressBody(BaseModel):
    """Тело запроса для обновления прогресса по цели"""

    amount: float = Field(..., gt=0, description="Сумма для добавления к прогрессу")


@router.post("/goals/{goal_id}/progress")
async def update_goal_progress(
    goal_id: int,
    body: GoalProgressBody,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Обновить прогресс по финансовой цели"""

    amount = Decimal(str(body.amount))

    goal = await FinancialGoalCRUD.update_progress(db, goal_id, current_user.id, amount)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Финансовая цель не найдена"
        )

    # Also create an expense transaction so the contribution shows up in
    # the dashboard totals and transaction list.
    savings_category = await CategoryCRUD.get_or_create_savings_category(db)
    transaction_data = TransactionCreate(
        category_id=savings_category.id,
        amount=amount,
        transaction_type=TransactionType.EXPENSE,
        notebook_type=NotebookType.BIG,
        description=f"Взнос на цель: {goal.title}",
        notes=f"Автоматически создано при пополнении цели #{goal.id}",
        transaction_date=datetime.utcnow(),
        is_planned=True,
        is_recurring=False,
    )
    await TransactionCRUD.create(db, current_user.id, transaction_data)

    # Invalidate dashboard/transaction caches so the new expense is
    # reflected immediately.
    cache = get_cache()
    if cache:
        await cache.invalidate_user_cache(current_user.id)

    return {"message": "Прогресс обновлен", "is_achieved": goal.is_achieved}


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_financial_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Удалить финансовую цель"""

    success = await FinancialGoalCRUD.delete(db, goal_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Финансовая цель не найдена"
        )


@router.get("/goals/summary", response_model=dict)
async def get_goals_summary(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить сводку по финансовым целям"""

    return await FinancialGoalCRUD.get_goals_summary(db, current_user.id)


# === ФИНАНСОВЫЙ АНАЛИЗ ===


@router.get("/analyses", response_model=List[FinancialAnalysisResponse])
async def get_financial_analyses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить финансовые анализы пользователя"""

    return await FinancialAnalysisCRUD.get_user_analyses(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )


@router.get("/analyses/latest", response_model=Optional[FinancialAnalysisResponse])
async def get_latest_analysis(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить последний финансовый анализ"""

    return await FinancialAnalysisCRUD.get_latest_analysis(db, current_user.id)


async def perform_financial_analysis(
    user_id: int,
    analysis_id: int,
    start_date: datetime,
    end_date: datetime,
    db: AsyncSession,
):
    """Фоновая задача для выполнения финансового анализа"""

    try:
        # Обновляем статус на "в процессе"
        from app.core.db.models.finance import AnalysisStatus

        await FinancialAnalysisCRUD.update_status(
            db, analysis_id, user_id, AnalysisStatus.PROCESSING
        )

        # Получаем статистику транзакций
        stats = await TransactionCRUD.get_transaction_stats(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

        # Получаем AI анализ
        analyzer = get_financial_analyzer()
        ai_summary = None
        ai_recommendations = None
        spending_insights = None

        if analyzer:
            ai_summary = await analyzer.analyze_financial_situation(
                user_id=user_id,
                financial_data=stats,
                period_days=(end_date - start_date).days,
            )

            # Получаем цели пользователя для рекомендаций
            goals = await FinancialGoalCRUD.get_user_goals(
                db, user_id, active_only=True
            )
            goals_data = [
                {
                    "title": goal.title,
                    "target_amount": goal.target_amount,
                    "current_amount": goal.current_amount,
                }
                for goal in goals
            ]

            ai_recommendations = await analyzer.generate_recommendations(
                user_id=user_id, financial_data=stats, user_goals=goals_data
            )

        # Обновляем результаты анализа
        await FinancialAnalysisCRUD.update_analysis_results(
            db=db,
            analysis_id=analysis_id,
            user_id=user_id,
            total_income=stats["total_income"],
            total_expenses=stats["total_expenses"],
            savings_rate=stats["savings_rate"],
            ai_summary=ai_summary,
            ai_recommendations=ai_recommendations,
            spending_insights=spending_insights,
        )

    except Exception as e:
        # В случае ошибки обновляем статус
        from app.core.db.models.finance import AnalysisStatus

        await FinancialAnalysisCRUD.update_status(
            db, analysis_id, user_id, AnalysisStatus.FAILED
        )
        raise e


@router.post(
    "/analyses",
    response_model=FinancialAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_financial_analysis(
    analysis_data: FinancialAnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Создать новый финансовый анализ"""

    # Создаем анализ
    analysis = await FinancialAnalysisCRUD.create(db, current_user.id, analysis_data)

    # Запускаем анализ в фоне
    background_tasks.add_task(
        perform_financial_analysis,
        current_user.id,
        analysis.id,
        analysis_data.period_start,
        analysis_data.period_end,
        db,
    )

    return analysis


def _compute_data_fingerprint(
    stats: Dict[str, Any], goals_data: List[Dict[str, Any]]
) -> str:
    """Create a short hash of the actual financial data so that two requests
    with different period ranges but identical underlying numbers hit the
    same cache entry."""

    def _default(obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

    blob = json.dumps(
        {
            "income": str(stats.get("total_income", 0)),
            "expenses": str(stats.get("total_expenses", 0)),
            "savings_rate": round(float(stats.get("savings_rate", 0)), 1),
            "categories": sorted(
                [
                    {"id": c["category_id"], "t": str(c["total"]), "n": c["count"]}
                    for c in stats.get("category_breakdown", [])
                ],
                key=lambda x: x["id"],
            ),
            "notebooks": sorted(
                [
                    {
                        "type": str(n.get("type", "")),
                        "t": str(n["total"]),
                        "n": n["count"],
                    }
                    for n in stats.get("notebook_breakdown", [])
                ],
                key=lambda x: x["type"],
            ),
            "goals": sorted(
                [
                    {
                        "title": g["title"],
                        "target": str(g["target_amount"]),
                        "current": str(g["current_amount"]),
                    }
                    for g in goals_data
                ],
                key=lambda x: x["title"],
            ),
        },
        sort_keys=True,
        default=_default,
    )
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


async def _resolve_category_names(
    db: AsyncSession, stats: Dict[str, Any]
) -> Dict[str, Any]:
    """Return a *copy* of stats where category_breakdown entries have a
    human-readable ``category_name`` field instead of just ``category_id``."""
    enriched = dict(stats)
    enriched_cats = []
    for cat in stats.get("category_breakdown", []):
        cat_id = cat["category_id"]
        category = await CategoryCRUD.get(db, cat_id)
        cat_name = category.name if category else f"Категория {cat_id}"
        enriched_cats.append({**cat, "category_name": cat_name})
    enriched["category_breakdown"] = enriched_cats
    return enriched


@router.post("/ai-analysis", response_model=dict)
async def run_ai_analysis(
    request: AIAnalysisRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Запустить AI анализ финансов.

    Caching strategy: we fingerprint the actual financial data (totals,
    categories, goals) so that two requests with different period ranges
    but *identical* underlying numbers return from Redis immediately.
    """
    from app.api.routers.dashboard import _generate_rule_based_recommendations

    # Strip timezone info to avoid offset-naive vs offset-aware mismatch
    period_start = request.period_start
    period_end = request.period_end
    if period_start.tzinfo is not None:
        period_start = period_start.replace(tzinfo=None)
    if period_end.tzinfo is not None:
        period_end = period_end.replace(tzinfo=None)

    # ── 1. Gather financial data ──────────────────────────────────────
    stats = await TransactionCRUD.get_transaction_stats(
        db=db,
        user_id=current_user.id,
        start_date=period_start,
        end_date=period_end,
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

    # ── 2. Compute data fingerprint & check Redis ─────────────────────
    fingerprint = _compute_data_fingerprint(stats, goals_data)
    cache = get_cache()

    if cache:
        try:
            cached = await cache.get_ai_analysis(current_user.id, f"deep_{fingerprint}")
            if cached and cached.get("result"):
                logger.info(
                    "Returning cached deep analysis for user %s (fp=%s)",
                    current_user.id,
                    fingerprint,
                )
                cached_result = cached["result"]
                cached_result["metrics"] = stats
                cached_result["source"] = "cache"
                return cached_result
        except Exception as e:
            logger.warning("Redis cache read failed: %s", e)

    # ── 3. Resolve human-readable category names ──────────────────────
    enriched_stats = await _resolve_category_names(db, stats)

    # ── 4. Run AI analysis ────────────────────────────────────────────
    result: Dict[str, Any] = {}
    analyzer = get_financial_analyzer()

    if analyzer:
        try:
            if request.include_recommendations:
                assessment = await FinancialAssessmentCRUD.get_user_assessment(
                    db, current_user.id
                )
                assessment_data = None
                if assessment:
                    assessment_data = {
                        "risk_tolerance": assessment.risk_tolerance,
                        "financial_experience": assessment.financial_experience,
                        "income_stability": assessment.income_stability,
                    }

                recommendations = await analyzer.generate_recommendations(
                    user_id=current_user.id,
                    financial_data=enriched_stats,
                    user_goals=goals_data,
                    user_assessment=assessment_data,
                )
                result["recommendations"] = recommendations

            period_days = (period_end - period_start).days
            situation_analysis = await analyzer.analyze_financial_situation(
                user_id=current_user.id,
                financial_data=enriched_stats,
                period_days=period_days,
            )
            result["situation_analysis"] = situation_analysis
        except Exception as e:
            logger.warning("AI analysis failed, using rule-based fallback: %s", e)

    # ── 5. Fall back to rule-based results ────────────────────────────
    if "recommendations" not in result and request.include_recommendations:
        result["recommendations"] = _generate_rule_based_recommendations(
            stats, goals_data
        )

    if "situation_analysis" not in result:
        total_income = float(stats.get("total_income", 0))
        total_expenses = float(stats.get("total_expenses", 0))
        savings_rate = float(stats.get("savings_rate", 0))
        result["situation_analysis"] = (
            f"За выбранный период доходы составили {total_income:,.0f} ₽, "
            f"расходы — {total_expenses:,.0f} ₽. "
            f"Норма сбережений: {savings_rate:.1f}%."
        )

    # ── 6. Cache everything under the data fingerprint ────────────────
    if cache:
        try:
            cacheable = {
                "situation_analysis": result.get("situation_analysis", ""),
                "recommendations": result.get("recommendations", ""),
            }
            await cache.cache_ai_analysis(
                current_user.id,
                f"deep_{fingerprint}",
                cacheable,
                ttl=7200,
            )
            # Also store under the generic "recommendations" key so
            # GET /recommendations can serve it without triggering AI.
            recs = result.get("recommendations")
            if recs:
                await cache.cache_ai_analysis(
                    current_user.id, "recommendations", recs, ttl=7200
                )
            logger.info(
                "Cached deep analysis for user %s (fp=%s)",
                current_user.id,
                fingerprint,
            )
        except Exception as e:
            logger.warning("Failed to cache deep analysis in Redis: %s", e)

    # ── 7. Return ─────────────────────────────────────────────────────
    result["metrics"] = stats
    result["source"] = "ai"
    return result


# === ФИНАНСОВЫЙ ОПРОС ===


@router.post("/assessment", response_model=FinancialAssessmentResponse)
async def create_financial_assessment(
    assessment_data: FinancialAssessmentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Создать финансовый опрос"""

    # Создаем опрос
    assessment = await FinancialAssessmentCRUD.create(
        db, current_user.id, assessment_data
    )

    # ── Immediate local scoring (always available, no LLM needed) ──
    local_answers = [
        {"question_id": a.question_id, "answer": a.answer}
        for a in assessment_data.answers
    ]
    local_result = calculate_assessment_score(local_answers)

    # Persist the local score right away so the user sees results immediately
    score_value = int(round(local_result.get("overall_score", 0)))
    await FinancialAssessmentCRUD.update_assessment_results(
        db=db,
        user_id=current_user.id,
        risk_tolerance=local_result.get("risk_tolerance"),
        financial_experience=local_result.get("financial_experience"),
        income_stability=local_result.get("income_stability"),
        score=score_value,
        recommendations=None,  # will be enriched by AI below
    )

    # Refresh to return the updated object
    assessment = await FinancialAssessmentCRUD.get_user_assessment(db, current_user.id)

    # ── Background AI enrichment (optional — runs only if LLM is available) ──
    async def analyze_assessment_bg():
        try:
            analyzer = get_financial_analyzer()
            if not analyzer:
                logger.info(
                    "LLM analyzer not available; keeping local score for user %s",
                    current_user.id,
                )
                return

            analysis_result, recommendations = await analyzer.analyze_assessment(
                assessment_data.answers
            )

            # ── Safety: ensure all values destined for VARCHAR columns are str ──
            # recommendations
            if isinstance(recommendations, list):
                recommendations = "; ".join(str(r) for r in recommendations if r)
            elif not isinstance(recommendations, str):
                recommendations = str(recommendations) if recommendations else None

            # spending_habits
            spending_habits = analysis_result.get("spending_habits")
            if isinstance(spending_habits, list):
                spending_habits = "; ".join(str(s) for s in spending_habits if s)
            elif spending_habits is not None and not isinstance(spending_habits, str):
                spending_habits = str(spending_habits)

            # financial_goals_priority
            goals_priority = analysis_result.get("financial_goals_priority")
            if isinstance(goals_priority, list):
                goals_priority = "; ".join(str(g) for g in goals_priority if g)
            elif goals_priority is not None and not isinstance(goals_priority, str):
                goals_priority = str(goals_priority)

            # score — must be int
            ai_score = analysis_result.get("score")
            if ai_score is not None:
                try:
                    ai_score = int(float(str(ai_score)))
                except (ValueError, TypeError):
                    ai_score = score_value
            else:
                ai_score = score_value

            # Merge AI results — only overwrite fields that the LLM actually returned
            await FinancialAssessmentCRUD.update_assessment_results(
                db=db,
                user_id=current_user.id,
                risk_tolerance=analysis_result.get("risk_tolerance")
                or local_result.get("risk_tolerance"),
                financial_experience=analysis_result.get("financial_experience")
                or local_result.get("financial_experience"),
                income_stability=analysis_result.get("income_stability")
                or local_result.get("income_stability"),
                financial_goals_priority=goals_priority,
                spending_habits=spending_habits,
                score=ai_score,
                recommendations=recommendations,
            )
            logger.info(
                "AI assessment enrichment completed for user %s", current_user.id
            )
        except Exception as e:
            logger.error(
                "Error in background assessment analysis for user %s: %s",
                current_user.id,
                e,
            )

    background_tasks.add_task(analyze_assessment_bg)

    return assessment


@router.get("/assessment", response_model=Optional[FinancialAssessmentResponse])
async def get_user_assessment(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить последний опрос пользователя"""

    assessment = await FinancialAssessmentCRUD.get_user_assessment(db, current_user.id)
    if not assessment:
        return None
    return assessment


@router.get("/assessment/questions")
async def get_assessment_questions(current_user: User = Depends(get_current_user)):
    """Получить вопросы финансового опроса"""
    return FINANCIAL_ASSESSMENT_QUESTIONS


# === СОГЛАСИЕ НА ОБРАБОТКУ ДАННЫХ ===


@router.post("/data-consent", response_model=DataConsentResponse)
async def create_or_update_data_consent(
    consent_data: DataConsentCreate,
    request=None,  # FastAPI Request для получения IP и User-Agent
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Создать или обновить согласие на обработку данных"""

    # Получаем IP и User-Agent из запроса
    ip_address = getattr(request, "client", {}).get("host") if request else None
    user_agent = getattr(request, "headers", {}).get("user-agent") if request else None

    consent = await DataConsentCRUD.create_or_update(
        db=db,
        user_id=current_user.id,
        consent_data=consent_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return consent


@router.get("/data-consent", response_model=Optional[DataConsentResponse])
async def get_data_consent(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить согласие на обработку данных"""

    return await DataConsentCRUD.get_user_consent(db, current_user.id)


@router.put("/data-consent", response_model=DataConsentResponse)
async def update_data_consent(
    consent_data: DataConsentUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Обновить согласие на обработку данных"""

    consent = await DataConsentCRUD.update(db, current_user.id, consent_data)
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Согласие не найдено"
        )

    return consent
