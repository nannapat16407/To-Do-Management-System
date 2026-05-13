package models

import "time"

type ProjectStatus string

const (
	ProjectActive   ProjectStatus = "active"
	ProjectArchived ProjectStatus = "archived"
)

type ProjectMemberRole string

const (
	PMRoleOwner  ProjectMemberRole = "owner"
	PMRoleMember ProjectMemberRole = "member"
)

type Project struct {
	ID          uint          `json:"id" gorm:"primaryKey"`
	Name        string        `json:"name" gorm:"not null"`
	Description string        `json:"description" gorm:"type:text"`
	Status      ProjectStatus `json:"status" gorm:"type:varchar(20);default:'active'"`
	OwnerID     uint          `json:"owner_id" gorm:"not null"`
	Owner       User          `json:"owner" gorm:"foreignKey:OwnerID"`
	Members     []User        `json:"members,omitempty" gorm:"many2many:project_members"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

func (Project) TableName() string { return "projects" }

type ProjectMember struct {
	ProjectID uint              `json:"project_id" gorm:"primaryKey"`
	UserID    uint              `json:"user_id" gorm:"primaryKey"`
	Role      ProjectMemberRole `json:"role" gorm:"type:varchar(20);default:'member'"`
	JoinedAt  time.Time         `json:"joined_at"`
}

func (ProjectMember) TableName() string { return "project_members" }
