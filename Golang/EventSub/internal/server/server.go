package server

import (
	"context"
	"fmt"
	"time"

	"github.com/JoachimFlottorp/GoCommon/assert"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/router"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"go.uber.org/zap"
)

type ZapWriter struct {
	*zap.SugaredLogger
}

func (w ZapWriter) Write(p []byte) (n int, err error) {
	w.Infof("%s", p)

	return len(p), nil
}

type Server struct {
	ctx context.Context

	redis redis.Instance
	app   *fiber.App

	config *config.Config
}

func NewServer(ctx context.Context, cfg *config.Config) *Server {
	redis, err := redis.Create(ctx, cfg.EventSub.Redis)
	assert.Error(err)

	apptoken, _ := redis.Get(ctx, "apptoken")

	if apptoken == "" {
		zap.S().Panic("No app token found, run Melonbot to load it")
	}

	server := &Server{
		ctx:    ctx,
		config: cfg,
		redis:  redis,
		app: fiber.New(fiber.Config{
			PassLocalsToViews: true,
			ReadTimeout:       10 * time.Second,
			WriteTimeout:      30 * time.Second,
		}),
	}

	return server
}

func (s *Server) Start(ctx context.Context, cn twitch.Connect_t) error {
	go func() {
		<-s.ctx.Done()

		s.app.Shutdown()
	}()

	s.app.Use(logger.New(logger.Config{
		Format: "${time} ${status} - ${latency} ${method} ${path}",
		Output: ZapWriter{zap.S()},
	}))

	{
		deps := router.DependencyList{
			Ctx:    s.ctx,
			Redis:  s.redis,
			Config: s.config,
		}

		route, err := routes.NewIndexRoute(&deps)
		if err != nil {
			zap.S().Errorf("failed to create route: %v", err)

			return err
		}

		if err := s.setupRoutes(route, s.app, ""); err != nil {
			zap.S().Errorf("failed to setup routes: %v", err)

			return err
		}
	}

	err := s.redis.Publish(ctx, redis.PubKeyEventSub, cn)

	assert.Error(err, "failed to publish connect message")

	zap.S().Infof("Starting server on -> %s", s.config.EventSub.PublicUrl)

	return s.app.Listen(fmt.Sprintf("0.0.0.0:%d", s.config.Port))
}

func (s *Server) setupRoutes(route router.Route, parent fiber.Router, parentName string) error {
	routeConfig := route.Configure()

	routeGroup := parent.Group(routeConfig.URI)

	handler := route.Handler()

	routeName := parentName + routeConfig.URI

	if len(routeName) > 1 && routeName[0] == '/' {
		routeName = routeName[1:]
	}

	for _, method := range routeConfig.Method {
		routeGroup.Add(method, "", handler)
		routeGroup.Add(method, "/", handler)
		zap.S().Infof("Registered route %s %s", method, routeName)
	}

	for _, routeChildren := range routeConfig.Children {
		deps := &router.DependencyList{
			Ctx:    s.ctx,
			Redis:  s.redis,
			Config: s.config,
		}

		if childrenRouteConfig, err := routeChildren(deps); err != nil {
			return err
		} else {
			if err := s.setupRoutes(childrenRouteConfig, routeGroup, routeName); err != nil {
				return err
			}
		}
	}

	return nil
}
