package twitch

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/nicklaw5/helix"
)

var (
	MOCK_EVENTSUB = &EventSub{}
)

func init() {
	MOCK_EVENTSUB.callbackURL = "http://127.0.0.1:3000"
	MOCK_EVENTSUB.secret = "j0a82j982fda982na928nda92"
}

func modAddBody(clock time.Time) EventSubNotificaton {
	body := []byte(fmt.Sprintf(`{
		"subscription":{
		   "id":"9f79ab28-25b2-047c-cb2e-23ad82f37e08",
		   "status":"enabled",
		   "type":"channel.moderator.add",
		   "version":"1",
		   "condition":{
			  "broadcaster_user_id":"10662134"
		   },
		   "transport":{
			  "method":"webhook",
			  "callback":"null"
		   },
		   "created_at":"%s",
		   "cost":0
		},
		"event":{
		   "user_id":"73235330",
		   "user_login":"testFromUser",
		   "user_name":"testFromUser",
		   "broadcaster_user_id":"10662134",
		   "broadcaster_user_login":"testBroadcaster",
		   "broadcaster_user_name":"testBroadcaster"
		}
	 }`, clock.Format(time.RFC3339)))
	 
	 var event EventSubNotificaton
	 _ = json.Unmarshal(body, &event)
	 
	 return event
}

func TestModeratorAddEvent(t *testing.T) {
	t.Parallel()

	date := time.Now()

	event := modAddBody(date)

	MOCK_EVENTSUB.onModAdd = func(event helix.EventSubModeratorAddEvent) {
		if event.UserID != "73235330" {
			t.Fatalf("Expected UserID to be '73235330', got '%v'", event.UserID)
		}
	
		if event.UserLogin != "testFromUser" {
			t.Fatalf("Expected UserLogin to be 'testFromUser', got '%v'", event.UserLogin)
		}
	}

	MOCK_EVENTSUB.HandleEventsubNotification(context.Background(), &event)
}

func TestOutdatedEvent(t *testing.T) {
	t.Parallel()

	date, err := time.Parse(time.RFC3339, "2006-01-02T15:04:05Z")

	if err != nil {
		t.Fatalf("Error parsing date, e: %s", err)
	}

	body := modAddBody(date)

	err = MOCK_EVENTSUB.HandleEventsubNotification(context.Background(), &body)

	if err == nil || !strings.Contains(err.Error(), ErrOlderThan10Minutes) {
		t.Fatal("Expected error to be ErrOlderThan10Minutes")
	}
}

func TestValidation(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		ShouldWork bool;
		ID string;
		Timestamp string;
		Signature string;
		body string;
		secret string;
	}{
		{
			true,
			"07ae00a7-3c23-9562-6479-e22c094b4bc7",
			"2022-04-23T23:17:46.5764042Z",
			"sha256=257ef87585a861699ee47e89bd24a74efa78d1ed83852709795575eb13ed603e",
			"{\"challenge\":\"823803fb-b204-2f32-3131-1893ca8f9eae\",\"subscription\":{\"id\":\"07ae00a7-3c23-9562-6479-e22c094b4bc7\",\"status\":\"webhook_callback_verification_pending\",\"type\":\"channel.moderator.add\",\"version\":\"1\",\"condition\":{\"broadcaster_user_id\":\"89222926\"},\"transport\":{\"method\":\"webhook\",\"callback\":\"http://127.0.0.1:3000/eventsub\"},\"created_at\":\"2022-04-23T23:17:46.5764042Z\",\"cost\":0}}",
			"j0a82j982fda982na928nda92",
		},
		{
			true,
			"PepegaID",
			"2022-04-23T23:17:46.5764042Z",
			"sha256=thisIs-not-a-valid-id!",
			"{\"challenge\":\"monkaS\",\"subscription\":{\"id\":\"PepegaID\",\"status\":\"webhook_callback_verification_pending\",\"type\":\"channel.moderator.add\",\"version\":\"1\",\"condition\":{\"broadcaster_user_id\":\"89222926\"},\"transport\":{\"method\":\"webhook\",\"callback\":\"http://127.0.0.1:3000/eventsub\"},\"created_at\":\"2022-04-23T23:17:46.5764042Z\",\"cost\":0}}",
			"j0a82j982fda982na928nda92",
		},
	}

	for _, testCase := range testCases {
		r := &http.Request{}

		r.Header = make(http.Header)

		r.Header.Set(TwitchEventsubMessageID, testCase.ID)
		r.Header.Set(TwitchEventsubMessageTimestamp, testCase.Timestamp)
		r.Header.Set(TwitchEventsubMessageSignature, testCase.Signature)
		
		header := NewHeaders(r)
		
		verified, err := ValidateHMAC(header, testCase.body, testCase.secret)
		if err != nil && !testCase.ShouldWork {
			t.Fatalf("Error validation Signature, e: %s", err)
		}
		if !verified && !testCase.ShouldWork {
			t.Fatalf("Signature not verified")
		}
	}
}