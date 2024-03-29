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

	s.AddMessage(MessageContext{
		Channel: "test2",
		Message: "test",
	})

	test2 := s.ChannelSchedules["test2"]
	if test2 != nil {
		t.Error("Channel 'test2' added to wrong queue")
	}

	if len(s.CatchAllScheduler.MessageQueue) != 1 {
		t.Error("Message not added to catch all")
	}
}

func TestUpdateTimer(t *testing.T) {
	s := NewMessageScheduler(context.Background())

	s.AddChannel("test", dbmodels.ModeratorPermission)

	s.UpdateTimer("test", dbmodels.ModeratorPermission)
}

func TestOnMessage(t *testing.T) {
	s := NewMessageScheduler(context.Background())
	perm := dbmodels.VIPPermission
	timeDur := timeDuration(perm)

	/*
		FIXME?: Too high of a interval will cause the test to fail
		Unable to test Moderator, but it's fine.
		What matters is Write mode works.
	*/
	s.AddChannel("test", perm)

	fnCount := 0
	now := time.Now()

	s.SetOnMessage(func(ctx MessageContext) {
		if ctx.Channel != "test" {
			t.Error("Expected channel to be test")
		}

		if ctx.Message != "test" {
			t.Error("Expected message to be test")
		}

		ti := time.Now()

		/* Allow for a 100ms difference in time :/ */
		dt := now.Sub(ti) + 100*time.Millisecond
		if dt > timeDur || dt < -timeDur {
			t.Error("Expected time difference to be within expected interval")
		}

		fnCount++
		now = time.Now()
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
