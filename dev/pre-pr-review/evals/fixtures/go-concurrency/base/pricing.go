package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// PriceSource returns the current price of a SKU in cents.
type PriceSource interface {
	Price(ctx context.Context, sku string) (int64, error)
}

type httpPriceSource struct {
	baseURL string
	client  *http.Client
}

func newHTTPPriceSource(baseURL string) *httpPriceSource {
	return &httpPriceSource{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 5 * time.Second},
	}
}

func (s *httpPriceSource) Price(ctx context.Context, sku string) (int64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/prices/"+url.PathEscape(sku), nil)
	if err != nil {
		return 0, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("price %s: unexpected status %d", sku, resp.StatusCode)
	}
	var body struct {
		Cents int64 `json:"cents"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, fmt.Errorf("price %s: decode response: %w", sku, err)
	}
	return body.Cents, nil
}
