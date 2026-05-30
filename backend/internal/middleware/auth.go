package middleware

import (
	"net/http"
	"strings"

	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func Auth(secret string, s *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			if t := c.Query("token"); t != "" {
				auth = "Bearer " + t
			}
		}
		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			utils.JSONError(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing bearer token")
			return
		}
		claims, err := utils.ParseSessionJWT(secret, parts[1])
		if err != nil {
			utils.JSONError(c, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token")
			return
		}
		if !s.SessionExists(c, claims.SessionID) {
			utils.JSONError(c, http.StatusUnauthorized, "UNAUTHORIZED", "session expired")
			return
		}
		c.Set("session_id", claims.SessionID)
		c.Set("workspace_id", claims.WorkspaceID)
		c.Set("device_id", claims.DeviceID)
		devs, _ := s.GetDevices(c, claims.WorkspaceID)
		for _, d := range devs {
			if d.ID == claims.DeviceID {
				c.Set("device_name", d.Name)
				break
			}
		}
		c.Next()
	}
}
