"""
CRUD операции для работы с финансовыми целями и анализом
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, case
from datetime import datetime
from decimal import Decimal

from app.core.db.models.finance import (
    FinancialGoal, FinancialAnalysis, FinancialAssessment, 
    DataConsent, AnalysisStatus
)
from app.api.schemas.finance import (
    FinancialGoalCreate, FinancialGoalUpdate, 
    FinancialAnalysisCreate, FinancialAssessmentCreate,
    DataConsentCreate, DataConsentUpdate
)


class FinancialGoalCRUD:
    """CRUD операции для финансовых целей"""

    @staticmethod
    async def create(db: AsyncSession, user_id: int, goal_data: FinancialGoalCreate) -> FinancialGoal:
        """Создать новую финансовую цель"""
        goal = FinancialGoal(
            user_id=user_id,
            title=goal_data.title,
            description=goal_data.description,
            target_amount=goal_data.target_amount,
            target_date=goal_data.target_date,
            priority=goal_data.priority
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def get(db: AsyncSession, goal_id: int, user_id: int) -> Optional[FinancialGoal]:
        """Получить финансовую цель по ID"""
        result = await db.execute(
            select(FinancialGoal).where(
                and_(FinancialGoal.id == goal_id, FinancialGoal.user_id == user_id)
            )
        )
        return result.scalars().first()

    @staticmethod
    async def get_user_goals(
        db: AsyncSession, 
        user_id: int, 
        active_only: bool = True,
        skip: int = 0, 
        limit: int = 100
    ) -> List[FinancialGoal]:
        """Получить финансовые цели пользователя"""
        query = (
            select(FinancialGoal)
            .where(FinancialGoal.user_id == user_id)
            .order_by(FinancialGoal.priority.desc(), FinancialGoal.target_date.asc())
            .offset(skip)
            .limit(limit)
        )
        
        if active_only:
            query = query.where(FinancialGoal.is_achieved == False)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def update(
        db: AsyncSession, 
        goal_id: int, 
        user_id: int, 
        goal_data: FinancialGoalUpdate
    ) -> Optional[FinancialGoal]:
        """Обновить финансовую цель"""
        goal = await FinancialGoalCRUD.get(db, goal_id, user_id)
        if not goal:
            return None

        for field, value in goal_data.dict(exclude_unset=True).items():
            setattr(goal, field, value)

        # Проверяем достижение цели
        if goal.current_amount >= goal.target_amount and not goal.is_achieved:
            goal.is_achieved = True

        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def update_progress(
        db: AsyncSession, 
        goal_id: int, 
        user_id: int, 
        amount_to_add: Decimal
    ) -> Optional[FinancialGoal]:
        """Обновить прогресс по финансовой цели"""
        goal = await FinancialGoalCRUD.get(db, goal_id, user_id)
        if not goal:
            return None

        goal.current_amount += amount_to_add
        
        if goal.current_amount >= goal.target_amount and not goal.is_achieved:
            goal.is_achieved = True

        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def delete(db: AsyncSession, goal_id: int, user_id: int) -> bool:
        """Удалить финансовую цель"""
        goal = await FinancialGoalCRUD.get(db, goal_id, user_id)
        if not goal:
            return False

        await db.delete(goal)
        await db.commit()
        return True

    @staticmethod
    async def get_goals_summary(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Получить сводку по финансовым целям"""
        result = await db.execute(
            select(
                func.count(FinancialGoal.id).label('total_goals'),
                func.sum(case((FinancialGoal.is_achieved == True, 1), else_=0)).label('achieved_goals'),
                func.sum(FinancialGoal.target_amount).label('total_target'),
                func.sum(FinancialGoal.current_amount).label('total_saved'),
                func.avg(FinancialGoal.current_amount / FinancialGoal.target_amount * 100).label('avg_progress')
            ).where(FinancialGoal.user_id == user_id)
        )
        summary = result.first()
        
        return {
            "total_goals": summary.total_goals or 0,
            "achieved_goals": summary.achieved_goals or 0,
            "active_goals": (summary.total_goals or 0) - (summary.achieved_goals or 0),
            "total_target": summary.total_target or Decimal('0'),
            "total_saved": summary.total_saved or Decimal('0'),
            "average_progress": float(summary.avg_progress or 0)
        }


