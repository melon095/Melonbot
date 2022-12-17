package eventsub

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/utils"
	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/router"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const SQLITE_DATABASE = "db/eventsub.db"

// Table contains a list of message ids that has been handled.
type Table struct {
	gorm.Model

	MessageID string `gorm:"uniqueIndex"`
}

type EventSubRoute struct {
	gCtx     context.Context
	Secret   string
	Redis    redis.Instance
	Log      *zap.SugaredLogger
	Eventsub *twitch.EventSub
	SQL      *gorm.DB
}

func New(deps *router.DependencyList) (router.Route, error) {
	route := &EventSubRoute{
		gCtx:     deps.Ctx,
		Secret:   deps.Config.EventSub.Secret,
		Redis:    deps.Redis,
		Log:      zap.S().With("Route", "/eventsub"),
		Eventsub: &twitch.EventSub{},
	}

	route.Eventsub.OnChannelFollowEvent(route.onFollow)
	route.Eventsub.OnStreamLiveEvent(route.onStreamLive)
	route.Eventsub.OnStreamOfflineEvent(route.onStreamOffline)
	route.Eventsub.OnChannelUpdateEvent(route.onChannelUpdate)

	db, err := gorm.Open(sqlite.Open(SQLITE_DATABASE), &gorm.Config{
		Logger: utils.GormZapLogger(route.Log),
	})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&Table{}); err != nil {
		return nil, err
	}

	route.SQL = db

	return route, nil
}

func (r *EventSubRoute) Configure() router.RouteConfig {
	return router.RouteConfig{
		URI: "/eventsub",
		Method: []string{
			http.MethodPost,
		},
	}
}

func (r *EventSubRoute) Handler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if strings.ToLower(c.Get(fiber.HeaderContentType)) != "application/json" || c.Body() == nil {
			return c.SendStatus(http.StatusBadRequest)
		}

		header := twitch.NewHeaders(c.GetReqHeaders())

		validate, err := twitch.ValidateHMAC(header, c.Body(), r.Secret)

		if err != nil || !validate {
			r.Log.Warnw("Received an invalid HMAC", "error", err)
			return c.SendStatus(http.StatusForbidden)
		}

		var notification twitch.EventSubNotificaton
		err = c.BodyParser(&notification)
		if err != nil {
			r.Log.Warn("Received an invalid JSON", err)
			return c.SendStatus(http.StatusInternalServerError)
		}

		// Twitch-Eventsub-Message-Type: webhook_callback_verification
		if notification.Challenge != "" {
			r.Log.Debug("Received verification event")
			return c.SendString(notification.Challenge)
		}
		c.Status(http.StatusNoContent)

		row := &Table{
			MessageID: header.ID,
		}
		currentRow := r.SQL.WithContext(c.Context()).Where(row).FirstOrCreate(row)

		r.Log.Debugf("Current row: %d", currentRow.RowsAffected)

		if currentRow.Error != nil && !errors.Is(currentRow.Error, gorm.ErrRecordNotFound) {
			r.Log.Warnf("Failed to query database: %w", currentRow.Error)
			return nil
		}

		if currentRow.RowsAffected < 1 {
			n, _ := json.MarshalIndent(notification, "", "  ")
			r.Log.Debugf("Received a duplicate event %s | %s", header.ID, string(n))
			return nil
		}

		switch c.Get(twitch.EventSubMessageType) {
		case twitch.MessageTypeNotification:
			{
				r.Log.Debugw("Received notification event", "type", notification.Subscription.Type, "event", notification.Event, "id", header.ID)
				r.Eventsub.HandleEventsubNotification(r.gCtx, &notification)
				break
			}
		case twitch.MessageTypeRevocation:
			{
				r.Log.Debug("Received revocation event")

				reason := notification.Subscription.Status
				status := notification.Subscription.Type
				switch reason {

				case twitch.RevocationUserRemoved:
					{
						r.Log.Warn("User in subscription has been removed / banned")
					}
				case twitch.RevocationAuthRevoked:
					{
						r.Log.Warn("The user revoked the authorization token or simply changed their password")
					}
				case twitch.RevocationFailures:
					{
						r.Log.Warn("The callback failed to respond in a timely manner too many times")
					}
				default:
					{
						break
					}
				}
				r.Log.Warnw("Revocation", "Reason", reason, "Status", status)
				break
			}
		default:
			{
				r.Log.Warnw("Received an unknown event")
				break
			}
		}

		return nil
	}
}

func (r *EventSubRoute) send(ctx context.Context, event redis.PubJSON) {
	if err := r.Redis.Publish(ctx, redis.PubKeyEventSub, event); err != nil {
		r.Log.Error("Error publishing to redis: ", err)
	}
}

func (r *EventSubRoute) onFollow(ctx context.Context, event twitch.EventSubChannelFollowEvent) {
	r.Log.Infof("FollowEvent %v", event)

	r.send(ctx, event)
}

func (r *EventSubRoute) onStreamLive(ctx context.Context, event twitch.EventSubStreamOnlineEvent) {
	r.Log.Infof("StreamLiveEvent %v", event)

	r.send(ctx, event)
}

func (r *EventSubRoute) onStreamOffline(ctx context.Context, event twitch.EventSubStreamOfflineEvent) {
	r.Log.Infof("StreamOfflineEvent %v", event)

	r.send(ctx, event)
}

func (r *EventSubRoute) onChannelUpdate(ctx context.Context, event twitch.EventSubChannelUpdateEvent) {
	r.Log.Infof("ChannelUpdateEvent %v", event)

	channel := event.BroadcasterUserID
	currentTitle, err := r.Redis.Get(ctx, redis.Key(fmt.Sprintf("channel:%s:title", channel)))
	keyNotExist := errors.Is(err, redis.Nil)
	if err != nil && !keyNotExist {
		r.Log.Errorf("Error getting current title: %w", err)
		return
	} else if keyNotExist {
		// TODO: Is this needed.
		currentTitle = ""
	}

	if currentTitle == event.Title {
		r.Log.Debugw("Title is the same, ignoring", "channel", channel, "title", event.Title)
		return
	}

	r.Log.Debugw("Title is different, updating", "channel", channel, "title", event.Title)

	if err := r.Redis.Set(ctx, redis.Key(fmt.Sprintf("channel:%s:title", channel)), event.Title); err != nil {
		r.Log.Errorf("Error setting current title: %w", err)
		return
	}

	r.send(ctx, event)
}
