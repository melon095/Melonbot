package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/config"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/server"
	"go.uber.org/zap"
)

var (
	cfg   = flag.String("config", "./../../config.json", "config file")
	debug = flag.Bool("debug", false, "debug mode")
	port  = flag.Int("port", 3000, "port")
)

const (
	version = "EventSub -- 0.1.0"
)

func init() {
	flag.Parse()

	if cfg == nil {
		panic("config flag is required")
	}
}

func main() {
	conf, err := config.ReadConfig(*cfg, *debug)
	if err != nil {
		zap.S().Fatal(err)
	}
	conf.Port = *port

	validateConfig(conf)

	doneSig := make(chan os.Signal, 1)
	signal.Notify(doneSig, syscall.SIGINT, syscall.SIGTERM)

	gCtx, cancel := context.WithCancel(context.Background())

	wg := sync.WaitGroup{}

	done := make(chan any)

	go func() {
		<-doneSig
		cancel()

		go func() {
			select {
			case <-time.After(10 * time.Second):
			case <-doneSig:
			}
			zap.S().Fatal("Forced to shutdown, because the shutdown took too long")
		}()

		zap.S().Info("Shutting down")

		wg.Wait()

		zap.S().Info("Shutdown complete")
		close(done)
	}()

	wg.Add(1)

	go func() {
		defer wg.Done()

		server := server.NewServer(gCtx, conf)

		c := twitch.Connect_t{Version: version}

		if err := server.Start(gCtx, c); err != nil {
			zap.S().Fatal(err)
		}
	}()

	zap.S().Info("Ready!")

	<-done

	zap.S().Info("Shutting down")

	os.Exit(0)
}

func validateConfig(conf *config.Config) {
	if conf.EventSub.PublicUrl == "" {
		zap.S().Fatal("EventSub public url is required")
	}

	if !strings.Contains(conf.EventSub.PublicUrl, "https://") {
		zap.S().Fatal("EventSub public url must be https")
	}
}
