package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"backend/internal/models"
	"backend/internal/repositories"
)

type TaskService struct {
	taskRepo     *repositories.TaskRepository
	userRepo     *repositories.UserRepository
	activityRepo *repositories.ActivityLogRepository
}

func NewTaskService(
	taskRepo *repositories.TaskRepository,
	userRepo *repositories.UserRepository,
	activityRepo *repositories.ActivityLogRepository,
) *TaskService {
	return &TaskService{
		taskRepo:     taskRepo,
		userRepo:     userRepo,
		activityRepo: activityRepo,
	}
}

func (s *TaskService) Create(req *models.CreateTaskRequest, userID uint) (*models.Task, error) {
	status := models.StatusPending
	if req.Status != "" {
		status = models.TaskStatus(req.Status)
	}
	priority := models.PriorityMedium
	if req.Priority != "" {
		priority = models.Priority(req.Priority)
	}

	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		dd, err := models.ParseDueDate(*req.DueDate)
		if err != nil {
			return nil, errors.New("invalid due date format, use YYYY-MM-DD")
		}
		dueDate = dd
	}

	task := &models.Task{
		Title:       req.Title,
		Description: req.Description,
		Status:      status,
		Priority:    priority,
		DueDate:     dueDate,
		CategoryID:  req.CategoryID,
		CreatedBy:   userID,
	}

	if err := s.taskRepo.Create(task, req.AssigneeIDs); err != nil {
		return nil, err
	}

	s.logActivity(task.ID, userID, "created", "Task created")

	return s.taskRepo.FindByID(task.ID)
}

func (s *TaskService) Update(id uint, req *models.UpdateTaskRequest, userID uint) (*models.Task, error) {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("task not found")
	}

	changes := map[string]interface{}{}

	if req.Title != nil {
		changes["title"] = fmt.Sprintf("%s → %s", task.Title, *req.Title)
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = *req.Description
		changes["description"] = "updated"
	}
	if req.Status != nil {
		changes["status"] = fmt.Sprintf("%s → %s", task.Status, *req.Status)
		task.Status = models.TaskStatus(*req.Status)
	}
	if req.Priority != nil {
		changes["priority"] = fmt.Sprintf("%s → %s", task.Priority, *req.Priority)
		task.Priority = models.Priority(*req.Priority)
	}
	if req.DueDate != nil {
		if *req.DueDate != "" {
			dd, err := models.ParseDueDate(*req.DueDate)
			if err != nil {
				return nil, errors.New("invalid due date format")
			}
			task.DueDate = dd
		} else {
			task.DueDate = nil
		}
		changes["due_date"] = "updated"
	}
	if req.CategoryID != nil {
		task.CategoryID = req.CategoryID
		changes["category"] = "updated"
	}

	var assigneeIDs []uint
	if req.AssigneeIDs != nil {
		assigneeIDs = req.AssigneeIDs
		changes["assignees"] = "updated"
	}

	if err := s.taskRepo.Update(task, assigneeIDs); err != nil {
		return nil, err
	}

	details, _ := json.Marshal(changes)
	s.logActivity(task.ID, userID, "updated", string(details))

	return s.taskRepo.FindByID(task.ID)
}

func (s *TaskService) Delete(id uint, userID uint) error {
	if _, err := s.taskRepo.FindByID(id); err != nil {
		return errors.New("task not found")
	}
	s.logActivity(id, userID, "deleted", "Task deleted")
	return s.taskRepo.Delete(id)
}

func (s *TaskService) GetByID(id uint) (*models.Task, error) {
	return s.taskRepo.FindByID(id)
}

func (s *TaskService) GetAll(filter *models.TaskFilter, userID uint, isAdmin bool) (*models.PaginatedResponse, error) {
	return s.taskRepo.FindAll(filter, userID, isAdmin)
}

func (s *TaskService) logActivity(taskID, userID uint, action, details string) {
	log := &models.ActivityLog{
		TaskID:  taskID,
		UserID:  userID,
		Action:  action,
		Details: details,
	}
	s.activityRepo.Create(log)
}
