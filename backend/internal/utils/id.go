package utils

import (
	"crypto/rand"
	"encoding/base64"

	"github.com/google/uuid"
)

func NewID() string {
	return uuid.NewString()
}

func NewShortID(size int) string {
	if size <= 0 {
		size = 12
	}
	b := make([]byte, size)
	_, err := rand.Read(b)
	if err != nil {
		return uuid.NewString()[:size]
	}
	return base64.RawURLEncoding.EncodeToString(b)[:size]
}
