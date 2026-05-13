package middleware

import (
	"strings"

	"backend/internal/config"

	"github.com/gofiber/fiber/v2"
)

func CORS(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		allowedOrigins := strings.Split(cfg.FrontendURL, ",")

		allowedOrigin := ""
		for _, ao := range allowedOrigins {
			ao = strings.TrimSpace(ao)
			if ao == "*" || origin == ao {
				allowedOrigin = origin
				break
			}
		}

		if allowedOrigin != "" {
			c.Set("Access-Control-Allow-Origin", allowedOrigin)
			c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			c.Set("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization")
			c.Set("Access-Control-Allow-Credentials", "true")
			c.Set("Vary", "Origin")
		}

		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}
