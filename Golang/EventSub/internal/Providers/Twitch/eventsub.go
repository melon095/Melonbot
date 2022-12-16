package twitch

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"

	"go.uber.org/zap"
)

type ChannelFollowFunc func(ctx context.Context, event EventSubChannelFollowEvent)
type StreamLiveFunc func(ctx context.Context, event EventSubStreamOnlineEvent)
type StreamOfflineFunc func(ctx context.Context, event EventSubStreamOfflineEvent)
type ChannelUpdateFunc func(ctx context.Context, event EventSubChannelUpdateEvent)

type EventSub struct {
	onChannelFollow ChannelFollowFunc
	onStreamLive    StreamLiveFunc
	onStreamOffline StreamOfflineFunc
	onChannelUpdate ChannelUpdateFunc
}

func (e *EventSub) OnChannelFollowEvent(callback ChannelFollowFunc) {
	e.onChannelFollow = callback
}

func (e *EventSub) OnStreamLiveEvent(callback StreamLiveFunc) {
	e.onStreamLive = callback
}

func (e *EventSub) OnStreamOfflineEvent(callback StreamOfflineFunc) {
	e.onStreamOffline = callback
}

func (e *EventSub) OnChannelUpdateEvent(callback ChannelUpdateFunc) {
	e.onChannelUpdate = callback
}

func (e *EventSub) HandleEventsubNotification(ctx context.Context, notification *EventSubNotificaton) {
	switch notification.Subscription.Type {
	case EventSubTypeChannelFollow:
		{
			var event EventSubChannelFollowEvent
			err := json.Unmarshal(notification.Event, &event)
			if err != nil {
				zap.S().Errorf("Failed to unmarshal event %v error: %v", notification.Event, err)
				return
			}
			e.onChannelFollow(ctx, event)
			break
		}
	default:
		{
			zap.S().Errorf("Unknown event type %v", notification)
		}
	}
}

// Constructs the HMAC of the request and validates it against our secret.
func ValidateHMAC(headers TwitchHeader, body []byte, secret string) (bool, error) {
	id := []byte(headers.ID)
	timestamp := []byte(headers.Timestamp)

	reqHMAC := append(id, timestamp...)
	reqHMAC = append(reqHMAC, body...)

	mac := hmac.New(sha256.New, []byte(secret))
	_, err := mac.Write(reqHMAC)

	if err != nil {
		return false, err
	}

	sha := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(sha), []byte(headers.Signature)), nil
}

func NewHeaders(headers map[string]string) TwitchHeader {
	return TwitchHeader{
		ID:                  headers[EventSubMessageID],
		Retry:               headers[EventSubMessageRetry],
		MessageType:         headers[EventSubMessageType],
		Signature:           headers[EventSubMessageSignature],
		Timestamp:           headers[EventSubMessageTimestamp],
		SubscriptionType:    headers[EventSubSubscriptionType],
		SubscriptionVersion: headers[EventSubSubscriptionVersion],
	}
}
