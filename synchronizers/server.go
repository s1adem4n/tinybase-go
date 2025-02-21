package synchronizers

import (
	"sync"
	"tinybase/persisters"
)

type Server struct {
	persister persisters.Persister
	rooms     map[string]*Room
	mu        sync.Mutex
}

func NewServer(persister persisters.Persister) *Server {
	return &Server{
		persister: persister,
		rooms:     make(map[string]*Room),
	}
}

func (s *Server) AddClient(roomID string, client *Client) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if room, exists := s.rooms[roomID]; exists {
		room.AddClient(client)
		return nil
	}

	room := NewRoom(roomID, s.persister)
	err := room.Initialize()
	if err != nil {
		return err
	}
	s.rooms[roomID] = room
	room.AddClient(client)

	return nil
}
