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
	total, statusCounts, overdue, byCategory, byPriority, err := s.taskRepo.GetDashboardStats(userID, isAdmin, projectID)
	if err != nil {
		return nil, err
	}

	return &models.DashboardSummary{
		TotalTasks:      total,
		TodoTasks:       statusCounts[string(models.StatusTodo)],
		InProgressTasks: statusCounts[string(models.StatusInProgress)],
		DoneTasks:       statusCounts[string(models.StatusDone)],
		OverdueTasks:    overdue,
		ByCategory:      byCategory,
		ByPriority:      byPriority,
	}, nil
}
