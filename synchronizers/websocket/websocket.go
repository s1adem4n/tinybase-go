package websocket

import (
	"errors"
	"log"
	"net/http"
	"tinybase/synchronizers"

	"github.com/gorilla/websocket"
)

type WebsocketConnection struct {
	conn *websocket.Conn
}

func NewWebsocketConnection(conn *websocket.Conn) *WebsocketConnection {
	return &WebsocketConnection{
		conn: conn,
	}
}

func (c *WebsocketConnection) Send(message string) error {
	return c.conn.WriteMessage(websocket.TextMessage, []byte(message))
}

func (c *WebsocketConnection) Receive() (string, error) {
	messageType, message, err := c.conn.ReadMessage()
	if err != nil {
		if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
			return "", synchronizers.ErrConnectionClosed
		}
		return "", err
	}
	if messageType != websocket.TextMessage {
		return "", errors.New("unexpected message type")
	}

	return string(message), nil
}

func (c *WebsocketConnection) Close() error {
	return c.conn.Close()
}

type WebsocketServer struct {
	server   *synchronizers.Server
	upgrader *websocket.Upgrader
}

func NewWebsocketServer(server *synchronizers.Server) *WebsocketServer {
	return &WebsocketServer{
		server: server,
		upgrader: &websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (ws *WebsocketServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "could not upgrade connection", http.StatusInternalServerError)
		return
	}

	roomID := r.PathValue("path")
	if roomID == "" {
		http.Error(w, "missing room ID", http.StatusBadRequest)
		return
	}

	// client id is sec-websocket-key
	clientID := r.Header.Get("Sec-WebSocket-Key")
	if clientID == "" {
		http.Error(w, "missing client ID", http.StatusBadRequest)
		return
	}

	client := synchronizers.NewClient(
		clientID,
		NewWebsocketConnection(conn),
	)

	err = ws.server.AddClient(roomID, client)
	if err != nil {
		log.Printf("Failed to add client to room: %v", err)
		return
	}
}
