package synchronizers

import (
	"errors"
	"log"
	"sync"
	"tinybase/persisters"
	"tinybase/store"
)

type Room struct {
	ID           string
	Clients      map[string]*Client
	persister    persisters.Persister
	serverClient *store.Store
	mu           sync.Mutex
}

// NewRoom creates a new room with the given ID and Persister.
func NewRoom(id string, persister persisters.Persister) *Room {
	return &Room{
		ID:           id,
		Clients:      make(map[string]*Client),
		persister:    persister,
		serverClient: store.New(),
	}
}

func (r *Room) Initialize() error {
	persisted, err := r.persister.Get(r.ID)
	if err != nil && err != persisters.ErrNotFound {
		return err
	}

	err = r.serverClient.Initialize(
		func(s string) {
			r.mu.Lock()
			for _, c := range r.Clients {
				c.Conn.Send(s)
			}
			r.mu.Unlock()
		},
		persisted,
		func(s string) {
			err := r.persister.Set(r.ID, s)
			if err != nil {
				log.Printf("Failed to persist data: %v", err)
			}
		},
	)
	if err != nil {
		return err
	}

	return nil
}

func (r *Room) handleClient(client *Client) error {
	defer r.RemoveClient(client.ID)
	for {
		message, err := client.Conn.Receive()
		if err != nil {
			if errors.Is(err, ErrConnectionClosed) {
				return nil
			}
			return err
		}

		r.serverClient.Receive(message)

		r.mu.Lock()
		for _, c := range r.Clients {
			if c.ID != client.ID {
				c.Conn.Send(message)
			}
		}
		r.mu.Unlock()
	}
}

func (r *Room) AddClient(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Clients[client.ID] = client
	go func() {
		err := r.handleClient(client)
		if err != nil {
			log.Printf("Client %s error: %v", client.ID, err)
		}
	}()
}

func (r *Room) RemoveClient(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if client, exists := r.Clients[id]; exists {
		client.Conn.Close()
		delete(r.Clients, id)
	}
}
