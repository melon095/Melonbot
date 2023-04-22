package tcp

import (
	"bufio"
	"net"
)

// Connection is a wrapper for a TCP connection
type Connection struct {
	conn net.Conn
	r    *bufio.Reader
	w    *bufio.Writer
}

// NewConnection creates a new connection
func NewConnection(conn net.Conn) *Connection {
	return &Connection{
		conn: conn,
		r:    bufio.NewReader(conn),
		w:    bufio.NewWriter(conn),
	}
}

// Read reads a message from the connection
func (c *Connection) Read() ([]byte, error) {
	return c.r.ReadBytes('\n') // FIXME: Should read until \r\n?
}

// ReadString reads a string from the connection
func (c *Connection) ReadString() (string, error) {
	return c.r.ReadString('\n') // FIXME: Should read until \r\n?
}

// Write writes a message to the connection
func (c *Connection) Write(msg []byte) error {
	_, err := c.w.Write(msg)
	if err != nil {
		return err
	}
	return c.w.Flush()
}

// Close closes the connection
func (c *Connection) Close() error {
	return c.conn.Close()
}
