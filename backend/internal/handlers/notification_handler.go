package handlers

import (
	"backend/internal/models"
	"backend/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type NotificationHandler struct {
	notifService *services.NotificationService
}

func NewNotificationHandler(notifService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifService: notifService}
}

func (h *NotificationHandler) GetAll(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	notifications, total, totalPages, err := h.notifService.GetByUserID(userID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to fetch notifications",
		})
	}

	return c.JSON(models.PaginatedResponse{
		Data:       notifications,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	count, err := h.notifService.GetUnreadCount(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to count unread notifications",
		})
	}

	return c.JSON(fiber.Map{"unread_count": count})
}

func (h *NotificationHandler) MarkRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid notification ID",
		})
	}

	if err := h.notifService.MarkRead(uint(id), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to mark notification as read",
		})
	}

	return c.JSON(fiber.Map{"message": "notification marked as read"})
}

func (h *NotificationHandler) MarkAllRead(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	if err := h.notifService.MarkAllRead(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to mark all notifications as read",
		})
	}

	return c.JSON(fiber.Map{"message": "all notifications marked as read"})
}

func (h *NotificationHandler) AcceptInvitation(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid notification ID",
		})
	}

	userID := c.Locals("user_id").(uint)
	if err := h.notifService.AcceptInvitation(uint(id), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: err.Error(),
		})
	}

	return c.JSON(fiber.Map{"message": "invitation accepted"})
}

func (h *NotificationHandler) DeclineInvitation(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid notification ID",
		})
	}

	userID := c.Locals("user_id").(uint)
	if err := h.notifService.DeclineInvitation(uint(id), userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: err.Error(),
		})
	}

	return c.JSON(fiber.Map{"message": "invitation declined"})
}
