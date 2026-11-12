package main

import (
	"context"
	"fmt"
	"strings"
)

// LookupPrices fetches the price of every SKU. SKUs whose price cannot be
// fetched are listed in the returned error; the prices that were fetched are
// still returned.
func LookupPrices(ctx context.Context, src PriceSource, skus []string) (map[string]int64, error) {
	prices := make(map[string]int64, len(skus))
	var failed []string
	for _, sku := range skus {
		cents, err := src.Price(ctx, sku)
		if err != nil {
			failed = append(failed, sku)
			continue
		}
		prices[sku] = cents
	}
	if len(failed) > 0 {
		return prices, fmt.Errorf("could not price %d SKUs: %s", len(failed), strings.Join(failed, ", "))
	}
	return prices, nil
}
