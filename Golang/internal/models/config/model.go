package config

import (
	"encoding/json"
	"flag"
	"os"

	"github.com/JoachimFlottorp/Melonbot/Golang/internal/redis"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	cfg   = flag.String("config", "./../config.json", "config file")
	debug = flag.Bool("debug", false, "debug mode")
)

func init() {
	flag.Parse()
}

type Config struct {
	Port     int
	Twitch   TwitchConfig   `json:"Twitch"`
	EventSub EventSubConfig `json:"EventSub"`
}

type TwitchConfig struct {
	ClientSecret string `json:"ClientSecret"`
	ClientID     string `json:"ClientID"`
}

type EventSubConfig struct {
	PublicUrl string        `json:"PublicUrl"`
	Secret    string        `json:"Secret"`
	Redis     redis.Options `json:"Redis"`
}

func createLogConfig(isDebug bool) *zap.Config {
	config := &zap.Config{
		Encoding:         "console",
		EncoderConfig:    zap.NewProductionEncoderConfig(),
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	if isDebug {
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	} else {
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	}

	return config
}

func ReadConfig() (*Config, error) {
	fileDesc, err := os.Open(*cfg)
	if err != nil {
		return nil, err
	}
	var config Config

	err = json.NewDecoder(fileDesc).Decode(&config)
	if err != nil {
		return nil, err
	}

	global, err := createLogConfig(*debug).Build()
	if err != nil {
		return nil, err
	}

	zap.ReplaceGlobals(global)

	return &config, nil
}
