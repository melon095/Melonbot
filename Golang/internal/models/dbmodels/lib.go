package dbmodels

import (
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/gorm_log"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func CreateGormPostgres(address string) (*gorm.DB, error) {
	return gorm.Open(
		postgres.Open(address),
		&gorm.Config{
			Logger: gorm_log.GormZapLogger(zap.S().Named("postgres_gorm")),
		},
	)
}
