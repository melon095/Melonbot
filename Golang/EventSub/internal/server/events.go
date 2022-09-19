package server

import (
	"context"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/twitch"
	"go.uber.org/zap"
)

// TODO Validate it's the bot id here rather on node side
func registerEvents(s *Server) {
	s.eventsub.OnModAddEvent(func(event twitch.EventSubModeratorAddEvent) {
		zap.S().Infof("ModAddEvent %v", event)
		if err := s.redis.Publish(context.Background(), "channel.moderator.add", event); err != nil {
			zap.S().Error("Error publishing to redis: ", err)
		}
	})
		

	s.eventsub.OnModRemoveEvent(func(event twitch.EventSubModeratorRemoveEvent) {
		zap.S().Infof("ModRemoveEvent %v", event)
		if err := s.redis.Publish(context.Background(), "channel.moderator.remove", event); err != nil {
			zap.S().Error("Error publishing to redis: ", err)
		}
	})

	s.eventsub.OnFollowEvent(func(event twitch.EventSubChannelFollowEvent) {
		zap.S().Infof("FollowEvent %v", event)
		if err := s.redis.Publish(context.Background(), "channel.follow", event); err != nil {
			zap.S().Error("Error publishing to redis: ", err)
		}
	})
}
