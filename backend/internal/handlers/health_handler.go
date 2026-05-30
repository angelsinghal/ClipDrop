package handlers

import (
	"net/http"

	goredis "github.com/redis/go-redis/v9"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	Redis *goredis.Client
}

func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *HealthHandler) Ready(c *gin.Context) {
	if err := h.Redis.Ping(c).Err(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "redis": "down"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready", "redis": "up"})
}
