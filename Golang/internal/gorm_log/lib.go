package gorm_log

import (
	"context"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm/logger"
)

type GormLogger struct {
	*zap.SugaredLogger
}

func (g *GormLogger) LogMode(level logger.LogLevel) logger.Interface {
	return g
}

func (g *GormLogger) Info(ctx context.Context, format string, args ...interface{}) {
	g.SugaredLogger.Infof(format, args...)
}

func (g *GormLogger) Warn(ctx context.Context, format string, args ...interface{}) {
	g.SugaredLogger.Warnf(format, args...)
}

func (g *GormLogger) Error(ctx context.Context, format string, args ...interface{}) {
	g.SugaredLogger.Errorf(format, args...)
}

func (g *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	// Anoying...

	// elapsed := time.Since(begin)
	// sql, rowsAffected := fc()
	// if err != nil {
	// 	g.Errorf("gorm trace error: %v", err)
	// } else {
	// 	g.Infof("gorm trace: %s, %d, %s", sql, rowsAffected, elapsed)
	// }
}

func GormZapLogger(zap *zap.SugaredLogger) logger.Interface {
	return &GormLogger{zap}
}
