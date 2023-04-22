package main

import (
	"context"
	"flag"

	applicationwrapper "github.com/JoachimFlottorp/Melonbot/Golang/internal/application_wrapper"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/config"
	"go.uber.org/zap"
)

var (
	port  = flag.Int("port", 3000, "port")
	cfg   = flag.String("config", "./../config.json", "config file")
	debug = flag.Bool("debug", false, "debug mode")
)

func main() {
	conf, err := config.ReadConfig(*cfg, *debug)
	if err != nil {
		panic(err)
	}

	gCtx, cancel := context.WithCancel(context.Background())

	done := applicationwrapper.NewWrapper(gCtx, cancel)

	done.Execute(func(ctx context.Context) {
		zap.S().Infof("Config: %v", conf)
	})
}
