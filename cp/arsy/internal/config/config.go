package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const DefaultListen = "127.0.0.1:8787"

// Allowlist membatasi resource apa saja yang boleh disentuh arsy.
// Setiap entri boleh memakai pola glob (path.Match).
type Allowlist struct {
	Units      []string `json:"units"`
	Containers []string `json:"containers"`
	Paths      []string `json:"paths"`
	Users      []string `json:"users"`
	CronOwners []string `json:"cron_owners"`
}

type Config struct {
	Listen            string    `json:"listen"`
	StatePath         string    `json:"state_path"`
	AuditPath         string    `json:"audit_path"`
	DataDir           string    `json:"data_dir"`
	TokenAdminFile    string    `json:"token_admin_file"`
	TokenReadonlyFile string    `json:"token_readonly_file"`
	Allow             Allowlist `json:"allow"`
}

func Default() Config {
	if runtime.GOOS == "windows" {
		base := os.Getenv("ProgramData")
		if base == "" {
			base = `C:\ProgramData`
		}
		root := filepath.Join(base, "arsy")
		return Config{
			Listen:            DefaultListen,
			StatePath:         filepath.Join(root, "state.json"),
			AuditPath:         filepath.Join(root, "audit.jsonl"),
			DataDir:           filepath.Join(root, "data"),
			TokenAdminFile:    filepath.Join(root, "token-admin"),
			TokenReadonlyFile: filepath.Join(root, "token-readonly"),
			Allow:             defaultAllow(),
		}
	}
	return Config{
		Listen:            DefaultListen,
		StatePath:         "/etc/arsy/state.json",
		AuditPath:         "/var/log/arsy/audit.jsonl",
		DataDir:           "/etc/arsy/data",
		TokenAdminFile:    "/etc/arsy/token-admin",
		TokenReadonlyFile: "/etc/arsy/token-readonly",
		Allow:             defaultAllow(),
	}
}

func defaultAllow() Allowlist {
	return Allowlist{
		Units:      []string{"caddy", "docker", "moonwitness-*", "arsy"},
		Containers: []string{"moonwitness-*", "arsy-*"},
		Paths:      []string{"/etc/arsy", "/etc/caddy", "/opt/moonwitness", "/var/lib/moonwitness"},
		Users:      []string{"deploy", "moonwitness"},
		CronOwners: []string{"root"},
	}
}

// Load membaca config dari path. Path kosong berarti pakai default + env.
func Load(path string) (Config, error) {
	cfg := Default()
	if path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				return Config{}, fmt.Errorf("baca config: %w", err)
			}
		} else if err := json.Unmarshal(data, &cfg); err != nil {
			return Config{}, fmt.Errorf("parse config %s: %w", path, err)
		}
	}

	if v := os.Getenv("ARSY_LISTEN"); v != "" {
		cfg.Listen = v
	}
	if v := os.Getenv("ARSY_STATE_PATH"); v != "" {
		cfg.StatePath = v
	}
	if v := os.Getenv("ARSY_AUDIT_PATH"); v != "" {
		cfg.AuditPath = v
	}
	if v := os.Getenv("ARSY_DATA_DIR"); v != "" {
		cfg.DataDir = v
	}
	if v := os.Getenv("ARSY_TOKEN_ADMIN_FILE"); v != "" {
		cfg.TokenAdminFile = v
	}
	if v := os.Getenv("ARSY_TOKEN_READONLY_FILE"); v != "" {
		cfg.TokenReadonlyFile = v
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if c.Listen == "" {
		return errors.New("listen wajib diisi")
	}
	host, _, err := net.SplitHostPort(c.Listen)
	if err != nil {
		return fmt.Errorf("listen %q tidak valid: %w", c.Listen, err)
	}
	if !isLoopback(host) && os.Getenv("ARSY_ALLOW_PUBLIC") != "1" {
		return fmt.Errorf("listen %q bukan loopback; set ARSY_ALLOW_PUBLIC=1 untuk memaksa", c.Listen)
	}
	if c.StatePath == "" {
		return errors.New("state_path wajib diisi")
	}
	if c.AuditPath == "" {
		return errors.New("audit_path wajib diisi")
	}
	if c.DataDir == "" {
		return errors.New("data_dir wajib diisi")
	}
	return nil
}

func isLoopback(host string) bool {
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(strings.Trim(host, "[]"))
	return ip != nil && ip.IsLoopback()
}
