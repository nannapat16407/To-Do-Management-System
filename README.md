# TaskFlow - To-Do Management System

A full-stack multi-user task management application with a Go backend and Next.js frontend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Shadcn UI, React Query, Recharts |
| Backend | Go, Fiber, GORM, JWT, bcrypt |
| Database | PostgreSQL (Neon) |
| Deployment | Vercel (frontend), Railway (backend), Docker |

## Quick Start

### Prerequisites
- Go 1.23+
- Node.js 20+
- PostgreSQL 16+

### Local Development

**1. Start PostgreSQL**
```bash
# Option A: Docker Compose (starts everything)
docker compose up postgres -d

# Option B: Local PostgreSQL
createdb todomgmt
```

**2. Start Backend**
```bash
cd backend
cp .env.example .env    # edit with your DB credentials
go mod tidy
go run cmd/main.go
```

**3. Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

**4. Open** http://localhost:3000

### Docker Compose (Full Stack)

```bash
docker compose up --build
```

Frontend: http://localhost:3000 | Backend: http://localhost:8080

## Project Structure

```
├── backend/
│   ├── cmd/main.go                 # Entry point
│   ├── internal/
│   │   ├── config/                 # Config & database
│   │   ├── handlers/               # HTTP handlers
│   │   ├── middleware/              # JWT, CORS, role auth
│   │   ├── models/                 # GORM models & DTOs
│   │   ├── repositories/           # Data access layer
│   │   └── services/               # Business logic
│   ├── Dockerfile
│   └── railway.toml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/        # Protected pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── tasks/
│   │   │   │   ├── categories/
│   │   │   │   └── profile/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── components/
│   │   │   └── layout/             # Sidebar, Navbar
│   │   ├── contexts/               # Auth context
│   │   └── lib/                    # API client, types, utils
│   ├── Dockerfile
│   └── vercel.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/:id` | Admin | Get user by ID |
| GET | `/api/tasks` | Yes | List tasks (with filters) |
| POST | `/api/tasks` | Yes | Create task |
| GET | `/api/tasks/:id` | Yes | Get task details |
| PUT | `/api/tasks/:id` | Yes | Update task |
| DELETE | `/api/tasks/:id` | Yes | Delete task |
| GET | `/api/categories` | Yes | List categories |
| POST | `/api/categories` | Yes | Create category |
| PUT | `/api/categories/:id` | Yes | Update category |
| DELETE | `/api/categories/:id` | Yes | Delete category |
| GET | `/api/dashboard/summary` | Yes | Dashboard analytics |

### Task Query Parameters
`search`, `status`, `priority`, `category_id`, `assignee_id`, `due_date_from`, `due_date_to`, `page`, `limit`

## Database Schema

### ER Diagram
```
users ─────────< tasks >────────── task_assignees >──────── users
                   |
                   |
categories ────────<

activity_logs >──── tasks
                >──── users
```

### Tables
- **users**: id, name, email, password, role (admin/user), timestamps
- **tasks**: id, title, description, status, priority, due_date, category_id, created_by, timestamps
- **categories**: id, name, created_by, timestamps
- **task_assignees**: task_id, user_id, assigned_at (junction table)
- **activity_logs**: id, task_id, user_id, action, details, created_at

## Deployment

### Backend (Railway)
1. Connect repo to Railway
2. Set root directory to `backend`
3. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`
4. Deploy

### Frontend (Vercel)
1. Connect repo to Vercel
2. Set root directory to `frontend`
3. Add: `NEXT_PUBLIC_API_URL` = your Railway backend URL
4. Deploy

### Database (Neon)
1. Create PostgreSQL database at neon.tech
2. Copy connection string to `DATABASE_URL`

### GitHub Actions
Set these secrets in your repository:
- `RAILWAY_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Roles

**Admin**: View all users, view all tasks, manage categories
**User**: Manage own tasks, assign tasks to other users
