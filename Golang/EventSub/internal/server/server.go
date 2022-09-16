package server

import (
	"context"
	"net/http"
	"time"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/assert"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/config"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

type Server struct {
	ctx context.Context
	
	redis redis.Instance

	http *http.Server
	router *mux.Router

	config *config.Config
	externalURL string

	secret string

	eventsub *twitch.EventSub
}

func NewServer(url string, cfg *config.Config) *Server {
	ctx := context.Background()
	
	mux := mux.NewRouter().StrictSlash(true)

	httpServer := &http.Server{
		Addr:   url,
		Handler: mux,
		ReadTimeout: 10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	redis, err := redis.Create(ctx, cfg.EventSub.Redis)
	assert.ErrAssert(err)
		
	apptoken, _ := redis.Get(ctx, "apptoken")
	
	if apptoken == "" {
		log.Warn("No app token found, run Melonbot to load it")
	}

	sub := twitch.NewEventSub(cfg)

	server := &Server{
		ctx: ctx,
		config: cfg,
		http: httpServer,
		router: mux,
		redis: redis,
		externalURL: url,
		secret: string(cfg.EventSub.Secret),
		eventsub: sub,
	}
	
	registerEvents(server)
	registerRoutes(server)
	return server
}

func (s *Server) Start(ctx context.Context, cn twitch.Connect_t) {
	err := redis.PublishJSON(s.redis, ctx, "EventSub", cn)

	assert.ErrAssert(err)
	
	// if err := s.redis.Publish(context.Background(), "connect", cn); err != nil {
	// 	log.Error("Error publishing to redis: ", err)
	// }

	log.Info("Starting server on -> ", s.externalURL)
	log.Fatal(s.http.ListenAndServe())
}

