package repositories

import (
	"backend/internal/models"

	"gorm.io/gorm"
)

type ProjectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(project *models.Project, memberIDs []uint) error {
	tx := r.db.Begin()

	if err := tx.Create(project).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Add owner as "owner" member
	ownerMember := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    project.OwnerID,
		Role:      models.PMRoleOwner,
	}
	if err := tx.Create(&ownerMember).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Add other members as "member"
	if len(memberIDs) > 0 {
		members := []models.ProjectMember{}
		for _, uid := range memberIDs {
			if uid == project.OwnerID {
				continue // skip owner, already added
			}
			members = append(members, models.ProjectMember{
				ProjectID: project.ID,
				UserID:    uid,
				Role:      models.PMRoleMember,
			})
		}
		if len(members) > 0 {
			if err := tx.Create(&members).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
}

func (r *ProjectRepository) Update(project *models.Project) error {
	return r.db.Save(project).Error
}

func (r *ProjectRepository) Delete(id uint) error {
	tx := r.db.Begin()

	if err := tx.Where("project_id = ?", id).Delete(&models.ProjectMember{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Delete(&models.Project{}, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (r *ProjectRepository) FindByID(id uint) (*models.Project, error) {
	var project models.Project
	err := r.db.Preload("Owner").Preload("Members").First(&project, id).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *ProjectRepository) FindByUserID(userID uint) ([]models.Project, error) {
	var projects []models.Project
	err := r.db.Preload("Owner").Preload("Members").
		Where("owner_id = ? OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)", userID, userID).
		Find(&projects).Error
	if err != nil {
		return nil, err
	}
	return projects, nil
}

func (r *ProjectRepository) AreMembers(projectID uint, userIDs []uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.ProjectMember{}).
		Where("project_id = ? AND user_id IN ?", projectID, userIDs).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count == int64(len(userIDs)), nil
}

func (r *ProjectRepository) IsMember(projectID, userID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.ProjectMember{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *ProjectRepository) AddMember(projectID, userID uint, role models.ProjectMemberRole) error {
	member := models.ProjectMember{
		ProjectID: projectID,
		UserID:    userID,
		Role:      role,
	}
	return r.db.Create(&member).Error
}

func (r *ProjectRepository) RemoveMember(projectID, userID uint) error {
	return r.db.Where("project_id = ? AND user_id = ?", projectID, userID).
		Delete(&models.ProjectMember{}).Error
}

func (r *ProjectRepository) FindAllUsers() ([]models.User, error) {
	var users []models.User
	err := r.db.Find(&users).Error
	return users, err
}

func (r *ProjectRepository) FindMemberByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
