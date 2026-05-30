package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"clipdrop/backend/internal/config"
	"clipdrop/backend/internal/models"
	redisk "clipdrop/backend/internal/redis"
	"clipdrop/backend/internal/utils"

	goredis "github.com/redis/go-redis/v9"
)

type Services struct {
	Config config.Config
	Redis  *goredis.Client
	Keys   redisk.Keys
}

func New(cfg config.Config, rdb *goredis.Client) *Services {
	return &Services{
		Config: cfg,
		Redis:  rdb,
		Keys:   redisk.NewKeys(cfg.RedisPrefix),
	}
}

func (s *Services) CreateSession(ctx context.Context, deviceName, platform, userAgent string) (token string, expMS int64, session models.Session, device models.Device, err error) {
	now := utils.NowMS()
	session = models.Session{
		SessionID:   utils.NewID(),
		WorkspaceID: utils.NewID(),
		DeviceID:    utils.NewID(),
		CreatedAt:   now,
		LastSeenAt:  now,
	}
	device = models.Device{
		ID:         session.DeviceID,
		Name:       defaultIfEmpty(deviceName, "This device"),
		Platform:   defaultIfEmpty(platform, "web"),
		UserAgent:  truncate(userAgent, 180),
		LastSeenAt: now,
		Online:     true,
	}

	if err = s.Redis.HSet(ctx, s.Keys.Session(session.SessionID), map[string]interface{}{
		"workspace_id": session.WorkspaceID,
		"device_id":    session.DeviceID,
		"created_at":   session.CreatedAt,
		"last_seen_at": session.LastSeenAt,
	}).Err(); err != nil {
		return
	}
	b, _ := json.Marshal(device)
	if err = s.Redis.HSet(ctx, s.Keys.WorkspaceDevices(session.WorkspaceID), device.ID, b).Err(); err != nil {
		return
	}
	token, expMS, err = utils.SignSessionJWT(s.Config.JWTSecret, session.SessionID, session.WorkspaceID, session.DeviceID, s.Config.JWTTTL)
	return
}

func (s *Services) RefreshSessionToken(sessionID, workspaceID, deviceID string) (string, int64, error) {
	return utils.SignSessionJWT(s.Config.JWTSecret, sessionID, workspaceID, deviceID, s.Config.JWTTTL)
}

func (s *Services) SessionExists(ctx context.Context, sessionID string) bool {
	n, err := s.Redis.Exists(ctx, s.Keys.Session(sessionID)).Result()
	return err == nil && n > 0
}

func (s *Services) GetDevices(ctx context.Context, workspaceID string) ([]models.Device, error) {
	raw, err := s.Redis.HGetAll(ctx, s.Keys.WorkspaceDevices(workspaceID)).Result()
	if err != nil {
		return nil, err
	}
	out := make([]models.Device, 0, len(raw))
	for _, v := range raw {
		var d models.Device
		if json.Unmarshal([]byte(v), &d) == nil {
			out = append(out, d)
		}
	}
	return out, nil
}

func (s *Services) RemoveDevice(ctx context.Context, workspaceID, deviceID string) error {
	count, err := s.Redis.HLen(ctx, s.Keys.WorkspaceDevices(workspaceID)).Result()
	if err != nil {
		return err
	}
	if count <= 1 {
		return fmt.Errorf("cannot remove last device")
	}
	return s.Redis.HDel(ctx, s.Keys.WorkspaceDevices(workspaceID), deviceID).Err()
}

type CreateSnippetInput struct {
	Type         string  `json:"type"`
	Content      string  `json:"content"`
	Lang         *string `json:"lang"`
	Title        *string `json:"title"`
	Sensitive    bool    `json:"sensitive"`
	ExpiresInSec int64   `json:"expires_in_sec"`
	FileID       *string `json:"file_id"`
}

