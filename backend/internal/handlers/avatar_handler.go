package handlers

import (
	"backend/internal/models"
	"backend/internal/repositories"

	"github.com/gofiber/fiber/v2"
)

type AvatarHandler struct {
	userRepo *repositories.UserRepository
}

func NewAvatarHandler(userRepo *repositories.UserRepository) *AvatarHandler {
	return &AvatarHandler{userRepo: userRepo}
}

func (h *AvatarHandler) UpdateAvatar(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var body struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid request body",
		})
	}
	if body.AvatarURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "avatar_url is required",
		})
	}

	if err := h.userRepo.UpdateAvatar(userID, body.AvatarURL); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to update avatar",
		})
	}

	user, _ := h.userRepo.FindByID(userID)
	return c.JSON(user)
}
