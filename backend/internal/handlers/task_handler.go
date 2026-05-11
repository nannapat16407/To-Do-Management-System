package handlers

import (
	"backend/internal/models"
	"backend/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type TaskHandler struct {
	taskService *services.TaskService
}

func NewTaskHandler(taskService *services.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

func (h *TaskHandler) Create(c *fiber.Ctx) error {
	req := new(models.CreateTaskRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid request body",
		})
	}
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "title is required",
		})
	}

	userID := c.Locals("user_id").(uint)
	isAdmin := c.Locals("role").(string) == string(models.RoleAdmin)

	task, err := h.taskService.Create(req, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: err.Error(),
		})
	}

	_ = isAdmin
	return c.Status(fiber.StatusCreated).JSON(task)
}

func (h *TaskHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid task ID",
		})
	}

	req := new(models.UpdateTaskRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid request body",
		})
	}

	userID := c.Locals("user_id").(uint)
	task, err := h.taskService.Update(uint(id), req, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: err.Error(),
		})
	}

	return c.JSON(task)
}

func (h *TaskHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid task ID",
		})
	}

	userID := c.Locals("user_id").(uint)
	if err := h.taskService.Delete(uint(id), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TaskHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "invalid task ID",
		})
	}

	task, err := h.taskService.GetByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "task not found",
		})
	}

	return c.JSON(task)
}

func (h *TaskHandler) GetAll(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	isAdmin := c.Locals("role").(string) == string(models.RoleAdmin)

	categoryID, _ := strconv.Atoi(c.Query("category_id"))
	assigneeID, _ := strconv.Atoi(c.Query("assignee_id"))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	filter := &models.TaskFilter{
		Search:      c.Query("search"),
		Status:      c.Query("status"),
		Priority:    c.Query("priority"),
		DueDateFrom: c.Query("due_date_from"),
		DueDateTo:   c.Query("due_date_to"),
		Page:        page,
		Limit:       limit,
	}

	if categoryID > 0 {
		cid := uint(categoryID)
		filter.CategoryID = &cid
	}
	if assigneeID > 0 {
		aid := uint(assigneeID)
		filter.AssigneeID = &aid
	}

	result, err := h.taskService.GetAll(filter, userID, isAdmin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "failed to fetch tasks",
		})
	}

	return c.JSON(result)
}
