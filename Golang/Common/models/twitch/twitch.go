package twitch

import (
	"time"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
)

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

type EventSubChannelFollowEvent struct {
	UserID               string `json:"user_id"`
	UserLogin            string `json:"user_login"`
	UserName             string `json:"user_name"`
	BroadcasterUserID    string `json:"broadcaster_user_id"`
	BroadcasterUserLogin string `json:"broadcaster_user_login"`
	BroadcasterUserName  string `json:"broadcaster_user_name"`
}

func (e EventSubChannelFollowEvent) Type() redis.Key {
	return "channel.follow"
}

// Cant use lhs = rhs because of DuplicateDecl error


type EventSubModeratorAddEvent struct {
	UserID               string `json:"user_id"`
	UserLogin            string `json:"user_login"`
	UserName             string `json:"user_name"`
	BroadcasterUserID    string `json:"broadcaster_user_id"`
	BroadcasterUserLogin string `json:"broadcaster_user_login"`
	BroadcasterUserName  string `json:"broadcaster_user_name"`
}

func (e EventSubModeratorAddEvent) Type() redis.Key {
	return "channel.moderator.add"
}

type EventSubModeratorRemoveEvent struct {
	UserID               string `json:"user_id"`
	UserLogin            string `json:"user_login"`
	UserName             string `json:"user_name"`
	BroadcasterUserID    string `json:"broadcaster_user_id"`
	BroadcasterUserLogin string `json:"broadcaster_user_login"`
	BroadcasterUserName  string `json:"broadcaster_user_name"`
}

func (e EventSubModeratorRemoveEvent) Type() redis.Key {
	return "channel.moderator.remove"
}
