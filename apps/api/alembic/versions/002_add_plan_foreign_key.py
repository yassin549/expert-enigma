"""Add foreign key constraint for users.plan_id

Revision ID: 002
Revises: 001
Create Date: 2025-01-21 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add foreign key constraint for users.plan_id
    # This is done in a separate migration because ai_investment_plans table
    # is created in migration 003, but we need this migration to exist
    # for the migration chain to work properly
    # The actual foreign key will be added in migration 003 after the table is created
    pass


def downgrade():
    # Remove foreign key if it exists (will be handled in migration 003 downgrade)
    pass

