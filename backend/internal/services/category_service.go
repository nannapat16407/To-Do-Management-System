package services

import (
	"errors"

	"backend/internal/models"
	"backend/internal/repositories"
)

type CategoryService struct {
	catRepo *repositories.CategoryRepository
}

func NewCategoryService(catRepo *repositories.CategoryRepository) *CategoryService {
	return &CategoryService{catRepo: catRepo}
}

func (s *CategoryService) Create(req *models.CreateCategoryRequest, userID uint) (*models.Category, error) {
	cat := &models.Category{
		Name:      req.Name,
		CreatedBy: userID,
	}
	if err := s.catRepo.Create(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *CategoryService) Update(id uint, req *models.UpdateCategoryRequest) (*models.Category, error) {
	cat, err := s.catRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("category not found")
	}
	if req.Name != nil {
		cat.Name = *req.Name
	}
	if err := s.catRepo.Update(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *CategoryService) Delete(id uint) error {
	return s.catRepo.Delete(id)
}

func (s *CategoryService) GetAll() ([]models.Category, error) {
	return s.catRepo.FindAll()
}
