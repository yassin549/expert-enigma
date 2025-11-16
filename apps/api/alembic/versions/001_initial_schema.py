"""Initial schema - All base tables

Revision ID: 001
Revises: 
Create Date: 2025-01-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import Numeric

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create ENUM types (only if they don't exist to handle concurrent migration attempts)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE kyc_status_enum AS ENUM ('pending', 'auto_approved', 'approved', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deposit_status_enum AS ENUM ('pending', 'confirming', 'confirmed', 'failed', 'refunded');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE wallet_type_enum AS ENUM ('business_operational', 'business_deposit', 'user_custody');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE adjustment_type_enum AS ENUM ('credit', 'debit', 'set_balance', 'fee', 'bonus', 'refund');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_side_enum AS ENUM ('buy', 'sell');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_type_enum AS ENUM ('market', 'limit', 'stop', 'stop_limit', 'take_profit', 'trailing_stop', 'oco');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_status_enum AS ENUM ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE position_status_enum AS ENUM ('open', 'closed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE position_side_enum AS ENUM ('buy', 'sell');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE instrument_type_enum AS ENUM ('forex', 'crypto', 'stock', 'index', 'commodity');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE timeframe_enum AS ENUM ('1m', '5m', '15m', '1h', '4h', '1d', '1w');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE entry_type_enum AS ENUM ('deposit', 'withdrawal', 'admin_adjustment', 'trade_pnl', 'fee', 'bonus', 'refund', 'investment_return', 'investment_withdrawal');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE aml_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE audit_action_enum AS ENUM ('user_created', 'user_updated', 'user_banned', 'user_unbanned', 'account_created', 'account_frozen', 'account_unfrozen', 'deposit_created', 'deposit_confirmed', 'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_completed', 'order_placed', 'order_filled', 'order_cancelled', 'position_opened', 'position_closed', 'admin_adjustment', 'kyc_submitted', 'kyc_approved', 'kyc_rejected', 'aml_alert_created', 'aml_alert_resolved', 'investment_allocated', 'investment_withdrawn');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ticket_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ticket_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=True),
        sa.Column('region', sa.String(50), nullable=True),
        sa.Column('kyc_status', sa.Enum('pending', 'auto_approved', 'approved', 'rejected', name='kyc_status_enum'), nullable=False),
        sa.Column('kyc_submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('kyc_reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('kyc_reviewed_by', sa.Integer(), nullable=True),
        sa.Column('kyc_rejection_reason', sa.String(500), nullable=True),
        sa.Column('kyc_id_document', sa.String(500), nullable=True),
        sa.Column('kyc_selfie', sa.String(500), nullable=True),
        sa.Column('kyc_proof_of_address', sa.String(500), nullable=True),
        sa.Column('can_access_trading', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_banned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('plan_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['kyc_reviewed_by'], ['users.id'], ),
        # Note: plan_id foreign key will be added in migration 002 after ai_investment_plans table is created
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create accounts table
    op.create_table('accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False, server_default='Main Account'),
        sa.Column('base_currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('deposited_amount', Numeric(20, 2), nullable=False, server_default='0.00'),
        sa.Column('virtual_balance', Numeric(20, 2), nullable=False, server_default='0.00'),
        sa.Column('equity_cached', Numeric(20, 2), nullable=False, server_default='0.00'),
        sa.Column('margin_used', Numeric(20, 2), nullable=False, server_default='0.00'),
        sa.Column('margin_available', Numeric(20, 2), nullable=False, server_default='0.00'),
        sa.Column('total_trades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('winning_trades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('losing_trades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_pnl', Numeric(20, 2), nullable=False, server_default='0.00'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_frozen', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_trade_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_accounts_user_id'), 'accounts', ['user_id'], unique=False)

    # Create wallets table
    op.create_table('wallets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('business_operational', 'business_deposit', 'user_custody', name='wallet_type_enum'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('balance', Numeric(20, 8), nullable=False, server_default='0.00000000'),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create deposits table
    op.create_table('deposits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', Numeric(20, 8), nullable=False),
        sa.Column('amount_usd', Numeric(20, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('status', sa.Enum('pending', 'confirming', 'confirmed', 'failed', 'refunded', name='deposit_status_enum'), nullable=False, server_default='pending'),
        sa.Column('nowpayments_payment_id', sa.String(100), nullable=True),
        sa.Column('payment_address', sa.String(500), nullable=True),
        sa.Column('tx_hash', sa.String(200), nullable=True),
        sa.Column('confirmations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('required_confirmations', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('tx_meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('network_fee', Numeric(20, 8), nullable=True),
        sa.Column('reconciled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reconciled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expired_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_deposits_user_id'), 'deposits', ['user_id'], unique=False)
    op.create_index(op.f('ix_deposits_status'), 'deposits', ['status'], unique=False)
    op.create_index(op.f('ix_deposits_nowpayments_payment_id'), 'deposits', ['nowpayments_payment_id'], unique=False)
    op.create_index(op.f('ix_deposits_created_at'), 'deposits', ['created_at'], unique=False)

    # Create withdrawals table
    op.create_table('withdrawals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount_requested', Numeric(20, 2), nullable=False),
        sa.Column('amount_approved', Numeric(20, 2), nullable=True),
        sa.Column('amount_sent', Numeric(20, 8), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('status', sa.Enum('pending', 'approved', 'processing', 'completed', 'rejected', 'failed', name='withdrawal_status_enum'), nullable=False, server_default='pending'),
        sa.Column('payout_address', sa.String(500), nullable=False),
        sa.Column('admin_review_id', sa.Integer(), nullable=True),
        sa.Column('admin_notes', sa.String(1000), nullable=True),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        sa.Column('tx_hash', sa.String(200), nullable=True),
        sa.Column('tx_meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('network_fee', Numeric(20, 8), nullable=True),
        sa.Column('processing_fee', Numeric(20, 2), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_review_id'], ['users.id'], ),
    )
    op.create_index(op.f('ix_withdrawals_user_id'), 'withdrawals', ['user_id'], unique=False)
    op.create_index(op.f('ix_withdrawals_status'), 'withdrawals', ['status'], unique=False)
    op.create_index(op.f('ix_withdrawals_requested_at'), 'withdrawals', ['requested_at'], unique=False)

    # Create instruments table
    op.create_table('instruments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('type', sa.Enum('forex', 'crypto', 'stock', 'index', 'commodity', name='instrument_type_enum'), nullable=False),
        sa.Column('min_size', Numeric(20, 8), nullable=False),
        sa.Column('max_size', Numeric(20, 8), nullable=False),
        sa.Column('tick_size', Numeric(20, 8), nullable=False),
        sa.Column('spread_pct', Numeric(10, 6), nullable=False, server_default='0.001'),
        sa.Column('commission_pct', Numeric(10, 6), nullable=False, server_default='0.001'),
        sa.Column('max_leverage', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_tradeable', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('trading_hours', sa.String(500), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('icon_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_instruments_symbol'), 'instruments', ['symbol'], unique=True)
    op.create_index(op.f('ix_instruments_type'), 'instruments', ['type'], unique=False)

    # Create candles table
    op.create_table('candles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('instrument_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('timeframe', sa.Enum('1m', '5m', '15m', '1h', '4h', '1d', '1w', name='timeframe_enum'), nullable=False),
        sa.Column('open', Numeric(20, 8), nullable=False),
        sa.Column('high', Numeric(20, 8), nullable=False),
        sa.Column('low', Numeric(20, 8), nullable=False),
        sa.Column('close', Numeric(20, 8), nullable=False),
        sa.Column('volume', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('num_trades', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['instrument_id'], ['instruments.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_candles_instrument_id'), 'candles', ['instrument_id'], unique=False)
    op.create_index(op.f('ix_candles_timestamp'), 'candles', ['timestamp'], unique=False)
    op.create_index('ix_candles_instrument_timestamp_timeframe', 'candles', ['instrument_id', 'timestamp', 'timeframe'], unique=False)

    # Create orders table
    op.create_table('orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('instrument_id', sa.Integer(), nullable=False),
        sa.Column('side', sa.Enum('buy', 'sell', name='order_side_enum'), nullable=False),
        sa.Column('type', sa.Enum('market', 'limit', 'stop', 'stop_limit', 'take_profit', 'trailing_stop', 'oco', name='order_type_enum'), nullable=False),
        sa.Column('size', Numeric(20, 8), nullable=False),
        sa.Column('price', Numeric(20, 8), nullable=True),
        sa.Column('stop_price', Numeric(20, 8), nullable=True),
        sa.Column('fill_price', Numeric(20, 8), nullable=True),
        sa.Column('filled_size', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('slippage', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('fee', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('pnl', Numeric(20, 8), nullable=True),
        sa.Column('status', sa.Enum('pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired', name='order_status_enum'), nullable=False, server_default='pending'),
        sa.Column('virtual_trade', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sl_price', Numeric(20, 8), nullable=True),
        sa.Column('tp_price', Numeric(20, 8), nullable=True),
        sa.Column('leverage', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('margin_required', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('filled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['instrument_id'], ['instruments.id'], ),
    )
    op.create_index(op.f('ix_orders_account_id'), 'orders', ['account_id'], unique=False)
    op.create_index(op.f('ix_orders_instrument_id'), 'orders', ['instrument_id'], unique=False)
    op.create_index(op.f('ix_orders_side'), 'orders', ['side'], unique=False)
    op.create_index(op.f('ix_orders_type'), 'orders', ['type'], unique=False)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    op.create_index(op.f('ix_orders_created_at'), 'orders', ['created_at'], unique=False)

    # Create positions table
    op.create_table('positions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('instrument_id', sa.Integer(), nullable=False),
        sa.Column('side', sa.String(10), nullable=False),
        sa.Column('size', Numeric(20, 8), nullable=False),
        sa.Column('entry_price', Numeric(20, 8), nullable=False),
        sa.Column('current_price', Numeric(20, 8), nullable=False),
        sa.Column('unrealized_pnl', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('unrealized_pnl_pct', Numeric(10, 4), nullable=False, server_default='0'),
        sa.Column('realized_pnl', Numeric(20, 8), nullable=True),
        sa.Column('sl_price', Numeric(20, 8), nullable=True),
        sa.Column('tp_price', Numeric(20, 8), nullable=True),
        sa.Column('leverage', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('margin_used', Numeric(20, 8), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('open', 'closed', name='position_status_enum'), nullable=False, server_default='open'),
        sa.Column('opened_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['instrument_id'], ['instruments.id'], ),
    )
    op.create_index(op.f('ix_positions_account_id'), 'positions', ['account_id'], unique=False)
    op.create_index(op.f('ix_positions_instrument_id'), 'positions', ['instrument_id'], unique=False)
    op.create_index(op.f('ix_positions_status'), 'positions', ['status'], unique=False)
    op.create_index(op.f('ix_positions_opened_at'), 'positions', ['opened_at'], unique=False)

    # Create ledger_entries table
    op.create_table('ledger_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('entry_type', sa.Enum('deposit', 'withdrawal', 'admin_adjustment', 'trade_pnl', 'fee', 'bonus', 'refund', 'investment_return', 'investment_withdrawal', name='entry_type_enum'), nullable=False),
        sa.Column('amount', Numeric(20, 8), nullable=False),
        sa.Column('balance_after', Numeric(20, 8), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_ledger_entries_account_id'), 'ledger_entries', ['account_id'], unique=False)
    op.create_index(op.f('ix_ledger_entries_user_id'), 'ledger_entries', ['user_id'], unique=False)
    op.create_index(op.f('ix_ledger_entries_entry_type'), 'ledger_entries', ['entry_type'], unique=False)
    op.create_index(op.f('ix_ledger_entries_created_at'), 'ledger_entries', ['created_at'], unique=False)

    # Create admin_adjustments table
    op.create_table('admin_adjustments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('admin_user_id', sa.Integer(), nullable=False),
        sa.Column('adjustment_type', sa.Enum('credit', 'debit', 'set_balance', 'fee', 'bonus', 'refund', name='adjustment_type_enum'), nullable=False),
        sa.Column('amount', Numeric(20, 8), nullable=False),
        sa.Column('balance_before', Numeric(20, 8), nullable=False),
        sa.Column('balance_after', Numeric(20, 8), nullable=False),
        sa.Column('reason', sa.String(1000), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], ),
    )
    op.create_index(op.f('ix_admin_adjustments_account_id'), 'admin_adjustments', ['account_id'], unique=False)
    op.create_index(op.f('ix_admin_adjustments_admin_user_id'), 'admin_adjustments', ['admin_user_id'], unique=False)
    op.create_index(op.f('ix_admin_adjustments_created_at'), 'admin_adjustments', ['created_at'], unique=False)

    # Create aml_alerts table
    op.create_table('aml_alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('severity', sa.Enum('low', 'medium', 'high', 'critical', name='aml_severity_enum'), nullable=False),
        sa.Column('rule_triggered', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
    )
    op.create_index(op.f('ix_aml_alerts_user_id'), 'aml_alerts', ['user_id'], unique=False)
    op.create_index(op.f('ix_aml_alerts_account_id'), 'aml_alerts', ['account_id'], unique=False)
    op.create_index(op.f('ix_aml_alerts_severity'), 'aml_alerts', ['severity'], unique=False)
    op.create_index(op.f('ix_aml_alerts_status'), 'aml_alerts', ['status'], unique=False)

    # Create audits table
    op.create_table('audits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('admin_user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('user_created', 'user_updated', 'user_banned', 'user_unbanned', 'account_created', 'account_frozen', 'account_unfrozen', 'deposit_created', 'deposit_confirmed', 'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_completed', 'order_placed', 'order_filled', 'order_cancelled', 'position_opened', 'position_closed', 'admin_adjustment', 'kyc_submitted', 'kyc_approved', 'kyc_rejected', 'aml_alert_created', 'aml_alert_resolved', 'investment_allocated', 'investment_withdrawn', name='audit_action_enum'), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], ),
    )
    op.create_index(op.f('ix_audits_user_id'), 'audits', ['user_id'], unique=False)
    op.create_index(op.f('ix_audits_admin_user_id'), 'audits', ['admin_user_id'], unique=False)
    op.create_index(op.f('ix_audits_action'), 'audits', ['action'], unique=False)
    op.create_index(op.f('ix_audits_created_at'), 'audits', ['created_at'], unique=False)

    # Create support_tickets table
    op.create_table('support_tickets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('subject', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('open', 'in_progress', 'resolved', 'closed', name='ticket_status_enum'), nullable=False, server_default='open'),
        sa.Column('priority', sa.Enum('low', 'medium', 'high', 'urgent', name='ticket_priority_enum'), nullable=False, server_default='medium'),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
    )
    op.create_index(op.f('ix_support_tickets_user_id'), 'support_tickets', ['user_id'], unique=False)
    op.create_index(op.f('ix_support_tickets_status'), 'support_tickets', ['status'], unique=False)
    op.create_index(op.f('ix_support_tickets_priority'), 'support_tickets', ['priority'], unique=False)


def downgrade():
    op.drop_table('support_tickets')
    op.drop_table('audits')
    op.drop_table('aml_alerts')
    op.drop_table('admin_adjustments')
    op.drop_table('ledger_entries')
    op.drop_table('positions')
    op.drop_table('orders')
    op.drop_table('candles')
    op.drop_table('instruments')
    op.drop_table('withdrawals')
    op.drop_table('deposits')
    op.drop_table('wallets')
    op.drop_table('accounts')
    op.drop_table('users')
    
    # Drop ENUM types
    op.execute('DROP TYPE IF EXISTS ticket_priority_enum')
    op.execute('DROP TYPE IF EXISTS ticket_status_enum')
    op.execute('DROP TYPE IF EXISTS audit_action_enum')
    op.execute('DROP TYPE IF EXISTS aml_severity_enum')
    op.execute('DROP TYPE IF EXISTS entry_type_enum')
    op.execute('DROP TYPE IF EXISTS timeframe_enum')
    op.execute('DROP TYPE IF EXISTS instrument_type_enum')
    op.execute('DROP TYPE IF EXISTS position_side_enum')
    op.execute('DROP TYPE IF EXISTS position_status_enum')
    op.execute('DROP TYPE IF EXISTS order_status_enum')
    op.execute('DROP TYPE IF EXISTS order_type_enum')
    op.execute('DROP TYPE IF EXISTS order_side_enum')
    op.execute('DROP TYPE IF EXISTS adjustment_type_enum')
    op.execute('DROP TYPE IF EXISTS wallet_type_enum')
    op.execute('DROP TYPE IF EXISTS withdrawal_status_enum')
    op.execute('DROP TYPE IF EXISTS deposit_status_enum')
    op.execute('DROP TYPE IF EXISTS kyc_status_enum')

