package main

import (
	"context"
	"flag"
	"fmt"
	"strings"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/assert"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/env"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/helper"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/log"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/server"
)

var (
	cfg = flag.String("config", "./../../config.json", "config file")
	loglevel = flag.String("loglevel", log.LogLevel.String(log.LevelDebug), "log level")
	port = flag.String("port", "3000", "port")
)

const (
	ip = "127.0.0.1"

	version = "EventSub -- 0.0.2"
)

func init() {
	env.Load()
	flag.Parse()

	log.New(log.IntoLogLevel(*loglevel))
	
	if cfg == nil {
		panic("config flag is required")
	}
}

func main() {
	ctx := context.Background()

	file, err := helper.ReadFile(*cfg)
	assert.ErrAssert(err)
	
	conf, err := helper.DeserializeStruct[config.Config](file)
	assert.ErrAssert(err)

	validateConfig(conf)
	
	url := fmt.Sprintf("%s:%s", ip, *port)
	
	server := server.NewServer(url, conf)

	c := twitch.Connect_t{Version: version}

	server.Start(ctx, c)
}

func validateConfig(conf *config.Config) {
	if conf.EventSub.PublicUrl == "" {
		log.Get().Fatal("EventSub public url is required")
	}

	if !strings.Contains(conf.EventSub.PublicUrl, "https://") {
		log.Get().Fatal("EventSub public url must be https")
	}
}