func (s *Services) CreateSnippet(ctx context.Context, workspaceID, deviceID, deviceName string, in CreateSnippetInput) (*models.Snippet, error) {
	if len(in.Content) > s.Config.MaxSnippetSize {
		return nil, fmt.Errorf("content too large")
	}
	now := utils.NowMS()
	snippet := &models.Snippet{
		ID:         utils.NewID(),
		Type:       defaultIfEmpty(in.Type, "text"),
		Content:    in.Content,
		Lang:       in.Lang,
		Title:      in.Title,
		Pinned:     false,
		Sensitive:  in.Sensitive,
		DeviceID:   deviceID,
		DeviceName: deviceName,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if in.ExpiresInSec > 0 {
		ex := now + (in.ExpiresInSec * 1000)
		snippet.ExpiresAt = &ex
	}
	if in.FileID != nil {
		if _, err := s.GetFileMetaForWorkspace(ctx, workspaceID, *in.FileID); err != nil {
			return nil, fmt.Errorf("invalid file")
		}
		f, err := s.GetFileMeta(ctx, *in.FileID)
		if err == nil {
			snippet.File = f
		}
	}
	if err := s.saveSnippet(ctx, workspaceID, snippet); err != nil {
		return nil, err
	}
	return snippet, nil
}

func (s *Services) saveSnippet(ctx context.Context, workspaceID string, sn *models.Snippet) error {
	b, _ := json.Marshal(sn)
	pipe := s.Redis.TxPipeline()
	pipe.Set(ctx, s.Keys.Snippet(sn.ID), b, 0)
	pipe.ZAdd(ctx, s.Keys.WorkspaceSnippets(workspaceID), goredis.Z{Score: float64(sn.CreatedAt), Member: sn.ID})
	if sn.Pinned {
		pipe.SAdd(ctx, s.Keys.WorkspacePinned(workspaceID), sn.ID)
	}
	if sn.ExpiresAt != nil {
		pipe.PExpireAt(ctx, s.Keys.Snippet(sn.ID), time.UnixMilli(*sn.ExpiresAt))
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return err
	}
	return s.trimSnippetHistory(ctx, workspaceID)
}

func (s *Services) trimSnippetHistory(ctx context.Context, workspaceID string) error {
	key := s.Keys.WorkspaceSnippets(workspaceID)
	count, err := s.Redis.ZCard(ctx, key).Result()
	if err != nil {
		return err
	}
	excess := count - s.Config.DefaultSnippetKeep
	if excess <= 0 {
		return nil
	}
	// Remove oldest entries (lowest scores = earliest created_at).
	return s.Redis.ZRemRangeByRank(ctx, key, 0, excess-1).Err()
}

func (s *Services) snippetInWorkspace(ctx context.Context, workspaceID, snippetID string) bool {
	_, err := s.Redis.ZScore(ctx, s.Keys.WorkspaceSnippets(workspaceID), snippetID).Result()
	return err == nil
}

func (s *Services) ListSnippets(ctx context.Context, workspaceID string, limit int64, onlyPinned bool, kind string) ([]models.Snippet, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	ids, err := s.Redis.ZRevRange(ctx, s.Keys.WorkspaceSnippets(workspaceID), 0, limit-1).Result()
	if err != nil {
		return nil, err
	}
	pinned := map[string]bool{}
	if onlyPinned {
		ps, _ := s.Redis.SMembers(ctx, s.Keys.WorkspacePinned(workspaceID)).Result()
		for _, p := range ps {
			pinned[p] = true
		}
	}
	items := make([]models.Snippet, 0, len(ids))
	for _, id := range ids {
		raw, err := s.Redis.Get(ctx, s.Keys.Snippet(id)).Bytes()
		if err != nil {
			_ = s.Redis.ZRem(ctx, s.Keys.WorkspaceSnippets(workspaceID), id).Err()
			continue
		}
		var sn models.Snippet
		if json.Unmarshal(raw, &sn) != nil {
			continue
		}
		if onlyPinned && !sn.Pinned && !pinned[sn.ID] {
			continue
		}
		if kind != "" && sn.Type != kind {
			continue
		}
		items = append(items, sn)
	}
	return items, nil
}

func (s *Services) GetSnippet(ctx context.Context, id string) (*models.Snippet, error) {
	raw, err := s.Redis.Get(ctx, s.Keys.Snippet(id)).Bytes()
	if err != nil {
		return nil, err
	}
	var sn models.Snippet
	if err := json.Unmarshal(raw, &sn); err != nil {
		return nil, err
	}
	return &sn, nil
}

func (s *Services) GetSnippetForWorkspace(ctx context.Context, workspaceID, id string) (*models.Snippet, error) {
	if !s.snippetInWorkspace(ctx, workspaceID, id) {
		return nil, fmt.Errorf("not found")
	}
	return s.GetSnippet(ctx, id)
}

func (s *Services) UpdateSnippet(ctx context.Context, workspaceID, id string, patch map[string]interface{}) (*models.Snippet, error) {
	sn, err := s.GetSnippetForWorkspace(ctx, workspaceID, id)
	if err != nil {
		return nil, err
	}
	if v, ok := patch["title"].(string); ok {
		sn.Title = &v
	}
	if v, ok := patch["pinned"].(bool); ok {
		sn.Pinned = v
	}
	if v, ok := patch["sensitive"].(bool); ok {
		sn.Sensitive = v
	}
	if v, ok := patch["expires_in_sec"].(float64); ok && int64(v) > 0 {
		ex := utils.NowMS() + int64(v)*1000
		sn.ExpiresAt = &ex
	}
	sn.UpdatedAt = utils.NowMS()
	if err := s.saveSnippet(ctx, workspaceID, sn); err != nil {
		return nil, err
	}
	return sn, nil
}

func (s *Services) DeleteSnippet(ctx context.Context, workspaceID, id string) error {
	if !s.snippetInWorkspace(ctx, workspaceID, id) {
		return fmt.Errorf("not found")
	}
	pipe := s.Redis.TxPipeline()
	pipe.Del(ctx, s.Keys.Snippet(id))
	pipe.ZRem(ctx, s.Keys.WorkspaceSnippets(workspaceID), id)
	pipe.SRem(ctx, s.Keys.WorkspacePinned(workspaceID), id)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *Services) SetPinned(ctx context.Context, workspaceID, id string, pinned bool) (*models.Snippet, error) {
	sn, err := s.GetSnippetForWorkspace(ctx, workspaceID, id)
	if err != nil {
		return nil, err
	}
	sn.Pinned = pinned
	sn.UpdatedAt = utils.NowMS()
	if pinned {
		_ = s.Redis.SAdd(ctx, s.Keys.WorkspacePinned(workspaceID), id).Err()
	} else {
		_ = s.Redis.SRem(ctx, s.Keys.WorkspacePinned(workspaceID), id).Err()
	}
	if err := s.saveSnippet(ctx, workspaceID, sn); err != nil {
		return nil, err
	}
	return sn, nil
}

func (s *Services) StoreFile(ctx context.Context, workspaceID string, data []byte, name, mime string) (*models.FileMeta, error) {
	id := utils.NewID()
	meta := &models.FileMeta{
		ID:   id,
		Name: name,
		Mime: defaultIfEmpty(mime, "application/octet-stream"),
		Size: int64(len(data)),
		URL:  fmt.Sprintf("/api/v1/files/%s", id),
	}
	if meta.Size > s.Config.MaxFileSize {
		return nil, fmt.Errorf("file too large")
	}
	pipe := s.Redis.TxPipeline()
	pipe.Set(ctx, s.Keys.FileData(id), data, s.Config.DefaultFileTTL)
	pipe.HSet(ctx, s.Keys.FileMeta(id), map[string]interface{}{
		"id":           meta.ID,
		"name":         meta.Name,
		"mime":         meta.Mime,
		"size":         meta.Size,
		"url":          meta.URL,
		"workspace_id": workspaceID,
	})
	pipe.Expire(ctx, s.Keys.FileMeta(id), s.Config.DefaultFileTTL)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return nil, err
	}
	return meta, nil
}

