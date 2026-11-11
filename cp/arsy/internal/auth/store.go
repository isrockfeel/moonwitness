package auth

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

const (
	RoleSuperadmin = "superadmin"
	RoleAdmin      = "admin"
	RoleReadonly   = "readonly"

	iterations = 210_000
	keyLen     = 32
	saltLen    = 16
	tokenLen   = 32
	sessionTTL = 12 * time.Hour
)

var (
	ErrAlreadyInitialized = errors.New("instance sudah diinisialisasi")
	ErrNotInitialized     = errors.New("instance belum diinisialisasi")
	ErrInvalidCredentials = errors.New("email atau password salah")
	ErrUnauthorized       = errors.New("sesi tidak valid atau kedaluwarsa")
	ErrUserNotFound       = errors.New("user tidak ditemukan")
	ErrLastSuperadmin     = errors.New("tidak bisa menghapus superadmin terakhir")
)

var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// User adalah akun manusia yang login ke dashboard.
type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	Salt         string    `json:"salt"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	LastLoginAt  time.Time `json:"last_login_at,omitempty"`
}

// Public adalah representasi user tanpa rahasia.
type Public struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	LastLoginAt time.Time `json:"last_login_at,omitempty"`
}

func (u User) Public() Public {
	return Public{
		ID:          u.ID,
		Name:        u.Name,
		Email:       u.Email,
		Role:        u.Role,
		CreatedAt:   u.CreatedAt,
		LastLoginAt: u.LastLoginAt,
	}
}

// Session menyimpan token yang sudah di-hash, bukan token mentah.
type Session struct {
	TokenHash string    `json:"token_hash"`
	UserID    string    `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Instance struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	InitializedAt time.Time `json:"initialized_at,omitempty"`
	Version       string    `json:"version"`
}

type usersFile struct {
	Users []User `json:"users"`
}

type sessionsFile struct {
	Sessions []Session `json:"sessions"`
}

// Store menyimpan user, sesi, dan metadata instance di satu direktori.
type Store struct {
	dir      string
	version  string
	mu       sync.Mutex
	users    []User
	sessions []Session
	instance Instance
	loaded   bool
}

func NewStore(dir, version string) (*Store, error) {
	if dir == "" {
		return nil, errors.New("direktori data auth kosong")
	}
	s := &Store{dir: dir, version: version}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) usersPath() string    { return filepath.Join(s.dir, "users.json") }
func (s *Store) sessionsPath() string { return filepath.Join(s.dir, "sessions.json") }
func (s *Store) instancePath() string { return filepath.Join(s.dir, "instance.json") }

func (s *Store) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.loadLocked()
}

func (s *Store) loadLocked() error {
	if err := os.MkdirAll(s.dir, 0o750); err != nil {
		return fmt.Errorf("buat direktori auth: %w", err)
	}

	var uf usersFile
	if err := readJSON(s.usersPath(), &uf); err != nil {
		return err
	}
	s.users = uf.Users

	var sf sessionsFile
	if err := readJSON(s.sessionsPath(), &sf); err != nil {
		return err
	}
	s.sessions = pruneExpired(sf.Sessions)

	var inst Instance
	if err := readJSON(s.instancePath(), &inst); err != nil {
		return err
	}
	if inst.ID == "" {
		id, err := randomHex(8)
		if err != nil {
			return err
		}
		inst.ID = id
	}
	inst.Version = s.version
	s.instance = inst
	s.loaded = true
	return nil
}

func readJSON(path string, target any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("baca %s: %w", path, err)
	}
	if len(strings.TrimSpace(string(data))) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, target); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}

func writeJSON(path string, payload any) error {
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, append(data, '\n'), 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func pruneExpired(sessions []Session) []Session {
	now := time.Now().UTC()
	out := sessions[:0]
	for _, s := range sessions {
		if s.ExpiresAt.After(now) {
			out = append(out, s)
		}
	}
	return out
}

// Initialized melaporkan apakah sudah ada minimal satu user.
func (s *Store) Initialized() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.users) > 0
}

