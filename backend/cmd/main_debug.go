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
	catService := services.NewCategoryService(catRepo)
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

	// Routes
	api := app.Group("/api")

	// Health check endpoint
	api.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"message": "backend running",
		})
	})

	// Log all registered routes for debugging
	app.Stack().Print()

	// Public routes
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)

	// Protected routes - apply JWT middleware
	api.Use(middleware.JWTProtected(cfg))

	// Task routes (all require JWT)
	api.Get("/tasks", taskHandler.GetAll)
	api.Post("/tasks", taskHandler.Create)
	api.Get("/tasks/:id", taskHandler.GetByID)
	api.Put("/tasks/:id", taskHandler.Update)
	api.Delete("/tasks/:id", taskHandler.Delete)

	// Other protected routes
	api.Get("/categories", catHandler.GetAll)
	api.Post("/categories", catHandler.Create)
	api.Put("/categories/:id", catHandler.Update)
	api.Delete("/categories/:id", catHandler.Delete)

	api.Get("/dashboard/summary", dashHandler.GetSummary)

	api.Get("/notifications", notifHandler.GetAll)
	api.Get("/notifications/unread-count", notifHandler.GetUnreadCount)
	api.Put("/notifications/:id/read", notifHandler.MarkRead)
	api.Put("/notifications/read-all", notifHandler.MarkAllRead)
	api.Put("/notifications/:id/accept", notifHandler.AcceptInvitation)
	api.Put("/notifications/:id/decline", notifHandler.DeclineInvitation)

	api.Put("/users/avatar", avatarHandler.UpdateAvatar)

	api.Get("/projects", projectHandler.GetAll)
	api.Post("/projects", projectHandler.Create)
	api.Get("/projects/:id", projectHandler.GetByID)
	api.Put("/projects/:id", projectHandler.Update)
	api.Delete("/projects/:id", projectHandler.Delete)
	api.Post("/projects/:id/members", projectHandler.AddMember)
	api.Post("/projects/:id/invite", projectHandler.InviteMember)
	api.Delete("/projects/:id/members/:userId", projectHandler.RemoveMember)

	// Start background services
	notifService.StartReminderScheduler()

	log.Printf("Server starting on port %s", cfg.Port)
	log.Printf("Registered routes:")
	for _, stack := range app.Stack() {
		for _, route := range stack.Routes {
			log.Printf("Method: %s, Path: %s", route.Method, route.Path)
		}
	}

	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
