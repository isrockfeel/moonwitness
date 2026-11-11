package api

import (
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/auth"
)

const sessionCookie = "arsy_session"

// limiter membatasi percobaan login/setup per alamat remote.
type limiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	max    int
	window time.Duration
}

func newLimiter(max int, window time.Duration) *limiter {
	return &limiter{hits: map[string][]time.Time{}, max: max, window: window}
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	kept := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if now.Sub(t) < l.window {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.max {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}

// sessionToken membaca token sesi dari cookie.
func sessionToken(r *http.Request) string {
	cookie, err := r.Cookie(sessionCookie)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (s *Server) setSessionCookie(w http.ResponseWriter, r *http.Request, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(r),
		MaxAge:   int((12 * time.Hour).Seconds()),
	})
}

func (s *Server) clearSessionCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(r),
		MaxAge:   -1,
	})
}

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

// authRole memetakan role akun ke level izin API.
func authRole(role string) string {
	switch role {
	case auth.RoleSuperadmin, auth.RoleAdmin:
		return RoleAdmin
	default:
		return RoleReadonly
	}
}

func (s *Server) handleSetupStatus(w http.ResponseWriter, _ *http.Request) {
	inst := s.users.Instance()
	writeJSON(w, http.StatusOK, map[string]any{
		"initialized": s.users.Initialized(),
		"version":     s.version,
		"instance":    inst,
	})
}

func (s *Server) handleSetupSuperuser(w http.ResponseWriter, r *http.Request) {
	if !s.setupLimiter.allow(clientKey(r)) {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "terlalu banyak percobaan, coba lagi nanti"})
		return
	}
	if s.users.Initialized() {
		writeJSON(w, http.StatusConflict, map[string]string{"error": auth.ErrAlreadyInitialized.Error()})
		return
	}

	var body struct {
		Name         string `json:"name"`
		Email        string `json:"email"`
		Password     string `json:"password"`
		InstanceName string `json:"instance_name"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	user, err := s.users.CreateSuperuser(auth.SetupInput{
		Name:         body.Name,
		Email:        body.Email,
		Password:     body.Password,
		InstanceName: body.InstanceName,
	})
	if err != nil {
		status := http.StatusUnprocessableEntity
		if errors.Is(err, auth.ErrAlreadyInitialized) {
			status = http.StatusConflict
		}
		writeError(w, status, err)
		return
	}

	_, token, err := s.users.Login(body.Email, body.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	s.setSessionCookie(w, r, token)
	s.record(r, user.Email, "setup", "superuser dibuat")
	writeJSON(w, http.StatusCreated, map[string]any{"user": user, "initialized": true})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !s.loginLimiter.allow(clientKey(r)) {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "terlalu banyak percobaan, coba lagi nanti"})
		return
	}

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	user, token, err := s.users.Login(body.Email, body.Password)
	if err != nil {
		s.record(r, "anonymous", "denied", "login gagal")
		status := http.StatusUnauthorized
		if errors.Is(err, auth.ErrNotInitialized) {
			status = http.StatusConflict
		}
		writeError(w, status, err)
		return
	}

	s.setSessionCookie(w, r, token)
	s.record(r, user.Email, "login", "")
	writeJSON(w, http.StatusOK, map[string]any{"user": user.Public()})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if token := sessionToken(r); token != "" {
		_ = s.users.Logout(token)
	}
	s.clearSessionCookie(w, r)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, err := s.sessionUser(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user.Public()})
}

func (s *Server) sessionUser(r *http.Request) (auth.User, error) {
	return s.users.SessionUser(sessionToken(r))
}

func (s *Server) handleListUsers(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"users": s.users.Users()})
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if body.Role == "" {
		body.Role = auth.RoleReadonly
	}
	user, err := s.users.CreateUser(body.Name, body.Email, body.Password, body.Role)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	s.record(r, role(r), "user.created", user.Email)
	writeJSON(w, http.StatusCreated, map[string]any{"user": user})
}

func (s *Server) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.users.DeleteUser(id); err != nil {
		status := http.StatusUnprocessableEntity
		if errors.Is(err, auth.ErrUserNotFound) {
			status = http.StatusNotFound
		}
		writeError(w, status, err)
		return
	}
	s.record(r, role(r), "user.deleted", id)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func clientKey(r *http.Request) string {
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i > 0 {
		host = host[:i]
	}
	return host
}
