package routes

import (
	"context"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/router"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/routes/eventsub"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type IndexRoute struct {
	gCtx   context.Context
	log    *zap.SugaredLogger
	config *config.Config
	redis  redis.Instance
}

func NewIndexRoute(deps *router.DependencyList) (router.Route, error) {
	return &IndexRoute{
		gCtx:   deps.Ctx,
		log:    zap.S().With("Route", "/"),
		config: deps.Config,
		redis:  deps.Redis,
	}, nil
}

func (r *IndexRoute) Configure() router.RouteConfig {
	return router.RouteConfig{
		URI: "/",
		Method: []string{
			"GET",
		},
		Children: []router.RouteInitializerFunc{
			eventsub.New,
		},
	}
}

func (r *IndexRoute) Handler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.SendString(":)")
	}
}
