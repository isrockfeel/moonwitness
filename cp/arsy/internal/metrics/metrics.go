package metrics

import "time"

type Sample struct {
	Time       time.Time `json:"time"`
	CPUPct     float64   `json:"cpu_pct"`
	Load1      float64   `json:"load1"`
	Load5      float64   `json:"load5"`
	Load15     float64   `json:"load15"`
	MemTotal   uint64    `json:"mem_total"`
	MemUsed    uint64    `json:"mem_used"`
	MemPct     float64   `json:"mem_pct"`
	SwapTotal  uint64    `json:"swap_total"`
	SwapUsed   uint64    `json:"swap_used"`
	DiskPath   string    `json:"disk_path"`
	DiskTotal  uint64    `json:"disk_total"`
	DiskUsed   uint64    `json:"disk_used"`
	DiskPct    float64   `json:"disk_pct"`
	UptimeSec  float64   `json:"uptime_sec"`
	Degraded   bool      `json:"degraded,omitempty"`
	Notes      []string  `json:"notes,omitempty"`
}