func (s *Store) Instance() Instance {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.instance
}

// Users mengembalikan semua akun (tanpa rahasia).
func (s *Store) Users() []Public {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Public, 0, len(s.users))
	for _, u := range s.users {
		out = append(out, u.Public())
	}
	return out
}

type SetupInput struct {
	Name         string
	Email        string
	Password     string
	InstanceName string
}

// CreateSuperuser membuat akun pertama. Gagal bila instance sudah punya user.
func (s *Store) CreateSuperuser(in SetupInput) (Public, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.users) > 0 {
		return Public{}, ErrAlreadyInitialized
	}
	if err := validateInput(in.Name, in.Email, in.Password); err != nil {
		return Public{}, err
	}

	hash, salt, err := hashPassword(in.Password)
	if err != nil {
		return Public{}, err
	}
	id, err := randomHex(12)
	if err != nil {
		return Public{}, err
	}
	now := time.Now().UTC()
	user := User{
		ID:           id,
		Name:         strings.TrimSpace(in.Name),
		Email:        normalizeEmail(in.Email),
		PasswordHash: hash,
		Salt:         salt,
		Role:         RoleSuperadmin,
		CreatedAt:    now,
	}
	s.users = append(s.users, user)

	instanceName := strings.TrimSpace(in.InstanceName)
	if instanceName == "" {
		instanceName = "Moonwitness"
	}
	s.instance.Name = instanceName
	s.instance.InitializedAt = now
	s.instance.Version = s.version

	if err := s.persistUsersLocked(); err != nil {
		s.users = s.users[:len(s.users)-1]
		return Public{}, err
	}
	if err := s.persistInstanceLocked(); err != nil {
		return Public{}, err
	}
	return user.Public(), nil
}

// CreateUser menambah akun baru (dipakai superadmin).
func (s *Store) CreateUser(name, email, password, role string) (Public, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.users) == 0 {
		return Public{}, ErrNotInitialized
	}
	if err := validateInput(name, email, password); err != nil {
		return Public{}, err
	}
	if role != RoleAdmin && role != RoleReadonly {
		return Public{}, fmt.Errorf("role %q tidak dikenal", role)
	}
	normalized := normalizeEmail(email)
	for _, u := range s.users {
		if u.Email == normalized {
			return Public{}, fmt.Errorf("email %s sudah dipakai", normalized)
		}
	}

	hash, salt, err := hashPassword(password)
	if err != nil {
		return Public{}, err
	}
	id, err := randomHex(12)
	if err != nil {
		return Public{}, err
	}
	user := User{
		ID:           id,
		Name:         strings.TrimSpace(name),
		Email:        normalized,
		PasswordHash: hash,
		Salt:         salt,
		Role:         role,
		CreatedAt:    time.Now().UTC(),
	}
	s.users = append(s.users, user)
	if err := s.persistUsersLocked(); err != nil {
		s.users = s.users[:len(s.users)-1]
		return Public{}, err
	}
	return user.Public(), nil
}

// DeleteUser menghapus akun. Superadmin terakhir tidak boleh dihapus.
func (s *Store) DeleteUser(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	idx := -1
	superadmins := 0
	for i, u := range s.users {
		if u.Role == RoleSuperadmin {
			superadmins++
		}
		if u.ID == id {
			idx = i
		}
	}
	if idx < 0 {
		return ErrUserNotFound
	}
	if s.users[idx].Role == RoleSuperadmin && superadmins <= 1 {
		return ErrLastSuperadmin
	}

	s.users = append(s.users[:idx], s.users[idx+1:]...)
	kept := s.sessions[:0]
	for _, sess := range s.sessions {
		if sess.UserID != id {
			kept = append(kept, sess)
		}
	}
	s.sessions = kept
	if err := s.persistUsersLocked(); err != nil {
		return err
	}
	return s.persistSessionsLocked()
}

