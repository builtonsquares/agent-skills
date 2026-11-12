package main

import (
	"context"
	"net/http"
	"strings"
)

type userKey struct{}

// requireUser resolves the bearer token to a user and stores it in the request
// context. Requests without a valid token are rejected with 401.
func requireUser(store *Store, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		user, err := store.UserByToken(token)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userKey{}, user)))
	})
}

// currentUser returns the user stored by requireUser.
func currentUser(r *http.Request) User {
	return r.Context().Value(userKey{}).(User)
}
