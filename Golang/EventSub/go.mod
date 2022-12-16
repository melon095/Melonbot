module github.com/JoachimFlottorp/Melonbot/Golang/EventSub

go 1.18

require (
	github.com/JoachimFlottorp/GoCommon v0.0.0-20220919224617-149fb676e5df
	github.com/JoachimFlottorp/Melonbot/Golang/Common v0.0.0-00010101000000-000000000000
	github.com/gofiber/fiber/v2 v2.40.1
	go.uber.org/zap v1.23.0
	gorm.io/driver/sqlite v1.4.3
	gorm.io/gorm v1.24.2
)

require (
	github.com/andybalholm/brotli v1.0.4 // indirect
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/go-redis/redis/v8 v8.11.5 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/klauspost/compress v1.15.9 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.16 // indirect
	github.com/mattn/go-runewidth v0.0.14 // indirect
	github.com/mattn/go-sqlite3 v1.14.16 // indirect
	github.com/rivo/uniseg v0.2.0 // indirect
	github.com/valyala/bytebufferpool v1.0.0 // indirect
	github.com/valyala/fasthttp v1.41.0 // indirect
	github.com/valyala/tcplisten v1.0.0 // indirect
	go.uber.org/atomic v1.10.0 // indirect
	go.uber.org/multierr v1.8.0 // indirect
	golang.org/x/sys v0.0.0-20220811171246-fbc7d0a398ab // indirect
)

replace github.com/JoachimFlottorp/Melonbot/Golang/Common => ../Common
