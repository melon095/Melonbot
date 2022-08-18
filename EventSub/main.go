package main

import (
	"flag"
	"fmt"

	twitch "github.com/JoachimFlottorp/Melonbot/EventSub/pkg/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/EventSub/pkg/config"
	"github.com/JoachimFlottorp/Melonbot/EventSub/pkg/server"
)

var (
	cfg = flag.String("config", "./../config.json", "config file")
	loglevel = flag.String("loglevel", config.LogLevelDebug, "log level")
	port = flag.String("port", "3000", "port")
)

const (
	ip = "127.0.0.1"

	version = "EventSub -- 0.0.1"
)

func main() {
	flags := commandFlags()
	
	url := fmt.Sprintf("%s:%s", ip, *port)
	
	server := server.NewServer(url, config.New(flags.ConfigFile, flags.LogLevel))

	c := twitch.Connect_t{Version: version}

	server.Start(c)
}

type termFlags struct {
	ConfigFile string;
	LogLevel   string;
}

func commandFlags() *termFlags {
	flag.Parse()
	
	if cfg == nil {
		panic("config flag is required")
	}

	return &termFlags{
		ConfigFile: *cfg,
		LogLevel:   *loglevel,
	}
}