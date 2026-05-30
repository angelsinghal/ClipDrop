package models

type Session struct {
	SessionID   string `json:"session_id"`
	WorkspaceID string `json:"workspace_id"`
	DeviceID    string `json:"device_id"`
	CreatedAt   int64  `json:"created_at"`
	LastSeenAt  int64  `json:"last_seen_at"`
}

type Device struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Platform   string `json:"platform"`
	UserAgent  string `json:"user_agent,omitempty"`
	LastSeenAt int64  `json:"last_seen_at"`
	Online     bool   `json:"online"`
}

type Snippet struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`
	Content    string    `json:"content"`
	Lang       *string   `json:"lang"`
	Title      *string   `json:"title"`
	Pinned     bool      `json:"pinned"`
	Sensitive  bool      `json:"sensitive"`
	ExpiresAt  *int64    `json:"expires_at"`
	DeviceID   string    `json:"device_id"`
	DeviceName string    `json:"device_name"`
	CreatedAt  int64     `json:"created_at"`
	UpdatedAt  int64     `json:"updated_at"`
	File       *FileMeta `json:"file"`
}

type FileMeta struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Mime string `json:"mime"`
	Size int64  `json:"size"`
	URL  string `json:"url"`
}

type PairingToken struct {
	WorkspaceID       string `json:"workspace_id"`
	InitiatorDeviceID string `json:"initiator_device_id"`
	Status            string `json:"status"`
	CreatedAt         int64  `json:"created_at"`
	JoinerDeviceID    string `json:"joiner_device_id,omitempty"`
}

type Share struct {
	ShareID     string  `json:"share_id"`
	SnippetID   string  `json:"snippet_id"`
	WorkspaceID string  `json:"workspace_id"`
	CreatedBy   string  `json:"created_by"`
	ViewCount   int64   `json:"view_count"`
	ExpiresAt   *int64  `json:"expires_at"`
	Revoked     bool    `json:"revoked"`
	URL         *string `json:"url,omitempty"`
}
