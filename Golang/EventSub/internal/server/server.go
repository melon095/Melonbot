package server

import (
	"context"
	"net/http"
	"time"

	"github.com/JoachimFlottorp/GoCommon/assert"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/config"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
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
	assert.Error(err)
		
	apptoken, _ := redis.Get(ctx, "apptoken")
	
	if apptoken == "" {
		zap.S().Panic("No app token found, run Melonbot to load it")
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

func (s *Server) Start(ctx context.Context, cn twitch.Connect_t) chan struct{} {
	done := make(chan struct{})
	
	err := s.redis.Publish(ctx, "EventSub", cn)

	assert.Error(err, "failed to publish connect message")

	zap.S().Infof("Starting server on -> %s", s.externalURL)

	go func() {
		err := s.http.ListenAndServe()
		assert.Error(err, "failed to start server")
	}()
	
	go func() {
		<-ctx.Done()
		
		close(done)
	}()

	return done
}

