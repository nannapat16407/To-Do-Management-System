package repositories

import (
	"backend/internal/models"

	"gorm.io/gorm"
)

type ActivityLogRepository struct {
	db *gorm.DB
}

func NewActivityLogRepository(db *gorm.DB) *ActivityLogRepository {
	return &ActivityLogRepository{db: db}
}

func (r *ActivityLogRepository) Create(log *models.ActivityLog) error {
	return r.db.Create(log).Error
}

func (r *ActivityLogRepository) FindByTaskID(taskID uint) ([]models.ActivityLog, error) {
	var logs []models.ActivityLog
	err := r.db.Where("task_id = ?", taskID).Order("created_at DESC").Find(&logs).Error
	return logs, err
}
