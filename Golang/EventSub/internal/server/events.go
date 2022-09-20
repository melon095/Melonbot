package server

import (
	"context"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
	"go.uber.org/zap"
)

func send(s *Server, event redis.PubJSON) {
	if err := s.redis.Publish(context.Background(), "EventSub", event); err != nil {
		zap.S().Error("Error publishing to redis: ", err)
	}
}

// TODO Validate it's the bot id here rather on node side
func registerEvents(s *Server) {
	s.eventsub.OnModAddEvent(func(event twitch.EventSubModeratorAddEvent) {
		zap.S().Infof("ModAddEvent %v", event)
		send(s, event)
	})
		

	s.eventsub.OnModRemoveEvent(func(event twitch.EventSubModeratorRemoveEvent) {
		zap.S().Infof("ModRemoveEvent %v", event)
		send(s, event)
	})

	s.eventsub.OnFollowEvent(func(event twitch.EventSubChannelFollowEvent) {
		zap.S().Infof("FollowEvent %v", event)
		send(s, event)
	})
}
