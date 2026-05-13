# Go Fiber Route Analysis - /api/tasks 404 Issue

## Problem Statement
- Endpoint: `GET /api/tasks`
- Response: `Cannot GET /api/tasks` (Fiber default 404 HTML)
- Working: `/api/auth/login`, `/api/` (health check)
- Status: Server running, DB connected

## Real Issue: Route Not Registered in Deployed Version

### Evidence:
1. **Response is Fiber's default HTML 404**, not JSON error from JWT middleware
2. **JWT middleware returns JSON**: `{"error": "missing or malformed JWT"}`
3. **404 HTML means**: Route `/api/tasks` doesn't exist, middleware never called

### Go Fiber Routing Behavior:

```go
api := app.Group("/api")

// Public routes - NO JWT required
api.Get("/", healthHandler)       // ✅ Works: /api/
api.Post("/auth/login", handler)    // ✅ Works: /api/auth/login

// Apply JWT middleware to subsequent routes
api.Use(middleware.JWTProtected(cfg))

// Protected routes - JWT REQUIRED
api.Get("/tasks", handler)          // ❌ 404: /api/tasks
```

### What Happens When You Call `/api/tasks` Without JWT:

1. **Fiber matches route**: `/api/tasks` found
2. **Applies JWT middleware** (registered before handler)
3. **JWT middleware validates Authorization header**:
   ```go
   authHeader := c.Get("Authorization")
   if authHeader == "" {
       return c.Status(401).JSON({"error": "missing or malformed JWT"})
   }
   ```
4. **If JWT valid**: Calls handler
5. **If JWT missing**: Returns 401 JSON (NOT 404 HTML)

### Why You Get 404 HTML:

**The route `/api/tasks` is not registered in the deployed code.**

Fiber's default behavior:
- Route found but blocked by middleware → Returns middleware response (401 JSON)
- Route NOT found → Returns Fiber's default 404 HTML page

Your getting 404 HTML proves the route doesn't exist in the deployed version.

---

## Root Cause: Deployment Version Mismatch

| Aspect | Local Code | Deployed Code |
|---------|-------------|----------------|
| Route /api/tasks | ✅ Registered | ❌ Missing |
| JWT middleware | ✅ Applied | ❌ Never called |
| Response when no JWT | 401 JSON | 404 HTML |

---

## How Fiber Protected Routes Work

### Correct Pattern (Your code follows this):

```go
// 1. Create route group
api := app.Group("/api")

// 2. Public routes (before middleware)
api.Post("/auth/login", handler)  // No JWT needed

// 3. Apply middleware to subsequent routes
api.Use(middleware.JWTProtected(cfg))

// 4. Protected routes (require JWT)
api.Get("/tasks", handler)  // Requires JWT

// 5. What happens when calling /api/tasks:
//    - Request arrives
//    - Fiber finds /api/tasks route
//    - Applies JWT middleware
//    - JWT checks Authorization header
//    - If valid: calls handler
//    - If missing: returns 401 JSON
```

### Fiber Middleware Flow:

```
Request → Route Match → Apply Middleware → Handler → Response
                    ↓
                 JWT Validation
                    ↓
                 Missing Token?
                    ↓
              Return 401 JSON
```

---

## Testing the Endpoint Correctly

### Step 1: Get JWT Token
```bash
# Login to get token
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@gmail.com",
    "password": "123456"
  }' \
  -s | jq -r '.token'
```

### Step 2: Call Tasks Endpoint WITH Token
```bash
# Set token variable
TOKEN="your-jwt-token-here"

# Call tasks endpoint with Authorization header
curl https://your-backend.onrender.com/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Step 3: Test Without Token (Should Get 401 JSON)
```bash
# Call without Authorization header
curl https://your-backend.onrender.com/api/tasks

# Expected response (if route exists):
# {"error": "missing or malformed JWT"}

# Your actual response:
# Cannot GET /api/tasks (Fiber's 404 HTML)
```

---

## Debugging Steps

### 1. Check Render Logs for Registered Routes
```bash
# Add this to main.go (line before server starts):
for _, stack := range app.Stack() {
    for _, route := range stack.Routes {
        log.Printf("Route: %s %s", route.Method, route.Path)
    }
}
```

Look for:
```
Route: GET /api/
Route: POST /api/auth/login
Route: GET /api/tasks  ← This should be here
```

### 2. Test Public Debug Route
```go
// Add this before JWT middleware:
api.Get("/tasks-debug", func(c *fiber.Ctx) error {
    return c.JSON(fiber.Map{
        "route": "tasks-debug works",
        "without_jwt": true,
    })
})
```

Test: `curl https://your-backend.onrender.com/api/tasks-debug`

### 3. Bypass JWT Middleware Temporarily
```go
// Comment out this line:
// api.Use(middleware.JWTProtected(cfg))

// Test /api/tasks - should work without JWT
```

### 4. Verify Handler is Not Nil
```go
// Add this after handler creation:
if taskHandler == nil {
    log.Fatal("taskHandler is nil!")
}
if taskHandler.GetAll == nil {
    log.Fatal("taskHandler.GetAll is nil!")
}
```

---

## Temporary Fix to Verify Issue

### Option 1: Make Tasks Route Public
```go
// Comment out JWT middleware:
// api.Use(middleware.JWTProtected(cfg))

// Test /api/tasks - should work if route exists
```

### Option 2: Add Detailed Error Logging
```go
// Wrap handler with debug:
api.Get("/tasks", func(c *fiber.Ctx) error {
    log.Printf("/api/tasks called - handler reached")
    return taskHandler.GetAll(c)
})
```

---

## Production Debugging Commands

### Test All Routes:
```bash
# Health check
curl https://your-backend.onrender.com/api/

# Auth (public)
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@gmail.com","password":"123456"}'

# Tasks (protected - requires JWT)
curl https://your-backend.onrender.com/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# Tasks debug (public)
curl https://your-backend.onrender.com/api/tasks-debug
```

---

## Conclusion

**The route `/api/tasks` is not registered in your deployed version.**

Evidence:
- Response is Fiber's 404 HTML (not JWT middleware 401 JSON)
- Other routes work (`/api/`, `/api/auth/login`)
- Route exists in local code

**Fix**: Push latest code and verify route registration in Render logs.

---

## Correct Request Example

```bash
# 1. Get token
TOKEN=$(curl -s -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@gmail.com","password":"123456"}' \
  | jq -r '.token')

# 2. Call with token
curl https://your-backend.onrender.com/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

**Key Points:**
- Must include `Authorization: Bearer <TOKEN>` header
- Must be valid JWT from login endpoint
- Route exists in code but missing in deployed version
