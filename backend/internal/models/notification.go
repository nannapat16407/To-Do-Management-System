package models

import (
	"time"
)

type NotificationType string

const (
	NotificationDeadline   NotificationType = "deadline"
	NotificationOverdue    NotificationType = "overdue"
	NotificationAssigned   NotificationType = "assigned"
	NotificationInvitation NotificationType = "invitation"
)

type InvitationStatus string

const (
	InvitationPending  InvitationStatus = "pending"
	InvitationAccepted InvitationStatus = "accepted"
	InvitationDeclined InvitationStatus = "declined"
)

type Notification struct {
	ID               uint             `json:"id" gorm:"primaryKey"`
	UserID           uint             `json:"user_id" gorm:"not null;index"`
	User             User             `json:"-" gorm:"foreignKey:UserID"`
	TaskID           *uint            `json:"task_id"`
	Task             *Task            `json:"task,omitempty" gorm:"foreignKey:TaskID"`
	ProjectID        *uint            `json:"project_id"`
	Project          *Project         `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	Message          string           `json:"message" gorm:"not null"`
	Type             NotificationType `json:"type" gorm:"type:varchar(20);not null"`
	InvitationStatus InvitationStatus `json:"invitation_status" gorm:"type:varchar(20);default:'pending'"`
	IsRead           bool             `json:"is_read" gorm:"default:false"`
	CreatedAt        time.Time        `json:"created_at"`
}

func (Notification) TableName() string { return "notifications" }
