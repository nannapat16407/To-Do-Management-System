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

func (s *DashboardService) GetSummary(userID uint, isAdmin bool) (*models.DashboardSummary, error) {
	filter := &models.TaskFilter{Page: 1, Limit: 1}
	result, err := s.taskRepo.FindAll(filter, userID, isAdmin)
	if err != nil {
		return nil, err
	}
	total := result.Total

	completed, _ := s.taskRepo.CountByStatus(models.StatusCompleted, userID, isAdmin)
	pending, _ := s.taskRepo.CountByStatus(models.StatusPending, userID, isAdmin)
	overdue, _ := s.taskRepo.CountOverdue(userID, isAdmin)
	byCategory, _ := s.taskRepo.CountByCategory(userID, isAdmin)
	byPriority, _ := s.taskRepo.CountByPriority(userID, isAdmin)

	return &models.DashboardSummary{
		TotalTasks:     total,
		CompletedTasks: completed,
		PendingTasks:   pending,
		OverdueTasks:   overdue,
		ByCategory:     byCategory,
		ByPriority:     byPriority,
	}, nil
}
