package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/JoachimFlottorp/GoCommon/assert"
	"github.com/JoachimFlottorp/GoCommon/helper/json"
	"github.com/JoachimFlottorp/GoCommon/log"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/server"
	"go.uber.org/zap"
)

var (
	cfg 	= flag.String("config", "./../../config.json", "config file")
	debug 	= flag.Bool("debug", false, "debug mode")
	port 	= flag.String("port", "3000", "port")
)

const (
	ip = "127.0.0.1"

	version = "EventSub -- 0.0.2"
)

func init() {
	flag.Parse()

	if *debug {
		log.InitLogger(zap.NewDevelopmentConfig())
	} else {
		log.InitLogger(zap.NewProductionConfig())
	}
	
	if cfg == nil {
		panic("config flag is required")
	}
}

func main() {
	file, err := os.OpenFile(*cfg, os.O_RDONLY, 0)
	assert.Error(err)

	defer file.Close()
	
	conf, err := json.DeserializeStruct[config.Config](file)
	assert.Error(err, "failed to deserialize config")

	validateConfig(conf)
	
	url := fmt.Sprintf("%s:%s", ip, *port)
	
	server := server.NewServer(url, conf)

	c := twitch.Connect_t{Version: version}

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	
	ctx, cancel := context.WithCancel(context.Background())
	
	var serverDone <-chan struct{}
	done := make(chan struct{})

	go func() {
		<-sig
		cancel()
		if serverDone != nil {
			<-serverDone
		}

		close(done)
	}()


	serverDone = server.Start(ctx, c)

	<-done
	
	zap.S().Info("Shutting down")
}

func validateConfig(conf *config.Config) {
	if conf.EventSub.PublicUrl == "" {
		zap.S().Fatal("EventSub public url is required")
	}

	if !strings.Contains(conf.EventSub.PublicUrl, "https://") {
		zap.S().Fatal("EventSub public url must be https")
	}
}