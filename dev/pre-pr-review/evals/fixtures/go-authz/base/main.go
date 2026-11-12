package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	srv := &server{store: NewStore()}
	log.Printf("listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, srv.routes()))
}
