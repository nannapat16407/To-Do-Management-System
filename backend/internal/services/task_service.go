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
	projectRepo  *repositories.ProjectRepository
}

func NewTaskService(
	taskRepo *repositories.TaskRepository,
	userRepo *repositories.UserRepository,
	activityRepo *repositories.ActivityLogRepository,
	projectRepo *repositories.ProjectRepository,
) *TaskService {
	return &TaskService{
		taskRepo:     taskRepo,
		userRepo:     userRepo,
		activityRepo: activityRepo,
		projectRepo:  projectRepo,
	}
}

func (s *TaskService) Create(req *models.CreateTaskRequest, userID uint) (*models.Task, error) {
	status := models.StatusTodo
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

	var startDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		sd, err := models.ParseDueDate(*req.StartDate)
		if err != nil {
			return nil, errors.New("invalid start date format, use YYYY-MM-DD")
		}
		startDate = sd
	} else {
		now := time.Now()
		startDate = &now
	}

	task := &models.Task{
		Title:       req.Title,
		Description: req.Description,
		Status:      status,
		Priority:    priority,
		StartDate:   startDate,
		DueDate:     dueDate,
		CategoryID:  req.CategoryID,
		ProjectID:   req.ProjectID,
		CreatedBy:   userID,
	}

	assigneeIDs := req.AssigneeIDs
	if len(assigneeIDs) == 0 {
		return nil, errors.New("at least one assignee is required")
	}

	// Validate all assignees are project members
	if req.ProjectID != nil {
		for _, aid := range assigneeIDs {
			isMember, err := s.projectRepo.IsMember(*req.ProjectID, aid)
			if err != nil || !isMember {
				return nil, errors.New("assigned user must be a member of this project")
			}
		}
	}

	if err := s.taskRepo.Create(task, assigneeIDs); err != nil {
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
	if req.StartDate != nil {
		if *req.StartDate != "" {
			sd, err := models.ParseDueDate(*req.StartDate)
			if err != nil {
				return nil, errors.New("invalid start date format")
			}
			task.StartDate = sd
		} else {
			task.StartDate = nil
		}
		changes["start_date"] = "updated"
	}
	if req.CategoryID != nil {
		task.CategoryID = req.CategoryID
		changes["category"] = "updated"
	}
	if req.ProjectID != nil {
		task.ProjectID = req.ProjectID
		changes["project"] = "updated"
	}

	var assigneeIDs []uint
	if req.AssigneeIDs != nil {
		if len(req.AssigneeIDs) == 0 {
			return nil, errors.New("at least one assignee is required")
		}
		assigneeIDs = req.AssigneeIDs
		changes["assignees"] = "updated"
	}

	// Validate all new assignees are project members
	effectiveProjectID := task.ProjectID
	if req.ProjectID != nil {
		effectiveProjectID = req.ProjectID
	}
	if effectiveProjectID != nil && len(assigneeIDs) > 0 {
		for _, aid := range assigneeIDs {
			isMember, err := s.projectRepo.IsMember(*effectiveProjectID, aid)
			if err != nil || !isMember {
				return nil, errors.New("assigned user must be a member of this project")
			}
		}
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
