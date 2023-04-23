package config

import (
	"encoding/json"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type Config struct {
	Twitch TwitchConfig `json:"Twitch"`
	SQL    struct {
		Address string `json:"Address"`
	} `json:"SQL"`
	Verified    bool   `json:"Verified"`
	Prefix      string `json:"Prefix"`
	BotUsername string `json:"BotUsername"`
	Redis       struct {
		Address string `json:"Address"`
	}
	// Services is an array where key might be "EventSub", "Firehose", "Website"
	Services ServicesConfig `json:"Services"`
}

type TwitchConfig struct {
	OAuth        string `json:"OAuth"`
	ClientSecret string `json:"ClientSecret"`
	ClientID     string `json:"ClientID"`
}

type SQLConfig struct {
	Address string `json:"Address"`
}

type ServicesConfig struct {
	EventSub struct {
		PublicUrl string `json:"PublicUrl"`
		Secret    string `json:"Secret"`
	} `json:"EventSub"`
	Firehose struct {
		Port       int `json:"Port"`
		HealthPort int `json:"HealthPort"`
	} `json:"Firehose"`
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

func ReadConfig(path string, debug bool) (*Config, error) {
	fileDesc, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	var config Config

	err = json.NewDecoder(fileDesc).Decode(&config)
	if err != nil {
		return nil, err
	}

	global, err := createLogConfig(debug).Build()
	if err != nil {
		return nil, err
	}

	zap.ReplaceGlobals(global)

	return &config, nil
}
