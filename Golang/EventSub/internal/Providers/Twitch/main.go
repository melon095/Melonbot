package twitch

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	twitch "github.com/JoachimFlottorp/Melonbot/Golang/Common/models/twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	"github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/config"
	"github.com/nicklaw5/helix"
	log "github.com/sirupsen/logrus"
)

const (
	TwitchEventsubMessageID 			= "twitch-eventsub-message-id"
	TwitchEventsubMessageRetry 			= "twitch-eventsub-message-retry"
	TwitchEventsubMessageType 			= "twitch-eventsub-message-type"
	TwitchEventsubMessageSignature 		= "twitch-eventsub-message-signature"
	TwitchEventsubMessageTimestamp 		= "twitch-eventsub-message-timestamp"
	TwitchEventsubSubscriptionType 		= "twitch-eventsub-subscription-type"
	TwitchEventsubSubscriptionVersion 	= "twitch-eventsub-subscription-version"

	Connect          					= "connect"

	MessageTypeNotification    			= "notification"
	MessageTypeVerification	   			= "webhook_callback_verification"
	MessageTypeRevocation      			= "revocation"

	ErrOlderThan10Minutes 				= "subscription is older than 10 minutes"
	ErrIDAlreadyEvaled 					= "id already evaluated"
	ErrUnknownEventType 				= "unknown event type"
	ErrUnknownRevocationReason 			= "unknown revocation reason"
)

type EventSub struct {
	secret string
	callbackURL string

	onModAdd func(event twitch.EventSubModeratorAddEvent)
	onModRemove func(event twitch.EventSubModeratorRemoveEvent)
	onFollow func(event twitch.EventSubChannelFollowEvent)
}

func NewEventSub(cfg *config.Config) *EventSub {
	return &EventSub{
		secret: cfg.EventSub.Secret,
		callbackURL: strings.TrimSuffix(cfg.EventSub.PublicUrl, "/") + "/event",
	}
}

func (e *EventSub) OnModAddEvent(callback func(event twitch.EventSubModeratorAddEvent)) {
	e.onModAdd = callback
}

func (e *EventSub) OnModRemoveEvent(callback func(event twitch.EventSubModeratorRemoveEvent)) {
	e.onModRemove = callback
}

func (e *EventSub) OnFollowEvent(callback func(event twitch.EventSubChannelFollowEvent)) {
	e.onFollow = callback
}

func (e *EventSub) HandleEventsubNotification(ctx context.Context, notification *EventSubNotificaton) error {
	// TODO Check against current UTC time.
	// if time.Since(notification.Subscription.CreatedAt.Time) > 10 * time.Minute {
	// 	return errors.New(ErrOlderThan10Minutes)
	// }
	
	switch notification.Subscription.Type {
	case helix.EventSubTypeModeratorAdd: {
		var event twitch.EventSubModeratorAddEvent
		err := json.Unmarshal(notification.Event, &event)
		if err != nil {
			log.Errorf("Failed to munmarshal unmarshal event %v error: %v", notification.Event, err)
			return errors.New("failed unmarshal event")
		}
		e.onModAdd(event)
		break
	}
	case helix.EventSubTypeModeratorRemove: {
		var event twitch.EventSubModeratorRemoveEvent
		err := json.Unmarshal(notification.Event, &event)
		if err != nil {
			log.Errorf("Failed to munmarshal unmarshal event %v error: %v", notification.Event, err)
			return errors.New("failed unmarshal event")
		}
		e.onModRemove(event)
		break
	}
	case helix.EventSubTypeChannelFollow: {
		var event twitch.EventSubChannelFollowEvent
		err := json.Unmarshal(notification.Event, &event)
		if err != nil {
			log.Errorf("Failed to unmarshal event %v error: %v", notification.Event, err)
			return errors.New("failed unmarshal event")
		}
		e.onFollow(event)
		break
	}

	default: {
		log.Errorf("Unknown event type %v", notification)
	}
	}
	return nil
}

type Connect_t struct {
	Version string;
}

func (c Connect_t) Type() redis.Key {
	return "connect"
}

type TwitchHeader struct {
	ID string;
	Retry string;
	MessageType string;
	Signature string;
	Timestamp string;
	SubscriptionType string;
	SubscriptionVersion string;
}

type EventSubNotificaton struct {
	Subscription twitch.EventSubSubscription `json:"subscription"`
	Challenge string `json:"challenge"`
	Event json.RawMessage `json:"event"`
}

// Constructs the HMAC of the request and validates it against our secret.
func ValidateHMAC(headers TwitchHeader, body, secret string) (bool, error) {
	t := strings.Join([]string{
		headers.ID,
		headers.Timestamp,
		body,
	}, "");

	mac := hmac.New(sha256.New, []byte(secret))
	_, err := mac.Write([]byte(t))

	if err != nil {
		return false, err
	}

	sha := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(sha), []byte(headers.Signature)), nil
}

func NewHeaders(r *http.Request) TwitchHeader {
	return TwitchHeader{
		ID: r.Header.Get(TwitchEventsubMessageID),
		Retry: r.Header.Get(TwitchEventsubMessageRetry),
		MessageType: r.Header.Get(TwitchEventsubMessageType),
		Signature: r.Header.Get(TwitchEventsubMessageSignature),
		Timestamp: r.Header.Get(TwitchEventsubMessageTimestamp),
		SubscriptionType: r.Header.Get(TwitchEventsubSubscriptionType),
		SubscriptionVersion: r.Header.Get(TwitchEventsubSubscriptionVersion),
	}
}
