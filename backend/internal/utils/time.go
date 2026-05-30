package utils

import "time"

func NowMS() int64 {
	return time.Now().UnixMilli()
}
