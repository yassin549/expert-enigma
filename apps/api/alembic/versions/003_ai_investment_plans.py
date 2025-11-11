"""Add AI investment plans and user investments tables

Revision ID: 003
Revises: 002
Create Date: 2024-01-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Create ai_investment_plans table
    op.create_table('ai_investment_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('risk_profile', sa.Enum('conservative', 'balanced', 'aggressive', name='risk_profile_enum'), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('current_return_pct', sa.Numeric(10, 4), nullable=False, default=0.0),
        sa.Column('monthly_return_pct', sa.Numeric(10, 4), nullable=False, default=0.0),
        sa.Column('quarterly_return_pct', sa.Numeric(10, 4), nullable=False, default=0.0),
        sa.Column('ytd_return_pct', sa.Numeric(10, 4), nullable=False, default=0.0),
        sa.Column('equity_curve_data', postgresql.JSONB(), nullable=True),
        sa.Column('performance_notes', sa.Text(), nullable=True),
        sa.Column('market_commentary', sa.Text(), nullable=True),
        sa.Column('total_aum', sa.Numeric(15, 2), nullable=False, default=0.0),
        sa.Column('active_investors', sa.Integer(), nullable=False, default=0),
        sa.Column('min_investment', sa.Numeric(10, 2), nullable=False, default=100.0),
        sa.Column('max_drawdown_pct', sa.Numeric(10, 4), nullable=False, default=0.0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_accepting_investments', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_investment_plans_risk_profile'), 'ai_investment_plans', ['risk_profile'], unique=False)
    op.create_index(op.f('ix_ai_investment_plans_is_active'), 'ai_investment_plans', ['is_active'], unique=False)

    # Create user_investments table
    op.create_table('user_investments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('invested_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('current_value', sa.Numeric(15, 2), nullable=False),
        sa.Column('return_pct', sa.Numeric(10, 4), nullable=False, default=0.0),
        sa.Column('pnl_amount', sa.Numeric(15, 2), nullable=False, default=0.0),
        sa.Column('investment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_return_update', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['ai_investment_plans.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_user_investments_user_id'), 'user_investments', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_investments_plan_id'), 'user_investments', ['plan_id'], unique=False)
    op.create_index(op.f('ix_user_investments_is_active'), 'user_investments', ['is_active'], unique=False)

    # Create investment_plan_updates table for audit trail
    op.create_table('investment_plan_updates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('admin_user_id', sa.Integer(), nullable=False),
        sa.Column('update_type', sa.Enum('return_update', 'equity_curve', 'settings', 'bulk_update', name='update_type_enum'), nullable=False),
        sa.Column('previous_return_pct', sa.Numeric(10, 4), nullable=True),
        sa.Column('new_return_pct', sa.Numeric(10, 4), nullable=True),
        sa.Column('previous_equity_data', postgresql.JSONB(), nullable=True),
        sa.Column('new_equity_data', postgresql.JSONB(), nullable=True),
        sa.Column('update_reason', sa.Text(), nullable=False),
        sa.Column('affected_users_count', sa.Integer(), nullable=False, default=0),
        sa.Column('total_aum_affected', sa.Numeric(15, 2), nullable=False, default=0.0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['plan_id'], ['ai_investment_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_investment_plan_updates_plan_id'), 'investment_plan_updates', ['plan_id'], unique=False)
    op.create_index(op.f('ix_investment_plan_updates_admin_user_id'), 'investment_plan_updates', ['admin_user_id'], unique=False)
    op.create_index(op.f('ix_investment_plan_updates_created_at'), 'investment_plan_updates', ['created_at'], unique=False)

    # Create user_investment_history table for tracking performance over time
    op.create_table('user_investment_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_investment_id', sa.Integer(), nullable=False),
        sa.Column('snapshot_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('invested_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('current_value', sa.Numeric(15, 2), nullable=False),
        sa.Column('return_pct', sa.Numeric(10, 4), nullable=False),
        sa.Column('plan_return_pct', sa.Numeric(10, 4), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_investment_id'], ['user_investments.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_user_investment_history_user_investment_id'), 'user_investment_history', ['user_investment_id'], unique=False)
    op.create_index(op.f('ix_user_investment_history_snapshot_date'), 'user_investment_history', ['snapshot_date'], unique=False)

    # Insert default AI investment plans
    op.execute("""
        INSERT INTO ai_investment_plans (
            name, risk_profile, description, current_return_pct, monthly_return_pct, 
            quarterly_return_pct, ytd_return_pct, total_aum, active_investors, 
            min_investment, max_drawdown_pct, last_updated_at, equity_curve_data
        ) VALUES 
        (
            'Conservative AI', 'conservative', 
            'Steady, low-risk returns with capital preservation focus. Our AI algorithms prioritize stability and consistent performance over aggressive growth.',
            8.4, 0.7, 2.1, 8.4, 45000000, 2847, 100.00, 2.1,
            NOW(),
            '[{"date": "2024-01-01", "value": 100}, {"date": "2024-02-01", "value": 100.7}, {"date": "2024-03-01", "value": 101.4}, {"date": "2024-04-01", "value": 102.1}, {"date": "2024-05-01", "value": 102.8}, {"date": "2024-06-01", "value": 103.5}, {"date": "2024-07-01", "value": 104.2}, {"date": "2024-08-01", "value": 104.9}, {"date": "2024-09-01", "value": 105.6}, {"date": "2024-10-01", "value": 106.3}, {"date": "2024-11-01", "value": 107.0}, {"date": "2024-12-01", "value": 108.4}]'::jsonb
        ),
        (
            'Balanced AI', 'balanced',
            'Optimal risk-reward balance with consistent performance. Multi-strategy approach adapts to market conditions for steady growth.',
            15.2, 1.2, 3.8, 15.2, 89000000, 4521, 250.00, 4.8,
            NOW(),
            '[{"date": "2024-01-01", "value": 100}, {"date": "2024-02-01", "value": 101.2}, {"date": "2024-03-01", "value": 102.4}, {"date": "2024-04-01", "value": 103.6}, {"date": "2024-05-01", "value": 104.8}, {"date": "2024-06-01", "value": 106.0}, {"date": "2024-07-01", "value": 107.2}, {"date": "2024-08-01", "value": 108.4}, {"date": "2024-09-01", "value": 109.6}, {"date": "2024-10-01", "value": 110.8}, {"date": "2024-11-01", "value": 112.0}, {"date": "2024-12-01", "value": 115.2}]'::jsonb
        ),
        (
            'Aggressive AI', 'aggressive',
            'Maximum growth potential with higher risk tolerance. Advanced algorithms focus on alpha generation and high-frequency opportunities.',
            28.7, 2.1, 7.2, 28.7, 116000000, 3194, 500.00, 8.9,
            NOW(),
            '[{"date": "2024-01-01", "value": 100}, {"date": "2024-02-01", "value": 102.1}, {"date": "2024-03-01", "value": 104.2}, {"date": "2024-04-01", "value": 106.3}, {"date": "2024-05-01", "value": 108.4}, {"date": "2024-06-01", "value": 110.5}, {"date": "2024-07-01", "value": 112.6}, {"date": "2024-08-01", "value": 114.7}, {"date": "2024-09-01", "value": 116.8}, {"date": "2024-10-01", "value": 118.9}, {"date": "2024-11-01", "value": 121.0}, {"date": "2024-12-01", "value": 128.7}]'::jsonb
        );
    """)


def downgrade():
    op.drop_table('user_investment_history')
    op.drop_table('investment_plan_updates')
    op.drop_table('user_investments')
    op.drop_table('ai_investment_plans')
    op.execute('DROP TYPE IF EXISTS risk_profile_enum')
    op.execute('DROP TYPE IF EXISTS update_type_enum')
