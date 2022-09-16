module github.com/JoachimFlottorp/Melonbot/Golang/EventSub

go 1.18

require (
	github.com/JoachimFlottorp/Melonbot/Golang/Common v0.0.0-00010101000000-000000000000
	github.com/gorilla/mux v1.8.0
	github.com/nicklaw5/helix v1.25.0
	github.com/sirupsen/logrus v1.9.0
)

require (
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/go-redis/redis/v8 v8.11.5 // indirect
	github.com/golang-jwt/jwt v3.2.2+incompatible // indirect
	github.com/joho/godotenv v1.4.0 // indirect
	golang.org/x/net v0.0.0-20211015210444-4f30a5c0130f // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
	golang.org/x/text v0.3.7 // indirect
)

replace github.com/JoachimFlottorp/Melonbot/Golang/Common => ./../Common
