package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"clipdrop/backend/internal/services"
	wshub "clipdrop/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WSHandler struct {
	log            *slog.Logger
	services       *services.Services
	hub            *wshub.Hub
	allowedOrigins []string
}

func NewWSHandler(log *slog.Logger, s *services.Services, hub *wshub.Hub, allowedOrigins []string) *WSHandler {
	return &WSHandler{
		log:            log,
		services:       s,
		hub:            hub,
		allowedOrigins: allowedOrigins,
	}
}

func (h *WSHandler) upgrader() *websocket.Upgrader {
	return &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return originAllowed(r.Header.Get("Origin"), h.allowedOrigins)
		},
	}
}

func originAllowed(origin string, allowed []string) bool {
	if origin == "" {
		return true
	}
	for _, o := range allowed {
		if o == "*" || o == origin {
			return true
		}
	}
	return false
}

func (h *WSHandler) Serve(c *gin.Context) {
	workspaceID := c.GetString("workspace_id")
	deviceID := c.GetString("device_id")
	deviceName := c.GetString("device_name")

	conn, err := h.upgrader().Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	client := &wshub.Client{
		Conn:        conn,
		Send:        make(chan []byte, 32),
		WorkspaceID: workspaceID,
		DeviceID:    deviceID,
	}
	h.hub.Register(client)
	defer h.hub.Unregister(client)

	_ = h.services.UpdatePresence(c, workspaceID, deviceID, deviceName, "online")
	_ = h.hub.PublishWorkspace(c, workspaceID, "device.joined", gin.H{"device_id": deviceID}, "")

	connected, _ := json.Marshal(wshub.Message{
		Type: "connected",
		Payload: gin.H{
			"workspace_id": workspaceID,
			"device_id":    deviceID,
			"server_time":  time.Now().UnixMilli(),
		},
	})
	_ = conn.WriteMessage(websocket.TextMessage, connected)

	subscribed, _ := json.Marshal(wshub.Message{
		Type:    "subscribed",
		Payload: gin.H{"workspace_id": workspaceID},
	})
	client.Send <- subscribed

	done := make(chan struct{})
	go func() {
		defer close(done)
		h.writePump(client)
	}()
	h.readPump(c, client, workspaceID, deviceID, deviceName)
	<-done
	_ = h.services.UpdatePresence(c, workspaceID, deviceID, deviceName, "away")
	_ = h.hub.PublishWorkspace(c, workspaceID, "device.left", gin.H{"device_id": deviceID}, "")
}

func (h *WSHandler) readPump(c *gin.Context, client *wshub.Client, workspaceID, deviceID, deviceName string) {
	defer client.Conn.Close()
	const readWait = 90 * time.Second
	resetDeadline := func() {
		_ = client.Conn.SetReadDeadline(time.Now().Add(readWait))
	}
	resetDeadline()
	client.Conn.SetPongHandler(func(string) error {
		resetDeadline()
		return nil
	})
	for {
		_, msg, err := client.Conn.ReadMessage()
		if err != nil {
			return
		}
		resetDeadline()
		var incoming map[string]interface{}
		if json.Unmarshal(msg, &incoming) != nil {
			continue
		}
		typ, _ := incoming["type"].(string)
		payload, _ := incoming["payload"].(map[string]interface{})
		switch typ {
		case "ping":
			b, _ := json.Marshal(wshub.Message{Type: "pong", Payload: gin.H{}})
			client.Send <- b
		case "presence.update":
			status, _ := payload["status"].(string)
			_ = h.services.UpdatePresence(c, workspaceID, deviceID, deviceName, status)
			list, _ := h.services.PresenceList(c, workspaceID)
			_ = h.hub.PublishWorkspace(c, workspaceID, "presence.changed", gin.H{"devices": list}, "")
		}
	}
}

func (h *WSHandler) writePump(client *wshub.Client) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		_ = client.Conn.Close()
	}()
	for {
		select {
		case m, ok := <-client.Send:
			if !ok {
				return
			}
			_ = client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.TextMessage, m); err != nil {
				return
			}
		case <-ticker.C:
			_ = client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
