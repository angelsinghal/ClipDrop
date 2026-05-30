package handlers

import (
	"net/http"
	"strconv"

	"clipdrop/backend/internal/models"
	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"
	wshub "clipdrop/backend/internal/websocket"

	"github.com/gin-gonic/gin"
)

type SnippetHandler struct {
	services *services.Services
	hub      *wshub.Hub
}

type createSnippetBody struct {
	Type         string  `json:"type" binding:"required,oneof=text code link image file"`
	Content      string  `json:"content" binding:"required"`
	Lang         *string `json:"lang"`
	Title        *string `json:"title"`
	Sensitive    bool    `json:"sensitive"`
	ExpiresInSec int64   `json:"expires_in_sec"`
	FileID       *string `json:"file_id"`
}

func NewSnippetHandler(s *services.Services, hub *wshub.Hub) *SnippetHandler {
	return &SnippetHandler{services: s, hub: hub}
}

func (h *SnippetHandler) List(c *gin.Context) {
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "50"), 10, 64)
	onlyPinned := c.Query("pinned") == "true"
	kind := c.Query("type")
	items, err := h.services.ListSnippets(c, c.GetString("workspace_id"), limit, onlyPinned, kind)
	if err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "SNIPPETS_LIST_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "next_cursor": nil})
}

func (h *SnippetHandler) Create(c *gin.Context) {
	var body createSnippetBody
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid snippet payload")
		return
	}
	in := services.CreateSnippetInput{
		Type:         body.Type,
		Content:      body.Content,
		Lang:         body.Lang,
		Title:        body.Title,
		Sensitive:    body.Sensitive,
		ExpiresInSec: body.ExpiresInSec,
		FileID:       body.FileID,
	}
	sn, err := h.services.CreateSnippet(c, c.GetString("workspace_id"), c.GetString("device_id"), c.GetString("device_name"), in)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "SNIPPET_CREATE_FAILED", err.Error())
		return
	}
	h.publishSync(c, sn)
	c.JSON(http.StatusCreated, sn)
}

func (h *SnippetHandler) Get(c *gin.Context) {
	sn, err := h.services.GetSnippetForWorkspace(c, c.GetString("workspace_id"), c.Param("id"))
	if err != nil {
		utils.JSONError(c, http.StatusNotFound, "NOT_FOUND", "snippet not found")
		return
	}
	c.JSON(http.StatusOK, sn)
}

func (h *SnippetHandler) Patch(c *gin.Context) {
	var patch map[string]interface{}
	if err := c.ShouldBindJSON(&patch); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid patch body")
		return
	}
	sn, err := h.services.UpdateSnippet(c, c.GetString("workspace_id"), c.Param("id"), patch)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "SNIPPET_UPDATE_FAILED", err.Error())
		return
	}
	h.publishSync(c, sn)
	c.JSON(http.StatusOK, sn)
}

func (h *SnippetHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.services.DeleteSnippet(c, c.GetString("workspace_id"), id); err != nil {
		utils.JSONError(c, http.StatusBadRequest, "SNIPPET_DELETE_FAILED", err.Error())
		return
	}
	_ = h.hub.PublishWorkspace(c, c.GetString("workspace_id"), "sync.delete", gin.H{"snippet_id": id}, c.GetString("device_id"))
	c.Status(http.StatusNoContent)
}

func (h *SnippetHandler) Pin(c *gin.Context) {
	sn, err := h.services.SetPinned(c, c.GetString("workspace_id"), c.Param("id"), true)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "SNIPPET_PIN_FAILED", err.Error())
		return
	}
	h.publishSync(c, sn)
	c.JSON(http.StatusOK, sn)
}

func (h *SnippetHandler) Unpin(c *gin.Context) {
	sn, err := h.services.SetPinned(c, c.GetString("workspace_id"), c.Param("id"), false)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "SNIPPET_PIN_FAILED", err.Error())
		return
	}
	h.publishSync(c, sn)
	c.JSON(http.StatusOK, sn)
}

func (h *SnippetHandler) publishSync(c *gin.Context, sn *models.Snippet) {
	_ = h.hub.PublishWorkspace(
		c,
		c.GetString("workspace_id"),
		"sync.push",
		gin.H{"snippet": sn, "source_device_id": c.GetString("device_id")},
		c.GetString("device_id"),
	)
}
