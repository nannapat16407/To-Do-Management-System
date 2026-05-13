package handlers

import (
	"backend/internal/models"
	"backend/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type DashboardHandler struct {
	dashService *services.DashboardService
}

func NewDashboardHandler(dashService *services.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashService: dashService}
}

func (h *DashboardHandler) GetSummary(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	isAdmin := c.Locals("role").(string) == string(models.RoleAdmin)

	var projectID *uint
	if pid, err := strconv.Atoi(c.Query("project_id")); err == nil && pid > 0 {
		uid := uint(pid)
		projectID = &uid
	}

	summary, err := h.dashService.GetSummary(userID, isAdmin, projectID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to fetch dashboard summary",
		})
	}

	return c.JSON(summary)
}
