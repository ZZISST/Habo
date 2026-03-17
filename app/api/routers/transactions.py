"""
API роуты для работы с транзакциями (блокноты Кэкэйбо)
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routers.auth import get_current_user
from app.api.schemas.finance import (
    KakeiboNotebookSummary,
    NotebookType,
    TransactionCreate,
    TransactionResponse,
    TransactionType,
    TransactionUpdate,
)
from app.core.cache import get_cache
from app.core.database import get_async_session
from app.core.db.crud.finance.budget import CategoryCRUD
from app.core.db.crud.finance.transaction import TransactionCRUD
from app.core.db.models.finance import NotebookType as ModelNotebookType
from app.core.db.models.finance import TransactionType as ModelTransactionType
from app.core.db.models.user import User

router = APIRouter(prefix="/finance/transactions", tags=["Transactions & Kakeibo"])


@router.get("/", response_model=List[TransactionResponse])
async def get_user_transactions(
    skip: int = Query(0, ge=0, description="Количество пропускаемых записей"),
    limit: int = Query(50, ge=1, le=1000, description="Количество записей на странице"),
    transaction_type: Optional[TransactionType] = Query(
        None, description="Тип транзакции"
    ),
    notebook_type: Optional[NotebookType] = Query(
        None, description="Тип блокнота Кэкэйбо"
    ),
    category_id: Optional[int] = Query(None, description="ID категории"),
    start_date: Optional[datetime] = Query(None, description="Начальная дата"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата"),
    is_planned: Optional[bool] = Query(None, description="Планируемые или фактические"),
    search: Optional[str] = Query(None, description="Поиск по описанию и заметкам"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить транзакции пользователя с фильтрацией"""

    # When the client sends a date-only string like "2026-03-12", FastAPI
    # parses it as midnight (00:00:00).  Extend to end-of-day so that
    # transactions created later in the day are included.
    if (
        end_date is not None
        and end_date.hour == 0
        and end_date.minute == 0
        and end_date.second == 0
    ):
        end_date = end_date.replace(hour=23, minute=59, second=59)

    return await TransactionCRUD.get_user_transactions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        transaction_type=ModelTransactionType(transaction_type.value)
        if transaction_type
        else None,
        notebook_type=ModelNotebookType(notebook_type.value) if notebook_type else None,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        is_planned=is_planned,
        search=search,
    )


