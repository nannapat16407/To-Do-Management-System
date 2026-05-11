package models

import "time"

type RegisterRequest struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateTaskRequest struct {
	Title       string   `json:"title" validate:"required"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	Priority    string   `json:"priority"`
	DueDate     *string  `json:"due_date"`
	CategoryID  *uint    `json:"category_id"`
	AssigneeIDs []uint   `json:"assignee_ids"`
}

type UpdateTaskRequest struct {
	Title       *string  `json:"title"`
	Description *string  `json:"description"`
	Status      *string  `json:"status"`
	Priority    *string  `json:"priority"`
	DueDate     *string  `json:"due_date"`
	CategoryID  *uint    `json:"category_id"`
	AssigneeIDs []uint   `json:"assignee_ids"`
}

type CreateCategoryRequest struct {
	Name string `json:"name" validate:"required"`
}

type UpdateCategoryRequest struct {
	Name *string `json:"name"`
}

type TaskFilter struct {
	Search      string `json:"search"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	CategoryID  *uint  `json:"category_id"`
	AssigneeID  *uint  `json:"assignee_id"`
	DueDateFrom string `json:"due_date_from"`
	DueDateTo   string `json:"due_date_to"`
	Page        int    `json:"page"`
	Limit       int    `json:"limit"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

type DashboardSummary struct {
	TotalTasks     int64              `json:"total_tasks"`
	CompletedTasks int64              `json:"completed_tasks"`
	PendingTasks   int64              `json:"pending_tasks"`
	OverdueTasks   int64              `json:"overdue_tasks"`
	ByCategory     []CategoryCount    `json:"by_category"`
	ByPriority     []PriorityCount    `json:"by_priority"`
}

type CategoryCount struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

type PriorityCount struct {
	Priority string `json:"priority"`
	Count    int64  `json:"count"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

func ParseDueDate(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
