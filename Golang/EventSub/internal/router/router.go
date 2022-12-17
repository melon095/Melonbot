package router

import (
	"context"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	"github.com/gofiber/fiber/v2"
)

type DependencyList struct {
	Ctx    context.Context
	Config *config.Config
	Redis  redis.Instance
}

type RouteInitializerFunc func(*DependencyList) (Route, error)
type MiddlewareInitializerFunc func(*DependencyList) Middleware

type RouteConfig struct {
	URI        string
	Method     []string
	Middleware []Middleware
	Children   []RouteInitializerFunc
}

type Route interface {
	Configure() RouteConfig
	Handler() fiber.Handler
}

type Middleware interface {
	Handler(*fiber.Ctx) error
}
