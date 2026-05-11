package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBURL      string
	JWTSecret  string
	Port       string
	Env        string
	FrontendURL string
}

func Load() *Config {
	godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")

	cfg := &Config{
		DBHost:      os.Getenv("DB_HOST"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      os.Getenv("DB_USER"),
		DBPassword:  os.Getenv("DB_PASSWORD"),
		DBName:      os.Getenv("DB_NAME"),
		DBSSLMode:   getEnv("DB_SSLMODE", "require"),
		DBURL:       dbURL,
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("APP_ENV", "development"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
	}

	if dbURL != "" {
		cfg.DBSSLMode = ""
	}

	return cfg
}

func (c *Config) DSN() string {
	if c.DBURL != "" {
		return c.DBURL
	}
	sslMode := ""
	if c.DBSSLMode != "" {
		sslMode = fmt.Sprintf("sslmode=%s", c.DBSSLMode)
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s %s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, sslMode,
	)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
