package safety

import (
	"errors"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
)

func testGuard() *Guard {
	return New(config.Allowlist{
		Units:      []string{"caddy", "moonwitness-*"},
		Containers: []string{"moonwitness-*"},
		Paths:      []string{"/etc/arsy", "/etc/caddy"},
		Users:      []string{"deploy"},
		CronOwners: []string{"root"},
	})
}

func TestUnitAllowed(t *testing.T) {
	g := testGuard()
	for _, name := range []string{"caddy", "caddy.service", "moonwitness-web", "moonwitness-api.service"} {
		if err := g.Unit(name); err != nil {
			t.Errorf("unit %q seharusnya diizinkan: %v", name, err)
		}
	}
}

func TestUnitDenied(t *testing.T) {
	g := testGuard()
	cases := []string{"sshd", "ssh.service", "nginx", "systemd-journald"}
	for _, name := range cases {
		if err := g.Unit(name); err == nil {
			t.Errorf("unit %q seharusnya ditolak", name)
		}
	}
}

func TestUnitDenylistWins(t *testing.T) {
	g := New(config.Allowlist{Units: []string{"*"}})
	if err := g.Unit("sshd"); !errors.Is(err, ErrDenylisted) {
		t.Fatalf("sshd harus kena denylist, dapat: %v", err)
	}
}

func TestPathAllowed(t *testing.T) {
	g := testGuard()
	for _, p := range []string{"/etc/arsy/state.json", "/etc/caddy/Caddyfile", "/etc/arsy"} {
		if err := g.Path(p); err != nil {
			t.Errorf("path %q seharusnya diizinkan: %v", p, err)
		}
	}
}

func TestPathDenied(t *testing.T) {
	g := testGuard()
	cases := []string{
		"/etc/passwd",
		"/etc/shadow",
		"/",
		"/etc/arsy/../../etc/shadow",
		"relative/path",
		"/etc/caddy/../../../boot",
	}
	for _, p := range cases {
		if err := g.Path(p); err == nil {
			t.Errorf("path %q seharusnya ditolak", p)
		}
	}
}

func TestPathPrefixBypass(t *testing.T) {
	g := New(config.Allowlist{Paths: []string{"/etc/caddy"}})
	if err := g.Path("/etc/caddyevil/secret"); err == nil {
		t.Fatal("prefix /etc/caddy tidak boleh membuka /etc/caddyevil")
	}
}

func TestUserDenied(t *testing.T) {
	g := testGuard()
	if err := g.User("root"); err == nil {
		t.Fatal("user root harus ditolak")
	}
	if err := g.User("deploy"); err != nil {
		t.Fatalf("user deploy harus diizinkan: %v", err)
	}
}

func TestCronOwner(t *testing.T) {
	g := testGuard()
	if err := g.CronOwner("root"); err != nil {
		t.Fatalf("cron owner root harus diizinkan: %v", err)
	}
	if err := g.CronOwner("deploy"); err == nil {
		t.Fatal("cron owner deploy harus ditolak")
	}
}
