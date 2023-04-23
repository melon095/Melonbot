package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/JoachimFlottorp/GoCommon/assert"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/cmd/EventSub/twitch_eventsub"
	gorm_log "github.com/JoachimFlottorp/Melonbot/Golang/internal/gorm_log"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/redis"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Table contains a list of message ids that has been handled.
type Table struct {
	gorm.Model

	MessageID string `gorm:"uniqueIndex"`
}

const SQLITE_DATABASE = "db/eventsub.db"

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

	eventsub *twitch.EventSub
	sql      *gorm.DB
}

func NewServer(ctx context.Context, cfg *config.Config) (*Server, error) {
	redis, err := redis.Create(ctx, cfg.Redis.Address)
	assert.Error(err)

	apptoken, _ := redis.Get(ctx, "apptoken")

	if apptoken == "" {
		zap.S().Panic("No app token found, run Melonbot to load it")
	}

	db, err := gorm.Open(sqlite.Open(SQLITE_DATABASE), &gorm.Config{
		Logger: gorm_log.GormZapLogger(zap.S().Named("gorm")),
	})

	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&Table{}); err != nil {
		return nil, err
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
		eventsub: &twitch.EventSub{},
		sql:      db,
	}

	server.eventsub.OnChannelFollowEvent(server.onFollow)
	server.eventsub.OnStreamLiveEvent(server.onStreamLive)
	server.eventsub.OnStreamOfflineEvent(server.onStreamOffline)
	server.eventsub.OnChannelUpdateEvent(server.onChannelUpdate)

	return server, nil
}

func (s *Server) Start(ctx context.Context, cn twitch.Connect_t, port int) error {
	go func() {
		<-s.ctx.Done()

		s.app.Shutdown()
	}()

	s.app.Use(logger.New(logger.Config{
		Format: "${time} ${status} - ${latency} ${method} ${path}",
		Output: ZapWriter{zap.S()},
	}))

	s.app.Get("/", s.indexRoute)
	s.app.Post("/eventsub", s.eventsubRoute)

	err := s.redis.Publish(ctx, redis.PubKeyEventSub, cn)

	assert.Error(err, "failed to publish connect message")

	zap.S().Infof("Starting server on -> %s", s.config.Services.EventSub.PublicUrl)

	return s.app.Listen(fmt.Sprintf("0.0.0.0:%d", port))
}

func (s *Server) indexRoute(c *fiber.Ctx) error {
	return c.SendString(":)")
}

func (s *Server) eventsubRoute(c *fiber.Ctx) error {
	if strings.ToLower(c.Get(fiber.HeaderContentType)) != "application/json" || c.Body() == nil {
		return c.SendStatus(http.StatusBadRequest)
	}

	header := twitch.NewHeaders(c.GetReqHeaders())

	validate, err := twitch.ValidateHMAC(header, c.Body(), s.config.Services.EventSub.Secret)

	if err != nil || !validate {
		zap.S().Warnw("Received an invalid HMAC", "error", err)
		return c.SendStatus(http.StatusForbidden)
	}

	var notification twitch.EventSubNotificaton
	err = c.BodyParser(&notification)
	if err != nil {
		zap.S().Warn("Received an invalid JSON", err)
		return c.SendStatus(http.StatusInternalServerError)
	}

	// Twitch-Eventsub-Message-Type: webhook_callback_verification
	if notification.Challenge != "" {
		zap.S().Debug("Received verification event")
		return c.SendString(notification.Challenge)
	}
	c.Status(http.StatusNoContent)

	row := &Table{
		MessageID: header.ID,
	}
	currentRow := s.sql.WithContext(c.Context()).Where(row).FirstOrCreate(row)

	zap.S().Debugf("Current row: %d", currentRow.RowsAffected)

	if currentRow.Error != nil && !errors.Is(currentRow.Error, gorm.ErrRecordNotFound) {
		zap.S().Warnf("Failed to query database: %w", currentRow.Error)
		return nil
	}

	if currentRow.RowsAffected < 1 {
		n, _ := json.MarshalIndent(notification, "", "  ")
		zap.S().Debugf("Received a duplicate event %s | %s", header.ID, string(n))
		return nil
	}

	switch c.Get(twitch.EventSubMessageType) {
	case twitch.MessageTypeNotification:
		{
			zap.S().Debugw("Received notification event", "type", notification.Subscription.Type, "event", notification.Event, "id", header.ID)
			s.eventsub.HandleEventsubNotification(c.Context(), &notification)
			break
		}
	case twitch.MessageTypeRevocation:
		{
			zap.S().Debug("Received revocation event")

			reason := notification.Subscription.Status
			status := notification.Subscription.Type
			switch reason {

			case twitch.RevocationUserRemoved:
				{
					zap.S().Warn("User in subscription has been removed / banned")
				}
			case twitch.RevocationAuthRevoked:
				{
					zap.S().Warn("The user revoked the authorization token or simply changed their password")
				}
			case twitch.RevocationFailures:
				{
					zap.S().Warn("The callback failed to respond in a timely manner too many times")
				}
			default:
				{
					break
				}
			}
			zap.S().Warnw("Revocation", "Reason", reason, "Status", status)
			break
		}
	default:
		{
			zap.S().Warnw("Received an unknown event")
			break
		}
	}

	return nil
}

func (s *Server) send(ctx context.Context, event redis.PubJSON) {
	if err := s.redis.Publish(ctx, redis.PubKeyEventSub, event); err != nil {
		zap.S().Error("Error publishing to redis: ", err)
	}
}

func (s *Server) onFollow(ctx context.Context, event twitch.EventSubChannelFollowEvent) {
	zap.S().Infof("FollowEvent %v", event)

	s.send(ctx, event)
}

func (s *Server) onStreamLive(ctx context.Context, event twitch.EventSubStreamOnlineEvent) {
	zap.S().Infof("StreamLiveEvent %v", event)

	s.send(ctx, event)
}

func (s *Server) onStreamOffline(ctx context.Context, event twitch.EventSubStreamOfflineEvent) {
	zap.S().Infof("StreamOfflineEvent %v", event)

	s.send(ctx, event)
}

func (s *Server) onChannelUpdate(ctx context.Context, event twitch.EventSubChannelUpdateEvent) {
	zap.S().Infof("ChannelUpdateEvent %v", event)

	channel := event.BroadcasterUserID
	currentTitle, err := s.redis.Get(ctx, redis.Key(fmt.Sprintf("channel:%s:title", channel)))
	keyNotExist := errors.Is(err, redis.Nil)
	if err != nil && !keyNotExist {
		zap.S().Errorf("Error getting current title: %w", err)
		return
	} else if keyNotExist {
		// TODO: Is this needed.
		currentTitle = ""
	}

	if currentTitle == event.Title {
		zap.S().Debugw("Title is the same, ignoring", "channel", channel, "title", event.Title)
		return
	}

	zap.S().Debugw("Title is different, updating", "channel", channel, "title", event.Title)

	if err := s.redis.Set(ctx, redis.Key(fmt.Sprintf("channel:%s:title", channel)), event.Title); err != nil {
		zap.S().Errorf("Error setting current title: %w", err)
		return
	}

	s.send(ctx, event)
}
