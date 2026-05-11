package repositories

import (
	"backend/internal/models"

	"gorm.io/gorm"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) Create(cat *models.Category) error {
	return r.db.Create(cat).Error
}

func (r *CategoryRepository) Update(cat *models.Category) error {
	return r.db.Save(cat).Error
}

func (r *CategoryRepository) Delete(id uint) error {
	return r.db.Delete(&models.Category{}, id).Error
}

func (r *CategoryRepository) FindByID(id uint) (*models.Category, error) {
	var cat models.Category
	err := r.db.First(&cat, id).Error
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (r *CategoryRepository) FindAll() ([]models.Category, error) {
	var cats []models.Category
	err := r.db.Find(&cats).Error
	return cats, err
}
