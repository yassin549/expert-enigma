# Environment Setup Guide

This guide will help you set up the environment variables required for the Topcoin platform.

## Quick Setup

Run the setup script to automatically generate `.env` files:

```bash
python setup_env.py
```

This will create:
- `.env` - Backend API environment variables
- `apps/web/.env.local` - Frontend environment variables

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Backend Environment (.env)

Create a `.env` file in the root directory with the following variables:

```bash
# Application
ENVIRONMENT=development
LOG_LEVEL=DEBUG
API_URL=http://localhost:8000
WEB_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://topcoin:topcoin_dev_password@localhost:5432/topcoin
DB_ECHO=false

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# JWT Authentication (REQUIRED)
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(64))"
JWT_SECRET=your-generated-secret-here-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# NOWPayments.io (REQUIRED - Get from https://nowpayments.io/)
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_PUBLIC_KEY=your_public_key_here
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here
NOWPAYMENTS_SANDBOX=true
NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://localhost:8080

# Admin (REQUIRED)
ADMIN_EMAIL=admin@topcoin.local
ADMIN_PASSWORD=your-strong-admin-password-here
ADMIN_IP_WHITELIST=127.0.0.1,::1

# Security (REQUIRED)
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(64))"
SESSION_SECRET=your-generated-session-secret-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Feature Flags
ENABLE_KYC_AUTO_APPROVAL=true
ENABLE_DEMO_ACCOUNTS=false
ENABLE_AI_INVESTMENT_PLANS=true
ENABLE_2FA=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# AML Configuration
AML_THRESHOLD_USD=10000.0
AML_VELOCITY_CHECK_HOURS=24
AML_RAPID_WITHDRAWAL_COUNT=3

# Withdrawal Limits
WITHDRAWAL_MIN_USD=10.0
WITHDRAWAL_MAX_USD=100000.0
WITHDRAWAL_DAILY_LIMIT_USD=50000.0

# Business Wallet
BUSINESS_WALLET_INITIAL_BALANCE=250000.0
BUSINESS_WALLET_RESERVE_PERCENT=20.0

# Regulatory
CMF_LICENSE_NUMBER=CMF-2024-001
MSB_REGISTRATION_NUMBER=MSB-2024-TOPCOIN-001

# Monitoring
SENTRY_DSN=
PROMETHEUS_ENABLED=true
```

### 2. Frontend Environment (apps/web/.env.local)

Create `apps/web/.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NODE_ENV=development
```

## Required Variables

These variables **MUST** be set for the platform to function:

1. **JWT_SECRET** - Generate a secure random string (min 32 characters)
2. **SESSION_SECRET** - Generate a secure random string (min 32 characters)
3. **NOWPAYMENTS_API_KEY** - Get from https://nowpayments.io/
4. **NOWPAYMENTS_PUBLIC_KEY** - Get from https://nowpayments.io/
5. **NOWPAYMENTS_IPN_SECRET** - Get from https://nowpayments.io/
6. **ADMIN_PASSWORD** - Set a strong password for admin access
7. **DATABASE_URL** - PostgreSQL connection string

## Generating Secrets

### Using Python

```bash
# JWT Secret
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Session Secret
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Using the provided script

```bash
python generate_jwt_secret.py
```

## Docker Compose

If using Docker Compose, you can also set environment variables in `docker-compose.yml` or use a `.env` file that Docker Compose will automatically load.

## Validation

After setting up your environment, validate it by:

1. Starting the API server - it should start without errors
2. Checking logs for missing environment variable warnings
3. Testing the health endpoint: `curl http://localhost:8000/health`

## Security Notes

- **NEVER** commit `.env` or `.env.local` files to version control
- Use different secrets for development, staging, and production
- Rotate secrets periodically (every 90 days recommended)
- Keep secrets secure and limit access to authorized personnel only

## Troubleshooting

### "Missing required environment variable" error

Check that all required variables are set in your `.env` file.

### Database connection errors

Verify your `DATABASE_URL` is correct and the database is running.

### NOWPayments errors

Ensure your NOWPayments API keys are correct and the account is active.

