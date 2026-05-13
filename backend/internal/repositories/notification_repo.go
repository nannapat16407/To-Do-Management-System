package repositories

import (
	"backend/internal/models"
	"math"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(n *models.Notification) error {
	return r.db.Create(n).Error
}

func (r *NotificationRepository) CreateBatch(notifications []models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}
	return r.db.Create(&notifications).Error
}

func (r *NotificationRepository) FindByUserID(userID uint, page, limit int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	var total int64

	r.db.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&total)

	offset := (page - 1) * limit
	err := r.db.Where("user_id = ?", userID).
		Preload("Task").Preload("Project").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&notifications).Error
	if err != nil {
		return nil, 0, err
	}
	return notifications, total, nil
}

func (r *NotificationRepository) CountUnread(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Count(&count).Error
	return count, err
}

func (r *NotificationRepository) MarkRead(id, userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true).Error
}

func (r *NotificationRepository) MarkAllRead(userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Update("is_read", true).Error
}

// Exists checks if a notification with the same user, task, and type already exists
// within a given time window, preventing duplicate deadline reminders.
func (r *NotificationRepository) Exists(userID uint, taskID uint, notifType models.NotificationType, sinceHours float64) (bool, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND task_id = ? AND type = ? AND created_at >= NOW() - ? * INTERVAL '1 hour'",
			userID, taskID, notifType, sinceHours).
		Count(&count).Error
	return count > 0, err
}

// FindTasksDueSoon returns tasks with due_date within the next `hours` that are not completed.
func (r *NotificationRepository) FindTasksDueSoon(hours float64) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.Where(
		"status != ? AND due_date IS NOT NULL AND due_date <= NOW() + ? * INTERVAL '1 hour' AND due_date > NOW()",
		models.StatusDone, hours,
	).Preload("Creator").Preload("Assignees").
		Find(&tasks).Error
	return tasks, err
}

// FindOverdueTasks returns tasks past due_date that are not completed.
func (r *NotificationRepository) FindOverdueTasks() ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.Where(
		"status != ? AND due_date IS NOT NULL AND due_date < NOW()",
		models.StatusDone,
	).Preload("Creator").Preload("Assignees").
		Find(&tasks).Error
	return tasks, err
}

// TotalPages calculates total pages — kept local to avoid import in other files.
func TotalPages(total int64, limit int) int {
	return int(math.Ceil(float64(total) / float64(limit)))
}

func (r *NotificationRepository) FindByID(id uint) (*models.Notification, error) {
	var n models.Notification
	err := r.db.Preload("Task").Preload("Project").First(&n, id).Error
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NotificationRepository) UpdateInvitationStatus(id uint, status models.InvitationStatus) error {
	return r.db.Model(&models.Notification{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"invitation_status": status,
			"is_read":           true,
		}).Error
}