class FinancialAnalysisCRUD:
    """CRUD операции для финансового анализа"""

    @staticmethod
    async def create(db: AsyncSession, user_id: int, analysis_data: FinancialAnalysisCreate) -> FinancialAnalysis:
        """Создать новый финансовый анализ"""
        analysis = FinancialAnalysis(
            user_id=user_id,
            period_start=analysis_data.period_start,
            period_end=analysis_data.period_end,
            status=AnalysisStatus.PENDING
        )
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def get(db: AsyncSession, analysis_id: int, user_id: int) -> Optional[FinancialAnalysis]:
        """Получить финансовый анализ по ID"""
        result = await db.execute(
            select(FinancialAnalysis).where(
                and_(FinancialAnalysis.id == analysis_id, FinancialAnalysis.user_id == user_id)
            )
        )
        return result.scalars().first()

    @staticmethod
    async def get_user_analyses(
        db: AsyncSession, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[FinancialAnalysis]:
        """Получить финансовые анализы пользователя"""
        result = await db.execute(
            select(FinancialAnalysis)
            .where(FinancialAnalysis.user_id == user_id)
            .order_by(desc(FinancialAnalysis.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_latest_analysis(db: AsyncSession, user_id: int) -> Optional[FinancialAnalysis]:
        """Получить последний анализ пользователя"""
        result = await db.execute(
            select(FinancialAnalysis)
            .where(
                and_(
                    FinancialAnalysis.user_id == user_id,
                    FinancialAnalysis.status == AnalysisStatus.COMPLETED
                )
            )
            .order_by(desc(FinancialAnalysis.analysis_date))
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def update_analysis_results(
        db: AsyncSession,
        analysis_id: int,
        user_id: int,
        total_income: Decimal,
        total_expenses: Decimal,
        savings_rate: Decimal,
        ai_summary: Optional[str] = None,
        ai_recommendations: Optional[str] = None,
        spending_insights: Optional[str] = None
    ) -> Optional[FinancialAnalysis]:
        """Обновить результаты анализа"""
        analysis = await FinancialAnalysisCRUD.get(db, analysis_id, user_id)
        if not analysis:
            return None

        analysis.total_income = total_income
        analysis.total_expenses = total_expenses
        analysis.savings_rate = savings_rate
        analysis.ai_summary = ai_summary
        analysis.ai_recommendations = ai_recommendations
        analysis.spending_insights = spending_insights
        analysis.status = AnalysisStatus.COMPLETED

        await db.commit()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def update_status(
        db: AsyncSession, 
        analysis_id: int, 
        user_id: int, 
        status: AnalysisStatus
    ) -> Optional[FinancialAnalysis]:
        """Обновить статус анализа"""
        analysis = await FinancialAnalysisCRUD.get(db, analysis_id, user_id)
        if not analysis:
            return None

        analysis.status = status
        await db.commit()
        await db.refresh(analysis)
        return analysis


class FinancialAssessmentCRUD:
    """CRUD операции для финансового опроса"""

    @staticmethod
    async def create(
        db: AsyncSession, 
        user_id: int, 
        assessment_data: FinancialAssessmentCreate
    ) -> FinancialAssessment:
        """Создать новый финансовый опрос"""
        import json
        
        assessment = FinancialAssessment(
            user_id=user_id,
            assessment_data=json.dumps([answer.dict() for answer in assessment_data.answers])
        )
        db.add(assessment)
        await db.commit()
        await db.refresh(assessment)
        return assessment

    @staticmethod
    async def get_user_assessment(db: AsyncSession, user_id: int) -> Optional[FinancialAssessment]:
        """Получить последний опрос пользователя"""
        result = await db.execute(
            select(FinancialAssessment)
            .where(FinancialAssessment.user_id == user_id)
            .order_by(desc(FinancialAssessment.created_at))
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def update_assessment_results(
        db: AsyncSession,
        user_id: int,
        risk_tolerance: Optional[str] = None,
        financial_experience: Optional[str] = None,
        income_stability: Optional[str] = None,
        financial_goals_priority: Optional[str] = None,
        spending_habits: Optional[str] = None,
        score: Optional[int] = None,
        recommendations: Optional[str] = None
    ) -> Optional[FinancialAssessment]:
        """Обновить результаты опроса"""
        assessment = await FinancialAssessmentCRUD.get_user_assessment(db, user_id)
        if not assessment:
            return None

        if risk_tolerance is not None:
            assessment.risk_tolerance = risk_tolerance
        if financial_experience is not None:
            assessment.financial_experience = financial_experience
        if income_stability is not None:
            assessment.income_stability = income_stability
        if financial_goals_priority is not None:
            assessment.financial_goals_priority = financial_goals_priority
        if spending_habits is not None:
            assessment.spending_habits = spending_habits
        if score is not None:
            assessment.score = score
        if recommendations is not None:
            assessment.recommendations = recommendations

        await db.commit()
        await db.refresh(assessment)
        return assessment


class DataConsentCRUD:
    """CRUD операции для согласия на обработку данных"""

    @staticmethod
    async def create_or_update(
        db: AsyncSession, 
        user_id: int, 
        consent_data: DataConsentCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> DataConsent:
        """Создать или обновить согласие на обработку данных"""
        # Ищем существующее согласие
        result = await db.execute(
            select(DataConsent).where(DataConsent.user_id == user_id)
        )
        consent = result.scalars().first()

        if consent:
            # Обновляем существующее
            consent.analytics_consent = consent_data.analytics_consent
            consent.ai_improvement_consent = consent_data.ai_improvement_consent
            consent.marketing_consent = consent_data.marketing_consent
            consent.updated_at = datetime.utcnow()
            if ip_address:
                consent.ip_address = ip_address
            if user_agent:
                consent.user_agent = user_agent
        else:
            # Создаем новое
            consent = DataConsent(
                user_id=user_id,
                analytics_consent=consent_data.analytics_consent,
                ai_improvement_consent=consent_data.ai_improvement_consent,
                marketing_consent=consent_data.marketing_consent,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(consent)

        await db.commit()
        await db.refresh(consent)
        return consent

    @staticmethod
    async def get_user_consent(db: AsyncSession, user_id: int) -> Optional[DataConsent]:
        """Получить согласие пользователя"""
        result = await db.execute(
            select(DataConsent).where(DataConsent.user_id == user_id)
        )
        return result.scalars().first()

    @staticmethod
    async def update(
        db: AsyncSession, 
        user_id: int, 
        consent_data: DataConsentUpdate
    ) -> Optional[DataConsent]:
        """Обновить согласие на обработку данных"""
        consent = await DataConsentCRUD.get_user_consent(db, user_id)
        if not consent:
            return None

        for field, value in consent_data.dict(exclude_unset=True).items():
            if value is not None:
                setattr(consent, field, value)

        consent.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(consent)
        return consent