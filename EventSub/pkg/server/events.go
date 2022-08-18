package server

import (
	"context"

	"github.com/nicklaw5/helix"
	log "github.com/sirupsen/logrus"
)

// TODO Validate it's the bot id here rather on node side
func registerEvents(s *Server) {
	s.eventsub.OnModAddEvent(func(event helix.EventSubChannelFollowEvent) {
		log.Infof("ModAddEvent %v", event)
		if err := s.redis.Publish(context.Background(), "channel.moderator.add", event); err != nil {
			log.Error("Error publishing to redis: ", err)
		}
	})
		

	s.eventsub.OnModRemoveEvent(func(event helix.EventSubModeratorRemoveEvent) {
		log.Infof("ModRemoveEvent %v", event)
		if err := s.redis.Publish(context.Background(), "channel.moderator.remove", event); err != nil {
			log.Error("Error publishing to redis: ", err)
		}
	})

	s.eventsub.OnFollowEvent(func(event helix.EventSubChannelFollowEvent) {
		log.Infof("FollowEvent %v", event)
		if err := s.redis.Publish(context.Background(), "channel.follow", event); err != nil {
			log.Error("Error publishing to redis: ", err)
		}
	})
}
