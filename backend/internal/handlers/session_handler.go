package handlers

import (
	"net/http"

	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	services *services.Services
}

func NewSessionHandler(s *services.Services) *SessionHandler {
	return &SessionHandler{services: s}
}

func (h *SessionHandler) Create(c *gin.Context) {
	var body struct {
		DeviceName string `json:"device_name"`
		Platform   string `json:"platform"`
	}
	_ = c.ShouldBindJSON(&body)
	token, exp, session, _, err := h.services.CreateSession(c, body.DeviceName, body.Platform, c.Request.UserAgent())
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "SESSION_CREATE_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"token":        token,
		"expires_at":   exp,
		"workspace_id": session.WorkspaceID,
		"device_id":    session.DeviceID,
	})
}

func (h *SessionHandler) Refresh(c *gin.Context) {
	token, exp, err := h.services.RefreshSessionToken(c.GetString("session_id"), c.GetString("workspace_id"), c.GetString("device_id"))
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "SESSION_REFRESH_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token":        token,
		"expires_at":   exp,
		"workspace_id": c.GetString("workspace_id"),
		"device_id":    c.GetString("device_id"),
	})
}

func (h *SessionHandler) Me(c *gin.Context) {
	devices, err := h.services.GetDevices(c, c.GetString("workspace_id"))
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "SESSION_READ_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"workspace_id": c.GetString("workspace_id"),
		"device_id":    c.GetString("device_id"),
		"device_name":  c.GetString("device_name"),
		"devices":      devices,
	})
}
