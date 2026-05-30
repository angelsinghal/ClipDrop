package middleware

import (
	"fmt"
	"net/http"
	"time"

	"clipdrop/backend/internal/redis"
	"clipdrop/backend/internal/utils"

	goredis "github.com/redis/go-redis/v9"

	"github.com/gin-gonic/gin"
)

func RateLimit(rdb *goredis.Client, keys redis.Keys, rpm int) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.ClientIP()
		if d, ok := c.Get("device_id"); ok {
			id = fmt.Sprintf("%v", d)
		}
		window := time.Now().UTC().Format("200601021504")
		key := keys.RateLimit(id, window)
		n, err := rdb.Incr(c, key).Result()
		if err == nil && n == 1 {
			_ = rdb.Expire(c, key, 2*time.Minute).Err()
		}
		if err != nil {
			utils.JSONError(c, http.StatusInternalServerError, "RATE_LIMIT_ERROR", "rate limiter unavailable")
			return
		}
		if n > int64(rpm) {
			utils.JSONError(c, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests")
			return
		}
		c.Next()
	}
}
