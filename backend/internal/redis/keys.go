package redis

import "fmt"

type Keys struct {
	Prefix string
}

func NewKeys(prefix string) Keys {
	return Keys{Prefix: prefix}
}

func (k Keys) Session(id string) string              { return fmt.Sprintf("%ssession:%s", k.Prefix, id) }
func (k Keys) WorkspaceDevices(id string) string     { return fmt.Sprintf("%sws:%s:devices", k.Prefix, id) }
func (k Keys) WorkspaceSnippets(id string) string    { return fmt.Sprintf("%sws:%s:snippets", k.Prefix, id) }
func (k Keys) WorkspacePinned(id string) string      { return fmt.Sprintf("%sws:%s:pinned", k.Prefix, id) }
func (k Keys) Snippet(id string) string              { return fmt.Sprintf("%ssnippet:%s", k.Prefix, id) }
func (k Keys) Pair(token string) string              { return fmt.Sprintf("%spair:%s", k.Prefix, token) }
func (k Keys) Share(id string) string                { return fmt.Sprintf("%sshare:%s", k.Prefix, id) }
func (k Keys) FileMeta(id string) string             { return fmt.Sprintf("%sfilemeta:%s", k.Prefix, id) }
func (k Keys) FileData(id string) string             { return fmt.Sprintf("%sfile:%s", k.Prefix, id) }
func (k Keys) Presence(workspaceID string) string    { return fmt.Sprintf("%spresence:%s", k.Prefix, workspaceID) }
func (k Keys) RateLimit(id, bucket string) string    { return fmt.Sprintf("%srl:%s:%s", k.Prefix, id, bucket) }
func (k Keys) WSChannel(workspaceID string) string   { return fmt.Sprintf("%schannel:ws:%s", k.Prefix, workspaceID) }
func (k Keys) WSChannelPattern() string              { return fmt.Sprintf("%schannel:ws:*", k.Prefix) }
func (k Keys) WorkspaceFromChannel(channel string) string {
	return channel[len(fmt.Sprintf("%schannel:ws:", k.Prefix)):]
}
