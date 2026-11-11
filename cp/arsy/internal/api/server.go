package api

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/audit"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/auth"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/metrics"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/ops"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/reconcile"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/vpn"
)

const (
	RoleAdmin    = "admin"
	RoleReadonly = "readonly"
)

type roleKey struct{}
type whoKey struct{}

type Server struct {
	cfg          config.Config
	info         host.Info
	runner       host.Runner
	registry     *resources.Registry
	engine       *reconcile.Engine
	ops          *ops.Executor
	audit        *audit.Log
	tokens       map[string]string
	users        *auth.Store
	vpn          *vpn.Store
	loginLimiter *limiter
	setupLimiter *limiter
	version      string
	logger       *log.Logger
}

type Options struct {
	Config   config.Config
	Info     host.Info
	Runner   host.Runner
	Registry *resources.Registry
	Engine   *reconcile.Engine
	Ops      *ops.Executor
	Audit    *audit.Log
	Users    *auth.Store
	VPN      *vpn.Store
	Version  string
	Logger   *log.Logger
}

func New(opts Options) (*Server, error) {
	tokens, err := loadTokens(opts.Config)
	if err != nil {
		return nil, err
	}
	logger := opts.Logger
	if logger == nil {
		logger = log.New(os.Stderr, "arsy: ", log.LstdFlags)
	}
	return &Server{
		cfg:          opts.Config,
		info:         opts.Info,
		runner:       opts.Runner,
		registry:     opts.Registry,
		engine:       opts.Engine,
		ops:          opts.Ops,
		audit:        opts.Audit,
		tokens:       tokens,
		users:        opts.Users,
		vpn:          opts.VPN,
		loginLimiter: newLimiter(10, 5*time.Minute),
		setupLimiter: newLimiter(10, 10*time.Minute),
		version:      opts.Version,
		logger:       logger,
	}, nil
}

func loadTokens(cfg config.Config) (map[string]string, error) {
	tokens := map[string]string{}
	admin, err := readToken(cfg.TokenAdminFile, "ARSY_TOKEN_ADMIN")
	if err != nil {
		return nil, fmt.Errorf("token admin: %w", err)
	}
	if admin == "" {
		return nil, errors.New("token admin belum ada; jalankan install.sh atau isi ARSY_TOKEN_ADMIN")
	}
	tokens[admin] = RoleAdmin

	readonly, err := readToken(cfg.TokenReadonlyFile, "ARSY_TOKEN_READONLY")
	if err != nil {
		return nil, fmt.Errorf("token read-only: %w", err)
	}
	if readonly != "" {
		tokens[readonly] = RoleReadonly
	}
	return tokens, nil
}

