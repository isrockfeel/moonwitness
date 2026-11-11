package audit

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Entry struct {
	Time    time.Time `json:"time"`
	Role    string    `json:"role"`
	Method  string    `json:"method"`
	Path    string    `json:"path"`
	Target  string    `json:"target,omitempty"`
	Action  string    `json:"action,omitempty"`
	Plan    string    `json:"plan,omitempty"`
	Result  string    `json:"result"`
	Error   string    `json:"error,omitempty"`
	Remote  string    `json:"remote,omitempty"`
	Elapsed string    `json:"elapsed,omitempty"`
}

type Log struct {
	path string
	mu   sync.Mutex
}

func New(path string) (*Log, error) {
	if path == "" {
		return &Log{}, nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return nil, err
	}
	return &Log{path: path}, nil
}

func (l *Log) Write(entry Entry) error {
	if l.path == "" {
		return nil
	}
	if entry.Time.IsZero() {
		entry.Time = time.Now().UTC()
	}
	line, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	f, err := os.OpenFile(l.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := f.Write(append(line, '\n')); err != nil {
		return err
	}
	return nil
}

// Tail mengembalikan n entri terakhir, terbaru lebih dulu.
func (l *Log) Tail(n int) ([]Entry, error) {
	if l.path == "" || n <= 0 {
		return nil, nil
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	data, err := os.ReadFile(l.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	lines := splitLines(string(data))
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	out := make([]Entry, 0, len(lines))
	for i := len(lines) - 1; i >= 0; i-- {
		var e Entry
		if err := json.Unmarshal([]byte(lines[i]), &e); err != nil {
			continue
		}
		out = append(out, e)
	}
	return out, nil
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			if i > start {
				lines = append(lines, s[start:i])
			}
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}
