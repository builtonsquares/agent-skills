package main

import (
	"errors"
	"sort"
	"sync"
)

var ErrNotFound = errors.New("not found")

const RoleAdmin = "admin"

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Plan  string `json:"plan"`

	Notifications Notifications `json:"notifications"`
}

type Notifications struct {
	Email bool `json:"email"`
	SMS   bool `json:"sms"`
}

type Store struct {
	mu       sync.RWMutex
	users    map[string]User
	sessions map[string]string // token -> user ID
}

func NewStore() *Store {
	return &Store{
		users:    make(map[string]User),
		sessions: make(map[string]string),
	}
}

func (s *Store) AddUser(u User, token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[u.ID] = u
	s.sessions[token] = u.ID
}

func (s *Store) UserByToken(token string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.sessions[token]
	if !ok {
		return User{}, ErrNotFound
	}
	u, ok := s.users[id]
	if !ok {
		return User{}, ErrNotFound
	}
	return u, nil
}

// Users returns every user, ordered by ID.
func (s *Store) Users() []User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]User, 0, len(s.users))
	for _, u := range s.users {
		out = append(out, u)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

func (s *Store) SetPlan(id, plan string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return ErrNotFound
	}
	u.Plan = plan
	s.users[id] = u
	return nil
}

func (s *Store) SetNotifications(id string, n Notifications) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return ErrNotFound
	}
	u.Notifications = n
	s.users[id] = u
	return nil
}
