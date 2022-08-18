package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/JoachimFlottorp/Melonbot/EventSub/pkg/config"
)

type RedisProvider struct {
	client *redis.Client

	channelName string
}

func New(config *config.Config) *RedisProvider {
	var rds RedisProvider

	rds.client = redis.NewClient(&redis.Options{
		Addr: config.Redis.Address,
		Password: "", /* TODO allow change this */
		DB: 0, /* TODO allow to change this */
 	})

	rds.channelName = "Melonbot:EventSub"

	return &rds
}

type SendEvent struct {
	Type string;
	Data interface{};
}

func (r *RedisProvider) Publish(ctx context.Context, event string, data interface{}) error {
	var send SendEvent;

	send.Type = event;
	send.Data = data;
	
	jsonBytes, err := json.Marshal(send)
	if err != nil {
		return err
	}
	return r.client.Publish(ctx, r.channelName, jsonBytes).Err()
}

func (r *RedisProvider) Subscribe(ctx context.Context, channel string) chan *redis.Message {
	ch := make(chan *redis.Message)

	go func() {
		pubsub := r.client.Subscribe(ctx, channel)
		defer pubsub.Close()
		for {
			ch <- <-pubsub.Channel()
		}
	}()

	return ch
} 

func (r *RedisProvider) SGet(ctx context.Context, key string) (string, error) {
	res, err := r.client.Get(ctx, fmt.Sprintf("Melonbot:%s", key)).Result()
	if err != nil {
		return (""), err
	}

	if res == string(redis.Nil) {
		return (""), nil
	}

	return res, nil
}

func (r *RedisProvider) SSet(ctx context.Context, key string, value string, expire time.Duration) error {
	return r.client.Set(ctx, fmt.Sprintf("Melonbot:%s", key), value, expire).Err()
}
