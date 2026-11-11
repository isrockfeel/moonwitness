package api

import "net/http"

func (s *Server) handleDNS(w http.ResponseWriter, _ *http.Request) {
	if s.dns == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"enabled": false,
			"listen":  s.cfg.DNSListen,
			"entries": []any{},
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled": true,
		"listen":  s.cfg.DNSListen,
		"entries": s.dns.All(),
	})
}
