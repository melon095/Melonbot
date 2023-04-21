package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/JoachimFlottorp/GoCommon/helper/json"
	"github.com/go-redis/redis/v8"
)

const (
	PubKeyEventSub Key = "EventSub"

	Prefix = "Melonbot:"

	Nil = redis.Nil
)

type Options struct {
	Address  string
	Username string
	Password string
	DB       int
}

type Key string

func (k Key) String() string {
	return string(k)
}

type PubMessage struct {
	Channel string
	Payload string
}

type PubJSON interface {
	Type() string
}

type SendEvent struct {
	Type Key
	Data interface{}
}

type Instance interface {
	// Ping checks if the redis instance is alive
	Ping(context.Context) error

	// Get returns the value of the key
	Get(context.Context, Key) (string, error)
	// Set sets the value of the key
	//
	// No expiration is set
	Set(context.Context, Key, string) error
	// Del deletes the key
	Del(context.Context, Key) error
	// Expire sets the expiration of the key
	Expire(context.Context, Key, time.Duration) error

	// Subscribe subscribes to a channel and returns a channel
	Subscribe(context.Context, Key) chan PubMessage
	// Publish publish a struct to a channel
	//
	// Data is sent as {
	// 	"Type": Key
	// 	"Data": interface{}
	// }
	//
	// This allows the receiver to know what type of data it is receiving
	//
	// Such as Eventsub, where the type could be "foo" or "bar"
	//
	// And the data would could be different for each type
	Publish(context.Context, Key, PubJSON) error

	// Prefix returns the prefix used for all keys
	Prefix() string
}

type redisInstance struct {
	client *redis.Client
}

func Create(ctx context.Context, options Options) (Instance, error) {
	rds := redis.NewClient(&redis.Options{
		Addr:     options.Address,
		Username: options.Username,
		Password: options.Password,
		DB:       options.DB,
	})

	if err := rds.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	inst := &redisInstance{
		client: rds,
	}

	return inst, nil
}

func (r *redisInstance) formatKey(key Key) string {
	return fmt.Sprintf("%s%s", r.Prefix(), key.String())
}

func (r *redisInstance) Prefix() string {
	return Prefix
}

func (r *redisInstance) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *redisInstance) Get(ctx context.Context, key Key) (string, error) {
	return r.client.Get(ctx, r.formatKey(key)).Result()
}

func (r *redisInstance) Set(ctx context.Context, key Key, value string) error {
	return r.client.Set(ctx, r.formatKey(key), value, 0).Err()
}

func (r *redisInstance) Del(ctx context.Context, key Key) error {
	return r.client.Del(ctx, r.formatKey(key)).Err()
}

func (r *redisInstance) Expire(ctx context.Context, key Key, expiration time.Duration) error {
	return r.client.Expire(ctx, r.formatKey(key), expiration).Err()
}

func (r *redisInstance) Publish(ctx context.Context, channel Key, data PubJSON) error {
	s, err := serializeSendEvent(data)
	if err != nil {
		return err
	}

	return r.client.Publish(ctx, r.Prefix()+channel.String(), s).Err()
}

func (r *redisInstance) Subscribe(ctx context.Context, channel Key) chan PubMessage {
	ch := make(chan PubMessage)

	go func() {
		pubsub := r.client.Subscribe(ctx, channel.String())
		defer pubsub.Close()
		for {
			message := <-pubsub.Channel()
			ch <- PubMessage{
				Channel: message.Channel,
				Payload: message.Payload,
			}
		}
	}()

	return ch
}

func serializeSendEvent(data PubJSON) ([]byte, error) {
	var send SendEvent

	send.Type = Key(data.Type())
	send.Data = data

	return json.SerializeStruct(send)
}