func (s *Services) GetFileMeta(ctx context.Context, id string) (*models.FileMeta, error) {
	v, err := s.Redis.HGetAll(ctx, s.Keys.FileMeta(id)).Result()
	if err != nil || len(v) == 0 {
		return nil, fmt.Errorf("file not found")
	}
	return &models.FileMeta{
		ID:   v["id"],
		Name: v["name"],
		Mime: v["mime"],
		Size: toInt64(v["size"]),
		URL:  v["url"],
	}, nil
}

func (s *Services) GetFileMetaForWorkspace(ctx context.Context, workspaceID, id string) (*models.FileMeta, error) {
	v, err := s.Redis.HGetAll(ctx, s.Keys.FileMeta(id)).Result()
	if err != nil || len(v) == 0 {
		return nil, fmt.Errorf("file not found")
	}
	if v["workspace_id"] != workspaceID {
		return nil, fmt.Errorf("forbidden")
	}
	return &models.FileMeta{
		ID:   v["id"],
		Name: v["name"],
		Mime: v["mime"],
		Size: toInt64(v["size"]),
		URL:  v["url"],
	}, nil
}

func (s *Services) GetFileBytes(ctx context.Context, id string) ([]byte, error) {
	return s.Redis.Get(ctx, s.Keys.FileData(id)).Bytes()
}

