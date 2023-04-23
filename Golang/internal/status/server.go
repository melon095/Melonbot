package status

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"

	"go.uber.org/zap"
)

// Status Server provides a simple http server for sharing health status
//
// The endpoint is /health and returns the status.Status object
type Server struct {
	listener net.Listener
}

// NewServer creates a new status server
func NewServer(port uint16) (*Server, error) {
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return nil, err
	}

	return &Server{
		listener: listener,
	}, nil
}

// Start starts the status server
//
// This is a blocking operation
func (s *Server) Start(ctx context.Context) error {
	go func() {
		<-ctx.Done()

		s.listener.Close()
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.healthRoute)

	return http.Serve(s.listener, mux)
}

func (s *Server) healthRoute(w http.ResponseWriter, r *http.Request) {
	health := NewStatus()

	body, err := json.Marshal(health)

	if err != nil {
		zap.S().Errorw("Failed to marshal health status", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")

	_, err = w.Write(body)

	if err != nil {
		zap.S().Errorw("Failed to write health status", "error", err)
		return
	}
}
