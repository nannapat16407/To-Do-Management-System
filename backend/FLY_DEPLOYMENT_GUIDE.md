# Fly.io Deployment Guide - Go Backend Migration

## Project Overview
- **Backend**: Go Fiber + PostgreSQL
- **Frontend**: Next.js on Vercel (https://to-do-management-system.vercel.app)
- **Current State**: Backend failing on Render, needs migration to Fly.io

## Migration Strategy

```
┌─────────────────┐      ┌───────────────────┐
│   Vercel (Next.js) │──────►│   Fly.io (Go Backend) │
│  Frontend              │      │                   │
└─────────────────┘      └───────────────────┘

                            ┌───────────────────┐
                            │   Fly.io (PostgreSQL) │
                            │   Managed Database    │
                            └───────────────────┘
```

## Pre-Deployment Checklist

- [ ] Go 1.23+ installed locally
- [ ] Docker installed
- [ ] Fly.io CLI installed (`flyctl --version`)
- [ ] Fly.io account created
- [ ] Backend code fixed and committed
- [ ] Frontend environment variables documented
- [ ] Database connection string ready

## STEP 1: Install Fly.io CLI

### macOS
```bash
brew install flyctl
```

### Linux
```bash
curl -L https://fly.io/install.sh | sh
```

### Windows
```powershell
iwr -useget https://fly.io/install.ps1 -o flyctl.ps1
.\flyctl.ps1
```

### Verify Installation
```bash
flyctl --version
# Should show: flyctl v1.x.x
```

---

## STEP 2: Authenticate with Fly.io

```bash
flyctl auth signup
# or login with existing account
flyctl auth login
```

---

## STEP 3: Verify Backend Code

### Check Project Structure
```bash
cd /Users/nan/Projects/To-Do-Management-System/To-Do-Management-System/backend

# Verify structure
ls -la cmd/

# Expected output:
# main.go (production entrypoint)
# main_debug.go (debug utility with build tag)
# diagnose_routes.go (diagnostic utility with build tag)
```

### Verify Dockerfile
```bash
cat Dockerfile

# Expected structure:
# - Multi-stage build
# - Builds from ./cmd/main.go
# - Excludes debug files via build tags
```

### Verify Build Works Locally
```bash
# Test build (should succeed without errors)
docker build -t todo-backend .

# Test container (should start successfully)
docker run -p 8080:8080 -e DATABASE_URL="test" todo-backend
```

---

## STEP 4: Initialize Fly.io Application

### Create New App
```bash
flyctl launch --no-deploy \
  --name todo-management-backend \
  --region iad \
  --org personal \
  --image ghcr.io/flyio/golang:1.23
```

### This Creates:
- fly.toml configuration
- Fly application infrastructure
- DNS setup (optional)
- Database configuration

---

## STEP 5: Configure Environment Variables

### Set Secrets
```bash
# Database URL (from Neon or Fly PostgreSQL)
flyctl secrets set DATABASE_URL

# JWT Secret
flyctl secrets set JWT_SECRET

# Frontend URL
flyctl secrets set FRONTEND_URL=https://to-do-management-system.vercel.app

# Environment
flyctl secrets set APP_ENV=production
```

### View Current Secrets
```bash
flyctl secrets list
```

---

## STEP 6: Update fly.toml for Production

### Production Configuration
```toml
[build]
  dockerfile_path = "Dockerfile"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
```

---

## STEP 7: Deploy to Fly.io

### Deploy Application
```bash
flyctl deploy
```

### Deployment Process
1. ✅ Builds Docker image
2. ✅ Pushes to Fly.io registry
3. ✅ Deploys to Fly.io infrastructure
4. ✅ Health checks run
5. ✅ DNS propagated (takes ~5-10 minutes)

### Monitor Deployment
```bash
# Watch deployment logs
flyctl logs --tail

# Check deployment status
flyctl status

# Monitor machines
flyctl ps
```

---

## STEP 8: Set Up Database

### Option A: Use Fly.io PostgreSQL (Recommended)

```bash
# Create PostgreSQL database
flyctl postgres create --name todo-db --region iad

# Get connection string
flyctl postgres connect -a todo-db

# Update DATABASE_URL secret
flyctl secrets set DATABASE_URL=<connection-string-from-above>
```

### Option B: Use Existing Neon Database

```bash
# Update DATABASE_URL with Neon connection string
flyctl secrets set DATABASE_URL=postgresql://user:password@ep-xyz.aws.neon.tech/dbname?sslmode=require
```

---

## STEP 9: Configure CORS

### Backend CORS Configuration
```bash
# Verify FRONTEND_URL is set
flyctl secrets get FRONTEND_URL

# Should return:
# https://to-do-management-system.vercel.app
```

### Backend Code Verification
```go
// backend/internal/config/config.go
FrontendURL: getEnv("FRONTEND_URL", "https://to-do-management-system.vercel.app")

// backend/internal/middleware/cors.go
allowedOrigins := strings.Split(cfg.FrontendURL, ",")
```

---

## STEP 10: Verify Health Endpoint

### Health Check
```bash
# Get Fly.io URL
FLY_URL=$(flyctl info --json | jq -r '.Hostname')

# Test health endpoint
curl https://todo-management-backend.fly.dev/api

# Expected response:
# {
#   "status": "ok",
#   "message": "backend running"
# }
```

---

## STEP 11: Test API Endpoints

### Test Authentication (No Token Required)
```bash
# Test register
curl -X POST https://todo-management-backend.fly.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'

# Test login (to get token)
curl -X POST https://todo-management-backend.fly.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@gmail.com",
    "password": "123456"
  }'
```

### Test Protected Endpoints (Requires JWT)
```bash
# Get token from login
TOKEN=$(curl -s -X POST https://todo-management-backend.fly.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@gmail.com","password":"123456"}' \
  | jq -r '.token')

# Test tasks endpoint with token
curl https://todo-management-backend.fly.dev/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# Test categories endpoint
curl https://todo-management-backend.fly.dev/api/categories \
  -H "Authorization: Bearer $TOKEN"
```

---

## STEP 12: Update Frontend Integration

### Vercel Environment Variable
```
Settings → Environment Variables
NEXT_PUBLIC_API_URL=https://todo-management-backend.fly.dev
```

### Redeploy Frontend
```bash
# Via Vercel dashboard
# Deployments → Redeploy
```

---

## TROUBLESHOOTING

### Build Failures

#### Issue: "go build ./cmd" - main redeclared
```
Solution: Debug files have //go:build debug tags
Verify with:
head cmd/main_debug.go
# Should show:
//go:build debug
package main
```

#### Issue: "cannot load package"
```
Solution: Verify go.mod module name matches
cat go.mod | head -1

# Should be: module backend

# Directory structure should be:
backend/
  ├── cmd/main.go
  ├── go.mod (module backend)
  └── internal/...
```

### Runtime Errors

#### Issue: "listen tcp :8080: bind: address already in use"
```
Solution: Fly.io provides PORT env variable
Backend code already handles this:
port := os.Getenv("PORT")
if port == "" {
    port = "8080"
}
```

#### Issue: "database connection refused"
```
Solution: Verify DATABASE_URL format
Must include: sslmode=require
Fly PostgreSQL: postgresql://user:pass@db-host.flycast:5432/dbname?sslmode=require
```

#### Issue: CORS errors in browser
```
Solution: Verify FRONTEND_URL matches exactly
flyctl secrets get FRONTEND_URL
# Should be: https://to-do-management-system.vercel.app
```

### Monitoring Commands

```bash
# Real-time logs
flyctl logs --tail

# Check machine status
flyctl ps

# List all machines
flyctl machines list

# Restart application
flyctl apps restart

# Scale up
flyctl scale count 2

# Scale down
flyctl scale count 1
```

---

## PRODUCTION BEST PRACTICES

### Health Checks
```go
// Ensure health endpoint exists
api.Get("/", func(c *fiber.Ctx) error {
    return c.JSON(fiber.Map{
        "status": "ok",
        "message": "backend running",
    })
})
```

### Graceful Shutdowns
```go
// Handle shutdown signals
import "os"

app.HookOnShutdown(func() {
    log.Println("Graceful shutdown...")
})

// Use context with timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
```

### Connection Pooling
```go
// In database connection config
sqlDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
    MaxOpenConns: 10,
    MaxIdleConns: 5,
    ConnMaxLifetime: time.Hour,
})
```

---

## COST ESTIMATE

| Resource | Fly.io Cost |
|----------|-------------|
| Free Tier | $0/month (limited hours) |
| 1 vCPU + 256MB RAM | $5-7/month |
| 1 vCPU + 512MB RAM | $10-15/month |
| Database (PostgreSQL) | $5-15/month |

---

## SECURITY CHECKLIST

- [ ] JWT_SECRET is strong (>32 characters, randomly generated)
- [ ] DATABASE_URL uses sslmode=require
- [ ] No hardcoded credentials in code
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Database connection pooling configured

---

## MIGRATION COMPLETION

When the following are confirmed:
- [ ] Backend deploys successfully to Fly.io
- [ ] Health check returns 200 OK
- [ ] Database connection works
- [ ] Login endpoint returns valid JWT
- [ ] Protected endpoints work with JWT
- [ ] Frontend can connect to new backend
- [ ] All CRUD operations functional

**Migration is complete!** 🎉

---

## FINAL VERIFICATION

### Commands to Run
```bash
# Get Fly.io URL
FLY_URL=$(flyctl info --json | jq -r '.Hostname')

echo "Fly.io Backend URL: https://$FLY_URL"

# Test health
curl https://$FLY_URL/api

# Test login
curl -X POST https://$FLY_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@gmail.com","password":"123456"}'
```

### Expected URLs After Migration

| Service | URL |
|----------|-----|
| **Frontend (Vercel)** | https://to-do-management-system.vercel.app |
| **Backend (Fly.io)** | https://todo-management-backend.fly.dev |
| **API Base URL** | https://todo-management-backend.fly.dev |
| **Health Check** | https://todo-management-backend.fly.dev/api |
| **Auth Login** | https://todo-management-backend.fly.dev/api/auth/login |
| **Auth Register** | https://todo-management-backend.fly.dev/api/auth/register |
| **Tasks API** | https://todo-management-backend.fly.dev/api/tasks |
