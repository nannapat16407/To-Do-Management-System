package main

import (
	"fmt"
	"log"

	"backend/internal/config"
	"backend/internal/models"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/repositories"
	"backend/internal/services"

	"github.com/gofiber/fiber/v2"
)

func main() {
	cfg := config.Load()

	db := config.ConnectDB(cfg)
	config.Migrate(db)
	config.SeedAdminUser(db)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
		// Add detailed error logging
		DisableStartupMessage: false,
	})

	app.Use(middleware.CORS(cfg))

	// Repositories
	userRepo := repositories.NewUserRepository(db)
	taskRepo := repositories.NewTaskRepository(db)
	catRepo := repositories.NewCategoryRepository(db)
	activityRepo := repositories.NewActivityLogRepository(db)
	notifRepo := repositories.NewNotificationRepository(db)
	projectRepo := repositories.NewProjectRepository(db)

	// Services
	authService := services.NewAuthService(userRepo, cfg)
	taskService := services.NewTaskService(taskRepo, userRepo, activityRepo, projectRepo)
	catService := services.NewCategoryService(catService)
	dashService := services.NewDashboardService(taskRepo)
	notifService := services.NewNotificationService(notifRepo, projectRepo)
	projectService := services.NewProjectService(projectRepo, notifRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userRepo)
	taskHandler := handlers.NewTaskHandler(taskService)
	catHandler := handlers.NewCategoryHandler(catService)
	dashHandler := handlers.NewDashboardHandler(dashService)
	notifHandler := handlers.NewNotificationHandler(notifService)
	avatarHandler := handlers.NewAvatarHandler(userRepo)
	projectHandler := handlers.NewProjectHandler(projectService)

	// Verify handlers are not nil
	log.Printf("taskHandler is nil: %v", taskHandler == nil)
	log.Printf("taskHandler.GetAll is nil: %v", taskHandler.GetAll == nil)

	// Routes
	api := app.Group("/api")

	// Health check endpoint
	api.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"message": "backend running",
		})
	})

	// Public routes (no JWT required)
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)

	// DIAGNOSTIC: Test protected route WITHOUT JWT
	api.Get("/tasks-debug", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "tasks-debug works without JWT",
			"route_registered": true,
		})
	})

	// Apply JWT middleware to subsequent routes
	log.Printf("Applying JWT middleware...")
	api.Use(middleware.JWTProtected(cfg))
	log.Printf("JWT middleware applied")

	// Protected routes (require JWT)
	api.Get("/tasks", taskHandler.GetAll)
	api.Post("/tasks", taskHandler.Create)
	api.Get("/tasks/:id", taskHandler.GetByID)
	api.Put("/tasks/:id", taskHandler.Update)
	api.Delete("/tasks/:id", taskHandler.Delete)

	// Log all registered routes
	log.Printf("=== REGISTERED ROUTES ===")
	for _, stack := range app.Stack() {
		for _, route := range stack.Routes {
			routeType := "PUBLIC"
			for _, method := range []string{"GET", "POST", "PUT", "DELETE"} {
				if route.Method == method && route.Path == "/api/tasks" {
					routeType = "PROTECTED (JWT)"
				}
			}
			log.Printf("Method: %-6s Path: %-30s Type: %s", route.Method, route.Path, routeType)
		}
	}
	log.Printf("========================")

	// Start background services
	notifService.StartReminderScheduler()

	log.Printf("Server starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
