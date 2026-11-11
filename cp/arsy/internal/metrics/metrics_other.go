//go:build !linux

package metrics

import (
	"os"
	"runtime"
	"time"
)

// Collect di OS non-Linux hanya mengembalikan metrik proses.
// Metrik host penuh ditandai degraded supaya dashboard jujur.
func Collect(diskPath string) (Sample, error) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	s := Sample{
		Time:     time.Now().UTC(),
		DiskPath: diskPath,
		Degraded: true,
		MemUsed:  m.Sys,
	}
	s.Notes = append(s.Notes, "metrik host hanya tersedia di Linux; nilai di bawah ini metrik proses arsy")
	if host, err := os.Hostname(); err == nil && host == "" {
		s.Notes = append(s.Notes, "hostname kosong")
	}
	return s, nil
}
