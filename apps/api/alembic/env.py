"""
Alembic Environment Configuration
Handles database migrations for Topcoin platform
"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
import os

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from core.config import settings
from core.database import sync_engine
from sqlmodel import SQLModel

# Import all models here to ensure they're registered with SQLModel
from models.user import User
from models.account import Account
from models.admin_adjustment import AdminAdjustment
from models.wallet import Wallet
from models.deposit import Deposit
from models.withdrawal import Withdrawal
from models.order import Order
from models.position import Position
from models.instrument import Instrument
from models.candle import Candle
from models.ai_plan import AIInvestmentPlan, UserInvestment
from models.ledger import LedgerEntry
from models.aml import AMLAlert
from models.audit import Audit
from models.support import SupportTicket

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate
target_metadata = SQLModel.metadata

# Set database URL from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    This configures the context with just a URL and not an Engine.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    Creates an Engine and associates a connection with the context.
    """
    connectable = sync_engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
