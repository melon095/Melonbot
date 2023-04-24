package messagescheduler

import (
	"context"
	"testing"
	"time"

	"github.com/JoachimFlottorp/Melonbot/Golang/internal/models/dbmodels"
)

func TestAddChannel(t *testing.T) {
	s := NewMessageScheduler(context.Background())

	s.AddChannel("test", dbmodels.ModeratorPermission)

	if _, ok := s.ChannelSchedules["test"]; !ok {
		t.Error("Channel not added")
	}
}

func TestRemoveChannel(t *testing.T) {
	s := NewMessageScheduler(context.Background())

	s.AddChannel("test", dbmodels.ModeratorPermission)

	if err := s.RemoveChannel("test"); err != nil {
		t.Error("Error removing channel")
	}

	if _, ok := s.ChannelSchedules["test"]; ok {
		t.Error("Channel not removed")
	}

	if err := s.RemoveChannel("test"); err != ErrChanNotFound {
		t.Error("Expected ErrChanNotFound")
	}
}

func TestAddMessage(t *testing.T) {
	s := NewMessageScheduler(context.Background())

	s.AddChannel("test", dbmodels.ModeratorPermission)

	s.AddMessage(MessageContext{
		Channel: "test",
		Message: "test",
	})

	if len(s.ChannelSchedules["test"].MessageQueue) != 1 {
		t.Error("Message not added")
	}

	if err := s.AddMessage(MessageContext{
		Channel: "test2",
		Message: "test",
	}); err != ErrChanNotFound {
		t.Error("Expected ErrChanNotFound")
	}
}

func TestUpdateTimer(t *testing.T) {
	s := NewMessageScheduler(context.Background())

	s.AddChannel("test", dbmodels.ModeratorPermission)

	if err := s.UpdateTimer("test", dbmodels.ModeratorPermission); err != nil {
		t.Error("Error updating timer")
	}
}

func TestOnMessage(t *testing.T) {
	s := NewMessageScheduler(context.Background())

	s.AddChannel("test", dbmodels.ModeratorPermission)

	// onMessage check the message is "test" it got called 5 times and never got called more than 50 milliseconds inbetween
	fnCount := 0
	lastCall := time.Now()
	s.SetOnMessage(func(ctx MessageContext) {
		if ctx.Message != "test" {
			t.Error("Expected message to be test")
		}

		fnCount++

		if time.Since(lastCall) < timeDuration(dbmodels.ModeratorPermission) {
			t.Error("Expected at least 50 milliseconds between calls")
		}

		lastCall = time.Now()
	})

	for i := 0; i < 5; i++ {
		s.AddMessage(MessageContext{
			Channel: "test",
			Message: "test",
		})
	}

	if len(s.ChannelSchedules["test"].MessageQueue) != 5 {
		t.Error("Expected 5 messages in queue")
	}

	time.Sleep(5 * time.Second)

	if fnCount != 5 {
		t.Error("Expected OnMessage to be called 5 times")
	}
}