func (s *Services) CreateShare(ctx context.Context, workspaceID, deviceID, snippetID string, expiresInSec int64) (*models.Share, error) {
	if _, err := s.GetSnippetForWorkspace(ctx, workspaceID, snippetID); err != nil {
		return nil, fmt.Errorf("snippet not found")
	}
	shareID := utils.NewShortID(14)
	share := &models.Share{
		ShareID:     shareID,
		SnippetID:   snippetID,
		WorkspaceID: workspaceID,
		CreatedBy:   deviceID,
		ViewCount:   0,
		Revoked:     false,
	}
	if expiresInSec > 0 {
		ex := utils.NowMS() + (expiresInSec * 1000)
		share.ExpiresAt = &ex
	}
	url := fmt.Sprintf("%s/share/%s", s.Config.PublicBaseURL, shareID)
	share.URL = &url
	data := map[string]interface{}{
		"share_id":     share.ShareID,
		"snippet_id":   share.SnippetID,
		"workspace_id": share.WorkspaceID,
		"created_by":   share.CreatedBy,
		"view_count":   share.ViewCount,
		"revoked":      share.Revoked,
	}
	if share.ExpiresAt != nil {
		data["expires_at"] = *share.ExpiresAt
	}
	pipe := s.Redis.TxPipeline()
	pipe.HSet(ctx, s.Keys.Share(shareID), data)
	if share.ExpiresAt != nil {
		pipe.PExpireAt(ctx, s.Keys.Share(shareID), time.UnixMilli(*share.ExpiresAt))
	}
	_, err := pipe.Exec(ctx)
	if err != nil {
		return nil, err
	}
	return share, nil
}

func (s *Services) GetShareSnippet(ctx context.Context, shareID string) (*models.Snippet, error) {
	h, err := s.Redis.HGetAll(ctx, s.Keys.Share(shareID)).Result()
	if err != nil || len(h) == 0 {
		return nil, fmt.Errorf("share not found")
	}
	if h["revoked"] == "1" || h["revoked"] == "true" {
		return nil, fmt.Errorf("share revoked")
	}
	sn, err := s.GetSnippet(ctx, h["snippet_id"])
	if err != nil {
		return nil, err
	}
	_, _ = s.Redis.HIncrBy(ctx, s.Keys.Share(shareID), "view_count", 1).Result()
	return sn, nil
}

func (s *Services) RevokeShare(ctx context.Context, shareID, workspaceID string) error {
	owner, err := s.Redis.HGet(ctx, s.Keys.Share(shareID), "workspace_id").Result()
	if err != nil {
		return err
	}
	if owner != workspaceID {
		return fmt.Errorf("forbidden")
	}
	return s.Redis.HSet(ctx, s.Keys.Share(shareID), "revoked", 1).Err()
}

