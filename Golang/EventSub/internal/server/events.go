package server

import (
	"context"

	"github.com/JoachimFlottorp/Melonbot/Golang/Common/models/twitch"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/log"
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
)

// TODO Validate it's the bot id here rather on node side
func registerEvents(s *Server) {
	s.eventsub.OnModAddEvent(func(event twitch.EventSubModeratorAddEvent) {
		log.Get().Infof("ModAddEvent %v", event)
		if err := redis.PublishJSON(s.redis, context.Background(), "channel.moderator.add", event); err != nil {
			log.Get().Error("Error publishing to redis: ", err)
		}
	})
		

	s.eventsub.OnModRemoveEvent(func(event twitch.EventSubModeratorRemoveEvent) {
		log.Get().Infof("ModRemoveEvent %v", event)
		if err := redis.PublishJSON(s.redis, context.Background(), "channel.moderator.remove", event); err != nil {
			log.Get().Error("Error publishing to redis: ", err)
		}
	})

	s.eventsub.OnFollowEvent(func(event twitch.EventSubChannelFollowEvent) {
		log.Get().Infof("FollowEvent %v", event)
		if err := redis.PublishJSON(s.redis, context.Background(), "channel.follow", event); err != nil {
			log.Get().Error("Error publishing to redis: ", err)
		}
	})
}
