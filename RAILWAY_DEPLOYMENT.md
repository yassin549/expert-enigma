# 🚀 Railway Deployment Guide - Topcoin Platform

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your production environment variables

## 🗄️ **Step 1: Deploy Database (PostgreSQL)**

1. Go to Railway Dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your Topcoin repository
4. Add PostgreSQL service:
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL instance
   - Note the connection details from the "Connect" tab

## 🔴 **Step 2: Deploy Redis**

1. In your Railway project
2. Click "Add Service" → "Database" → "Redis"
3. Railway will provision Redis automatically
4. Note the Redis URL from the "Connect" tab

## 🔧 **Step 3: Deploy FastAPI Backend**

1. Click "Add Service" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Root Directory**: `apps/api`
   - **Dockerfile Path**: `railway.Dockerfile`
   - **Port**: Railway will auto-detect from $PORT

### Environment Variables for API:
```bash
# Security Secrets (REQUIRED - Generated above)
ADMIN_PASSWORD=ExY6!GoP^jE@VGftCKJs
SESSION_SECRET=eS1qQA9Dti6aW0wvwUc6hix0vLwx6YL7KzTW1hQD00dPARa4eWgum4QGmkHyEuccnnhcCdZvNiRtZlS85VNQOA
JWT_SECRET=ip5tk5c6aGCxwdEQBBEi9JeZ2MVNymbWZGbvJxCwHmC1SfPaQq5wTzkNX8Oq2GqihSk2etT1xWI6F3bf6fsslA
JWT_ALGORITHM=HS256

# Database & Redis (from Railway services)
DATABASE_URL=postgresql://postgres:vfrpgZzDnbxzqBfUOmmkqLlRwcVlsRsQ@switchyard.proxy.rlwy.net:46344/railway
REDIS_URL=redis://default:BIyXIxRfZJJitZyQvlqxMpVYvkxhXChW@ballast.proxy.rlwy.net:45220

# NOWPayments Configuration
NOWPAYMENTS_API_KEY=A53GE0J-PPD4G6Z-NFVAC23-GNBEFAH
NOWPAYMENTS_PUBLIC_KEY=c83c4ff4-30e7-4bd8-8d91-4d4912ac5863
NOWPAYMENTS_IPN_SECRET=OemSUwv9OSlRrCjhEV5lMTzfBGKanpen

# Environment Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
```

## 🌐 **Step 4: Deploy Next.js Frontend**

1. Click "Add Service" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Root Directory**: `apps/web`
   - **Dockerfile Path**: `railway.Dockerfile`
   - **Port**: Railway will auto-detect from $PORT

### Environment Variables for Web:
```bash
NEXT_PUBLIC_API_URL=https://[your-api-service-url].railway.app
NEXT_PUBLIC_WS_URL=wss://[your-api-service-url].railway.app
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 🔄 **Step 5: Database Migration**

After API deployment, run database migrations:

1. Go to your API service in Railway
2. Open the "Deploy" tab
3. Add a deploy command or run manually:
```bash
alembic upgrade head
```

## 🌱 **Step 6: Seed Database (Optional)**

To seed with demo data:
```bash
python scripts/seed_dev.py
```

## 🔗 **Step 7: Configure Custom Domains (Optional)**

1. In each service, go to "Settings" → "Domains"
2. Add your custom domains:
   - API: `api.topcoin.com`
   - Web: `topcoin.com`
3. Update CORS settings in API to allow your frontend domain

## ✅ **Deployment Checklist**

- [ ] PostgreSQL service deployed and connected
- [ ] Redis service deployed and connected
- [ ] API service deployed with correct environment variables
- [ ] Web service deployed with correct API URL
- [ ] Database migrations completed
- [ ] Health checks passing on both services
- [ ] Custom domains configured (if needed)
- [ ] SSL certificates active
- [ ] CORS properly configured

## 🔧 **Production Environment Variables**

### Critical Variables to Set:
```bash
# Security
JWT_SECRET=generate_a_strong_secret_key_here
CORS_ORIGINS=["https://yourdomain.com"]

# Database (from Railway)
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis (from Railway)  
REDIS_URL=redis://host:port

# NOWPayments (from description.txt)
NOWPAYMENTS_API_KEY=A53GE0J-PPD4G6Z-NFVAC23-GNBEFAH
NOWPAYMENTS_PUBLIC_KEY=c83c4ff4-30e7-4bd8-8d91-4d4912ac5863
NOWPAYMENTS_IPN_SECRET=OemSUwv9OSlRrCjhEV5lMTzfBGKanpen

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
```

## 🚨 **Important Notes**

1. **Database Persistence**: Railway PostgreSQL includes automatic backups
2. **Scaling**: Railway auto-scales based on usage
3. **Monitoring**: Use Railway's built-in monitoring and logs
4. **Security**: All connections are encrypted by default
5. **Cost**: Monitor usage to avoid unexpected charges

## 🔍 **Troubleshooting**

### Common Issues:

#### 1. **Missing Environment Variables Error**
```
ValidationError: Field required [ADMIN_PASSWORD/SESSION_SECRET]
```
**Solution**: Add all required environment variables from the list above.

#### 2. **Build Failures**: 
- Check Dockerfile paths and dependencies
- Ensure `railway.Dockerfile` exists in service root directory

#### 3. **Database Connection**: 
- Verify DATABASE_URL format matches Railway PostgreSQL connection string
- Ensure PostgreSQL service is running and healthy

#### 4. **CORS Errors**: 
- Update CORS_ORIGINS with your frontend URL
- Add both HTTP and HTTPS versions

#### 5. **Port Issues**: 
- Railway automatically assigns ports via $PORT
- Don't hardcode port numbers in your application

### Logs Access:
- Railway Dashboard → Service → "Deploy" tab → View logs
- Real-time logs available for debugging

## 🎯 **Post-Deployment**

1. Test all API endpoints: `https://your-api.railway.app/docs`
2. Verify frontend functionality: `https://your-web.railway.app`
3. Test user registration and login
4. Verify AI investment plans are working
5. Test admin dashboard functionality
6. Confirm NOWPayments integration (use test mode first)

## 💰 **Estimated Railway Costs**

- **PostgreSQL**: ~$5/month
- **Redis**: ~$5/month  
- **API Service**: ~$5-20/month (depending on usage)
- **Web Service**: ~$5-15/month (depending on traffic)

**Total**: ~$20-45/month for production deployment

---

Your Topcoin platform is now ready for Railway deployment! 🚀
