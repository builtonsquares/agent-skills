package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sort"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: catalog SKU [SKU...]")
		os.Exit(2)
	}
	baseURL := os.Getenv("PRICING_URL")
	if baseURL == "" {
		log.Fatal("PRICING_URL is not set")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	prices, err := LookupPrices(ctx, newHTTPPriceSource(baseURL), os.Args[1:])
	if err != nil {
		log.Print(err)
	}

	skus := make([]string, 0, len(prices))
	for sku := range prices {
		skus = append(skus, sku)
	}
	sort.Strings(skus)
	for _, sku := range skus {
		fmt.Printf("%s\t%d.%02d\n", sku, prices[sku]/100, prices[sku]%100)
	}
}
