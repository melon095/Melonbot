package config

import (
	"github.com/JoachimFlottorp/Melonbot/Golang/Common/redis"
)

type Config struct {
	Port int
	
	Twitch   struct {
		ClientSecret string `json:"ClientSecret"`
		ClientID string `json:"ClientID"`
	} `json:"Twitch"`
	
	EventSub struct {
		PublicUrl string `json:"PublicUrl"`
		Secret string `json:"Secret"`
		Redis redis.Options
	} `json:"EventSub"`
}