package server

import (
	"context"
	"net/http"
	"time"

	rds "github.com/JoachimFlottorp/Melonbot/EventSub/pkg/Providers/Redis"
	twitch "github.com/JoachimFlottorp/Melonbot/EventSub/pkg/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/EventSub/pkg/config"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

type Server struct {
	redis *rds.RedisProvider

	http *http.Server
	router *mux.Router

	config *config.Config
	externalURL string

	secret string

	eventsub *twitch.EventSub

	// TODO implement this better
	notification_id string
}

func NewServer(url string, cfg *config.Config) *Server {
	mux := mux.NewRouter().StrictSlash(true)

	httpServer := &http.Server{
		Addr:   url,
		Handler: mux,
		ReadTimeout: 10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	redis := rds.New(cfg)
		
	apptoken, _ := redis.SGet(context.Background(), "AppToken")
	
	if apptoken == "" {
		log.Warn("No app token found, run Melonbot to load it")
	}

	sub := twitch.NewEventSub(cfg)

	server := &Server{
		config: cfg,
		http: httpServer,
		router: mux,
		redis: redis,
		externalURL: url,
		secret: string(cfg.EventSub.Secret),
		eventsub: sub,
		notification_id: "",
	}
	
	registerEvents(server)
	registerRoutes(server)
	return server
}

func (s *Server) LatestID() string {
	return s.notification_id
}

func (s *Server) SetID(id string) {
	s.notification_id = id
}

func (s *Server) Start(cn twitch.Connect_t) {
	if err := s.redis.Publish(context.Background(), "connect", cn); err != nil {
		log.Error("Error publishing to redis: ", err)
	}

	log.Info("Starting server on -> ", s.externalURL)
	log.Fatal(s.http.ListenAndServe())
}

