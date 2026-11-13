package safety

import (
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
)

var (
	ErrDenied     = errors.New("ditolak oleh allowlist")
	ErrDenylisted = errors.New("target ada di denylist")
)

var defaultDenyUnits = []string{
	"ssh", "ssh.service", "sshd", "sshd.service",
	"systemd-journald", "systemd-logind", "systemd-udevd",
	"dbus", "dbus.service", "networking", "NetworkManager",
}

var defaultDenyPaths = []string{
	"/", "/boot", "/dev", "/proc", "/sys", "/usr", "/bin", "/sbin", "/lib", "/lib64",
	"/etc/shadow", "/etc/sudoers", "/etc/sudoers.d", "/etc/ssh", "/root",
}

var defaultDenyUsers = []string{"root", "sudo", "admin", "systemd-*"}

type Guard struct {
	allow config.Allowlist
}

func New(allow config.Allowlist) *Guard {
	return &Guard{allow: allow}
}

func (g *Guard) Unit(name string) error {
	if name == "" {
		return fmt.Errorf("unit: nama kosong")
	}
	// systemctl menerima nama dengan atau tanpa sufiks; normalisasi agar
	// allowlist "caddy" juga mengizinkan "caddy.service".
	bare := strings.TrimSuffix(name, ".service")
	if matchesAny(name, defaultDenyUnits) || matchesAny(bare, defaultDenyUnits) {
		return fmt.Errorf("%w: unit %q", ErrDenylisted, name)
	}
	if !matchesAny(name, g.allow.Units) && !matchesAny(bare, g.allow.Units) {
		return fmt.Errorf("%w: unit %q tidak ada di allow.units", ErrDenied, name)
	}
	return nil
}

func (g *Guard) Container(name string) error {
	if name == "" {
		return fmt.Errorf("container: nama kosong")
	}
	if !matchesAny(name, g.allow.Containers) {
		return fmt.Errorf("%w: container %q tidak ada di allow.containers", ErrDenied, name)
	}
	return nil
}

// Kube memvalidasi nama resource Kubernetes terhadap allowlist containers.
// Nama resource Kubernetes mengikuti pola penamaan yang sama dengan container.
func (g *Guard) Kube(name string) error {
	if name == "" {
		return fmt.Errorf("kubernetes: nama kosong")
	}
	if !matchesAny(name, g.allow.Containers) {
		return fmt.Errorf("%w: kubernetes resource %q tidak ada di allow.containers", ErrDenied, name)
	}
	return nil
}

// Path menolak path relatif, path yang keluar dari root, dan path sensitif.
// Path yang diterima harus berada di dalam salah satu direktori allowlist.
//
// Validasi memakai semantik POSIX karena state.json mendeskripsikan host
// Linux; ini juga membuat aturan yang sama bisa diuji di Windows.
func (g *Guard) Path(p string) error {
	if p == "" {
		return errors.New("path kosong")
	}
	if !path.IsAbs(p) {
		return fmt.Errorf("path %q harus absolut", p)
	}
	clean := path.Clean(p)
	if strings.Contains(clean, "..") {
		return fmt.Errorf("path %q mengandung '..'", p)
	}
	for _, denied := range defaultDenyPaths {
		if clean == denied {
			return fmt.Errorf("%w: path %q", ErrDenylisted, clean)
		}
		if denied != "/" && isUnder(clean, denied) {
			return fmt.Errorf("%w: path %q berada di bawah %s", ErrDenylisted, clean, denied)
		}
	}
	for _, base := range g.allow.Paths {
		base = path.Clean(base)
		if clean == base || isUnder(clean, base) {
			return nil
		}
	}
	return fmt.Errorf("%w: path %q tidak berada di allow.paths", ErrDenied, clean)
}

// isUnder memeriksa target berada di dalam base, dengan batas segmen path
// supaya "/etc/caddyevil" tidak lolos untuk base "/etc/caddy".
func isUnder(target, base string) bool {
	if base == "/" {
		return target != base
	}
	return strings.HasPrefix(target, strings.TrimSuffix(base, "/")+"/")
}

func (g *Guard) User(name string) error {
	if name == "" {
		return errors.New("user: nama kosong")
	}
	if matchesAny(name, defaultDenyUsers) {
		return fmt.Errorf("%w: user %q", ErrDenylisted, name)
	}
	if !matchesAny(name, g.allow.Users) {
		return fmt.Errorf("%w: user %q tidak ada di allow.users", ErrDenied, name)
	}
	return nil
}

func (g *Guard) CronOwner(owner string) error {
	if owner == "" {
		owner = "root"
	}
	if !matchesAny(owner, g.allow.CronOwners) {
		return fmt.Errorf("%w: cron owner %q tidak ada di allow.cron_owners", ErrDenied, owner)
	}
	return nil
}

// Interface memvalidasi nama interface jaringan terhadap allowlist.
func (g *Guard) Interface(name string) error {
	if name == "" {
		return errors.New("interface: nama kosong")
	}
	if !matchesAny(name, g.allow.Interfaces) {
		return fmt.Errorf("%w: interface %q tidak ada di allow.interfaces", ErrDenied, name)
	}
	return nil
}

func matchesAny(name string, patterns []string) bool {
	for _, pattern := range patterns {
		if ok, err := path.Match(pattern, name); err == nil && ok {
			return true
		}
		if pattern == name {
			return true
		}
	}
	return false
}
