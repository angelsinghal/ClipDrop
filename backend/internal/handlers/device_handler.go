package handlers

import (
	"net/http"

	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"
	wshub "clipdrop/backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

type DeviceHandler struct {
	services *services.Services
	hub      *wshub.Hub
}

func NewDeviceHandler(s *services.Services, hub *wshub.Hub) *DeviceHandler {
	return &DeviceHandler{services: s, hub: hub}
}

func (h *DeviceHandler) List(c *gin.Context) {
	devices, err := h.services.GetDevices(c, c.GetString("workspace_id"))
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "DEVICES_LIST_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusOK, devices)
}

func (h *DeviceHandler) Delete(c *gin.Context) {
	deviceID := c.Param("device_id")
	if err := h.services.RemoveDevice(c, c.GetString("workspace_id"), deviceID); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "DEVICE_DELETE_FAILED", err.Error())
		return
	}
	_ = h.hub.PublishWorkspace(c, c.GetString("workspace_id"), "device.left", gin.H{"device_id": deviceID}, "")
	c.Status(http.StatusNoContent)
}
