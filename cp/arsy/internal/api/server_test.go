package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/audit"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/auth"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/ops"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/reconcile"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/safety"
)

const (
	adminToken    = "admin-token-test"
	readonlyToken = "readonly-token-test"
)

func testServer(t *testing.T) *Server {
	t.Helper()
	dir := t.TempDir()

	adminFile := filepath.Join(dir, "token-admin")
	readonlyFile := filepath.Join(dir, "token-readonly")
	if err := os.WriteFile(adminFile, []byte(adminToken), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(readonlyFile, []byte(readonlyToken), 0o600); err != nil {
		t.Fatal(err)
	}

	cfg := config.Config{
		Listen:            "127.0.0.1:8787",
		StatePath:         filepath.Join(dir, "state.json"),
		AuditPath:         filepath.Join(dir, "audit.jsonl"),
		TokenAdminFile:    adminFile,
		TokenReadonlyFile: readonlyFile,
		Allow: config.Allowlist{
			Units:      []string{"caddy"},
			Containers: []string{"moonwitness-*"},
			Paths:      []string{"/etc/arsy"},
		},
	}

	runner := &host.FakeRunner{}
	guard := safety.New(cfg.Allow)
	info := host.Info{OS: host.Linux, Capabilities: host.Capabilities{Systemd: true, Docker: true, Files: true}}
	registry := resources.NewRegistry(guard, resources.DefaultProviders(runner, info)...)
	auditLog, err := audit.New(cfg.AuditPath)
	if err != nil {
		t.Fatal(err)
	}
	users, err := auth.NewStore(filepath.Join(dir, "data"), "test")
	if err != nil {
		t.Fatal(err)
	}

	srv, err := New(Options{
		Config:   cfg,
		Info:     info,
		Runner:   runner,
		Registry: registry,
		Engine:   reconcile.NewEngine(registry, runner),
		Ops:      ops.NewExecutor(registry, runner),
		Audit:    auditLog,
		Users:    users,
		Version:  "test",
	})
	if err != nil {
		t.Fatal(err)
	}
	return srv
}

func do(t *testing.T, srv *Server, method, path, token, body string) *httptest.ResponseRecorder {
	t.Helper()
	var reader *strings.Reader
	if body == "" {
		reader = strings.NewReader("")
	} else {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func TestHealthNeedsNoToken(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/health", "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("health harus 200, dapat %d", rec.Code)
	}
}

func TestReadEndpointRejectsAnonymous(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/host", "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("harus 401, dapat %d", rec.Code)
	}
}

func TestReadEndpointAcceptsReadonly(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/host", readonlyToken, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestWriteEndpointRejectsReadonly(t *testing.T) {
	srv := testServer(t)
	body := `{"version":1,"resources":[{"kind":"systemd","name":"caddy","state":"started"}]}`
	rec := do(t, srv, "POST", "/v1/plan", readonlyToken, body)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("harus 403, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestPlanRejectsDenylistedUnit(t *testing.T) {
	srv := testServer(t)
	body := `{"version":1,"resources":[{"kind":"systemd","name":"sshd","state":"started"}]}`
	rec := do(t, srv, "POST", "/v1/plan", adminToken, body)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("harus 422, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestPlanReturnsHash(t *testing.T) {
	srv := testServer(t)
	body := `{"version":1,"resources":[{"kind":"systemd","name":"caddy","state":"started"}]}`
	rec := do(t, srv, "POST", "/v1/plan", adminToken, body)
	if rec.Code != http.StatusOK {
		t.Fatalf("harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	var plan reconcile.Plan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if len(plan.Hash) != 64 {
		t.Fatalf("hash harus sha256 hex, dapat %q", plan.Hash)
	}
}

func TestApplyRejectsWrongConfirm(t *testing.T) {
	srv := testServer(t)
	body := `{"state":{"version":1,"resources":[{"kind":"systemd","name":"caddy","state":"started"}]},"confirm":"salah"}`
	rec := do(t, srv, "POST", "/v1/apply", adminToken, body)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("harus 422, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestUnknownFieldRejected(t *testing.T) {
	srv := testServer(t)
	body := `{"version":1,"resources":[],"extra":true}`
	rec := do(t, srv, "POST", "/v1/plan", adminToken, body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("harus 400, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAuditRecordsDenied(t *testing.T) {
	srv := testServer(t)
	do(t, srv, "GET", "/v1/host", "token-palsu", "")

	rec := do(t, srv, "GET", "/v1/audit?lines=10", readonlyToken, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("harus 200, dapat %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "denied") {
		t.Fatalf("audit harus mencatat penolakan: %s", rec.Body.String())
	}
}

func TestLogsRejectsUnknownKind(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/logs?kind=magic&name=x", readonlyToken, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("harus 400, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestLogsRejectsDeniedUnit(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/logs?kind=systemd&name=sshd", readonlyToken, "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("harus 403, dapat %d: %s", rec.Code, rec.Body.String())
	}
}
