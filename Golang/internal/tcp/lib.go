package tcp

import (
	"context"
	"net"
)

// Server is a wrapper for a TCP server
type Server struct {
	listener    net.Listener
	connections []*Connection
}

// NewServer creates a new server
func NewServer() *Server {
	return &Server{}
}

func (s *Server) addConnection(c *Connection) {
	s.connections = append(s.connections, c)
}

func (s *Server) removeConnection(c *Connection) {
	for i, conn := range s.connections {
		if conn == c {
			s.connections = append(s.connections[:i], s.connections[i+1:]...)
			return
		}
	}
}

// Start starts the server
func (s *Server) Start(ctx context.Context, addr string, handler func(*Connection)) error {
	var err error
	s.listener, err = net.Listen("tcp", addr)
	if err != nil {
		return err
	}

	go func() {
		<-ctx.Done()
		s.listener.Close()
	}()

	for {
		conn, err := s.listener.Accept()
		if err != nil {
			return err
		}

		connWrap := NewConnection(conn)

		s.addConnection(connWrap)

		go func() {
			handler(connWrap)

			_ = connWrap.conn.Close()

			s.removeConnection(connWrap)
		}()
	}
}

// Broadcast sends a message to all connections
func (s *Server) Broadcast(msg string) error {
	for _, conn := range s.connections {
		err := conn.WriteString(msg)

		switch err {
		case nil:
			continue
		case net.ErrClosed:
			s.removeConnection(conn)
			continue
		default:
			return err
		}
	}

	return nil
}
