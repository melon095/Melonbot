package twitch

import (
	"encoding/json"
	"time"
)

const (
	EventSubMessageID           = "Twitch-Eventsub-Message-Id"
	EventSubMessageRetry        = "Twitch-Eventsub-Message-Retry"
	EventSubMessageType         = "Twitch-Eventsub-Message-Type"
	EventSubMessageSignature    = "Twitch-Eventsub-Message-Signature"
	EventSubMessageTimestamp    = "Twitch-Eventsub-Message-Timestamp"
	EventSubSubscriptionType    = "Twitch-Eventsub-Mubscription-Type"
	EventSubSubscriptionVersion = "Twitch-Eventsub-Mubscription-Version"

	EventSubTypeChannelFollow = "channel.follow"
	EventSubTypeStreamLive    = "stream.online"
	EventSubTypeStreamOffline = "stream.offline"
	EventSubTypeChannelUpdate = "channel.update"

	Connect = "connect"

	MessageTypeNotification = "notification"
	MessageTypeVerification = "webhook_callback_verification"
	MessageTypeRevocation   = "revocation"

	ErrOlderThan10Minutes      = "subscription is older than 10 minutes"
	ErrIDAlreadyEvaled         = "id already evaluated"
	ErrUnknownEventType        = "unknown event type"
	ErrUnknownRevocationReason = "unknown revocation reason"

	RevocationUserRemoved = "user_removed"
	RevocationAuthRevoked = "authorization_revoked"
	RevocationFailures    = "notification_failures_exceeded"
)

type Connect_t struct {
	Version string
}

func (c Connect_t) Type() string {
	return "connect"
}

type TwitchHeader struct {
	ID                  string
	Retry               string
	MessageType         string
	Signature           string
	Timestamp           string
	SubscriptionType    string
	SubscriptionVersion string
}

type EventSubNotificaton struct {
	Subscription EventSubSubscription `json:"subscription"`
	Challenge    string               `json:"challenge"`
	Event        json.RawMessage      `json:"event"`
}

type EventSubCondition struct {
	BroadcasterUserID     string `json:"broadcaster_user_id"`
	FromBroadcasterUserID string `json:"from_broadcaster_user_id"`
	ToBroadcasterUserID   string `json:"to_broadcaster_user_id"`
	RewardID              string `json:"reward_id"`
	ClientID              string `json:"client_id"`
	ExtensionClientID     string `json:"extension_client_id"`
	UserID                string `json:"user_id"`
}

type EventSubTransport struct {
	Method   string `json:"method"`
	Callback string `json:"callback"`
	Secret   string `json:"secret"`
}

type EventSubSubscription struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Version   string            `json:"version"`
	Status    string            `json:"status"`
	Condition EventSubCondition `json:"condition"`
	Transport EventSubTransport `json:"transport"`
	CreatedAt time.Time         `json:"created_at"`
	Cost      int               `json:"cost"`
}

// EventSubChannelFollowEvent occurs when a user follows a channel
type EventSubChannelFollowEvent struct {
	EventSubBroadcastData

	// The user ID for the user now following the specified channel.
	UserID string `json:"user_id"`
	// The user login for the user now following the specified channel.
	UserLogin string `json:"user_login"`
	// The user login for the user now following the specified channel.
	UserName string `json:"user_name"`
	// RFC3339 timestamp of when the follow occurred.
	FollowedAt time.Time `json:"followed_at"`
}

func (e EventSubChannelFollowEvent) Type() string {
	return EventSubTypeChannelFollow
}

type EventSubStreamType string

const (
	StreamTypeLive       = EventSubStreamType("live")
	StreamTypePlaylist   = EventSubStreamType("playlist")
	StreamTypeWatchParty = EventSubStreamType("watch_party")
	StreamTypePremiere   = EventSubStreamType("premiere")
	StreamTypeRerun      = EventSubStreamType("rerun")
)

func (e EventSubStreamType) String() string {
	return string(e)
}

// EventSubStreamOnlineEvent occurs when a stream goes live
type EventSubStreamOnlineEvent struct {
	EventSubBroadcastData

	// The id of the stream
	ID string `json:"id"`
	// The stream type.
	StreamType EventSubStreamType `json:"type"`
	// The timestamp at which the stream went online at.
	StartedAt time.Time `json:"started_at"`
}

func (e EventSubStreamOnlineEvent) Type() string {
	return EventSubTypeStreamLive
}

// EventSubStreamOfflineEvent occurs when a stream goes offline
type EventSubStreamOfflineEvent struct {
	EventSubBroadcastData
}

func (e EventSubStreamOfflineEvent) Type() string {
	return EventSubTypeStreamOffline
}

// EventSubChannelUpdateEvent occurs when a channel is updated
//
// Such as when the title or the category is changed.
type EventSubChannelUpdateEvent struct {
	EventSubBroadcastData

	// The channel’s stream title.
	Title string `json:"title"`
	// 	The channel’s broadcast language.
	Language string `json:"language"`
	// 	The channel’s category ID.
	CategoryID string `json:"category_id"`
	// The category name.
	CategoryName string `json:"category_name"`
	// A boolean identifying whether the channel is flagged as mature.
	IsMature bool `json:"is_mature"`
}

func (e EventSubChannelUpdateEvent) Type() string {
	return EventSubTypeChannelUpdate
}

// struct that holds broadcaster data

type EventSubBroadcastData struct {
	// The broadcaster’s user id.
	BroadcasterUserID string `json:"broadcaster_user_id"`
	// The broadcaster’s user login.
	BroadcasterUserLogin string `json:"broadcaster_user_login"`
	// The broadcaster’s user display name
	BroadcasterUserName string `json:"broadcaster_user_name"`
}
