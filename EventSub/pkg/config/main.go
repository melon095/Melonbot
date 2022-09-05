package config

import (
	"encoding/json"
	"os"
	"strings"

	"github.com/JoachimFlottorp/Melonbot/EventSub/pkg/util"
	log "github.com/sirupsen/logrus"
)

type Config struct {
	LogLevel string
	Port int
	
	Twitch   struct {
		ClientSecret string `json:"ClientSecret"`
		ClientID string `json:"ClientID"`
	} `json:"Twitch"`
	
	EventSub struct {
		PublicUrl string `json:"PublicUrl"`
		Secret string `json:"Secret"`
		Redis struct {
			Address string `json:"Address"`
			Username string `json:"Username"`
			Password string `json:"Password"`
			Database int `json:"Database"`
		} `json:"Redis"`
	} `json:"EventSub"`
}

const (
	LogLevelDebug = "debug"
	LogLevelInfo  = "info"
	LogLevelWarn  = "warn"
	LogLevelError = "error"
	LogLevelFatal = "fatal"
)

func New(configfile, loglevel string) *Config {
	InitLogger(loglevel)

	config := getConfig(configfile)

	config.LogLevel = loglevel

	return config
}

func getConfig(location string) *Config {
	
	var config Config

	_, err := os.Stat(location)
	util.Validate(err)

	file, err := os.Open(location)
	util.Validate(err)
	defer file.Close()

	jsonParsed := json.NewDecoder(file)
	err = jsonParsed.Decode(&config)
	util.Validate(err)

	if config.EventSub.PublicUrl == "" {
		log.Fatal("EventSub public url is required")
	}

	if !strings.Contains(config.EventSub.PublicUrl, "https://") {
		log.Fatal("EventSub public url must be https")
	}
	
	return &config
}