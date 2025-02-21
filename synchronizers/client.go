package synchronizers

import "errors"

var ErrConnectionClosed = errors.New("connection closed")

// Connection is a generic connection for sending and receiving text messages.
type Connection interface {
	Send(message string) error
	Receive() (string, error)
	Close() error
}

// A client is a connection associated with an ID and a room.
type Client struct {
	ID   string
	Conn Connection
}

func NewClient(id string, conn Connection) *Client {
	return &Client{
		ID:   id,
		Conn: conn,
	}
}
