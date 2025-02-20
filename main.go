package main

import (
	"log"
	"net/http"

	"tinybase/server"
)

func main() {
	wsServer := server.NewWsServerSimple()
	mux := http.NewServeMux()
	mux.Handle("/ws/", wsServer)

	log.Println("Starting server on :8080")
	err := http.ListenAndServe(":8080", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		mux.ServeHTTP(w, r)
	}))
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
