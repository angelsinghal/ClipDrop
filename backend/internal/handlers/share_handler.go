package handlers

import (
	"net/http"

	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type ShareHandler struct {
	services *services.Services
}

func NewShareHandler(s *services.Services) *ShareHandler {
	return &ShareHandler{services: s}
}

func (h *ShareHandler) Create(c *gin.Context) {
	var body struct {
		SnippetID    string `json:"snippet_id" binding:"required"`
		ExpiresInSec int64  `json:"expires_in_sec"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.SnippetID == "" {
		utils.JSONError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid share payload")
		return
	}
	share, err := h.services.CreateShare(c, c.GetString("workspace_id"), c.GetString("device_id"), body.SnippetID, body.ExpiresInSec)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "SHARE_CREATE_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"share_id":   share.ShareID,
		"url":        share.URL,
		"expires_at": share.ExpiresAt,
	})
}

func (h *ShareHandler) PublicGet(c *gin.Context) {
	sn, err := h.services.GetShareSnippet(c, c.Param("id"))
	if err != nil {
		utils.JSONError(c, http.StatusNotFound, "NOT_FOUND", "share not found")
		return
	}
	c.JSON(http.StatusOK, sn)
}

func (h *ShareHandler) Delete(c *gin.Context) {
	if err := h.services.RevokeShare(c, c.Param("id"), c.GetString("workspace_id")); err != nil {
		utils.JSONError(c, http.StatusForbidden, "SHARE_REVOKE_FAILED", err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}
