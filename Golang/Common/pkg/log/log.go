package log

import (
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

var g_log = logrus.New()

type LogLevel string

const (
	LevelDebug LogLevel = "debug"
	LevelInfo  LogLevel = "info"
	LevelWarn  LogLevel = "warn"
	LevelError LogLevel = "error"
	LevelFatal LogLevel = "fatal"
)

func (l LogLevel) String() string {
	return string(l)
}

func IntoLogLevel(s string) LogLevel {
	return LogLevel(s)
}

func New(level LogLevel) {
	g_log.SetFormatter(&logrus.TextFormatter{
		ForceColors:   true,
		FullTimestamp: true,
		TimestampFormat: time.RFC3339,
	})

	g_log.SetOutput(os.Stdout)

	if lvl, err := logrus.ParseLevel(string(level)); err == nil {
		g_log.SetLevel(lvl)
		if lvl >= logrus.DebugLevel {
			g_log.SetReportCaller(true)
		}
	}
}

func Get() *logrus.Logger {
	return g_log
}