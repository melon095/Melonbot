package config

import (
	"os"
	"time"

	log "github.com/sirupsen/logrus"
)

func InitLogger(loglevel string) {
	log.SetFormatter(&log.TextFormatter{
		ForceColors: true,
		FullTimestamp: true,
		TimestampFormat: time.RFC3339,
	})

	log.SetOutput(os.Stdout)
	
	if lvl, err := log.ParseLevel(loglevel); err == nil {
		log.SetLevel(lvl)
		if lvl >= log.DebugLevel {
			log.SetReportCaller(true)
		}
	}
}