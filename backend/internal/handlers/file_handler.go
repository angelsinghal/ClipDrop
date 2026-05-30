package handlers

import (
	"io"
	"net/http"

	"clipdrop/backend/internal/services"
	"clipdrop/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	services *services.Services
}

func NewFileHandler(s *services.Services) *FileHandler {
	return &FileHandler{services: s}
}

func (h *FileHandler) Upload(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "INVALID_PAYLOAD", "missing file")
		return
	}
	f, err := fh.Open()
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "FILE_OPEN_FAILED", err.Error())
		return
	}
	defer f.Close()
	buf, err := io.ReadAll(f)
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "FILE_READ_FAILED", err.Error())
		return
	}
	meta, err := h.services.StoreFile(c, c.GetString("workspace_id"), buf, fh.Filename, fh.Header.Get("Content-Type"))
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "FILE_UPLOAD_FAILED", err.Error())
		return
	}
	c.JSON(http.StatusCreated, meta)
}

func (h *FileHandler) Download(c *gin.Context) {
	id := c.Param("id")
	meta, err := h.services.GetFileMetaForWorkspace(c, c.GetString("workspace_id"), id)
	if err != nil {
		if err.Error() == "forbidden" {
			utils.JSONError(c, http.StatusForbidden, "FORBIDDEN", "file access denied")
			return
		}
		utils.JSONError(c, http.StatusNotFound, "NOT_FOUND", "file not found")
		return
	}
	data, err := h.services.GetFileBytes(c, id)
	if err != nil {
		utils.JSONError(c, http.StatusNotFound, "NOT_FOUND", "file not found")
		return
	}
	c.Header("Content-Type", meta.Mime)
	c.Header("Content-Disposition", "inline; filename=\""+meta.Name+"\"")
	c.Data(http.StatusOK, meta.Mime, data)
}