@router.post(
    "/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Создать новую транзакцию"""

    # Проверяем существование категории
    category = await CategoryCRUD.get(db, transaction_data.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена"
        )

    transaction = await TransactionCRUD.create(db, current_user.id, transaction_data)

    # Инвалидируем кэш пользователя
    cache = get_cache()
    if cache:
        await cache.invalidate_user_cache(current_user.id)

    return transaction


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить транзакцию по ID"""

    transaction = await TransactionCRUD.get(db, transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Транзакция не найдена"
        )

    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Обновить транзакцию"""

    transaction = await TransactionCRUD.update(
        db, transaction_id, current_user.id, transaction_data
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Транзакция не найдена"
        )

    # Инвалидируем кэш пользователя
    cache = get_cache()
    if cache:
        await cache.invalidate_user_cache(current_user.id)

    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Удалить транзакцию"""

    success = await TransactionCRUD.delete(db, transaction_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Транзакция не найдена"
        )

    # Инвалидируем кэш пользователя
    cache = get_cache()
    if cache:
        await cache.invalidate_user_cache(current_user.id)


# === КЭКЭЙБО БЛОКНОТЫ ===


@router.get("/kakeibo/{notebook_type}", response_model=KakeiboNotebookSummary)
async def get_kakeibo_notebook(
    notebook_type: NotebookType,
    start_date: Optional[datetime] = Query(None, description="Начальная дата периода"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата периода"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить данные блокнота Кэкэйбо"""

    # Если даты не указаны, берем текущий месяц
    if not start_date:
        start_date = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
    if not end_date:
        # Последний день месяца
        if start_date.month == 12:
            next_month = start_date.replace(year=start_date.year + 1, month=1)
        else:
            next_month = start_date.replace(month=start_date.month + 1)
        end_date = next_month - timedelta(days=1)
        end_date = end_date.replace(hour=23, minute=59, second=59)

    period_str = start_date.strftime("%Y-%m")

    # Проверяем кэш
    cache = get_cache()
    if cache:
        cached_data = await cache.get_kakeibo_notebook(
            current_user.id, notebook_type.value, period_str
        )
        if cached_data:
            return KakeiboNotebookSummary(**cached_data)

    # Получаем транзакции
    transactions = await TransactionCRUD.get_kakeibo_notebook(
        db=db,
        user_id=current_user.id,
        notebook_type=ModelNotebookType(notebook_type.value),
        start_date=start_date,
        end_date=end_date,
    )

    # Вычисляем суммы
    total_planned = sum((t.amount for t in transactions if t.is_planned), Decimal(0))
    total_actual = sum((t.amount for t in transactions if not t.is_planned), Decimal(0))
    variance = total_planned - total_actual

    summary = KakeiboNotebookSummary(
        notebook_type=notebook_type,
        period=period_str,
        total_planned=total_planned,
        total_actual=total_actual,
        variance=variance,
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
    )

    # Кэшируем результат
    if cache:
        await cache.cache_kakeibo_notebook(
            current_user.id,
            notebook_type.value,
            period_str,
            summary.dict(),
            ttl=900,  # 15 минут
        )

    return summary


@router.get("/daily/{date}", response_model=List[TransactionResponse])
async def get_daily_transactions(
    date: datetime,
    notebook_type: Optional[NotebookType] = Query(None, description="Тип блокнота"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить транзакции за определенный день"""

    return await TransactionCRUD.get_daily_transactions(
        db=db,
        user_id=current_user.id,
        date=date,
        notebook_type=ModelNotebookType(notebook_type.value) if notebook_type else None,
    )


@router.get("/stats/summary", response_model=dict)
async def get_transaction_stats(
    start_date: Optional[datetime] = Query(None, description="Начальная дата"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата"),
    category_id: Optional[int] = Query(None, description="ID категории"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить статистику транзакций"""

    # По умолчанию берем текущий месяц
    if not start_date:
        start_date = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
    if not end_date:
        end_date = datetime.utcnow()

    period_str = f"{start_date.strftime('%Y-%m')}_to_{end_date.strftime('%Y-%m')}"

    # Проверяем кэш
    cache = get_cache()
    if cache:
        cached_stats = await cache.get_transaction_stats(current_user.id, period_str)
        if cached_stats:
            return cached_stats

    stats = await TransactionCRUD.get_transaction_stats(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
    )

    # Кэшируем результат
    if cache:
        await cache.cache_transaction_stats(
            current_user.id,
            period_str,
            stats,
            ttl=1800,  # 30 минут
        )

    return stats


@router.get("/stats/top-expenses", response_model=List[TransactionResponse])
async def get_top_expenses(
    limit: int = Query(10, ge=1, le=100, description="Количество топ трат"),
    start_date: Optional[datetime] = Query(None, description="Начальная дата"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить топ расходов"""

    return await TransactionCRUD.get_top_expenses(
        db=db,
        user_id=current_user.id,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/recurring", response_model=List[TransactionResponse])
async def get_recurring_transactions(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Получить регулярные транзакции"""

    return await TransactionCRUD.get_recurring_transactions(db, current_user.id)


# === БЫСТРЫЕ ДЕЙСТВИЯ ===


@router.post("/quick/expense", response_model=TransactionResponse)
async def create_quick_expense(
    category_id: int,
    amount: float,
    description: str,
    notebook_type: NotebookType = NotebookType.SMALL,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Быстро создать расход"""

    transaction_data = TransactionCreate(
        category_id=category_id,
        amount=Decimal(str(amount)),
        transaction_type=TransactionType.EXPENSE,
        notebook_type=notebook_type,
        description=description,
        notes=None,
        transaction_date=datetime.utcnow(),
        is_planned=False,
    )

    return await create_transaction(transaction_data, db, current_user)


@router.post("/quick/income", response_model=TransactionResponse)
async def create_quick_income(
    category_id: int,
    amount: float,
    description: str,
    notebook_type: NotebookType = NotebookType.BIG,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Быстро создать доход"""

    transaction_data = TransactionCreate(
        category_id=category_id,
        amount=Decimal(str(amount)),
        transaction_type=TransactionType.INCOME,
        notebook_type=notebook_type,
        description=description,
        notes=None,
        transaction_date=datetime.utcnow(),
        is_planned=False,
    )

    return await create_transaction(transaction_data, db, current_user)
