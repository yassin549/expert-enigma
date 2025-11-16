# 🚀 Production Deployment Guide

## Railway Deployment

### Prerequisites

1. Railway account at [railway.app](https://railway.app)
2. GitHub repository with code pushed
3. NOWPayments.io account (for crypto deposits)

### Step 1: Deploy Services

Deploy in this order:

1. **PostgreSQL Database**
   - Add Service → Database → PostgreSQL
   - Note the `DATABASE_URL` from Connect tab

2. **Redis**
   - Add Service → Database → Redis
   - Note the `REDIS_URL` from Connect tab

3. **API Service** (FastAPI)
   - Add Service → GitHub Repo
   - Root Directory: `apps/api`
   - Build Command: (auto-detected)
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Worker Service** (Celery)
   - Add Service → GitHub Repo
   - Root Directory: `apps/worker`
   - Build Command: (auto-detected)
   - Start Command: `celery -A worker.celery_app worker --loglevel=info`

5. **Beat Service** (Celery Scheduler)
   - Add Service → GitHub Repo
   - Root Directory: `apps/worker`
   - Start Command: `celery -A worker.celery_app beat --loglevel=info`

6. **Web Service** (Next.js)
   - Add Service → GitHub Repo
   - Root Directory: `apps/web`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### Step 2: Configure Environment Variables

Set these in Railway dashboard for each service:

#### API Service Variables:
```env
# Database
DATABASE_URL=<from PostgreSQL service>

# Redis
REDIS_URL=<from Redis service>
CELERY_BROKER_URL=<from Redis service>
CELERY_RESULT_BACKEND=<from Redis service>

# JWT
JWT_SECRET=<generate secure random string>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# NOWPayments
NOWPAYMENTS_API_KEY=<your_api_key>
NOWPAYMENTS_PUBLIC_KEY=<your_public_key>
NOWPAYMENTS_IPN_SECRET=<your_ipn_secret>
NOWPAYMENTS_SANDBOX=false
NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong_password>

# Security
SESSION_SECRET=<generate secure random string>
CORS_ORIGINS=https://yourdomain.com

# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
```

#### Worker Service Variables:
```env
# Same as API service (DATABASE_URL, REDIS_URL, etc.)
```

#### Web Service Variables:
```env
NEXT_PUBLIC_API_URL=https://your-api-service.railway.app
NEXT_PUBLIC_WS_URL=wss://your-api-service.railway.app
NODE_ENV=production
```

### Step 3: Run Database Migrations

After API service is deployed:

1. Go to API service in Railway
2. Open "Deployments" → Latest deployment
3. Click "View Logs"
4. Run migrations:
   ```bash
   alembic upgrade head
   ```

Or add a one-time migration service:
- Add Service → GitHub Repo
- Root Directory: `apps/api`
- Start Command: `alembic upgrade head && exit`

### Step 4: Create Admin User

After migrations complete, create admin user via API:

```bash
curl -X POST https://your-api.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your_secure_password"
  }'
```

Then manually set `is_admin=true` in database or via admin endpoint.

### Step 5: Configure NOWPayments Webhook

1. Go to NOWPayments dashboard
2. Set IPN (Instant Payment Notification) URL:
   ```
   https://your-api.railway.app/api/payments/ipn
   ```
3. Use the `NOWPAYMENTS_IPN_SECRET` you set in environment variables

### Step 6: Verify Deployment

1. **API Health**: `https://your-api.railway.app/docs`
2. **Frontend**: `https://your-web.railway.app`
3. **Worker Logs**: Check Celery worker is processing tasks
4. **Beat Logs**: Check scheduled tasks are running

## Environment Variables Reference

See `ENV_SETUP.md` for complete list of all environment variables.

## Monitoring

- **Railway Dashboard**: Monitor service health and logs
- **API Logs**: Check for errors in API service logs
- **Worker Logs**: Monitor background job processing
- **Database**: Monitor connection pool and query performance

## Troubleshooting

### API Service Won't Start
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is running
- Check logs for import errors

### Worker Not Processing Tasks
- Verify `REDIS_URL` is correct
- Check Redis is running
- Ensure worker service has same env vars as API

### Frontend Build Fails
- Check `NEXT_PUBLIC_API_URL` is set
- Verify Node.js version compatibility
- Check build logs for missing dependencies

### Migrations Fail
- Ensure database is accessible
- Check `DATABASE_URL` format
- Verify Alembic is installed in API service

## Production Checklist

- [ ] All services deployed and running
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Admin user created
- [ ] NOWPayments webhook configured
- [ ] SSL certificates active (Railway handles this)
- [ ] Monitoring set up
- [ ] Backup strategy configured
- [ ] Error tracking configured (Sentry, etc.)

