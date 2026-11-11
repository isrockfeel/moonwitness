package auth

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func newStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore(t.TempDir(), "test")
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestSetupCreatesSuperuserOnce(t *testing.T) {
	s := newStore(t)
	if s.Initialized() {
		t.Fatal("store baru tidak boleh initialized")
	}

	user, err := s.CreateSuperuser(SetupInput{
		Name:         "Reza",
		Email:        "Reza@Example.COM",
		Password:     "rahasia-panjang",
		InstanceName: "VPS Reza",
	})
	if err != nil {
		t.Fatal(err)
	}
	if user.Role != RoleSuperadmin {
		t.Fatalf("role harus superadmin, dapat %q", user.Role)
	}
	if user.Email != "reza@example.com" {
		t.Fatalf("email harus dinormalisasi, dapat %q", user.Email)
	}
	if !s.Initialized() {
		t.Fatal("store harus initialized setelah superuser dibuat")
	}
	if inst := s.Instance(); inst.Name != "VPS Reza" {
		t.Fatalf("nama instance harus tersimpan, dapat %q", inst.Name)
	}

	if _, err := s.CreateSuperuser(SetupInput{Name: "X", Email: "x@y.id", Password: "1234567890"}); err != ErrAlreadyInitialized {
		t.Fatalf("setup kedua harus ErrAlreadyInitialized, dapat %v", err)
	}
}

func TestSetupValidatesInput(t *testing.T) {
	s := newStore(t)
	cases := []SetupInput{
		{Name: "", Email: "a@b.id", Password: "1234567890"},
		{Name: "A", Email: "bukan-email", Password: "1234567890"},
		{Name: "A", Email: "a@b.id", Password: "pendek"},
	}
	for _, in := range cases {
		if _, err := s.CreateSuperuser(in); err == nil {
			t.Fatalf("input %+v seharusnya ditolak", in)
		}
	}
	if s.Initialized() {
		t.Fatal("validasi gagal tidak boleh menginisialisasi store")
	}
}

func TestLoginAndSession(t *testing.T) {
	s := newStore(t)
	if _, err := s.CreateSuperuser(SetupInput{Name: "Reza", Email: "reza@example.com", Password: "rahasia-panjang"}); err != nil {
		t.Fatal(err)
	}

	if _, _, err := s.Login("reza@example.com", "salah-password"); err != ErrInvalidCredentials {
		t.Fatalf("password salah harus ErrInvalidCredentials, dapat %v", err)
	}

	user, token, err := s.Login("reza@example.com", "rahasia-panjang")
	if err != nil {
		t.Fatal(err)
	}
	if token == "" {
		t.Fatal("token sesi kosong")
	}

	got, err := s.SessionUser(token)
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != user.ID {
		t.Fatalf("sesi harus milik user %s, dapat %s", user.ID, got.ID)
	}

	if _, err := s.SessionUser("token-palsu"); err != ErrUnauthorized {
		t.Fatalf("token palsu harus ErrUnauthorized, dapat %v", err)
	}

	if err := s.Logout(token); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SessionUser(token); err != ErrUnauthorized {
		t.Fatalf("sesi setelah logout harus tidak valid, dapat %v", err)
	}
}

func TestSessionPersistsAcrossRestart(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStore(dir, "test")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateSuperuser(SetupInput{Name: "Reza", Email: "reza@example.com", Password: "rahasia-panjang"}); err != nil {
		t.Fatal(err)
	}
	_, token, err := s.Login("reza@example.com", "rahasia-panjang")
	if err != nil {
		t.Fatal(err)
	}

	reloaded, err := NewStore(dir, "test")
	if err != nil {
		t.Fatal(err)
	}
	if !reloaded.Initialized() {
		t.Fatal("store setelah restart harus tetap initialized")
	}
	if _, err := reloaded.SessionUser(token); err != nil {
		t.Fatalf("sesi harus bertahan setelah restart: %v", err)
	}
}

func TestExpiredSessionRejected(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStore(dir, "test")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateSuperuser(SetupInput{Name: "Reza", Email: "reza@example.com", Password: "rahasia-panjang"}); err != nil {
		t.Fatal(err)
	}
	_, token, err := s.Login("reza@example.com", "rahasia-panjang")
	if err != nil {
		t.Fatal(err)
	}

	// Mundurkan masa berlaku semua sesi.
	s.mu.Lock()
	for i := range s.sessions {
		s.sessions[i].ExpiresAt = time.Now().Add(-time.Hour)
	}
	if err := s.persistSessionsLocked(); err != nil {
		s.mu.Unlock()
		t.Fatal(err)
	}
	s.mu.Unlock()

	if _, err := s.SessionUser(token); err != ErrUnauthorized {
		t.Fatalf("sesi kedaluwarsa harus ditolak, dapat %v", err)
	}
}

func TestDeleteUserProtectsLastSuperadmin(t *testing.T) {
	s := newStore(t)
	admin, err := s.CreateSuperuser(SetupInput{Name: "Reza", Email: "reza@example.com", Password: "rahasia-panjang"})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteUser(admin.ID); err != ErrLastSuperadmin {
		t.Fatalf("superadmin terakhir tidak boleh dihapus, dapat %v", err)
	}

	user, err := s.CreateUser("Witness", "witness@example.com", "rahasia-panjang", RoleReadonly)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteUser(user.ID); err != nil {
		t.Fatalf("user biasa harus bisa dihapus: %v", err)
	}
	if err := s.DeleteUser("tidak-ada"); err != ErrUserNotFound {
		t.Fatalf("user tidak ada harus ErrUserNotFound, dapat %v", err)
	}
}

func TestPasswordNotStoredInPlaintext(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStore(dir, "test")
	if err != nil {
		t.Fatal(err)
	}
	const password = "rahasia-panjang"
	if _, err := s.CreateSuperuser(SetupInput{Name: "Reza", Email: "reza@example.com", Password: password}); err != nil {
		t.Fatal(err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "users.json"))
	if err != nil {
		t.Fatal(err)
	}
	if containsPlaintext(string(data), password) {
		t.Fatal("password tidak boleh tersimpan plaintext")
	}
}

func containsPlaintext(haystack, needle string) bool {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
