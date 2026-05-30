package redis

import (
	"context"
	"net/url"
	"strings"

	goredis "github.com/redis/go-redis/v9"
)

type Client struct {
	RDB *goredis.Client
}

func New(redisURL string) (*Client, error) {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		// fallback for host:port
		opts = &goredis.Options{Addr: strings.TrimPrefix(redisURL, "redis://")}
	}
	rdb := goredis.NewClient(opts)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &Client{RDB: rdb}, nil
}

func NormalizePublicURL(v string) string {
	u, err := url.Parse(v)
	if err != nil {
		return v
	}
	u.Path = strings.TrimRight(u.Path, "/")
	return u.String()
}
