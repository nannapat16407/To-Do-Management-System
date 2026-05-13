# Quick Deployment Checklist

## Pre-Deployment

- [ ] Push all code changes to GitHub
- [ ] Verify backend and frontend directories are correct
- [ ] Have GitHub, Railway, Neon, and Vercel accounts ready

## Database (Neon)

- [ ] Create Neon account
- [ ] Create new PostgreSQL project
- [ ] Copy database connection string
- [ ] Save connection string securely

## Backend (Railway)

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Set environment variables:
  - [ ] `APP_ENV=production`
  - [ ] `PORT=8080`
  - [ ] `DATABASE_URL=<your-neon-connection-string>`
  - [ ] `JWT_SECRET=<generate-with-openssl-rand-base64-32>`
  - [ ] `FRONTEND_URL=<wait-for-vercel-url>`
- [ ] Deploy backend
- [ ] Get backend URL
- [ ] Test backend URL in browser

## Frontend (Vercel)

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set root directory to `frontend`
- [ ] Set environment variable:
  - [ ] `NEXT_PUBLIC_API_URL=<your-railway-backend-url>/api`
- [ ] Deploy frontend
- [ ] Get frontend URL
- [ ] Test frontend in browser

## Final Configuration

- [ ] Update `FRONTEND_URL` in Railway with actual Vercel URL
- [ ] Redeploy backend
- [ ] Test full application flow:
  - [ ] Register new user
  - [ ] Login with admin (admin1@gmail.com / 123456)
  - [ ] Create task
  - [ ] Update task status
  - [ ] View dashboard

## Post-Deployment

- [ ] Change admin password
- [ ] Set up custom domain (optional)
- [ ] Enable monitoring/alerts
- [ ] Verify database backups
- [ ] Update documentation with production URLs

## Troubleshooting

If something goes wrong:

- **CORS errors**: Check `FRONTEND_URL` matches Vercel URL exactly
- **DB connection**: Verify `DATABASE_URL` is correct and includes `sslmode=require`
- **API 404**: Check `NEXT_PUBLIC_API_URL` in Vercel
- **JWT errors**: Ensure `JWT_SECRET` is set and backend is redeployed
- **Migration failures**: Check Railway logs, verify database access

## Quick Commands

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

**Test Backend:**
```bash
curl https://your-backend.railway.app/api
```

**Test Frontend:**
```bash
open https://your-app.vercel.app
```
