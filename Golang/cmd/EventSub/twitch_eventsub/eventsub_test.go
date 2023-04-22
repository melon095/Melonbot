package twitch_eventsub

import (
	"testing"
)

var (
	MOCK_EVENTSUB = &EventSub{}
)

func TestValidation(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		ShouldWork bool
		ID         string
		Timestamp  string
		Signature  string
		body       []byte
		secret     string
	}{
		{
			true,
			"07ae00a7-3c23-9562-6479-e22c094b4bc7",
			"2022-04-23T23:17:46.5764042Z",
			"sha256=257ef87585a861699ee47e89bd24a74efa78d1ed83852709795575eb13ed603e",
			[]byte("{\"challenge\":\"823803fb-b204-2f32-3131-1893ca8f9eae\",\"subscription\":{\"id\":\"07ae00a7-3c23-9562-6479-e22c094b4bc7\",\"status\":\"webhook_callback_verification_pending\",\"type\":\"channel.moderator.add\",\"version\":\"1\",\"condition\":{\"broadcaster_user_id\":\"89222926\"},\"transport\":{\"method\":\"webhook\",\"callback\":\"http://127.0.0.1:3000/eventsub\"},\"created_at\":\"2022-04-23T23:17:46.5764042Z\",\"cost\":0}}"),
			"j0a82j982fda982na928nda92",
		},
		{
			true,
			"PepegaID",
			"2022-04-23T23:17:46.5764042Z",
			"sha256=thisIs-not-a-valid-id!",
			[]byte("{\"challenge\":\"monkaS\",\"subscription\":{\"id\":\"PepegaID\",\"status\":\"webhook_callback_verification_pending\",\"type\":\"channel.moderator.add\",\"version\":\"1\",\"condition\":{\"broadcaster_user_id\":\"89222926\"},\"transport\":{\"method\":\"webhook\",\"callback\":\"http://127.0.0.1:3000/eventsub\"},\"created_at\":\"2022-04-23T23:17:46.5764042Z\",\"cost\":0}}"),
			"j0a82j982fda982na928nda92",
		},
	}

	for _, testCase := range testCases {
		r := make(map[string]string)

		r[EventSubMessageID] = testCase.ID
		r[EventSubMessageTimestamp] = testCase.Timestamp
		r[EventSubMessageSignature] = testCase.Signature

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
