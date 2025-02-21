package main

import (
	"log"
	"net/http"
	badgerPersister "tinybase/persisters/badger"
	"tinybase/synchronizers"
	"tinybase/synchronizers/websocket"

	badger "github.com/dgraph-io/badger/v4"
)

func main() {
	db, err := badger.Open(badger.DefaultOptions("db"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	persister := badgerPersister.NewBadgerPersister(db, "room:")
	server := synchronizers.NewServer(persister)
	websocketServer := websocket.NewWebsocketServer(server)

	mux := http.NewServeMux()
	mux.Handle("/ws/{path...}", websocketServer)

	log.Println("Listening on :8080")
	err = http.ListenAndServe(":8080", mux)
	if err != nil {
		log.Fatal(err)
	}
}