func readToken(path, env string) (string, error) {
	if v := strings.TrimSpace(os.Getenv(env)); v != "" {
		return v, nil
	}
	if path == "" {
		return "", nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /v1/health", s.handleHealth)

	// Onboarding: publik, tapi hanya berguna selama instance belum punya user.
	mux.HandleFunc("GET /v1/setup/status", s.handleSetupStatus)
	mux.HandleFunc("POST /v1/setup/superuser", s.handleSetupSuperuser)
	mux.HandleFunc("POST /v1/auth/login", s.handleLogin)
	mux.HandleFunc("POST /v1/auth/logout", s.handleLogout)
	mux.HandleFunc("GET /v1/auth/me", s.handleMe)

	mux.HandleFunc("GET /v1/host", s.authorize(RoleReadonly, s.handleHost))
	mux.HandleFunc("GET /v1/capabilities", s.authorize(RoleReadonly, s.handleCapabilities))
	mux.HandleFunc("GET /v1/metrics", s.authorize(RoleReadonly, s.handleMetrics))
	mux.HandleFunc("GET /v1/state", s.authorize(RoleReadonly, s.handleState))
	mux.HandleFunc("GET /v1/resources", s.authorize(RoleReadonly, s.handleResources))
	mux.HandleFunc("GET /v1/logs", s.authorize(RoleReadonly, s.handleLogs))
	mux.HandleFunc("GET /v1/audit", s.authorize(RoleReadonly, s.handleAudit))

	mux.HandleFunc("POST /v1/plan", s.authorize(RoleAdmin, s.handlePlan))
	mux.HandleFunc("POST /v1/apply", s.authorize(RoleAdmin, s.handleApply))
	mux.HandleFunc("POST /v1/ops/plan", s.authorize(RoleAdmin, s.handleOpsPlan))
	mux.HandleFunc("POST /v1/ops", s.authorize(RoleAdmin, s.handleOps))

	mux.HandleFunc("GET /v1/users", s.authorize(RoleAdmin, s.handleListUsers))
	mux.HandleFunc("POST /v1/users", s.authorize(RoleAdmin, s.handleCreateUser))
	mux.HandleFunc("DELETE /v1/users/{id}", s.authorize(RoleAdmin, s.handleDeleteUser))

	mux.HandleFunc("GET /v1/vpn/status", s.authorize(RoleReadonly, s.handleVPNStatus))
	mux.HandleFunc("POST /v1/vpn/up", s.authorize(RoleAdmin, s.handleVPNUp))
	mux.HandleFunc("POST /v1/vpn/down", s.authorize(RoleAdmin, s.handleVPNDown))
	mux.HandleFunc("POST /v1/vpn/peers", s.authorize(RoleAdmin, s.handleVPNCreatePeer))
	mux.HandleFunc("GET /v1/vpn/peers/{name}/config", s.authorize(RoleAdmin, s.handleVPNPeerConfig))
	mux.HandleFunc("DELETE /v1/vpn/peers/{name}", s.authorize(RoleAdmin, s.handleVPNDeletePeer))

	return s.recover(mux)
}

// authorize menerima Bearer token (CLI/integrasi) atau cookie sesi (dashboard).
func (s *Server) authorize(required string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, who, ok := s.resolveIdentity(r)
		if !ok {
			s.record(r, "anonymous", "denied", "tidak terautentikasi")
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "token atau sesi tidak valid"})
			return
		}
		if required == RoleAdmin && role != RoleAdmin {
			s.record(r, who, "denied", "butuh role admin")
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "butuh akses admin"})
			return
		}
		ctx := context.WithValue(r.Context(), roleKey{}, role)
		ctx = context.WithValue(ctx, whoKey{}, who)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) resolveIdentity(r *http.Request) (role, who string, ok bool) {
	if token := bearerToken(r); token != "" {
		if role, found := s.lookupRole(token); found {
			return role, "token:" + role, true
		}
	}
	if s.users != nil {
		if user, err := s.sessionUser(r); err == nil {
			return authRole(user.Role), user.Email, true
		}
	}
	return "", "", false
}

func (s *Server) lookupRole(token string) (string, bool) {
	if token == "" {
		return "", false
	}
	for candidate, role := range s.tokens {
		if subtle.ConstantTimeCompare([]byte(candidate), []byte(token)) == 1 {
			return role, true
		}
	}
	return "", false
}

func (s *Server) recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				s.logger.Printf("panic %s %s: %v", r.Method, r.URL.Path, rec)
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"version": s.version,
		"os":      s.info.OS,
		"time":    time.Now().UTC(),
	})
}

func (s *Server) handleHost(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.info)
}

func (s *Server) handleCapabilities(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"host":           s.info,
		"resource_kinds": s.registry.Kinds(),
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	sample, err := metrics.Collect(s.metricsRoot())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, sample)
}

