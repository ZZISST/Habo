import json
import logging
from pathlib import Path
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db.models.finance import Transaction

logger = logging.getLogger(__name__)


async def migrate_transactions(db: AsyncSession, json_file_path: str = None) -> int:
    """
    Migrate transactions from JSON file to database.
    
    Args:
        db: Async SQLAlchemy session
        json_file_path: Path to JSON file with transactions data (optional)
    
    Returns:
        int: Number of transactions migrated
        
    Raises:
        ValueError: If JSON file not found or invalid
        
    Example JSON structure:
        [
            {

            }
        ]
    """
    # Default path to transactions.json in project root
    if json_file_path is None:
        project_root = Path(__file__).parent.parent.parent.parent.parent
        json_file_path = project_root / "transactions.json"
    else:
        json_file_path = Path(json_file_path)
    
    # Check if file exists
    if not json_file_path.exists():
        error_msg = f"Transactions JSON file not found at: {json_file_path}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Read and parse JSON file
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            transactions_data = json.load(f)
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON format in {json_file_path}: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    except Exception as e:
        error_msg = f"Error reading file {json_file_path}: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if not isinstance(transactions_data, list):
        raise ValueError("JSON file must contain an array of transactions")
    
    migrated_count = 0
    
    # Migrate each transaction
    for transaction_data in transactions_data:
        try:
            # Convert date strings to datetime objects if needed
            if isinstance(transaction_data.get('date'), str):
                transaction_data['date'] = datetime.fromisoformat(transaction_data['date'])
            if isinstance(transaction_data.get('end_date'), str):
                transaction_data['end_date'] = datetime.fromisoformat(transaction_data['end_date'])
            
            # Check if transaction already exists (by title and agency)
            stmt = select(Transaction).where(
                Transaction.title == transaction_data['title'],
                Transaction.agency == transaction_data['agency']
            )
            result = await db.execute(stmt)
            existing_transaction = result.scalar_one_or_none()
            
            if existing_transaction:
                logger.info(f"Transaction '{transaction_data['title']}' from '{transaction_data['agency']}' already exists, skipping...")
                continue
            
            # Create new transaction
            transaction = Transaction(**transaction_data)
            db.add(transaction)
            migrated_count += 1
            logger.info(f"Migrating transaction: {transaction_data['title']}")
            
        except KeyError as e:
            logger.error(f"Missing required field in transaction data: {e}")
            continue
        except Exception as e:
            logger.error(f"Error migrating transaction '{transaction_data.get('title', 'Unknown')}': {str(e)}")
            continue
    
    # Commit all changes
    await db.commit()
    logger.info(f"Successfully migrated {migrated_count} transactions")
    
    return migrated_count
