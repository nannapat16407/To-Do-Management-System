package services

import (
	"errors"
	"fmt"

	"backend/internal/models"
	"backend/internal/repositories"
)

type ProjectService struct {
	projectRepo *repositories.ProjectRepository
	notifRepo   *repositories.NotificationRepository
}

func NewProjectService(projectRepo *repositories.ProjectRepository, notifRepo *repositories.NotificationRepository) *ProjectService {
	return &ProjectService{
		projectRepo: projectRepo,
		notifRepo:   notifRepo,
	}
}

func (s *ProjectService) Create(req *models.CreateProjectRequest, userID uint) (*models.Project, error) {
	project := &models.Project{
		Name:        req.Name,
		Description: req.Description,
		Status:      models.ProjectActive,
		OwnerID:     userID,
	}

	if err := s.projectRepo.Create(project, req.MemberIDs); err != nil {
		return nil, err
	}

	return s.projectRepo.FindByID(project.ID)
}

func (s *ProjectService) Update(id uint, req *models.UpdateProjectRequest, userID uint) (*models.Project, error) {
	project, err := s.projectRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("project not found")
	}

	if project.OwnerID != userID {
		return nil, errors.New("only the project owner can update the project")
	}

	if req.Name != nil {
		project.Name = *req.Name
	}
	if req.Description != nil {
		project.Description = *req.Description
	}
	if req.Status != nil {
		project.Status = models.ProjectStatus(*req.Status)
	}

	if err := s.projectRepo.Update(project); err != nil {
		return nil, err
	}

	return s.projectRepo.FindByID(id)
}

func (s *ProjectService) Delete(id uint, userID uint) error {
	project, err := s.projectRepo.FindByID(id)
	if err != nil {
		return errors.New("project not found")
	}

	if project.OwnerID != userID {
		return errors.New("only the project owner can delete the project")
	}

	return s.projectRepo.Delete(id)
}

func (s *ProjectService) GetByID(id uint) (*models.Project, error) {
	return s.projectRepo.FindByID(id)
}

func (s *ProjectService) GetByUserID(userID uint) ([]models.Project, error) {
	return s.projectRepo.FindByUserID(userID)
}

func (s *ProjectService) AddMember(projectID uint, req *models.AddProjectMemberRequest, currentUserID uint) error {
	project, err := s.projectRepo.FindByID(projectID)
	if err != nil {
		return errors.New("project not found")
	}

	if project.OwnerID != currentUserID {
		return errors.New("only the project owner can add members")
	}

	// Check if already a member
	isMember, err := s.projectRepo.IsMember(projectID, req.UserID)
	if err != nil {
		return err
	}
	if isMember {
		return errors.New("user is already a member of this project")
	}

	return s.projectRepo.AddMember(projectID, req.UserID, models.PMRoleMember)
}

func (s *ProjectService) RemoveMember(projectID uint, memberUserID uint, currentUserID uint) error {
	project, err := s.projectRepo.FindByID(projectID)
	if err != nil {
		return errors.New("project not found")
	}

	if project.OwnerID != currentUserID {
		return errors.New("only the project owner can remove members")
	}

	if memberUserID == project.OwnerID {
		return errors.New("cannot remove the project owner")
	}

	return s.projectRepo.RemoveMember(projectID, memberUserID)
}

func (s *ProjectService) InviteMember(projectID uint, email string, currentUserID uint) error {
	project, err := s.projectRepo.FindByID(projectID)
	if err != nil {
		return errors.New("project not found")
	}

	if project.OwnerID != currentUserID {
		return errors.New("only the project owner can invite members")
	}

	targetUser, err := s.projectRepo.FindMemberByEmail(email)
	if err != nil {
		return errors.New("no user found with that email")
	}

	isMember, err := s.projectRepo.IsMember(projectID, targetUser.ID)
	if err != nil {
		return err
	}
	if isMember {
		return errors.New("user is already a member of this project")
	}

	notification := &models.Notification{
		UserID:           targetUser.ID,
		ProjectID:        &projectID,
		Message:          fmt.Sprintf("You've been invited to join project \"%s\"", project.Name),
		Type:             models.NotificationInvitation,
		InvitationStatus: models.InvitationPending,
	}
	return s.notifRepo.Create(notification)
}
