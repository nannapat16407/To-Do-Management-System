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

	userRepo := repositories.NewUserRepository(db)
	taskRepo := repositories.NewTaskRepository(db)
	catRepo := repositories.NewCategoryRepository(db)
	activityRepo := repositories.NewActivityLogRepository(db)

	authService := services.NewAuthService(userRepo, cfg)
	taskService := services.NewTaskService(taskRepo, userRepo, activityRepo)
	catService := services.NewCategoryService(catRepo)
	dashService := services.NewDashboardService(taskRepo)

	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userRepo)
	taskHandler := handlers.NewTaskHandler(taskService)
	catHandler := handlers.NewCategoryHandler(catService)
	dashHandler := handlers.NewDashboardHandler(dashService)

	api := app.Group("/api")

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

	log.Printf("Server starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
