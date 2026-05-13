package services

import (
	"backend/internal/models"
	"backend/internal/repositories"
)

type DashboardService struct {
	taskRepo *repositories.TaskRepository
}

func NewDashboardService(taskRepo *repositories.TaskRepository) *DashboardService {
	return &DashboardService{taskRepo: taskRepo}
}

func (s *DashboardService) GetSummary(userID uint, isAdmin bool, projectID *uint) (*models.DashboardSummary, error) {
	filter := &models.TaskFilter{Page: 1, Limit: 1, ProjectID: projectID}
	result, err := s.taskRepo.FindAll(filter, userID, isAdmin)
	if err != nil {
		return nil, err
	}
	total := result.Total

	todoCount, _ := s.taskRepo.CountByStatus(models.StatusTodo, userID, isAdmin, projectID)
	inProgressCount, _ := s.taskRepo.CountByStatus(models.StatusInProgress, userID, isAdmin, projectID)
	doneCount, _ := s.taskRepo.CountByStatus(models.StatusDone, userID, isAdmin, projectID)
	overdue, _ := s.taskRepo.CountOverdue(userID, isAdmin, projectID)
	byCategory, _ := s.taskRepo.CountByCategory(userID, isAdmin, projectID)
	byPriority, _ := s.taskRepo.CountByPriority(userID, isAdmin, projectID)

	return &models.DashboardSummary{
		TotalTasks:      total,
		TodoTasks:       todoCount,
		InProgressTasks: inProgressCount,
		DoneTasks:       doneCount,
		OverdueTasks:    overdue,
		ByCategory:      byCategory,
		ByPriority:      byPriority,
	}, nil
}
