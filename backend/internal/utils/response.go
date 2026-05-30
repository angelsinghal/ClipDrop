package utils

import "github.com/gin-gonic/gin"

type ErrorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func JSONError(c *gin.Context, status int, code, message string) {
	var e ErrorEnvelope
	e.Error.Code = code
	e.Error.Message = message
	c.AbortWithStatusJSON(status, e)
}