func (s *Server) metricsRoot() string {
	if s.info.OS == host.Windows {
		return os.Getenv("SystemDrive") + `\`
	}
	return "/"
}

func (s *Server) handleState(w http.ResponseWriter, _ *http.Request) {
	st, err := s.loadState()
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (s *Server) loadState() (reconcile.State, error) {
	data, err := os.ReadFile(s.cfg.StatePath)
	if err != nil {
		return reconcile.State{}, fmt.Errorf("baca state %s: %w", s.cfg.StatePath, err)
	}
	return reconcile.ParseState(data)
}

func (s *Server) handleResources(w http.ResponseWriter, r *http.Request) {
	kind := r.URL.Query().Get("kind")
	kinds := s.registry.Kinds()
	if kind != "" {
		kinds = []string{kind}
	}

	out := map[string]any{}
	for _, k := range kinds {
		provider, err := s.registry.Get(k)
		if err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		obs, err := provider.Observe(r.Context())
		if err != nil {
			out[k] = map[string]string{"error": err.Error()}
			continue
		}
		out[k] = obs
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handlePlan(w http.ResponseWriter, r *http.Request) {
	st, err := decodeState(w, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	plan, err := s.engine.BuildPlan(r.Context(), st)
	if err != nil {
		s.record(r, role(r), "error", err.Error())
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	s.recordPlan(r, plan)
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) handleApply(w http.ResponseWriter, r *http.Request) {
	var body struct {
		State   reconcile.State `json:"state"`
		Confirm string          `json:"confirm"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	result, err := s.engine.Apply(r.Context(), body.State, body.Confirm)
	if err != nil {
		s.record(r, role(r), "error", err.Error())
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": err.Error(), "result": result})
		return
	}
	s.record(r, role(r), "applied", "")
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleOpsPlan(w http.ResponseWriter, r *http.Request) {
	var req ops.Request
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	plan, err := s.ops.Plan(req)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) handleOps(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Request ops.Request `json:"request"`
		Confirm string      `json:"confirm"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	plan, err := s.ops.Run(r.Context(), body.Request, body.Confirm)
	if err != nil {
		s.record(r, role(r), "error", err.Error())
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	s.record(r, role(r), "applied", plan.Note)
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) handleLogs(w http.ResponseWriter, r *http.Request) {
	kind := r.URL.Query().Get("kind")
	name := r.URL.Query().Get("name")
	lines := parseInt(r.URL.Query().Get("lines"), 200)

	if name == "" {
		writeError(w, http.StatusBadRequest, errors.New("parameter name wajib"))
		return
	}
	if kind != "systemd" && kind != "docker" {
		writeError(w, http.StatusBadRequest, errors.New("kind log harus systemd atau docker"))
		return
	}
	if err := s.registry.Validate(resources.Resource{Kind: kind, Name: name}); err != nil {
		writeError(w, http.StatusForbidden, err)
		return
	}

	var cmd host.Command
	switch kind {
	case "systemd":
		unit := name
		if !strings.Contains(unit, ".") {
			unit += ".service"
		}
		cmd = host.Command{Name: "journalctl", Args: []string{"-u", unit, "-n", strconv.Itoa(lines), "--no-pager", "-o", "short-iso"}}
	case "docker":
		cmd = host.Command{Name: "docker", Args: []string{"logs", "--tail", strconv.Itoa(lines), name}}
	}

	res, err := s.runner.Run(r.Context(), cmd)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"kind": kind, "name": name, "lines": lines, "output": res.Stdout + res.Stderr})
}

func (s *Server) handleAudit(w http.ResponseWriter, r *http.Request) {
	lines := parseInt(r.URL.Query().Get("lines"), 50)
	entries, err := s.audit.Tail(lines)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (s *Server) record(r *http.Request, who, result, detail string) {
	_ = s.audit.Write(audit.Entry{
		Role:   who,
		Method: r.Method,
		Path:   r.URL.Path,
		Result: result,
		Error:  detail,
		Remote: r.RemoteAddr,
	})
}

func (s *Server) recordPlan(r *http.Request, plan reconcile.Plan) {
	_ = s.audit.Write(audit.Entry{
		Role:   role(r),
		Method: r.Method,
		Path:   r.URL.Path,
		Plan:   plan.Hash,
		Result: "planned",
		Remote: r.RemoteAddr,
	})
}

func role(r *http.Request) string {
	if v, ok := r.Context().Value(roleKey{}).(string); ok {
		return v
	}
	return "unknown"
}

func who(r *http.Request) string {
	if v, ok := r.Context().Value(whoKey{}).(string); ok {
		return v
	}
	return role(r)
}

func bearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):])
	}
	return ""
}

func decodeState(w http.ResponseWriter, r *http.Request) (reconcile.State, error) {
	var st reconcile.State
	if err := decodeJSON(w, r, &st); err != nil {
		return reconcile.State{}, err
	}
	if st.Version != 1 {
		return reconcile.State{}, fmt.Errorf("state version %d tidak didukung", st.Version)
	}
	if len(st.Resources) == 0 {
		return reconcile.State{}, errors.New("state tidak berisi resource")
	}
	return st, nil
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		return fmt.Errorf("body JSON tidak valid: %w", err)
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		return errors.New("body JSON hanya boleh satu objek")
	}
	return nil
}

func parseInt(s string, def int) int {
	v, err := strconv.Atoi(s)
	if err != nil || v <= 0 {
		return def
	}
	if v > 5000 {
		return 5000
	}
	return v
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(payload)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
