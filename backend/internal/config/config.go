package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port               string
	RedisURL           string
	RedisPrefix        string
	JWTSecret          string
	JWTTTL             time.Duration
	MaxSnippetSize     int
	MaxFileSize        int64
	RateLimitRPM       int
	PairingTTL         time.Duration
	DefaultFileTTL     time.Duration
	DefaultSnippetKeep int64
	PublicBaseURL      string
	CORSOrigins        []string
}

func Load() Config {
	return Config{
		Port:               env("PORT", "8080"),
		RedisURL:           env("REDIS_URL", "redis://localhost:6379/0"),
		RedisPrefix:        env("REDIS_PREFIX", "clipdrop:"),
		JWTSecret:          env("JWT_SECRET", "clipdrop-dev-secret"),
		JWTTTL:             envDuration("JWT_TTL", 720*time.Hour),
		MaxSnippetSize:     envInt("MAX_SNIPPET_SIZE", 65536),
		MaxFileSize:        int64(envInt("MAX_FILE_SIZE", 262144)),
		RateLimitRPM:       envInt("RATE_LIMIT_RPM", 120),
		PairingTTL:         envDuration("PAIRING_TTL", 5*time.Minute),
		DefaultFileTTL:     envDuration("DEFAULT_FILE_TTL", 168*time.Hour),
		DefaultSnippetKeep: int64(envInt("SNIPPET_HISTORY_MAX", 500)),
		PublicBaseURL:      env("PUBLIC_BASE_URL", "http://localhost:8080"),
		CORSOrigins:        splitCSV(env("CORS_ORIGINS", "*")),
	}
}

func env(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func splitCSV(v string) []string {
	if v == "" {
		return []string{"*"}
	}
	out := []string{}
	cur := ""
	for _, r := range v {
		if r == ',' {
			if cur != "" {
				out = append(out, cur)
			}
			cur = ""
			continue
		}
		cur += string(r)
	}
	if cur != "" {
		out = append(out, cur)
	}
	if len(out) == 0 {
		return []string{"*"}
	}
	return out
}
