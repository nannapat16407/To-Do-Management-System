package services

import (
	"errors"
	"fmt"
	"log"
	"time"

	"backend/internal/models"
	"backend/internal/repositories"
)

type NotificationService struct {
	notifRepo   *repositories.NotificationRepository
	projectRepo *repositories.ProjectRepository
}

func NewNotificationService(notifRepo *repositories.NotificationRepository, projectRepo *repositories.ProjectRepository) *NotificationService {
	return &NotificationService{
		notifRepo:   notifRepo,
		projectRepo: projectRepo,
	}
}

func (s *NotificationService) GetByUserID(userID uint, page, limit int) ([]models.Notification, int64, int, error) {
	notifications, total, err := s.notifRepo.FindByUserID(userID, page, limit)
	if err != nil {
		return nil, 0, 0, err
	}
	totalPages := repositories.TotalPages(total, limit)
	return notifications, total, totalPages, nil
}

func (s *NotificationService) GetUnreadCount(userID uint) (int64, error) {
	return s.notifRepo.CountUnread(userID)
}

func (s *NotificationService) MarkRead(id, userID uint) error {
	return s.notifRepo.MarkRead(id, userID)
}

func (s *NotificationService) MarkAllRead(userID uint) error {
	return s.notifRepo.MarkAllRead(userID)
}

// StartReminderScheduler launches a background goroutine that checks for
// upcoming and overdue tasks every hour and generates notifications.
func (s *NotificationService) StartReminderScheduler() {
	go func() {
		// Run once immediately on startup
		s.generateDeadlineReminders()
		s.generateOverdueReminders()

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			s.generateDeadlineReminders()
			s.generateOverdueReminders()
		}
	}()
	log.Println("Notification reminder scheduler started (every 1 hour)")
}

func (s *NotificationService) generateDeadlineReminders() {
	tasks, err := s.notifRepo.FindTasksDueSoon(24)
	if err != nil {
		log.Printf("Reminder: error finding due-soon tasks: %v", err)
		return
	}

	var notifications []models.Notification
	for _, task := range tasks {
		// Collect all relevant user IDs: creator + assignees
		userIDs := s.collectUserIDs(task)

		for _, uid := range userIDs {
			// Dedupe: skip if we already notified this user about this task in the last 23 hours
			exists, err := s.notifRepo.Exists(uid, task.ID, models.NotificationDeadline, 23)
			if err != nil || exists {
				continue
			}

			notifications = append(notifications, models.Notification{
				UserID:  uid,
				TaskID:  &task.ID,
				Message: fmt.Sprintf("Task \"%s\" is due soon (deadline: %s)", task.Title, task.DueDate.Format("Jan 2, 2006 3:04 PM")),
				Type:    models.NotificationDeadline,
			})
		}
	}

	if len(notifications) > 0 {
		if err := s.notifRepo.CreateBatch(notifications); err != nil {
			log.Printf("Reminder: error creating deadline notifications: %v", err)
		} else {
			log.Printf("Reminder: created %d deadline notifications", len(notifications))
		}
	}
}

func (s *NotificationService) generateOverdueReminders() {
	tasks, err := s.notifRepo.FindOverdueTasks()
	if err != nil {
		log.Printf("Reminder: error finding overdue tasks: %v", err)
		return
	}

	var notifications []models.Notification
	for _, task := range tasks {
		userIDs := s.collectUserIDs(task)

		for _, uid := range userIDs {
			// Dedupe: skip if we already sent an overdue notification in the last 47 hours
			exists, err := s.notifRepo.Exists(uid, task.ID, models.NotificationOverdue, 47)
			if err != nil || exists {
				continue
			}

			notifications = append(notifications, models.Notification{
				UserID:  uid,
				TaskID:  &task.ID,
				Message: fmt.Sprintf("Task \"%s\" is overdue (was due: %s)", task.Title, task.DueDate.Format("Jan 2, 2006 3:04 PM")),
				Type:    models.NotificationOverdue,
			})
		}
	}

	if len(notifications) > 0 {
		if err := s.notifRepo.CreateBatch(notifications); err != nil {
			log.Printf("Reminder: error creating overdue notifications: %v", err)
		} else {
			log.Printf("Reminder: created %d overdue notifications", len(notifications))
		}
	}
}

func (s *NotificationService) collectUserIDs(task models.Task) []uint {
	seen := map[uint]bool{}
	var ids []uint

	if !seen[task.CreatedBy] {
		seen[task.CreatedBy] = true
		ids = append(ids, task.CreatedBy)
	}
	for _, a := range task.Assignees {
		if !seen[a.ID] {
			seen[a.ID] = true
			ids = append(ids, a.ID)
		}
	}
	return ids
}

func (s *NotificationService) AcceptInvitation(notificationID, userID uint) error {
	notif, err := s.notifRepo.FindByID(notificationID)
	if err != nil {
		return errors.New("notification not found")
	}
	if notif.UserID != userID {
		return errors.New("unauthorized")
	}
	if notif.Type != models.NotificationInvitation {
		return errors.New("not an invitation")
	}
	if notif.InvitationStatus != models.InvitationPending {
		return errors.New("invitation already handled")
	}
	if notif.ProjectID == nil {
		return errors.New("invalid invitation")
	}

	if err := s.projectRepo.AddMember(*notif.ProjectID, userID, models.PMRoleMember); err != nil {
		return err
	}

	return s.notifRepo.UpdateInvitationStatus(notificationID, models.InvitationAccepted)
}

func (s *NotificationService) DeclineInvitation(notificationID, userID uint) error {
	notif, err := s.notifRepo.FindByID(notificationID)
	if err != nil {
		return errors.New("notification not found")
	}
	if notif.UserID != userID {
		return errors.New("unauthorized")
	}
	if notif.Type != models.NotificationInvitation {
		return errors.New("not an invitation")
	}
	if notif.InvitationStatus != models.InvitationPending {
		return errors.New("invitation already handled")
	}

	return s.notifRepo.UpdateInvitationStatus(notificationID, models.InvitationDeclined)
}
