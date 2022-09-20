package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	twitch "github.com/JoachimFlottorp/Melonbot/Golang/EventSub/internal/Providers/Twitch"
	"go.uber.org/zap"
)

const (
	INDEX_FILE = `<!DOCTYPE html>
				<html lang="en">
					<head>
						<meta charset="UTF-8" />
						<meta http-equiv="X-UA-Compatible" content="IE=edge" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>EventSub</title>
					</head>
					<body>
						<div>Nothing to see here!</div>
					</body>
				</html>`
)

func (s *Server) send(w http.ResponseWriter, data string) {
	fmt.Fprint(w, data)
}

func (s *Server) indexHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	s.send(w, INDEX_FILE)
}

func (s *Server) eventHandler(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	defer ctx.Done()
	body, err := ioutil.ReadAll(r.Body)

	if err != nil {
		zap.S().Error(err)
		return
	}

	header := twitch.NewHeaders(r)
	
	validate, err := twitch.ValidateHMAC(header, string(body), s.secret)

	if err != nil {
		zap.S().Error(err)
		return
	}

	if !validate {
		zap.S().Warn("Received an invalid HMAC")
		w.WriteHeader(http.StatusForbidden)
		return
	}

	var notification twitch.EventSubNotificaton
	err = json.Unmarshal(body, &notification)
	if err != nil {
		zap.S().Warn("Received an invalid JSON", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if notification.Challenge != "" {
		zap.S().Debug("Received verification event")
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(notification.Challenge))
		return
	}
	w.WriteHeader(http.StatusNoContent)


	switch r.Header.Get(twitch.TwitchEventsubMessageType) {
		case twitch.MessageTypeNotification: {
			zap.S().Debugf("Received notification event")
			s.eventsub.HandleEventsubNotification(ctx, &notification)
			break
		}
		case twitch.MessageTypeRevocation: {
			zap.S().Debug("Received revocation event")

			reason := notification.Subscription.Status
			status := notification.Subscription.Type
			switch reason {

				case "user_removed": {
					zap.S().Warn("User in subscription has been removed / banned")
					break
				}
				case "authorization_revoked": {
					zap.S().Warn("The user revoked the authorization token or simply changed their password")
					break
				}
				case "notification_failures_exceeded": {
					zap.S().Warn("The callback failed to respond in a timely manner too many times")
					break
				}
				default: {
					break
				}
			}
			zap.S().Warn(zap.String("Reason", reason), zap.String("Status", status))
			break
		}
	}
}

func registerRoutes(server *Server) {
	zap.S().Info("Registering routes...")

	// Logger middleware
	server.router.Use(func (next http.Handler) http.Handler { 
		return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
			zap.S().Infof("[REQUEST] %s %s %v", r.Method, r.URL.Path, r.Host)
			next.ServeHTTP(w, r)
		})
	})
	
	// Index #TODO Do something here
	server.router.HandleFunc("/", server.indexHandler).Methods("GET")

	// Main star of the show
	server.router.HandleFunc("/eventsub", server.eventHandler).Methods("POST")
}
