package messagescheduler

import (
	"context"
	"errors"
	"time"

	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/dbmodels"
	"go.uber.org/zap"
)

var (
	ErrChanNotFound = errors.New("channel not found in message scheduler")
)

type MessageContext struct {
	Channel string
	Message string
	ReplyTo *string
}

type ChannelSchedule struct {
	Interval     dbmodels.BotPermmision
	MessageQueue []*MessageContext
	Ctx          context.Context
}

func NewChannelSchedule(ctx context.Context, interval dbmodels.BotPermmision) *ChannelSchedule {
	return &ChannelSchedule{
		Interval:     interval,
		MessageQueue: make([]*MessageContext, 0),
		Ctx:          ctx,
	}
}

func (cs *ChannelSchedule) IntervalIsCurrently(interval dbmodels.BotPermmision) bool {
	return cs.Interval == interval
}

// MessageScheduler sends one message within a given interval to a channel
type MessageScheduler struct {
	// Catch all scheduler which puts messages that don't have a channel in here
	// It defaults to the lowest permission level (WritePermission) and can't be changed
	CatchAllScheduler *ChannelSchedule
	ChannelSchedules  map[string]*ChannelSchedule
	Ctx               context.Context
	OnMessage         func(ctx MessageContext)
}

func NewMessageScheduler(ctx context.Context) *MessageScheduler {
	return &MessageScheduler{
		CatchAllScheduler: NewChannelSchedule(ctx, dbmodels.WritePermission),
		ChannelSchedules:  make(map[string]*ChannelSchedule),
		Ctx:               ctx,
		OnMessage:         func(ctx MessageContext) {},
	}
}

func (ms *MessageScheduler) SetOnMessage(f func(ctx MessageContext)) {
	ms.OnMessage = f
}

func (ms *MessageScheduler) UpdateTimer(channel string, interval dbmodels.BotPermmision) {
	c, ok := ms.ChannelSchedules[channel]
	if !ok {
		return
	}

	zap.S().Infof("Updating timer for channel %s to %d", channel, interval.ToMessageCooldown())

	c.Interval = interval
}

func (ms *MessageScheduler) AddChannel(channel string, interval dbmodels.BotPermmision) {
	/*
		As clients like dt-irc listen for a JOIN response we don't bother
		returning an error if the channel already exists
	*/
	if _, ok := ms.ChannelSchedules[channel]; ok {
		return
	}

	// FIXME: SA1029
	ms.ChannelSchedules[channel] = NewChannelSchedule(
		context.WithValue(ms.Ctx, "channel", channel),
		interval,
	)

	zap.S().Infof("Starting message scheduler for channel %s", channel)
	go ms.channelLoop(ms.ChannelSchedules[channel])
}

func (ms *MessageScheduler) RemoveChannel(channel string) error {
	c, ok := ms.ChannelSchedules[channel]
	if !ok {
		return ErrChanNotFound
	}

	c.Ctx.Done()
	delete(ms.ChannelSchedules, channel)

	return nil
}

func (ms *MessageScheduler) AddMessage(ctx MessageContext) {
	c, ok := ms.ChannelSchedules[ctx.Channel]
	if !ok {
		ms.CatchAllScheduler.MessageQueue = append(ms.CatchAllScheduler.MessageQueue, &ctx)
		return
	}

	c.MessageQueue = append(c.MessageQueue, &ctx)
}

func (ms *MessageScheduler) Run() {
	go func() {
		<-ms.Ctx.Done()

		for _, schedule := range ms.ChannelSchedules {
			/*
				FIXME: This would make any messages that are currently being sent be lost
			*/
			schedule.Ctx.Done()
		}
	}()

	// Generate a goroutine for each channel
	for channel, schedule := range ms.ChannelSchedules {
		zap.S().Infof("Starting message scheduler for channel %s", channel)
		go ms.channelLoop(schedule)
	}

	go ms.channelLoop(ms.CatchAllScheduler)
}

func (ms *MessageScheduler) channelLoop(schedule *ChannelSchedule) {

	/*
		time.Ticker seems to have issues with not being accurate enough.

		See: https://stackoverflow.com/questions/70594795/more-accurate-ticker-than-time-newticker-in-go-on-macos/

		dynamically create a time.Duration to make updating the interval easier
	*/
	next := time.Now().Add(timeDuration(schedule.Interval))

	// Wait for timer or program shutdown
	for {
		time.Sleep(time.Until(next))

		select {
		case <-schedule.Ctx.Done():
			return
		default:
			{
				/* pass */
			}
		}
		// Send message if there is one
		if len(schedule.MessageQueue) > 0 {
			ms.OnMessage(*schedule.MessageQueue[0])
			schedule.MessageQueue = schedule.MessageQueue[1:]
		}

		next = next.Add(timeDuration(schedule.Interval))
	}
}

// Converts a BotPermmision to a time.Duration
func timeDuration(interval dbmodels.BotPermmision) time.Duration {
	return time.Duration(interval.ToMessageCooldown()) * time.Millisecond
}
