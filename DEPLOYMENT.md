# Deployment Guide - To-Do Management System

## Project Overview

This is a full-stack To-Do Management System with:
- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS
- **Backend**: Go Fiber with GORM, PostgreSQL
- **Database**: PostgreSQL with automatic migrations

---

## 📋 Prerequisites

- GitHub account
- Railway account (free tier available)
- Neon account (free PostgreSQL, or use Railway's built-in database)
- Vercel account (free tier available)
- Git installed locally

---

## 🏗️ Architecture

```
┌─────────────┐     HTTPS API     ┌─────────────┐     SSL/TLS      ┌─────────────┐
│   Vercel    │───────────────────│   Railway   │─────────────────│   Neon DB   │
│  (Next.js)  │                   │  (Go Fiber) │                 │(PostgreSQL) │
└─────────────┘                   └─────────────┘                 └─────────────┘
```

**Recommended Strategy**: Option A - Separate services
- Easier deployment and management
- Each service scales independently
- Better debugging and monitoring
- Free tiers available for all services

---

## 🚀 Step-by-Step Deployment

### Phase 1: Prepare Your Repository

1. **Push all changes to GitHub**
   ```bash
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   ```

2. **Verify your repository structure**
   - `backend/` - Go backend
   - `frontend/` - Next.js frontend
   - Docker files are present
   - Environment templates are present

---

### Phase 2: Set Up Database (Neon)

1. **Create Neon account**
   - Go to https://neon.tech
   - Sign up for free account

2. **Create new PostgreSQL database**
   - Click "New Project"
   - Choose region closest to you
   - Name it: `todo-management-db`
   - Wait for database to be created

3. **Get connection string**
   - In Neon dashboard, find your database
   - Copy the Connection String (it looks like):
     ```
     postgresql://username:password@ep-xyz.aws.neon.tech/dbname?sslmode=require
     ```
   - Save this string securely

---

### Phase 3: Deploy Backend (Railway)

1. **Create Railway account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy backend from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your repository
   - Set root directory to: `backend`
   - Click "Deploy"

3. **Configure environment variables**
   - In Railway dashboard, select your backend service
   - Go to "Variables" tab
   - Add these variables:

   ```
   APP_ENV=production
   PORT=8080
   FRONTEND_URL=https://your-vercel-app.vercel.app  # Add after Phase 4
   DATABASE_URL=postgresql://username:password@ep-xyz.aws.neon.tech/dbname?sslmode=require
   JWT_SECRET=generate-strong-random-secret-here
   ```

   **Generate JWT Secret:**
   ```bash
   openssl rand -base64 32
   ```

4. **Redeploy backend**
   - Railway will automatically redeploy
   - Wait for deployment to complete

5. **Get backend URL**
   - In Railway dashboard, find your backend URL
   - It looks like: `https://your-backend.railway.app`
   - Test it: `https://your-backend.railway.app/api`

---

### Phase 4: Deploy Frontend (Vercel)

1. **Create Vercel account**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Deploy frontend from GitHub**
   - Click "Add New Project"
   - Select your repository
   - Click "Import"
   - Set root directory to: `frontend`
   - Click "Deploy"

3. **Configure environment variables**
   - In Vercel dashboard, go to "Settings" → "Environment Variables"
   - Add this variable:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   ```

4. **Redeploy frontend**
   - Go to "Deployments" tab
   - Click the three dots on the latest deployment
   - Select "Redeploy"

5. **Get frontend URL**
   - Vercel will provide a URL like: `https://your-app.vercel.app`
   - Save this URL

---

### Phase 5: Update CORS Configuration

1. **Go back to Railway backend**
   - Navigate to your backend service
   - Go to "Variables" tab

2. **Update FRONTEND_URL**
   - Change from placeholder to actual Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
   - If you have multiple domains, comma-separate them:
   ```
   FRONTEND_URL=https://your-app.vercel.app,https://custom-domain.com
   ```

3. **Redeploy backend**
   - Click "Redeploy" in Railway

---

## ✅ Verification Checklist

### 1. Test Backend
```bash
curl https://your-backend.railway.app/api
```

### 2. Test Database Connection
- Check Railway logs for database connection errors
- Verify admin user was seeded

### 3. Test Frontend
- Open `https://your-app.vercel.app`
- Try to register a new user
- Login with the seeded admin account:
  - Email: `admin1@gmail.com`
  - Password: `123456`

### 4. Test API Endpoints
- Create a task
- Update task status
- Add categories
- Verify dashboard loads

---

## 🔧 Troubleshooting

### CORS Errors
- **Symptom**: Browser shows CORS errors in console
- **Solution**: Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly

### Database Connection Failures
- **Symptom**: Backend logs show database connection errors
- **Solution**:
  1. Verify `DATABASE_URL` is correct
  2. Check Neon dashboard for database status
  3. Ensure `sslmode=require` is in connection string

### API 404 Errors
- **Symptom**: Frontend can't reach backend API
- **Solution**:
  1. Check `NEXT_PUBLIC_API_URL` in Vercel settings
  2. Verify backend is running (check Railway logs)
  3. Ensure no trailing slash in URL

### JWT Authentication Failures
- **Symptom**: Login fails with JWT errors
- **Solution**:
  1. Verify `JWT_SECRET` is set in Railway
  2. Redeploy backend after setting variable
  3. Generate a new strong secret

### Migrations Not Running
- **Symptom**: Database tables missing
- **Solution**:
  1. Check Railway logs for migration errors
  2. Verify database connection
  3. Manually check database tables in Neon console

---

## 📝 Environment Variables Reference

### Backend (Railway)
```bash
APP_ENV=production
PORT=8080
FRONTEND_URL=https://your-vercel-app.vercel.app
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=your-strong-secret-here
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

---

## 🔄 Post-Deployment Tasks

### 1. Change Admin Password
- Login as admin
- Go to profile settings
- Change default password immediately

### 2. Set Up Custom Domain (Optional)
- In Vercel: Add custom domain to your project
- In Railway: Update CORS to include custom domain

### 3. Enable Monitoring
- Railway: Set up alerts for errors
- Vercel: Enable analytics and error tracking

### 4. Set Up Backups
- Neon: Verify automated backups are enabled
- Consider setting up database export jobs

### 5. Update Documentation
- Update any hardcoded URLs in README
- Document your deployment URLs

---

## 🎯 Time Estimate

| Phase | Time |
|-------|------|
| Repository setup | 15 min |
| Database setup (Neon) | 10 min |
| Backend deployment (Railway) | 20 min |
| Frontend deployment (Vercel) | 15 min |
| CORS & final config | 10 min |
| Testing | 15 min |
| **Total** | **~85 minutes** |

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Go Fiber Guide](https://docs.gofiber.io/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🆘 Support

If you encounter issues:
1. Check logs in Railway and Vercel dashboards
2. Verify environment variables are set correctly
3. Ensure database is accessible
4. Review CORS configuration

For production issues:
- Monitor Railway backend logs
- Check Vercel deployment logs
- Use Neon console to inspect database

---

## 🔒 Security Notes

- Never commit `.env` files to git
- Use strong, unique JWT secrets
- Rotate admin passwords after deployment
- Enable HTTPS everywhere (default on Railway/Vercel)
- Review and limit API rate limiting if needed
- Keep dependencies updated
- Monitor logs for suspicious activity