func (s *Services) InitPairing(ctx context.Context, workspaceID, initiatorDeviceID string) (token string, expiresAt int64, err error) {
	token = utils.NewShortID(10)
	expiresAt = utils.NowMS() + s.Config.PairingTTL.Milliseconds()
	p := models.PairingToken{
		WorkspaceID:       workspaceID,
		InitiatorDeviceID: initiatorDeviceID,
		Status:            "pending",
		CreatedAt:         utils.NowMS(),
	}
	raw, _ := json.Marshal(p)
	err = s.Redis.Set(ctx, s.Keys.Pair(token), raw, s.Config.PairingTTL).Err()
	return
}

func (s *Services) PairingStatus(ctx context.Context, token string) (*models.PairingToken, error) {
	raw, err := s.Redis.Get(ctx, s.Keys.Pair(token)).Bytes()
	if err != nil {
		return nil, fmt.Errorf("expired")
	}
	var p models.PairingToken
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Services) ConfirmPairing(ctx context.Context, token, deviceName, platform, userAgent string) (string, int64, models.Session, models.Device, error) {
	p, err := s.PairingStatus(ctx, token)
	if err != nil {
		return "", 0, models.Session{}, models.Device{}, err
	}
	now := utils.NowMS()
	session := models.Session{
		SessionID:   utils.NewID(),
		WorkspaceID: p.WorkspaceID,
		DeviceID:    utils.NewID(),
		CreatedAt:   now,
		LastSeenAt:  now,
	}
	device := models.Device{
		ID:         session.DeviceID,
		Name:       defaultIfEmpty(deviceName, "Paired device"),
		Platform:   defaultIfEmpty(platform, "web"),
		UserAgent:  truncate(userAgent, 180),
		LastSeenAt: now,
		Online:     true,
	}
	if err := s.Redis.HSet(ctx, s.Keys.Session(session.SessionID), map[string]interface{}{
		"workspace_id": session.WorkspaceID,
		"device_id":    session.DeviceID,
		"created_at":   session.CreatedAt,
		"last_seen_at": session.LastSeenAt,
	}).Err(); err != nil {
		return "", 0, models.Session{}, models.Device{}, err
	}
	b, _ := json.Marshal(device)
	if err := s.Redis.HSet(ctx, s.Keys.WorkspaceDevices(session.WorkspaceID), device.ID, b).Err(); err != nil {
		return "", 0, models.Session{}, models.Device{}, err
	}
	p.Status = "completed"
	p.JoinerDeviceID = device.ID
	raw, _ := json.Marshal(p)
	_ = s.Redis.Set(ctx, s.Keys.Pair(token), raw, s.Config.PairingTTL).Err()
	jwtToken, exp, err := s.RefreshSessionToken(session.SessionID, session.WorkspaceID, session.DeviceID)
	return jwtToken, exp, session, device, err
}

func (s *Services) CancelPairing(ctx context.Context, token string) error {
	return s.Redis.Del(ctx, s.Keys.Pair(token)).Err()
}

func (s *Services) UpdatePresence(ctx context.Context, workspaceID, deviceID, deviceName, status string) error {
	entry := map[string]interface{}{
		"id":           deviceID,
		"device_name":  deviceName,
		"status":       defaultIfEmpty(status, "online"),
		"last_seen_at": utils.NowMS(),
	}
	b, _ := json.Marshal(entry)
	pipe := s.Redis.TxPipeline()
	pipe.HSet(ctx, s.Keys.Presence(workspaceID), deviceID, b)
	pipe.Expire(ctx, s.Keys.Presence(workspaceID), 2*time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *Services) PresenceList(ctx context.Context, workspaceID string) ([]map[string]interface{}, error) {
	v, err := s.Redis.HVals(ctx, s.Keys.Presence(workspaceID)).Result()
	if err != nil {
		return nil, err
	}
	out := make([]map[string]interface{}, 0, len(v))
	for _, item := range v {
		var row map[string]interface{}
		if json.Unmarshal([]byte(item), &row) == nil {
			out = append(out, row)
		}
	}
	return out, nil
}

func defaultIfEmpty(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

func truncate(v string, max int) string {
	if len(v) <= max {
		return v
	}
	return v[:max]
}

func toInt64(v string) int64 {
	var n int64
	for _, r := range v {
		if r < '0' || r > '9' {
			continue
		}
		n = n*10 + int64(r-'0')
	}
	return n
}
