package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type server struct {
	store *Store
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /me", s.handleMe)
	mux.HandleFunc("PUT /me/notifications", s.handleUpdateNotifications)
	mux.HandleFunc("GET /admin/users", s.handleAdminListUsers)
	mux.HandleFunc("PUT /admin/users/{id}/plan", s.handleAdminSetPlan)
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

func (s *server) handleUpdateNotifications(w http.ResponseWriter, r *http.Request) {
	var prefs Notifications
	json.NewDecoder(r.Body).Decode(&prefs)

	if err := s.store.SetNotifications(currentUser(r).ID, prefs); err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, prefs)
}

var validPlans = map[string]bool{"free": true, "pro": true, "enterprise": true}

type setPlanRequest struct {
	Plan string `json:"plan"`
}

func (s *server) handleAdminSetPlan(w http.ResponseWriter, r *http.Request) {
	var req setPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if !validPlans[req.Plan] {
		http.Error(w, "unknown plan", http.StatusBadRequest)
		return
	}

	err := s.store.SetPlan(r.PathValue("id"), req.Plan)
	if errors.Is(err, ErrNotFound) {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}
