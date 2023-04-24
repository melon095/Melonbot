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
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/status"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/tcp"
	"github.com/gempir/go-twitch-irc/v4"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	cfg   = flag.String("config", "./../config.json", "config file")
	debug = flag.Bool("debug", false, "debug mode")

	isReplyRegex        = regexp.MustCompile(`@reply-parent-msg-id=([\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}) PRIVMSG #(\w+) :(.*)`)
	extractPrivmsgRegex = regexp.MustCompile(`PRIVMSG #(\w+) :(.*)`)
)

func init() {
	flag.Parse()
}

type Application struct {
	TMI          *twitch.Client
	TCPServer    *tcp.Server
	HealthServer *status.Server
	DB           *gorm.DB
	Config       *config.Config
}

func (app *Application) createInitialJoinMessage() string {
	return strings.Join( // FIXME: Some kind of cached version?
		[]string{
			fmt.Sprintf(":tmi.twitch.tv 001 %s :Welcome, GLHF!", app.Config.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 002 %s :Your host is tmi.twitch.tv", app.Config.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 003 %s :This server is rather new", app.Config.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 004 %s :-", app.Config.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 375 %s :-", app.Config.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 372 %s :You are in a maze of twisty passages, all alike.", app.Config.BotUsername),
			fmt.Sprintf(":tmi.twitch.tv 376 %s :>\r\n", app.Config.BotUsername),
		},
		"\r\n",
	)
}

func (app *Application) formatTwitchMsg(msg string) string {
	return fmt.Sprintf(":%[1]s!%[1]s@%[1]s.tmi.twitch.tv %s\r\n", app.Config.BotUsername, msg)
}

func (app *Application) RunTMI(ctx context.Context) {
	// FIXME: Can this be put into a single function
	app.TMI.OnPrivateMessage(func(message twitch.PrivateMessage) {
		app.TCPServer.Broadcast(message.Raw + "\r\n")
	})

	app.TMI.OnNoticeMessage(func(message twitch.NoticeMessage) {
		zap.S().Debug(message.Raw)

		app.TCPServer.Broadcast(message.Raw + "\r\n")
	})

	app.TMI.OnSelfJoinMessage(func(message twitch.UserJoinMessage) {
		zap.S().Infof("Joined channel %s", message.Channel)
	})

	app.TMI.OnSelfPartMessage(func(message twitch.UserPartMessage) {
		zap.S().Infof("Left channel %s", message.Channel)
	})

	app.TMI.OnUserJoinMessage(func(message twitch.UserJoinMessage) {
		app.TCPServer.Broadcast(message.Raw + "\r\n")
	})

	app.TMI.OnUserPartMessage(func(message twitch.UserPartMessage) {
		app.TCPServer.Broadcast(message.Raw + "\r\n")
	})

	app.TMI.OnUserStateMessage(func(message twitch.UserStateMessage) {
		app.TCPServer.Broadcast(message.Raw + "\r\n")
	})

	app.TMI.OnConnect(func() {
		zap.S().Info("Connected to Twitch")
	})

	var channels []dbmodels.ChannelTable
	if result := app.DB.Find(&channels); result.Error != nil {
		zap.S().Error(result.Error)
		return
	}

	for _, channel := range channels {
		app.TMI.Join(channel.Name)
	}

	err := app.TMI.Connect()
	if err != nil {
		zap.S().Error(err)

		return
	}

	<-ctx.Done()
}

func (app *Application) onTCPClient(c *tcp.Connection) {
	zap.S().Info("Client connected")

	for {
		msg, err := c.ReadString()

		if err != nil {
			switch err {
			case io.EOF, net.ErrClosed, err.(*net.OpError) /* wsarecv on winblows */ :
				{
					zap.S().Info("Client disconnected")
					return
				}
			default:
				{
					zap.S().Error(err)
					return
				}

			}
		}

		/*
			Due to mimicking a IRC server,
			we have to manually handle certain commands like JOIN, PART and NICK
			because the actual connection has been established to Twitch a long time ago.
		*/
		if strings.HasPrefix(msg, "JOIN") {
			channel := strings.TrimPrefix(msg, "JOIN #")

			zap.S().Infof("Received JOIN for %s", channel)

			app.TMI.Join(channel)

			reply := app.formatTwitchMsg(fmt.Sprintf("JOIN #%s", channel))

			c.WriteString(reply)

		} else if strings.HasPrefix(msg, "PART") {

			channel := strings.TrimPrefix(msg, "PART #")

			zap.S().Infof("Received PART for %s", channel)

			app.TMI.Depart(channel)

			reply := app.formatTwitchMsg(fmt.Sprintf("PART #%s", channel))

			c.WriteString(reply)

		} else if strings.HasPrefix(msg, "NICK") {
			// Some clients expect a response for some commands
			c.WriteString(app.createInitialJoinMessage())

		} else if strings.HasPrefix(msg, "CAP REQ") {
			// Same with nick

			c.WriteString(":tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n")

		} else if strings.HasPrefix(msg, "PING") {

			msgCorrId := strings.TrimPrefix(msg, "PING :")

			c.WriteString(fmt.Sprintf(":tmi.twitch.tv PONG tmi.twitch.tv :%s\r\n", msgCorrId))

		} else if match := isReplyRegex.FindStringSubmatch(msg); match != nil {
			replyParentMsgID := match[1]
			channel := match[2]
			message := match[3]

			zap.S().Infof("Replying in %s with %s", channel, message)
			app.TMI.Reply(channel, replyParentMsgID, message)
		} else if match := extractPrivmsgRegex.FindStringSubmatch(msg); match != nil {
			channel := match[1]
			message := match[2]

			zap.S().Infof("Saying in %s with %s", channel, message)
			app.TMI.Say(channel, message)
		}
	}
}

func (app *Application) RunTCP(ctx context.Context) {
	// Listen all interfaces
	addr := fmt.Sprintf("0.0.0.0:%d", app.Config.Services.Firehose.Port)

	zap.S().Infof("Starting TCP server on %s", addr)

	app.TCPServer.Start(ctx, addr, app.onTCPClient)
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

	gCtx, cancel := context.WithCancel(context.Background())

	done := applicationwrapper.NewWrapper(gCtx, cancel)

	done.Execute(func(ctx context.Context) {
		statusServer, err := status.NewServer(uint16(conf.Services.Firehose.HealthPort))
		if err != nil {
			zap.S().Fatal(err)
		}

		app := Application{
			TMI:          twitch.NewClient(conf.BotUsername, conf.Twitch.OAuth),
			TCPServer:    tcp.NewServer(),
			HealthServer: statusServer,
			DB:           db,
			Config:       conf,
		}

		if conf.Verified {
			app.TMI.SetJoinRateLimiter(twitch.CreateVerifiedRateLimiter())
		}

		wg := sync.WaitGroup{}

		wg.Add(1)
		go func() {
			defer wg.Done()

			app.RunTMI(ctx)
		}()

		wg.Add(1)

		/*
			Provide a "fake" IRC server for the client to connect to.
		*/
		go func() {
			defer wg.Done()

			app.RunTCP(ctx)
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()

			zap.S().Infof("Starting health server on %d", conf.Services.Firehose.HealthPort)

			app.HealthServer.Start(ctx)
		}()
	})
}
