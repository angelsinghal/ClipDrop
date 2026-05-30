package routes

import (
	"context"
	"log/slog"
	"os"

	"clipdrop/backend/internal/config"
	"clipdrop/backend/internal/handlers"
	"clipdrop/backend/internal/middleware"
	redisk "clipdrop/backend/internal/redis"
	"clipdrop/backend/internal/services"
	wshub "clipdrop/backend/internal/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
)

func NewRouter(log *slog.Logger, cfg config.Config, rdb *goredis.Client) *gin.Engine {
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger(), middleware.RequestID())
	metrics := &middleware.Metrics{}
	r.Use(metrics.Handler())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
	}))

	keys := redisk.NewKeys(cfg.RedisPrefix)
	svc := services.New(cfg, rdb)
	hub := wshub.NewHub(log, rdb, keys)
	hub.Start(context.Background())

	health := &handlers.HealthHandler{Redis: rdb}
	session := handlers.NewSessionHandler(svc)
	devices := handlers.NewDeviceHandler(svc, hub)
	snippets := handlers.NewSnippetHandler(svc, hub)
	files := handlers.NewFileHandler(svc)
	pairing := handlers.NewPairingHandler(svc, hub)
	shares := handlers.NewShareHandler(svc)
	ws := handlers.NewWSHandler(log, svc, hub, cfg.CORSOrigins)

	api := r.Group("/api/v1")
	api.Use(middleware.RateLimit(rdb, keys, cfg.RateLimitRPM))
	{
		api.GET("/health", health.Health)
		api.GET("/ready", health.Ready)
		api.GET("/metrics", func(c *gin.Context) {
			c.Data(200, "text/plain; version=0.0.4", []byte(metrics.RenderText()))
		})
		api.POST("/session", session.Create)
		api.GET("/shares/:id", shares.PublicGet)
	}

	authed := api.Group("/")
	authed.Use(middleware.Auth(cfg.JWTSecret, svc))
	{
		authed.POST("/session/refresh", session.Refresh)
		authed.GET("/session/me", session.Me)

		authed.GET("/devices", devices.List)
		authed.DELETE("/devices/:device_id", devices.Delete)

		authed.POST("/pairing/init", pairing.Init)
		authed.GET("/pairing/:token/status", pairing.Status)
		authed.POST("/pairing/cancel", pairing.Cancel)

		authed.GET("/snippets", snippets.List)
		authed.POST("/snippets", snippets.Create)
		authed.GET("/snippets/:id", snippets.Get)
		authed.PATCH("/snippets/:id", snippets.Patch)
		authed.DELETE("/snippets/:id", snippets.Delete)
		authed.POST("/snippets/:id/pin", snippets.Pin)
		authed.DELETE("/snippets/:id/pin", snippets.Unpin)

		authed.POST("/files", files.Upload)
		authed.GET("/files/:id", files.Download)

		authed.POST("/shares", shares.Create)
		authed.DELETE("/shares/:id", shares.Delete)
		authed.GET("/ws", ws.Serve)
	}

	api.POST("/pairing/confirm", pairing.Confirm)
	return r
}
