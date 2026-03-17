import logging
from typing import Literal

from fastapi import Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.db.services import migrate_transactions
from . import database_manage_router

logger = logging.getLogger(__name__)


@database_manage_router.post(
    "/migrate_transactions",
    status_code=status.HTTP_201_CREATED,
    summary="Запустить миграцию транзакций"
)
async def migrate_transactions_endpoint(
        db: AsyncSession = Depends(get_async_session),
) -> JSONResponse:
    """
    Migrates transactions from JSON files to the database.
    :param db: Async SQLAlchemy-session.
    """
    result = None
    try:
        result = await migrate_transactions(db=db)
        return JSONResponse({"message": f"Successfully processed {result} transactions."})
    except ValueError as error:
        return JSONResponse({"error": str(error)}, status_code=status.HTTP_400_BAD_REQUEST)
