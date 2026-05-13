package repositories

import (
	"backend/internal/models"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"
)

type TaskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) Create(task *models.Task, assigneeIDs []uint) error {
	tx := r.db.Begin()

	if err := tx.Create(task).Error; err != nil {
		tx.Rollback()
		return err
	}

	if len(assigneeIDs) > 0 {
		assignees := []models.TaskAssignee{}
		for _, uid := range assigneeIDs {
			assignees = append(assignees, models.TaskAssignee{
				TaskID: task.ID,
				UserID: uid,
			})
		}
		if err := tx.Create(&assignees).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

func (r *TaskRepository) Update(task *models.Task, assigneeIDs []uint) error {
	tx := r.db.Begin()

	if err := tx.Save(task).Error; err != nil {
		tx.Rollback()
		return err
	}

	if assigneeIDs != nil {
		if err := tx.Where("task_id = ?", task.ID).Delete(&models.TaskAssignee{}).Error; err != nil {
			tx.Rollback()
			return err
		}
		if len(assigneeIDs) > 0 {
			assignees := []models.TaskAssignee{}
			for _, uid := range assigneeIDs {
				assignees = append(assignees, models.TaskAssignee{
					TaskID: task.ID,
					UserID: uid,
				})
			}
			if err := tx.Create(&assignees).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
}

func (r *TaskRepository) Delete(id uint) error {
	return r.db.Delete(&models.Task{}, id).Error
}

func (r *TaskRepository) FindByID(id uint) (*models.Task, error) {
	var task models.Task
	err := r.db.Preload("Category").Preload("Creator").Preload("Assignees").
		First(&task, id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) FindAll(filter *models.TaskFilter, userID uint, isAdmin bool) (*models.PaginatedResponse, error) {
	query := r.db.Model(&models.Task{})

	if !isAdmin {
		if filter.ProjectID != nil {
			// Project-scoped: all project members see all tasks in the project
			query = query.Where(
				"project_id = ? AND EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = ?)",
				*filter.ProjectID, userID,
			)
		} else {
			query = query.Where("created_by = ? OR id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)", userID, userID)
		}
	}

	if filter.Search != "" {
		query = query.Where("title ILIKE ?", "%"+filter.Search+"%")
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		query = query.Where("priority = ?", filter.Priority)
	}
	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}
	if filter.AssigneeID != nil {
		query = query.Where("created_by = ? OR id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)", *filter.AssigneeID, *filter.AssigneeID)
	}
	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.DueDateFrom != "" {
		query = query.Where("due_date >= ?", filter.DueDateFrom)
	}
	if filter.DueDateTo != "" {
		query = query.Where("due_date <= ?", filter.DueDateTo)
	}

	var total int64
	query.Count(&total)

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	var tasks []models.Task
	err := query.Preload("Category").Preload("Project").Preload("Creator").Preload("Assignees").
		Order("updated_at DESC").
		Offset(offset).Limit(limit).
		Find(&tasks).Error
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	return &models.PaginatedResponse{
		Data:       tasks,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *TaskRepository) CountByStatus(status models.TaskStatus, userID uint, isAdmin bool, projectID *uint) (int64, error) {
	var count int64
	query := r.db.Model(&models.Task{}).Where("status = ?", status)
	if !isAdmin {
		query = query.Where("created_by = ? OR id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)", userID, userID)
	}
	if projectID != nil {
		query = query.Where("project_id = ?", *projectID)
	}
	err := query.Count(&count).Error
	return count, err
}

func (r *TaskRepository) CountOverdue(userID uint, isAdmin bool, projectID *uint) (int64, error) {
	var count int64
	now := time.Now()
	today := strings.Split(now.Format("2006-01-02T15:04:05"), "T")[0]
	query := r.db.Model(&models.Task{}).
		Where("status != ? AND due_date IS NOT NULL AND due_date < ?", models.StatusDone, today)
	if !isAdmin {
		query = query.Where("created_by = ? OR id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)", userID, userID)
	}
	if projectID != nil {
		query = query.Where("project_id = ?", *projectID)
	}
	err := query.Count(&count).Error
	return count, err
}

func (r *TaskRepository) CountByCategory(userID uint, isAdmin bool, projectID *uint) ([]models.CategoryCount, error) {
	var results []models.CategoryCount
	query := r.db.Model(&models.Task{}).
		Select("COALESCE(c.name, 'Uncategorized') as category, COUNT(*) as count").
		Joins("LEFT JOIN categories c ON tasks.category_id = c.id").
		Group("c.name")
	if !isAdmin {
		query = query.Where("created_by = ? OR id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)", userID, userID)
	}
	if projectID != nil {
		query = query.Where("tasks.project_id = ?", *projectID)
	}
	err := query.Find(&results).Error
	return results, err
}

func (r *TaskRepository) CountByPriority(userID uint, isAdmin bool, projectID *uint) ([]models.PriorityCount, error) {
	var results []models.PriorityCount
	query := r.db.Model(&models.Task{}).
		Select("priority, COUNT(*) as count").
		Group("priority")
	if !isAdmin {
		query = query.Where("created_by = ? OR id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)", userID, userID)
	}
	if projectID != nil {
		query = query.Where("project_id = ?", *projectID)
	}
	err := query.Find(&results).Error
	return results, err
}
