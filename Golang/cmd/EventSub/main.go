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

	"github.com/JoachimFlottorp/Melonbot/Golang/cmd/EventSub/server"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/cmd/EventSub/twitch_eventsub"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/config"
	"go.uber.org/zap"
)

var (
	port = flag.Int("port", 3000, "port")
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

		server, err := server.NewServer(gCtx, conf)
		if err != nil {
			zap.S().Fatal(err)
		}

		c := twitch.Connect_t{Version: version}

		if err := server.Start(gCtx, c); err != nil {
			zap.S().Fatal(err)
		}
	}()

	zap.S().Info("Ready!")

	<-done

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
