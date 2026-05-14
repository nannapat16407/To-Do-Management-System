package main

import (
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

	// Health check endpoint at root (for Fly.io) and /api
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "backend running",
		})
	})

	// Routes
	api := app.Group("/api")

	api.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "backend running",
		})
	})

	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)

	protected := api.Use(middleware.JWTProtected(cfg))

	protected.Get("/users", middleware.RoleRequired(models.RoleAdmin), userHandler.GetAll)
	protected.Get("/users/:id", middleware.RoleRequired(models.RoleAdmin), userHandler.GetByID)

	protected.Get("/tasks", taskHandler.GetAll)
	protected.Post("/tasks", taskHandler.Create)
	protected.Get("/tasks/:id", taskHandler.GetByID)
	protected.Put("/tasks/:id", taskHandler.Update)
	protected.Delete("/tasks/:id", taskHandler.Delete)

	protected.Get("/categories", catHandler.GetAll)
	protected.Post("/categories", catHandler.Create)
	protected.Put("/categories/:id", catHandler.Update)
	protected.Delete("/categories/:id", catHandler.Delete)

	protected.Get("/dashboard/summary", dashHandler.GetSummary)

	protected.Get("/notifications", notifHandler.GetAll)
	protected.Get("/notifications/unread-count", notifHandler.GetUnreadCount)
	protected.Put("/notifications/:id/read", notifHandler.MarkRead)
	protected.Put("/notifications/read-all", notifHandler.MarkAllRead)
	protected.Put("/notifications/:id/accept", notifHandler.AcceptInvitation)
	protected.Put("/notifications/:id/decline", notifHandler.DeclineInvitation)

	protected.Put("/users/avatar", avatarHandler.UpdateAvatar)

	protected.Get("/projects", projectHandler.GetAll)
	protected.Post("/projects", projectHandler.Create)
	protected.Get("/projects/:id", projectHandler.GetByID)
	protected.Put("/projects/:id", projectHandler.Update)
	protected.Delete("/projects/:id", projectHandler.Delete)
	protected.Post("/projects/:id/members", projectHandler.AddMember)
	protected.Post("/projects/:id/invite", projectHandler.InviteMember)
	protected.Delete("/projects/:id/members/:userId", projectHandler.RemoveMember)

	// Start background deadline reminder scheduler
	notifService.StartReminderScheduler()


	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
