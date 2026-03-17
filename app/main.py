import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import analysis, auth, budget, dashboard, transactions
from app.api.routers.database_manager import database_manage_router
from app.core.cache import close_redis, init_redis
from app.core.database import async_session_local, close_db, init_db
from app.core.db import crud
from app.core.logging_config import IndentFormatter
from app.sdk.nlp.llm_integration import close_ollama, init_ollama

# Setup logging
IndentFormatter.setup_logging(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default admin credentials
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_EMAIL = "admin@habo.com"
DEFAULT_ADMIN_PASSWORD = "admin123"


async def create_default_admin():
    """Create default admin user if not exists"""
    async with async_session_local() as db:
        existing_admin = await crud.get_user_by_username(db, DEFAULT_ADMIN_USERNAME)
        if not existing_admin:
            logger.info("Creating default admin user...")
            admin = await crud.create_user(
                db,
                username=DEFAULT_ADMIN_USERNAME,
                email=DEFAULT_ADMIN_EMAIL,
                password=DEFAULT_ADMIN_PASSWORD,
                is_admin=True,
            )
            await crud.create_user_profile(db, user_id=admin.id)
            logger.info(f"Default admin created: {DEFAULT_ADMIN_USERNAME}")
        else:
            logger.info("Default admin already exists")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events:
    - Startup: Initialize database, Redis, Ollama and create tables
    - Shutdown: Close all connections

    Args:
        app: FastAPI application instance
    """
    # Startup
    logger.info("Starting Household Account Book Organised Financial Manager API...")

    # Initialize database
    await init_db()
    logger.info("Database initialized successfully")

    # Create default admin
    await create_default_admin()

    # Initialize default categories
    async with async_session_local() as db:
        from app.core.db.crud.finance.budget import CategoryCRUD

        await CategoryCRUD.init_default_categories(db)
        logger.info("Default categories initialized")

    # Initialize Redis
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = os.getenv("REDIS_PORT", "6379")
    redis_url = os.getenv("REDIS_URL", f"redis://{redis_host}:{redis_port}/0")
    try:
        await init_redis(redis_url)
        logger.info("Redis initialized successfully")
    except Exception as e:
        logger.warning(f"Redis initialization failed: {e}")

    # Initialize Ollama
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")
    try:
        await init_ollama(ollama_host, ollama_model)
        logger.info("Ollama initialized successfully")
    except Exception as e:
        logger.warning(f"Ollama initialization failed: {e}")

    yield

    # Shutdown
    logger.info("Shutting down Household Account Book Organised Financial Manager API...")
    await close_db()
    await close_redis()
    await close_ollama()
    logger.info("All connections closed")


app = FastAPI(
    title="Household Account Book Organised Financial Manager API",
    description="System for managing personal finances with AI-powered insights and recommendations.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(budget.router)
app.include_router(transactions.router)
app.include_router(analysis.router)
app.include_router(dashboard.router)
app.include_router(database_manage_router)


@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.

    Returns:
        dict: API metadata including version and documentation URLs
    """
    logger.info("Root endpoint accessed")
    return {
        "message": "Household Account Book Organised Financial Manager API",
        "description": "System for managing personal finances with AI-powered insights and recommendations.",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "auth": "/auth",
            "budget": "/finance/budget",
            "transactions": "/finance/transactions",
            "analysis": "/finance/analysis",
            "dashboard": "/finance/dashboard",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring API availability.

    Returns:
        dict: Health status of the API
    """
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.core.main:app", host="0.0.0.0", port=8000, reload=True)
