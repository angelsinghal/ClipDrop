package middleware

import (
	"fmt"
	"sync/atomic"

	"github.com/gin-gonic/gin"
)

type Metrics struct {
	RequestsTotal uint64
	ErrorsTotal   uint64
}

func (m *Metrics) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		atomic.AddUint64(&m.RequestsTotal, 1)
		c.Next()
		if c.Writer.Status() >= 500 {
			atomic.AddUint64(&m.ErrorsTotal, 1)
		}
	}
}

func (m *Metrics) RenderText() string {
	return fmt.Sprintf(
		"# TYPE clipdrop_requests_total counter\nclipdrop_requests_total %d\n# TYPE clipdrop_errors_total counter\nclipdrop_errors_total %d\n",
		atomic.LoadUint64(&m.RequestsTotal),
		atomic.LoadUint64(&m.ErrorsTotal),
	)
}