func (s *Store) validateCredentials(email, password string) (User, error) {
	normalized := normalizeEmail(email)
	for _, u := range s.users {
		if u.Email != normalized {
			continue
		}
		if verifyPassword(password, u.Salt, u.PasswordHash) {
			return u, nil
		}
		return User{}, ErrInvalidCredentials
	}
	return User{}, ErrInvalidCredentials
}

// Login memverifikasi kredensial dan membuat sesi baru.
func (s *Store) Login(email, password string) (User, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.users) == 0 {
		return User{}, "", ErrNotInitialized
	}
	user, err := s.validateCredentials(email, password)
	if err != nil {
		return User{}, "", err
	}

	token, err := randomHex(tokenLen)
	if err != nil {
		return User{}, "", err
	}
	now := time.Now().UTC()
	s.sessions = append(s.sessions, Session{
		TokenHash: hashToken(token),
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(sessionTTL),
	})

	for i := range s.users {
		if s.users[i].ID == user.ID {
			s.users[i].LastLoginAt = now
			user.LastLoginAt = now
		}
	}

	if err := s.persistSessionsLocked(); err != nil {
		return User{}, "", err
	}
	if err := s.persistUsersLocked(); err != nil {
		return User{}, "", err
	}
	return user, token, nil
}

// SessionUser mengembalikan user pemilik token yang masih valid.
func (s *Store) SessionUser(token string) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if token == "" {
		return User{}, ErrUnauthorized
	}
	want := hashToken(token)
	now := time.Now().UTC()
	for _, sess := range s.sessions {
		if sess.ExpiresAt.Before(now) {
			continue
		}
		if subtle.ConstantTimeCompare([]byte(sess.TokenHash), []byte(want)) != 1 {
			continue
		}
		for _, u := range s.users {
			if u.ID == sess.UserID {
				return u, nil
			}
		}
	}
	return User{}, ErrUnauthorized
}

// Logout mencabut sesi milik token.
func (s *Store) Logout(token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if token == "" {
		return nil
	}
	want := hashToken(token)
	kept := s.sessions[:0]
	for _, sess := range s.sessions {
		if subtle.ConstantTimeCompare([]byte(sess.TokenHash), []byte(want)) != 1 {
			kept = append(kept, sess)
		}
	}
	s.sessions = kept
	return s.persistSessionsLocked()
}

func (s *Store) persistUsersLocked() error {
	return writeJSON(s.usersPath(), usersFile{Users: s.users})
}

func (s *Store) persistSessionsLocked() error {
	return writeJSON(s.sessionsPath(), sessionsFile{Sessions: s.sessions})
}

func (s *Store) persistInstanceLocked() error {
	return writeJSON(s.instancePath(), s.instance)
}

func validateInput(name, email, password string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("nama wajib diisi")
	}
	if len(strings.TrimSpace(name)) > 80 {
		return errors.New("nama terlalu panjang")
	}
	if !emailPattern.MatchString(normalizeEmail(email)) {
		return errors.New("format email tidak valid")
	}
	if len(password) < 10 {
		return errors.New("password minimal 10 karakter")
	}
	if len(password) > 200 {
		return errors.New("password terlalu panjang")
	}
	return nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func hashPassword(password string) (string, string, error) {
	salt, err := randomBytes(saltLen)
	if err != nil {
		return "", "", err
	}
	key, err := pbkdf2.Key(sha256.New, password, salt, iterations, keyLen)
	if err != nil {
		return "", "", err
	}
	return hex.EncodeToString(key), hex.EncodeToString(salt), nil
}

func verifyPassword(password, saltHex, hashHex string) bool {
	salt, err := hex.DecodeString(saltHex)
	if err != nil {
		return false
	}
	want, err := hex.DecodeString(hashHex)
	if err != nil {
		return false
	}
	got, err := pbkdf2.Key(sha256.New, password, salt, iterations, len(want))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomBytes(n int) ([]byte, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}
	return buf, nil
}

func randomHex(n int) (string, error) {
	buf, err := randomBytes(n)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
