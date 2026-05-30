package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"sync"
	"time"

	redisk "clipdrop/backend/internal/redis"

	goredis "github.com/redis/go-redis/v9"
	"github.com/gorilla/websocket"
)

type Message struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
	Timestamp int64       `json:"ts,omitempty"`
}

type PubSubMessage struct {
	Event           string          `json:"event"`
	WorkspaceID     string          `json:"workspace_id,omitempty"`
	Payload         json.RawMessage `json:"payload"`
	ExcludeDeviceID string          `json:"exclude_device_id,omitempty"`
}

type Client struct {
	Conn        *websocket.Conn
	Send        chan []byte
	WorkspaceID string
	DeviceID    string
}

type Hub struct {
	log      *slog.Logger
	rdb      *goredis.Client
	keys     redisk.Keys
	mu       sync.RWMutex
	rooms    map[string]map[*Client]struct{}
	shutdown chan struct{}
}

func NewHub(log *slog.Logger, rdb *goredis.Client, keys redisk.Keys) *Hub {
	return &Hub{
		log:      log,
		rdb:      rdb,
		keys:     keys,
		rooms:    map[string]map[*Client]struct{}{},
		shutdown: make(chan struct{}),
	}
}

func (h *Hub) Start(ctx context.Context) {
	go h.consumePubSub(ctx)
}

func (h *Hub) Stop() {
	close(h.shutdown)
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[c.WorkspaceID] == nil {
		h.rooms[c.WorkspaceID] = map[*Client]struct{}{}
	}
	h.rooms[c.WorkspaceID][c] = struct{}{}
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[c.WorkspaceID]; ok {
		delete(room, c)
		if len(room) == 0 {
			delete(h.rooms, c.WorkspaceID)
		}
	}
}

func (h *Hub) PublishWorkspace(ctx context.Context, workspaceID, event string, payload interface{}, excludeDeviceID string) error {
	body, _ := json.Marshal(payload)
	msg, _ := json.Marshal(PubSubMessage{
		Event:           event,
		WorkspaceID:     workspaceID,
		Payload:         body,
		ExcludeDeviceID: excludeDeviceID,
	})
	return h.rdb.Publish(ctx, h.keys.WSChannel(workspaceID), msg).Err()
}

func (h *Hub) consumePubSub(ctx context.Context) {
	ps := h.rdb.PSubscribe(ctx, h.keys.WSChannelPattern())
	ch := ps.Channel()
	defer ps.Close()
	for {
		select {
		case <-h.shutdown:
			return
		case <-ctx.Done():
			return
		case m := <-ch:
			h.handlePubSub(m.Channel, m.Payload)
		}
	}
}

func (h *Hub) handlePubSub(channel, payload string) {
	workspaceID := strings.TrimPrefix(channel, h.keys.Prefix+"channel:ws:")
	var msg PubSubMessage
	if err := json.Unmarshal([]byte(payload), &msg); err != nil {
		return
	}
	envelope := Message{
		Type:      msg.Event,
		Payload:   json.RawMessage(msg.Payload),
		Timestamp: time.Now().UnixMilli(),
	}
	raw, _ := json.Marshal(envelope)
	h.mu.RLock()
	clients := h.rooms[workspaceID]
	h.mu.RUnlock()
	for c := range clients {
		if msg.ExcludeDeviceID != "" && msg.ExcludeDeviceID == c.DeviceID {
			continue
		}
		select {
		case c.Send <- raw:
		default:
		}
	}
}
