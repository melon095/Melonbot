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
	messagescheduler "github.com/JoachimFlottorp/Melonbot/Golang/internal/message_scheduler"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/config"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/dbmodels"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/redis"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/status"
	"github.com/JoachimFlottorp/Melonbot/Golang/internal/tcp"
	"github.com/gempir/go-twitch-irc/v4"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const (
	messageEvasionCharacter = "\U000e0000"
)

var (
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
	Redis        redis.Instance
	Config       *config.Config
	Scheduler    *messagescheduler.MessageScheduler
	LastMessage  map[string]string
}

type ChannelUpdateMode struct {
	Channel string
	Mode    string
}

func (c ChannelUpdateMode) Type() string {
	return "channel.mode_update"
}

func (app *Application) setPermission(ctx context.Context, channel *dbmodels.ChannelTable, perm dbmodels.BotPermmision) {
	result := app.DB.
		Model(channel).
		Where("user_id = ?", channel.UserID).
		Update("bot_permission", perm)

	if result.Error != nil {
		zap.S().Errorf("Failed to update permission for channel %s: %s", channel.Name, result.Error)
		return
	}

	app.Scheduler.UpdateTimer(channel.Name, perm)

	zap.S().Infof("Updated permission for channel %s to %s", channel.Name, perm.String())

	app.Redis.Publish(ctx, redis.PubKeyEventSub, ChannelUpdateMode{
		Channel: channel.UserID,
		Mode:    perm.String(),
	})
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

		if message.User.Name == app.Config.BotUsername {
			channel := &dbmodels.ChannelTable{}
			result := app.DB.
				Where("name = ?", message.Channel).
				First(channel)

			if result.Error != nil {
				return
			}

			cs := app.Scheduler.ChannelSchedules[channel.Name]

			isMod := userIsModerator(&message)
			isVIP := userIsVIP(&message)
			isBroadcaster := userIsBroadcaster(&message)

			// Assign the correct permission level to the channel
			if isBroadcaster && !cs.IntervalIsCurrently(dbmodels.BotPermission) {

				app.setPermission(ctx, channel, dbmodels.BotPermission)

			} else if isMod && !cs.IntervalIsCurrently(dbmodels.ModeratorPermission) {

				app.setPermission(ctx, channel, dbmodels.ModeratorPermission)

			} else if isVIP && !cs.IntervalIsCurrently(dbmodels.VIPPermission) {

				app.setPermission(ctx, channel, dbmodels.VIPPermission)

				// FIXME: So ugly
				// Checks if it is currently not a Mod, Vip, Bot channel and not in read or Write mode.
				// If the bot used to be VIP, but now has lost the VIP badge, we can put it in write mode.
				// We are also sure it's did not lose VIP and gained Mod, because that would have been caught above.
			} else if !cs.IntervalIsCurrently(dbmodels.ReadPermission) &&
				!cs.IntervalIsCurrently(dbmodels.WritePermission) &&
				!isVIP &&
				!isMod &&
				!isBroadcaster {

				app.setPermission(ctx, channel, dbmodels.WritePermission)

			}
		}
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
		app.Scheduler.AddChannel(channel.Name, channel.GetBotPermission())
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
			channels := strings.Split(removeTrailingNewline(strings.TrimPrefix(msg, "JOIN #")), ",")
			for _, channel := range channels {
				channel = strings.TrimPrefix(channel, "#")

				zap.S().Infof("Received JOIN for %s", channel)

				var perm dbmodels.BotPermmision
				var dbChannel dbmodels.ChannelTable
				result := app.DB.First(&dbChannel, "name = ?", channel)

				if result.Error != nil {
					perm = dbmodels.WritePermission
				} else {
					perm = dbChannel.GetBotPermission()
				}

				app.TMI.Join(channel)
				app.Scheduler.AddChannel(channel, perm)

				reply := app.formatTwitchMsg(fmt.Sprintf("JOIN #%s", channel))

				c.WriteString(reply)

			}
		} else if strings.HasPrefix(msg, "PART") {
			channels := strings.Split(removeTrailingNewline(strings.TrimPrefix(msg, "PART #")), ",")

			for _, channel := range channels {
				channel = strings.TrimPrefix(channel, "#")

				zap.S().Infof("Received PART for %s", channel)

				_ = app.Scheduler.RemoveChannel(channel)

				app.TMI.Depart(channel)

				reply := app.formatTwitchMsg(fmt.Sprintf("PART #%s", channel))

				c.WriteString(reply)

			}
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
			message := removeTrailingNewline(match[3])

			zap.S().Infof("Replying in %s with %s", channel, message)

			app.Scheduler.AddMessage(messagescheduler.MessageContext{
				Channel: channel,
				Message: message,
				ReplyTo: &replyParentMsgID,
			})
		} else if match := extractPrivmsgRegex.FindStringSubmatch(msg); match != nil {
			channel := match[1]
			message := removeTrailingNewline(match[2])

			zap.S().Infof("Sending %s to %s", message, channel)

			app.Scheduler.AddMessage(messagescheduler.MessageContext{
				Channel: channel,
				Message: message,
			})
		}
	}
}

func (app *Application) RunTCP(ctx context.Context) {
	// Listen all interfaces
	addr := fmt.Sprintf("0.0.0.0:%d", app.Config.Services.Firehose.Port)

	zap.S().Infof("Starting TCP server on %s", addr)

	app.TCPServer.Start(ctx, addr, app.onTCPClient)
}

func (app *Application) onScheduleMessage(ctx messagescheduler.MessageContext) {
	lastMsg := app.LastMessage[ctx.Channel]

	if lastMsg == ctx.Message {
		if strings.Contains(ctx.Message, messageEvasionCharacter) {
			ctx.Message = strings.ReplaceAll(ctx.Message, messageEvasionCharacter, "")

		} else {
			ctx.Message += fmt.Sprintf(" %s", messageEvasionCharacter)
		}
	}

	app.LastMessage[ctx.Channel] = ctx.Message

	if ctx.ReplyTo != nil {
		app.TMI.Reply(ctx.Channel, *ctx.ReplyTo, ctx.Message)
	} else {
		app.TMI.Say(ctx.Channel, ctx.Message)
	}
}

func main() {
	conf, err := config.ReadConfig()
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

		redisInst, err := redis.Create(ctx, conf.Redis.Address)
		if err != nil {
			zap.S().Fatal(err)
		}

		app := Application{
			TMI:          twitch.NewClient(conf.BotUsername, conf.Twitch.OAuth),
			TCPServer:    tcp.NewServer(),
			HealthServer: statusServer,
			DB:           db,
			Redis:        redisInst,
			Config:       conf,
			Scheduler:    messagescheduler.NewMessageScheduler(ctx),
			LastMessage:  make(map[string]string),
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

		app.Scheduler.SetOnMessage(app.onScheduleMessage)
		app.Scheduler.Run()

		wg.Wait()
	})
}

func removeTrailingNewline(s string) string {
	s = strings.ReplaceAll(s, "\n", "")
	s = strings.ReplaceAll(s, "\r", "")

	return s
}

func userIsBroadcaster(msg *twitch.UserStateMessage) bool {
	return msg.User.Badges["broadcaster"] == 1
}

func userIsModerator(msg *twitch.UserStateMessage) bool {
	return msg.User.Badges["moderator"] == 1
}

func userIsVIP(msg *twitch.UserStateMessage) bool {
	return msg.User.Badges["vip"] == 1
}
