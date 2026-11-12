package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
)

// maxConcurrentLookups caps how many price requests are in flight at once.
const maxConcurrentLookups = 8

// LookupPrices fetches the price of every SKU concurrently, with at most
// maxConcurrentLookups requests in flight. SKUs whose price cannot be fetched
// are listed in the returned error, in sorted order; the prices that were
// fetched are still returned.
func LookupPrices(ctx context.Context, src PriceSource, skus []string) (map[string]int64, error) {
	prices := make(map[string]int64, len(skus))
	var (
		wg     sync.WaitGroup
		mu     sync.Mutex
		failed []string
	)
	sem := make(chan struct{}, maxConcurrentLookups)

	for _, sku := range skus {
		go func() {
			wg.Add(1)
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			cents, err := src.Price(ctx, sku)
			if err != nil {
				mu.Lock()
				failed = append(failed, sku)
				mu.Unlock()
				return
			}
			prices[sku] = cents
		}()
	}
	wg.Wait()

	if len(failed) > 0 {
		sort.Strings(failed)
		return prices, fmt.Errorf("could not price %d SKUs: %s", len(failed), strings.Join(failed, ", "))
	}
	return prices, nil
}
