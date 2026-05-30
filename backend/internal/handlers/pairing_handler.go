package handlers

import (
	"net/http"

	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"
	wshub "clipdrop/backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

type PairingHandler struct {
	services *services.Services
	hub      *wshub.Hub
}

func NewPairingHandler(s *services.Services, hub *wshub.Hub) *PairingHandler {
	return &PairingHandler{services: s, hub: hub}
}

func (h *PairingHandler) Init(c *gin.Context) {
	token, expiresAt, err := h.services.InitPairing(c, c.GetString("workspace_id"), c.GetString("device_id"))
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "PAIR_INIT_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"token":      token,
		"expires_at": expiresAt,
		"qr_url":     h.services.Config.PublicBaseURL + "/pair?token=" + token,
		"poll_url":   "/api/v1/pairing/" + token + "/status",
	})
}

func (h *PairingHandler) Status(c *gin.Context) {
	p, err := h.services.PairingStatus(c, c.Param("token"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"status": "expired"})
		return
	}
	resp := gin.H{"status": p.Status}
	if p.Status == "completed" && p.JoinerDeviceID != "" {
		devices, _ := h.services.GetDevices(c, p.WorkspaceID)
		for _, d := range devices {
			if d.ID == p.JoinerDeviceID {
				resp["device"] = d
				break
			}
		}
	}
	c.JSON(http.StatusOK, resp)
}

func (h *PairingHandler) Confirm(c *gin.Context) {
	var body struct {
		Token      string `json:"token" binding:"required,min=6"`
		DeviceName string `json:"device_name"`
		Platform   string `json:"platform"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Token == "" {
		utils.JSONError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid pairing payload")
		return
	}
	token, exp, session, device, err := h.services.ConfirmPairing(c, body.Token, body.DeviceName, body.Platform, c.Request.UserAgent())
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "PAIR_CONFIRM_FAILED", err.Error())
		return
	}
	_ = h.hub.PublishWorkspace(c, session.WorkspaceID, "device.joined", gin.H{"device": device}, "")
	c.JSON(http.StatusOK, gin.H{
		"token":        token,
		"expires_at":   exp,
		"workspace_id": session.WorkspaceID,
		"device_id":    session.DeviceID,
	})
}

func (h *PairingHandler) Cancel(c *gin.Context) {
	var body struct {
		Token string `json:"token" binding:"required,min=6"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.Token == "" {
		utils.JSONError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "token required")
		return
	}
	if err := h.services.CancelPairing(c, body.Token); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "PAIR_CANCEL_FAILED", err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}
