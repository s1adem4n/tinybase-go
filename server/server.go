package server

import (
	"log"
	"net/http"
	"regexp"
	"sync"
	"tinybase/store"

	"github.com/gorilla/websocket"
)

var pathRegex = regexp.MustCompile(`^/([^?]+)`)

// WsServerSimple implements a simple WebSocket server.
// Clients are keyed by a path (extracted from the request URL) and client id (from Sec-Websocket-Key).
type WsServerSimple struct {
	mu            sync.Mutex
	storesByPath  map[string]*store.Store
	clientsByPath map[string]map[string]*websocket.Conn
	upgrader      websocket.Upgrader
}

// NewWsServerSimple creates and returns a new WsServerSimple.
func NewWsServerSimple() *WsServerSimple {
	return &WsServerSimple{
		storesByPath:  make(map[string]*store.Store),
		clientsByPath: make(map[string]map[string]*websocket.Conn),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

// ServeHTTP upgrades a client connection and sets up message handling.
func (ws *WsServerSimple) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	// Extract pathId from URL, e.g., "/foo" gives "foo"
	matches := pathRegex.FindStringSubmatch(r.URL.Path)
	if len(matches) < 2 {
		conn.Close()
		return
	}
	pathId := matches[1]

	// Use the "Sec-Websocket-Key" header as the client id.
	clientId := r.Header.Get("Sec-Websocket-Key")
	if clientId == "" {
		conn.Close()
		return
	}

	ws.mu.Lock()
	clients, exists := ws.clientsByPath[pathId]
	if !exists {
		clients = make(map[string]*websocket.Conn)
		ws.clientsByPath[pathId] = clients
	}
	clients[clientId] = conn

	if _, exists := ws.storesByPath[pathId]; !exists {
		ws.storesByPath[pathId] = store.New(
			func(s string) {
				if clients, exists := ws.clientsByPath[pathId]; exists {
					for _, client := range clients {
						err := client.WriteMessage(websocket.TextMessage, []byte(s))
						if err != nil {
							log.Printf("Closing because of write error: %v", err)
							client.Close()
							delete(clients, clientId)
						}
					}
				}
			},
		)
		err := ws.storesByPath[pathId].Initialize()
		if err != nil {
			log.Printf("Initialize error: %v", err)
			conn.Close()
			ws.mu.Unlock()
			return
		}
	}
	ws.mu.Unlock()

	// Handle messages from the client in a separate goroutine.
	go ws.handleClientMessages(pathId, clientId, conn)
}

// handleClientMessages reads messages from a client and forwards them accordingly.
func (ws *WsServerSimple) handleClientMessages(pathId, clientId string, conn *websocket.Conn) {
	log.Printf("Client %s connected to path %s", clientId, pathId)

	defer func() {
		// On connection close, remove it from the mapping.
		ws.mu.Lock()
		if clients, exists := ws.clientsByPath[pathId]; exists {
			delete(clients, clientId)
			if len(clients) == 0 {
				delete(ws.clientsByPath, pathId)
			}
		}
		ws.mu.Unlock()
		conn.Close()
	}()

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				log.Printf("Read error: %v", err)
			}
			break
		}
		if messageType != websocket.TextMessage {
			continue
		}
		msgStr := string(message)

		ws.mu.Lock()
		if clients, exists := ws.clientsByPath[pathId]; exists {
			ws.storesByPath[pathId].Receive(msgStr)

			for id, client := range clients {
				if id == clientId {
					continue
				}
				err := client.WriteMessage(websocket.TextMessage, []byte(msgStr))
				if err != nil {
					log.Printf("Closing because of write error: %v", err)
					client.Close()
					delete(clients, id)
				}
			}
		}
		ws.mu.Unlock()
	}
}

// Destroy closes all active connections and clears the client mapping.
func (ws *WsServerSimple) Destroy() {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	for _, clients := range ws.clientsByPath {
		for _, conn := range clients {
			conn.Close()
		}
	}
	ws.clientsByPath = make(map[string]map[string]*websocket.Conn)
}
