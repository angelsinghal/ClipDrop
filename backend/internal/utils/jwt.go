package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type SessionClaims struct {
	SessionID   string `json:"session_id"`
	WorkspaceID string `json:"workspace_id"`
	DeviceID    string `json:"device_id"`
	jwt.RegisteredClaims
}

func SignSessionJWT(secret, sessionID, workspaceID, deviceID string, ttl time.Duration) (string, int64, error) {
	exp := time.Now().Add(ttl)
	claims := SessionClaims{
		SessionID:   sessionID,
		WorkspaceID: workspaceID,
		DeviceID:    deviceID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sessionID,
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", 0, err
	}
	return signed, exp.UnixMilli(), nil
}

func ParseSessionJWT(secret, raw string) (*SessionClaims, error) {
	token, err := jwt.ParseWithClaims(raw, &SessionClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*SessionClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
