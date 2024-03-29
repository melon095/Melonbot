package main

import (
	"context"
	"flag"
	"strings"

	"github.com/JoachimFlottorp/Melonbot/Golang/cmd/EventSub/server"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/cmd/EventSub/twitch_eventsub"
	applicationwrapper "github.com/JoachimFlottorp/Melonbot/Golang/internal/application_wrapper"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/config"
	"go.uber.org/zap"
)

const (
	version = "EventSub -- 0.1.0"
)

func init() {
	flag.Parse()
}

func main() {
	conf, err := config.ReadConfig()
	if err != nil {
		panic(err)
	}

	validateConfig(conf)

	gCtx, cancel := context.WithCancel(context.Background())

	done := applicationwrapper.NewWrapper(gCtx, cancel)

	done.Execute(func(ctx context.Context) {
		server, err := server.NewServer(gCtx, conf)
		if err != nil {
			zap.S().Fatal(err)
		}

		c := twitch.Connect_t{Version: version}

		if err := server.Start(gCtx, c, conf.Services.EventSub.Port); err != nil {
			zap.S().Fatal(err)
		}
	})
}

func validateConfig(conf *config.Config) {
	if conf.Services.EventSub.PublicUrl == "" {
		zap.S().Fatal("EventSub public url is required")
	}

	if !strings.HasPrefix(conf.Services.EventSub.PublicUrl, "https://") {
		zap.S().Fatal("EventSub public url must be https")
	}
}
