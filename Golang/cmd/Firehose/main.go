package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"net"
	"regexp"
	"strings"
	"sync"

	applicationwrapper "github.com/JoachimFlottorp/Melonbot/Golang/internal/application_wrapper"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/dbmodels"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/tcp"
	"github.com/gempir/go-twitch-irc/v4"
	"go.uber.org/zap"
)

var (
	port  = flag.Int("port", 3000, "port")
	cfg   = flag.String("config", "./../config.json", "config file")
	debug = flag.Bool("debug", false, "debug mode")

	isReplyRegex        = regexp.MustCompile(`@reply-parent-msg-id=([\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}) PRIVMSG #(\w+) :(.*)`)
	extractPrivmsgRegex = regexp.MustCompile(`PRIVMSG #(\w+) :(.*)`)
)

func init() {
	flag.Parse()
}

func main() {
	conf, err := config.ReadConfig(*cfg, *debug)
	if err != nil {
		panic(err)
	}

	db, err := dbmodels.CreateGormPostgres(conf.SQL.Address)
	if err != nil {
		zap.S().Fatalf("failed to connect database: %v", err)
	}

	INITIAL_CONNECTION_MSG := []byte(strings.Join(
		[]string{
			fmt.Sprintf(":tmi.twitch.tv 001 %s :Welcome, GLHF!", conf.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 002 %s :Your host is tmi.twitch.tv", conf.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 003 %s :This server is rather new", conf.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 004 %s :-", conf.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 375 %s :-", conf.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 372 %s :You are in a maze of twisty passages, all alike.", conf.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 376 %s :>", conf.BotUsername),
		},
		"\r\n",
	))

	gCtx, cancel := context.WithCancel(context.Background())

	done := applicationwrapper.NewWrapper(gCtx, cancel)

	done.Execute(func(ctx context.Context) {
		tmiClient := twitch.NewClient(conf.BotUsername, conf.Twitch.OAuth)

		if conf.Verified {
			tmiClient.SetJoinRateLimiter(twitch.CreateVerifiedRateLimiter())
		}

		serverToClient := tcp.NewServer()

		wg := sync.WaitGroup{}

		wg.Add(1)
		go func() {
			defer wg.Done()

			// FIXME: Can this be put into a single function
			tmiClient.OnPrivateMessage(func(message twitch.PrivateMessage) {
				zap.S().Debug(message.Raw)

				serverToClient.Broadcast(message.Raw)
			})

			tmiClient.OnNoticeMessage(func(message twitch.NoticeMessage) {
				zap.S().Debug(message.Raw)

				serverToClient.Broadcast(message.Raw)
			})

			tmiClient.OnSelfJoinMessage(func(message twitch.UserJoinMessage) {
				zap.S().Infof("Joined channel %s", message.Channel)

				serverToClient.Broadcast(message.Raw)
			})

			tmiClient.OnSelfPartMessage(func(message twitch.UserPartMessage) {
				zap.S().Infof("Left channel %s", message.Channel)

				serverToClient.Broadcast(message.Raw)
			})

			tmiClient.OnUserJoinMessage(func(message twitch.UserJoinMessage) {
				serverToClient.Broadcast(message.Raw)
			})

			tmiClient.OnUserPartMessage(func(message twitch.UserPartMessage) {
				serverToClient.Broadcast(message.Raw)
			})

			tmiClient.OnConnect(func() {
				zap.S().Info("Connected to Twitch")
			})

			var channels []dbmodels.ChannelTable
			if result := db.Find(&channels); result.Error != nil {
				zap.S().Error(result.Error)
				return
			}

			for _, channel := range channels {
				tmiClient.Join(channel.Name)
			}

			err := tmiClient.Connect()
			if err != nil {
				zap.S().Error(err)

				return
			}

			<-ctx.Done()
		}()

		wg.Add(1)

		/*
			Provide a "fake" IRC server for the client to connect to.
		*/
		go func() {
			defer wg.Done()
			addr := fmt.Sprintf("127.0.0.1:%d", *port)

			zap.S().Infof("Starting TCP server on %s", addr)

			serverToClient.Start(ctx, addr, func(c *tcp.Connection) {
				zap.S().Info("Client connected")

				for {
					msg, err := c.ReadString()
					if err == io.EOF || err == net.ErrClosed {
						zap.S().Info("Client disconnected")
						return
					} else if err != nil {
						zap.S().Error(err)

						return
					}

					zap.S().Infof("Received: %s", msg)

					/*
						Due to mimicking a IRC server,
						we have to manually handle certain commands like JOIN, PART and NICK
						because the actual connection has been established to Twitch a long time ago.
					*/
					if strings.HasPrefix(msg, "JOIN") {
						channel := strings.TrimPrefix(msg, "JOIN #")

						zap.S().Infof("Received JOIN for %s", channel)

						tmiClient.Join(channel)

					} else if strings.HasPrefix(msg, "PART") {

						channel := strings.TrimPrefix(msg, "PART #")

						zap.S().Infof("Received PART for %s", channel)

						tmiClient.Depart(channel)

					} else if strings.HasPrefix(msg, "NICK") {
						// Some clients expect a response for some commands
						c.Write(INITIAL_CONNECTION_MSG)

					} else if strings.HasPrefix(msg, "CAP REQ") {
						// Same with nick

						c.Write([]byte(":tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n"))

					} else if strings.HasPrefix(msg, "PING") {

						msgCorrId := strings.TrimPrefix(msg, "PING :")

						c.Write([]byte(fmt.Sprintf(":tmi.twitch.tv PONG tmi.twitch.tv :%s\r\n", msgCorrId)))

					} else if match := isReplyRegex.FindStringSubmatch(msg); match != nil {
						replyParentMsgID := match[1]
						channel := match[2]
						message := match[3]

						tmiClient.Reply(channel, replyParentMsgID, message)
					} else if match := extractPrivmsgRegex.FindStringSubmatch(msg); match != nil {
						channel := match[1]
						message := match[2]

						tmiClient.Say(channel, message)
					}
				}
			})
		}()
	})
}
