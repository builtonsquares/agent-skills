package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type server struct {
	store *Store
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /me", s.handleMe)
	mux.HandleFunc("GET /admin/users", s.handleAdminListUsers)
	return requireUser(s.store, mux)
}

func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, currentUser(r))
}

func (s *server) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	if currentUser(r).Role != RoleAdmin {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	writeJSON(w, http.StatusOK, s.store.Users())
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}
