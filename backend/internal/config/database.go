package config

import (
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"backend/internal/models"
)

func ConnectDB(cfg *Config) *gorm.DB {
	dsn := cfg.DSN()
	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	var db *gorm.DB
	var err error

	for attempt := 1; attempt <= 10; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), gormCfg)
		if err == nil {
			break
		}
		log.Printf("Database not ready (attempt %d/10): %v", attempt, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to connect to database after 10 retries: %v", err)
	}

	if cfg.Env == "development" {
		db.Debug()
	}

	log.Println("Database connected")
	return db
}

func Migrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Task{},
		&models.TaskAssignee{},
		&models.Project{},
		&models.ProjectMember{},
		&models.ActivityLog{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Migrations completed")
}

func SeedAdminUser(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Where("email = ?", "admin1@gmail.com").Count(&count)
	if count > 0 {
		log.Println("Admin user already exists, skipping seed")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash admin password: %v", err)
	}

	admin := models.User{
		Name:     "Admin",
		Email:    "admin1@gmail.com",
		Password: string(hashedPassword),
		Role:     models.RoleAdmin,
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Fatalf("Failed to seed admin user: %v", err)
	}

	log.Println("Admin user seeded (admin1@gmail.com)")
}
