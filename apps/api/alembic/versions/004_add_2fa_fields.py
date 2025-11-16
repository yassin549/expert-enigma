"""Add 2FA fields to users table

Revision ID: 004
Revises: 003
Create Date: 2025-01-21 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add 2FA fields to users table
    op.add_column('users', sa.Column('totp_secret', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('is_2fa_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('two_factor_backup_codes', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('users', 'two_factor_backup_codes')
    op.drop_column('users', 'is_2fa_enabled')
    op.drop_column('users', 'totp_secret')

