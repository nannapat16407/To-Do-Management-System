package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

type TaskStatus string

const (
	StatusTodo       TaskStatus = "todo"
	StatusInProgress TaskStatus = "in_progress"
	StatusInReview   TaskStatus = "in_review"
	StatusDone       TaskStatus = "done"
)

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"not null"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null"`
	Password  string         `json:"-" gorm:"not null"`
	AvatarURL string         `json:"avatar_url" gorm:"type:text;default:''"`
	Role      Role           `json:"role" gorm:"type:varchar(20);default:'user'"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (User) TableName() string { return "users" }

type Category struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"not null"`
	CreatedBy uint           `json:"created_by" gorm:"not null"`
	User      User           `json:"user" gorm:"foreignKey:CreatedBy"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (Category) TableName() string { return "categories" }

type Task struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description" gorm:"type:text"`
	Status      TaskStatus     `json:"status" gorm:"type:varchar(20);default:'todo'"`
	Priority    Priority       `json:"priority" gorm:"type:varchar(20);default:'medium'"`
	DueDate     *time.Time     `json:"due_date"`
	StartDate   *time.Time     `json:"start_date"`
	CategoryID  *uint          `json:"category_id"`
	Category    *Category      `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	ProjectID   *uint          `json:"project_id"`
	Project     *Project       `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	CreatedBy   uint           `json:"created_by" gorm:"not null"`
	Creator     User           `json:"creator" gorm:"foreignKey:CreatedBy"`
	Assignees   []User         `json:"assignees,omitempty" gorm:"many2many:task_assignees"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (Task) TableName() string { return "tasks" }

type TaskAssignee struct {
	TaskID uint      `json:"task_id" gorm:"primaryKey"`
	UserID uint      `json:"user_id" gorm:"primaryKey"`
	AssignedAt time.Time `json:"assigned_at"`
}

func (TaskAssignee) TableName() string { return "task_assignees" }

type ActivityLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	TaskID    uint      `json:"task_id" gorm:"not null;index"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	Action    string    `json:"action" gorm:"not null"`
	Details   string    `json:"details" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

func (ActivityLog) TableName() string { return "activity_logs" }
